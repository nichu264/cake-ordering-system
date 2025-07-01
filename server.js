const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// --- Serve Static Frontend Files ---
// This serves all files in the current directory (e.g., index.html, style.css)
app.use(express.static(path.join(__dirname)));

// --- Dynamic Port & Database Path ---
const PORT = process.env.PORT || 3000;
// Use a persistent storage path provided by the hosting service
const DB_PATH = process.env.RENDER ? '/var/data/database.db' : './database.db';

let db;

// --- Database Setup ---
async function initializeDatabase() {
    db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            order_details TEXT,
            total_price REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
    `);
    console.log('Database initialized successfully.');
}

// --- API Endpoints (No changes needed here) ---

// User Registration
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: '請提供使用者名稱和密碼' });
    }
    try {
        const existingUser = await db.get('SELECT * FROM users WHERE username = ?', username);
        if (existingUser) {
            return res.status(409).json({ message: '此使用者名稱已被註冊' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.run('INSERT INTO users (username, password) VALUES (?, ?)', username, hashedPassword);
        res.status(201).json({ message: '註冊成功', userId: result.lastID });
    } catch (error) {
        res.status(500).json({ message: '伺服器錯誤', error: error.message });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: '請提供使用者名稱和密碼' });
    }
    try {
        const user = await db.get('SELECT * FROM users WHERE username = ?', username);
        if (!user) {
            return res.status(401).json({ message: '使用者名稱或密碼錯誤' });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: '使用者名稱或密碼錯誤' });
        }
        res.status(200).json({ message: '登入成功', userId: user.id, username: user.username });
    } catch (error) {
        res.status(500).json({ message: '伺服器錯誤', error: error.message });
    }
});

// Submit Order
app.post('/api/orders', async (req, res) => {
    const { userId, cart, totalPrice } = req.body;
    if (!userId || !cart || totalPrice == null) {
        return res.status(400).json({ message: '缺少訂單資訊' });
    }
    try {
        const orderDetails = JSON.stringify(cart);
        await db.run('INSERT INTO orders (user_id, order_details, total_price) VALUES (?, ?, ?)', userId, orderDetails, totalPrice);
        res.status(201).json({ message: '訂單已成功儲存' });
    } catch (error) {
        res.status(500).json({ message: '伺服器錯誤', error: error.message });
    }
});

// Get Order History
app.get('/api/orders/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const orders = await db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY timestamp DESC', userId);
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: '伺服器錯誤', error: error.message });
    }
});

// --- Server Start ---
app.listen(PORT, async () => {
    try {
        await initializeDatabase();
        console.log(`伺服器正在 http://localhost:${PORT} 上運行`);
    } catch (error) {
        console.error("Failed to initialize database:", error);
        process.exit(1);
    }
});