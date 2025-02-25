require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Redis = require('redis');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const redisClient = Redis.createClient({
    url: process.env.REDIS_URL
});

(async () => {
    await redisClient.connect();
})();

redisClient.on('error', (err) => console.log('Redis Client Error', err));

async function initializeProducts() {
    const products = [
        { id: '1', name: 'T-Sshirt', price: 19.99, stock: 100 },
        { id: '2', name: 'Jeans', price: 49.99, stock: 50 },
        { id: '3', name: 'Sneakers', price: 79.99, stock: 30 },
        { id: '4', name: 'Hat', price: 14.99, stock: 80 },
    ];

    for (let product of products) {
        await redisClient.hSet(`product:${product.id}`, product);
    }
    console.log('Products initialized',products.length );
}

app.get('/api/products', async (req, res) => {
    try {
        const keys = await redisClient.keys('product:*');
        console.log(keys,'keys')
        const products = await Promise.all(keys.map(async (key) => {
            return await redisClient.hGetAll(key);
        }));
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Error fetching products' });
    }
});

app.post('/api/purchase', async (req, res) => {
    const { productId, quantity } = req.body;
    try {
        const product = await redisClient.hGetAll(`product:${productId}`);
        if (!product.id) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (parseInt(product.stock) < quantity) {
            return res.status(400).json({ error: 'Not enough stock' });
        }
        await redisClient.hIncrBy(`product:${productId}`, 'stock', -quantity);
        res.json({ message: 'Purchase successful' });
    } catch (error) {
        console.error('Error processing purchase:', error);
        res.status(500).json({ error: 'Error processing purchase' });
    }
});

app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    await initializeProducts();
});