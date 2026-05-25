require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// Razorpay Instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret'
});

// Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

let db;
const JWT_SECRET = process.env.JWT_SECRET || 'lumina-secret-key';

// Mock OTP Storage (In production, use Redis or a DB table with expiry)
const otpStore = new Map();

// Initialize Database
async function initDb() {
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    // Users table for Google/OTP login
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            name TEXT,
            auth_type TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            customer_name TEXT,
            email TEXT,
            total REAL,
            status TEXT DEFAULT 'Processing',
            items TEXT,
            payment_status TEXT DEFAULT 'Pending',
            razorpay_order_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            brand TEXT,
            price REAL NOT NULL,
            original_price REAL,
            category TEXT,
            image_url TEXT,
            description TEXT,
            is_new BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log('Database initialized');
}

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-order-tracking', (orderId) => {
        socket.join(orderId);
        console.log(`User joined tracking for order: ${orderId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// --- Auth Routes ---

// 1. Google Login
app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        let user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            await db.run('INSERT INTO users (email, name, auth_type) VALUES (?, ?, ?)', [email, name, 'google']);
            user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        }

        const sessionToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token: sessionToken, user });
    } catch (err) {
        res.status(401).json({ error: 'Invalid Google token' });
    }
});

// 2. Generate OTP
app.post('/api/auth/otp/generate', async (req, res) => {
    const { email, phone } = req.body;
    const target = email || phone;
    if (!target) return res.status(400).json({ error: 'Email or phone required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(target, { otp, expires: Date.now() + 300000 }); // 5 min expiry

    console.log(`[MOCK OTP] Sent to ${target}: ${otp}`);

    // In a real app, send via Nodemailer or Twilio here
    res.json({ success: true, message: 'OTP sent successfully' });
});

// 3. Verify OTP
app.post('/api/auth/otp/verify', async (req, res) => {
    const { email, phone, otp } = req.body;
    const target = email || phone;
    const stored = otpStore.get(target);

    if (stored && stored.otp === otp && stored.expires > Date.now()) {
        otpStore.delete(target);
        
        let user = await db.get('SELECT * FROM users WHERE email = ? OR phone = ?', [email, phone]);
        if (!user) {
            await db.run('INSERT INTO users (email, phone, auth_type) VALUES (?, ?, ?)', [email, phone, 'otp']);
            user = await db.get('SELECT * FROM users WHERE email = ? OR phone = ?', [email, phone]);
        }

        const sessionToken = jwt.sign({ userId: user.id, target }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token: sessionToken, user });
    } else {
        res.status(400).json({ error: 'Invalid or expired OTP' });
    }
});

// --- Payment Routes (Razorpay) ---

app.post('/api/payments/create-order', async (req, res) => {
    const { amount, currency = 'INR', receipt } = req.body;
    try {
        const options = {
            amount: amount * 100, // amount in smallest currency unit
            currency,
            receipt,
        };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/payments/verify', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_details } = req.body;
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'mock_secret')
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        // Signature verified, save order to DB
        const { id, customer_name, email, total, items } = order_details;
        try {
            await db.run(
                'INSERT INTO orders (id, customer_name, email, total, items, payment_status, razorpay_order_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, customer_name, email, total, JSON.stringify(items), 'Paid', razorpay_order_id]
            );
            res.json({ success: true, message: 'Payment verified and order placed' });
        } catch (dbErr) {
            res.status(500).json({ error: dbErr.message });
        }
    } else {
        res.status(400).json({ error: 'Invalid payment signature' });
    }
});

// --- Product Routes ---
app.get('/api/products', async (req, res) => {
    try {
        const products = await db.all('SELECT * FROM products ORDER BY created_at DESC');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        let { name, brand, price, originalPrice, category, imageUrl, description, isNew } = req.body;
        
        // If a file was uploaded, use its path as the image URL
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const result = await db.run(
            'INSERT INTO products (name, brand, price, original_price, category, image_url, description, is_new) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, brand, price, originalPrice, category, imageUrl, description, isNew === 'true' || isNew === true ? 1 : 0]
        );
        res.status(201).json({ id: result.lastID, name, imageUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const { name, price, originalPrice, description } = req.body;
    try {
        await db.run(
            'UPDATE products SET name = ?, price = ?, original_price = ?, description = ? WHERE id = ?',
            [name, price, originalPrice, description, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Existing API Routes ---
app.get('/api/orders/all', async (req, res) => {
    try {
        const orders = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/orders/:id', async (req, res) => {
    try {
        const order = await db.get('SELECT * FROM orders WHERE id = ?', req.params.id);
        if (order) {
            order.items = JSON.parse(order.items);
            res.json(order);
        } else {
            res.status(404).json({ error: 'Order not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    const { id, customer_name, email, total, items } = req.body;
    try {
        await db.run(
            'INSERT INTO orders (id, customer_name, email, total, items) VALUES (?, ?, ?, ?, ?)',
            [id, customer_name, email, total, JSON.stringify(items)]
        );
        res.status(201).json({ id, status: 'Processing' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Route to update order status (Simulating real-time updates)
app.post('/api/admin/update-order', async (req, res) => {
    const { id, status } = req.body;
    try {
        await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
        
        // Notify all clients tracking this order
        io.to(id).emit('order-status-update', { id, status });
        
        res.json({ success: true, id, status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
initDb().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
