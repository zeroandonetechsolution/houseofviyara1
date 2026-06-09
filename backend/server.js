const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'lifestyle-secret-2024';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Database setup
let db;
(async () => {
    db = await open({
        filename: path.join(__dirname, 'database.db'),
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            phone TEXT,
            name TEXT,
            google_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            price REAL,
            category TEXT,
            image_url TEXT,
            stock INTEGER DEFAULT 10,
            rating REAL DEFAULT 4.5,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            user_id INTEGER,
            items TEXT,
            total_amount REAL,
            status TEXT DEFAULT 'Pending',
            shipping_address TEXT,
            txnid TEXT,
            payment_status TEXT DEFAULT 'Unpaid',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS otps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            otp TEXT,
            expires_at DATETIME
        );
    `);

    // Seed initial products if empty
    const productCount = await db.get('SELECT COUNT(*) as count FROM products');
    if (productCount.count === 0) {
        const initialProducts = [
            // Perfumes
            { name: 'Oud Wood', description: 'Rare. Exotic. Distinctive.', price: 4500, category: 'perfumes', image_url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400' },
            { name: 'Santal 33', description: 'Capture the spirit of the American West.', price: 5200, category: 'perfumes', image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400' },
            { name: 'Black Orchid', description: 'Luxurious and sensual fragrance of rich, dark accords.', price: 3800, category: 'perfumes', image_url: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400' },
            
            // Slippers
            { name: 'Velvet Slippers', description: 'Handcrafted velvet slippers for ultimate luxury.', price: 1800, category: 'slippers', image_url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400' },
            { name: 'Leather Mules', description: 'Premium Italian leather mules.', price: 2400, category: 'slippers', image_url: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=400' },
            { name: 'Silk Slides', description: 'Pure mulberry silk slides for home elegance.', price: 1500, category: 'slippers', image_url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400' },
            
            // Accessories
            { name: 'Silk Scarf', description: 'Hand-painted 100% silk scarf.', price: 1200, category: 'accessories', image_url: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400' },
            { name: 'Leather Wallet', description: 'Slim bifold wallet in genuine calfskin.', price: 2100, category: 'accessories', image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400' }
        ];
        for (const p of initialProducts) {
            await db.run('INSERT INTO products (name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?)', 
                [p.name, p.description, p.price, p.category, p.image_url]);
        }
    }
})();

// Auth Routes
app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        
        let user = await db.get('SELECT * FROM users WHERE email = ?', [payload.email]);
        if (!user) {
            const result = await db.run('INSERT INTO users (email, name, google_id) VALUES (?, ?, ?)', 
                [payload.email, payload.name, payload.sub]);
            user = { id: result.lastID, email: payload.email, name: payload.name };
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
        res.json({ token, user });
    } catch (error) {
        res.status(400).json({ error: 'Google Auth failed' });
    }
});

app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 mins

    await db.run('DELETE FROM otps WHERE email = ?', [email]);
    await db.run('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)', [email, otp, expiresAt]);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    try {
        await transporter.sendMail({
            from: `"Life Style" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Your Life Style Login OTP",
            text: `Your OTP is: ${otp}. Valid for 10 minutes.`
        });
        res.json({ message: 'OTP sent' });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const record = await db.get('SELECT * FROM otps WHERE email = ? AND otp = ?', [email, otp]);

    if (record && new Date(record.expires_at) > new Date()) {
        let user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            const result = await db.run('INSERT INTO users (email) VALUES (?)', [email]);
            user = { id: result.lastID, email };
        }
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
        res.json({ token, user });
    } else {
        res.status(400).json({ error: 'Invalid or expired OTP' });
    }
});

// Product Routes
app.get('/api/products', async (req, res) => {
    const { category } = req.query;
    let products;
    if (category) {
        products = await db.all('SELECT * FROM products WHERE category = ?', [category]);
    } else {
        products = await db.all('SELECT * FROM products');
    }
    res.json(products);
});

// Payment Routes (PayU)
app.post('/api/payments/payu-hash', (req, res) => {
    const { txnid, amount, productinfo, firstname, email } = req.body;
    const key = process.env.PAYU_MERCHANT_KEY;
    const salt = process.env.PAYU_SALT;
    
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');
    res.json({ hash });
});

app.post('/api/payments/verify', async (req, res) => {
    const { txnid, status, hash, amount, productinfo, firstname, email } = req.body;
    // Verification logic here (re-calculating hash with reverse salt)
    // For test mode, we just check status
    if (status === 'success') {
        await db.run('UPDATE orders SET payment_status = "Paid", status = "Confirmed" WHERE txnid = ?', [txnid]);
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Order Routes
app.post('/api/orders', async (req, res) => {
    const { user_id, items, total_amount, shipping_address, txnid } = req.body;
    const orderId = 'LS-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    await db.run(`INSERT INTO orders (id, user_id, items, total_amount, shipping_address, txnid) 
                  VALUES (?, ?, ?, ?, ?, ?)`, 
                  [orderId, user_id, JSON.stringify(items), total_amount, JSON.stringify(shipping_address), txnid]);
    
    res.json({ orderId });
});

app.get('/api/orders/:id', async (req, res) => {
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (order) {
        order.items = JSON.parse(order.items);
        order.shipping_address = JSON.parse(order.shipping_address);
        res.json(order);
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

// Socket.io for Real-time tracking
io.on('connection', (socket) => {
    socket.on('join-order', (orderId) => {
        socket.join(orderId);
        console.log(`User joined order room: ${orderId}`);
    });
});

// Admin Route to update order status
app.post('/api/admin/update-order', async (req, res) => {
    const { orderId, status } = req.body;
    await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    io.to(orderId).emit('status-update', { status });
    res.json({ success: true });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
