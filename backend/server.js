const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
let compression;
try { compression = require('compression'); } catch(e) { compression = null; }

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Razorpay — gracefully skip if keys are missing
let razorpay = null;
try {
    const Razorpay = require('razorpay');
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        console.log('Razorpay initialized.');
    } else {
        console.warn('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — payment gateway disabled.');
    }
} catch (e) {
    console.warn('Razorpay module error:', e.message);
}

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'lifestyle-secret-2024';
const PAYU_KEY = process.env.PAYU_MERCHANT_KEY || '';
const PAYU_SALT = process.env.PAYU_SALT || '';
const PAYU_URL = process.env.PAYU_ENV === 'production' ? 'https://secure.payu.in/_payment' : 'https://test.payu.in/_payment';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
    storage: multer.diskStorage({
        destination: UPLOAD_DIR,
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            cb(null, `img-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
        }
    })
});
app.use('/uploads', express.static(UPLOAD_DIR));

// Simple request logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Add compression for faster transfers (optional)
if (compression) app.use(compression());

// Static files with aggressive caching for assets
app.use(express.static(path.join(__dirname, '..'), {
    maxAge: '7d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        } else if (filePath.match(/\.(js|css|webp|jpg|png|svg|woff2)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        }
    }
}));

// ─────────────────────────────────────────────
// DATABASE SETUP
// ─────────────────────────────────────────────
let db;
(async () => {
    db = await open({
        filename: path.join(__dirname, 'database.db'),
        driver: sqlite3.Database
    });

    // Core tables
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
            offer_price REAL,
            category TEXT,
            image_url TEXT,
            stock INTEGER DEFAULT 10,
            rating REAL DEFAULT 4.5,
            is_trending INTEGER DEFAULT 0,
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
            payu_response TEXT,
            payment_gateway TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS otps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            otp TEXT,
            expires_at DATETIME
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            icon TEXT DEFAULT 'fas fa-tag',
            banner_image TEXT,
            display_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS banners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            subtitle TEXT,
            image_url TEXT NOT NULL,
            cta_text TEXT DEFAULT 'Shop Now',
            cta_link TEXT DEFAULT 'collections.html',
            is_active INTEGER DEFAULT 1,
            display_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Migrations — add columns that may not exist in older databases
    const migrations = [
        'ALTER TABLE products ADD COLUMN offer_price REAL',
        'ALTER TABLE products ADD COLUMN is_trending INTEGER DEFAULT 0',
        'ALTER TABLE orders ADD COLUMN payu_response TEXT',
        'ALTER TABLE orders ADD COLUMN payment_gateway TEXT'
    ];
    for (const sql of migrations) {
        try { await db.exec(sql); } catch (e) { /* Column already exists */ }
    }

    // ── Reset if old perfume data detected ──
    const oldProductCheck = await db.get("SELECT COUNT(*) as count FROM products WHERE name = 'Oud Wood'");
    if (oldProductCheck && oldProductCheck.count > 0) {
        console.log("Old seed detected. Clearing products to seed fresh data...");
        await db.run("DELETE FROM products");
        await db.run("DELETE FROM sqlite_sequence WHERE name='products'");
    }

    // ── Seed products if empty ──
    const productCount = await db.get('SELECT COUNT(*) as count FROM products');
    if (productCount.count === 0) {
        const initialProducts = [
            // SAREE
            { name: 'Banarasi Silk Saree', description: 'Elegant gold zari border with premium silk fabric.', price: 4500, category: 'saree', image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80', is_trending: 1 },
            { name: 'Kanjeevaram Saree', description: 'Pure mulberry silk with traditional temple patterns.', price: 6200, category: 'saree', image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80', is_trending: 0 },
            { name: 'Floral Organza Saree', description: 'Lightweight organza saree with delicate floral print.', price: 2800, category: 'saree', image_url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&q=80', is_trending: 0 },
            { name: 'Georgette Designer Saree', description: 'Glamorous saree with sequin work, perfect for cocktails.', price: 3500, category: 'saree', image_url: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=800&q=80', is_trending: 1 },
            { name: 'Cotton Handloom Saree', description: 'Comfortable and breathable handwoven cotton saree.', price: 1999, category: 'saree', image_url: 'https://images.unsplash.com/photo-1621184455862-c163dfb30e0f?w=800&q=80', is_trending: 0 },
            // KURTIS
            { name: 'Chikankari Cotton Kurti', description: 'Handcrafted Lucknowi chikankari embroidery on soft cotton.', price: 1800, category: 'kurtis', image_url: 'https://images.unsplash.com/photo-1608748010899-18f300247112?w=800&q=80', is_trending: 1 },
            { name: 'Floral Anarkali Kurta', description: 'Flowy flared silhouette with digital floral print details.', price: 2499, category: 'kurtis', image_url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=800&q=80', is_trending: 0 },
            { name: 'A-Line Rayon Kurti', description: 'Comfortable straight-cut daily wear rayon kurti.', price: 1200, category: 'kurtis', image_url: 'https://images.unsplash.com/photo-1609357605199-0d12e9b1cb7a?w=800&q=80', is_trending: 0 },
            { name: 'Embroidered Silk Kurta', description: 'Festive wear silk kurta with detailed hand-embroidery.', price: 3200, category: 'kurtis', image_url: 'https://images.unsplash.com/photo-1609357605177-f23a07aa1b67?w=800&q=80', is_trending: 0 },
            { name: 'Pastel Georgette Kurti', description: 'Elegant long kurti with bell sleeves and side slit.', price: 1600, category: 'kurtis', image_url: 'https://images.unsplash.com/photo-1631857455684-a54a2f03665f?w=800&q=80', is_trending: 1 },
            // ETHNIC WEARS
            { name: 'Velvet Lehenga Choli', description: 'Heavy embroidered velvet lehenga set for bridal wear.', price: 8900, category: 'ethnic', image_url: 'https://images.unsplash.com/photo-1610030470200-a616238b6d49?w=800&q=80', is_trending: 1 },
            { name: 'Anarkali Suit Set', description: 'Traditional 3-piece georgette anarkali with net dupatta.', price: 4200, category: 'ethnic', image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80', is_trending: 0 },
            { name: 'Sharara Suit Set', description: 'Trendy sharara bottom with short kurti and matching dupatta.', price: 3800, category: 'ethnic', image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80', is_trending: 0 },
            { name: 'Palazzo Suit Set', description: 'Comfortable straight kurta with wide-leg printed palazzos.', price: 2600, category: 'ethnic', image_url: 'https://images.unsplash.com/photo-1608748010899-18f300247112?w=800&q=80', is_trending: 0 },
            { name: 'Banarasi Brocade Suit', description: 'Rich Banarasi brocade fabric with elegant design and details.', price: 5500, category: 'ethnic', image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80', is_trending: 0 },
            // PARTY WEARS
            { name: 'Satin Evening Gown', description: 'Sleek and luxurious satin gown with cowl neck.', price: 7500, category: 'party', image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80', is_trending: 1 },
            { name: 'Sequin Bodycon Dress', description: 'Sparkling sequin party dress for clubbing and night events.', price: 4800, category: 'party', image_url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80', is_trending: 0 },
            { name: 'Off-Shoulder Velvet Dress', description: 'Classic luxury velvet dress with off-shoulder design.', price: 3900, category: 'party', image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', is_trending: 1 },
            { name: 'Chiffon Cocktail Dress', description: 'Flowy knee-length designer cocktail dress.', price: 3200, category: 'party', image_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80', is_trending: 0 },
            { name: 'Embroidered Party Gown', description: 'Floor-length net gown with gorgeous embellishments.', price: 6800, category: 'party', image_url: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&q=80', is_trending: 0 },
            // CASUAL WEARS
            { name: 'Linen Summer Dress', description: 'Lightweight breathable linen dress for sunny days.', price: 2200, category: 'casual', image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80', is_trending: 0 },
            { name: 'Denim Dungaree Set', description: 'Stylish classic blue denim dungarees with cotton inner.', price: 2600, category: 'casual', image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80', is_trending: 0 },
            { name: 'Oversized Cotton Tee', description: 'Casual everyday oversized tee made of organic cotton.', price: 999, category: 'casual', image_url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80', is_trending: 0 },
            { name: 'Floral Printed Jumpsuit', description: 'Trendy one-piece jumpsuit with comfortable fit.', price: 1800, category: 'casual', image_url: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=800&q=80', is_trending: 1 },
            { name: 'Cropped Knit Cardigan', description: 'Soft cozy knitted cardigan, perfect for layering.', price: 1500, category: 'casual', image_url: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&q=80', is_trending: 0 }
        ];
    console.log('Database ready.');
})();

// ─────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────
app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential, accessToken } = req.body;
        let payload = null;

        if (credential) {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            payload = ticket.getPayload();
        } else if (accessToken) {
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!userInfoResponse.ok) {
                throw new Error('Google userinfo request failed');
            }
            const userInfo = await userInfoResponse.json();
            payload = {
                email: userInfo.email,
                name: userInfo.name,
                sub: userInfo.sub
            };
        }

        if (!payload || !payload.email) {
            throw new Error('Invalid Google payload');
        }

        let user = await db.get('SELECT * FROM users WHERE email = ?', [payload.email]);
        if (!user) {
            const result = await db.run('INSERT INTO users (email, name, google_id) VALUES (?, ?, ?)',
                [payload.email, payload.name, payload.sub]);
            user = { id: result.lastID, email: payload.email, name: payload.name };
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
        res.json({ token, user });
    } catch (error) {
        console.error('Google auth failed:', error);
        res.status(400).json({ error: 'Google Auth failed' });
    }
});

app.get('/api/auth/config', (req, res) => {
    res.json({
        googleClientId: process.env.GOOGLE_CLIENT_ID || ''
    });
});

app.get('/api/auth/status', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
        return res.status(401).json({ authenticated: false });
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = await db.get('SELECT id, email, name FROM users WHERE id = ?', [payload.id]);
        return res.json({ authenticated: true, user: user || null });
    } catch (error) {
        return res.status(401).json({ authenticated: false });
    }
});

app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000);

    await db.run('DELETE FROM otps WHERE email = ?', [email]);
    await db.run('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)', [email, otp, expiresAt]);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    try {
        await transporter.sendMail({
            from: `"House Of Viyara" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Your House Of Viyara Login OTP",
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

// ─────────────────────────────────────────────
// PRODUCT ROUTES
// ─────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
    const { category, search, trending } = req.query;
    let query = 'SELECT * FROM products';
    let conditions = [];
    let params = [];

    if (category) { conditions.push('category = ?'); params.push(category); }
    if (search) { conditions.push('(name LIKE ? OR description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (trending === '1') { conditions.push('is_trending = 1'); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');

    try {
        const products = await db.all(query, params);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// ─────────────────────────────────────────────
// BANNER ROUTES (Public)
// ─────────────────────────────────────────────
app.get('/api/banners', async (req, res) => {
    try {
        const banners = await db.all('SELECT * FROM banners WHERE is_active = 1 ORDER BY display_order ASC');
        res.json(banners);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch banners' });
    }
});

// ─────────────────────────────────────────────
// CATEGORIES ROUTES (Public)
// ─────────────────────────────────────────────
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await db.all('SELECT * FROM categories ORDER BY display_order ASC');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

app.post('/api/admin/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url });
});

// ─────────────────────────────────────────────
// PAYMENT ROUTES
// ─────────────────────────────────────────────
function createPayuHash({ txnid, amount, productinfo, firstname, email, udf1 = '' }) {
    const hashString = [
        PAYU_KEY,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        udf1,
        '', '', '', '', '', '', '', '', '', '',
        PAYU_SALT
    ].join('|');
    return crypto.createHash('sha512').update(hashString).digest('hex');
}

app.post('/api/payments/payu/init', async (req, res) => {
    if (!PAYU_KEY || !PAYU_SALT) {
        return res.status(503).json({ error: 'PayU gateway not configured' });
    }

    const { orderId } = req.body;
    if (!orderId) {
        return res.status(400).json({ error: 'Missing orderId' });
    }

    const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const shipping = JSON.parse(order.shipping_address || '{}');
    const firstname = shipping.name || 'Guest';
    const email = shipping.email || 'guest@hov.com';
    const phone = shipping.phone || '9999999999';
    const txnid = order.txnid;
    const amount = Number(order.total_amount).toFixed(2);
    const productinfo = `House Of Viyara Order ${orderId}`;
    const hash = createPayuHash({ txnid, amount, productinfo, firstname, email, udf1: orderId });

    const params = {
        key: PAYU_KEY,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone,
        surl: `${req.protocol}://${req.get('host')}/payu/response`,
        furl: `${req.protocol}://${req.get('host')}/payu/response`,
        service_provider: 'payu_paisa',
        udf1: orderId,
        hash
    };

    res.json({ action: PAYU_URL, params });
});

app.post('/payu/response', async (req, res) => {
    const payload = req.body || {};
    const status = payload.status || '';
    const orderId = payload.udf1 || '';
    const txnid = payload.txnid || '';
    const responseHash = payload.hash || '';

    const hashString = [
        PAYU_SALT,
        status,
        payload.udf10 || '',
        payload.udf9 || '',
        payload.udf8 || '',
        payload.udf7 || '',
        payload.udf6 || '',
        payload.udf5 || '',
        payload.udf4 || '',
        payload.udf3 || '',
        payload.udf2 || '',
        payload.udf1 || '',
        payload.email || '',
        payload.firstname || '',
        payload.productinfo || '',
        payload.amount || '',
        payload.txnid || '',
        payload.key || ''
    ].join('|');
    const expectedHash = crypto.createHash('sha512').update(hashString).digest('hex');

    const order = await db.get('SELECT * FROM orders WHERE id = ? OR txnid = ?', [orderId, txnid]);
    const orderIdentifier = order ? order.id : orderId || txnid;

    if (!order) {
        console.warn('PayU response received for unknown order', orderId, txnid);
    }

    if (responseHash !== expectedHash) {
        console.error('PayU hash mismatch', { responseHash, expectedHash, payload });
        if (order) {
            await db.run('UPDATE orders SET payment_status = ?, status = ?, payu_response = ? WHERE id = ?', ['Failed', 'Pending', JSON.stringify(payload), order.id]);
        }
        return res.send(`<!doctype html><html><body><p>Verification failed. Redirecting...</p><script>window.location='${req.protocol}://${req.get('host')}/index.html?payment=failed&txnid=${encodeURIComponent(txnid)}'</script></body></html>`);
    }

    const paymentStatus = status === 'success' ? 'Paid' : 'Failed';
    const orderStatus = status === 'success' ? 'Confirmed' : 'Pending';
    if (order) {
        await db.run('UPDATE orders SET payment_status = ?, status = ?, payu_response = ? WHERE id = ?', [paymentStatus, orderStatus, JSON.stringify(payload), order.id]);
    }

    const redirectUrl = `${req.protocol}://${req.get('host')}/index.html?payment=${status === 'success' ? 'success' : 'failed'}&txnid=${encodeURIComponent(txnid)}`;
    res.send(`<!doctype html><html><body><p>Redirecting to storefront...</p><script>window.location='${redirectUrl}'</script></body></html>`);
});

// ─────────────────────────────────────────────
// ORDER ROUTES
// ─────────────────────────────────────────────
app.get('/api/orders/txnid/:txnid', async (req, res) => {
    const order = await db.get('SELECT * FROM orders WHERE txnid = ?', [req.params.txnid]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.items = JSON.parse(order.items || '[]');
    order.shipping_address = JSON.parse(order.shipping_address || '{}');
    res.json(order);
});
app.post('/api/orders', async (req, res) => {
    const { user_id, items, total_amount, shipping_address, txnid, payment_gateway } = req.body;
    const orderId = 'HOV-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    await db.run(`INSERT INTO orders (id, user_id, items, total_amount, shipping_address, txnid, payment_gateway) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, user_id, JSON.stringify(items), total_amount, JSON.stringify(shipping_address), txnid, payment_gateway || 'payu']);

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

// Socket.io for real-time tracking
io.on('connection', (socket) => {
    socket.on('join-order', (orderId) => {
        socket.join(orderId);
    });
});

// ─────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────

// ── Stats ──
app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalSales = await db.get('SELECT SUM(total_amount) as total FROM orders WHERE payment_status = "Paid"');
        const totalOrders = await db.get('SELECT COUNT(*) as count FROM orders');
        const pendingOrders = await db.get('SELECT COUNT(*) as count FROM orders WHERE status = "Pending"');
        const totalProducts = await db.get('SELECT COUNT(*) as count FROM products');
        const trendingProducts = await db.get('SELECT COUNT(*) as count FROM products WHERE is_trending = 1');

        res.json({
            totalSales: totalSales.total || 0,
            totalOrders: totalOrders.count || 0,
            pendingOrders: pendingOrders.count || 0,
            totalProducts: totalProducts.count || 0,
            trendingProducts: trendingProducts.count || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ── Orders ──
app.get('/api/admin/orders', async (req, res) => {
    try {
        const orders = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
        const parsedOrders = orders.map(order => ({
            ...order,
            items: JSON.parse(order.items || '[]'),
            shipping_address: JSON.parse(order.shipping_address || '{}')
        }));
        res.json(parsedOrders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.post('/api/admin/update-order', async (req, res) => {
    const { orderId, status } = req.body;
    await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    io.to(orderId).emit('status-update', { status });
    res.json({ success: true });
});

// ── Products ──
app.get('/api/admin/products', async (req, res) => {
    try {
        const products = await db.all('SELECT * FROM products ORDER BY created_at DESC');
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.post('/api/admin/products', async (req, res) => {
    const { name, description, price, offer_price, category, image_url, is_trending } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO products (name, description, price, offer_price, category, image_url, is_trending) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, description, price, offer_price || price, category, image_url, is_trending ? 1 : 0]
        );
        res.json({ id: result.lastID, success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add product' });
    }
});

app.put('/api/admin/products/:id', async (req, res) => {
    const { name, description, price, offer_price, category, image_url, is_trending } = req.body;
    try {
        await db.run(
            'UPDATE products SET name = ?, description = ?, price = ?, offer_price = ?, category = ?, image_url = ?, is_trending = ? WHERE id = ?',
            [name, description, price, offer_price || price, category, image_url, is_trending ? 1 : 0, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});

app.patch('/api/admin/products/:id/trending', async (req, res) => {
    const { is_trending } = req.body;
    try {
        await db.run('UPDATE products SET is_trending = ? WHERE id = ?', [is_trending ? 1 : 0, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update trending status' });
    }
});

app.delete('/api/admin/products/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// ── Categories ──
app.get('/api/admin/categories', async (req, res) => {
    try {
        const categories = await db.all('SELECT * FROM categories ORDER BY display_order ASC');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

app.post('/api/admin/categories', async (req, res) => {
    const { name, slug, icon, banner_image, display_order } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO categories (name, slug, icon, banner_image, display_order) VALUES (?, ?, ?, ?, ?)',
            [name, slug, icon || 'fas fa-tag', banner_image || '', display_order || 0]
        );
        res.json({ id: result.lastID, success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add category' });
    }
});

app.put('/api/admin/categories/:id', async (req, res) => {
    const { name, slug, icon, banner_image, display_order } = req.body;
    try {
        await db.run(
            'UPDATE categories SET name = ?, slug = ?, icon = ?, banner_image = ?, display_order = ? WHERE id = ?',
            [name, slug, icon || 'fas fa-tag', banner_image || '', display_order || 0, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update category' });
    }
});

app.delete('/api/admin/categories/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// ── Banners ──
app.get('/api/admin/banners', async (req, res) => {
    try {
        const banners = await db.all('SELECT * FROM banners ORDER BY display_order ASC');
        res.json(banners);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch banners' });
    }
});

app.post('/api/admin/banners', async (req, res) => {
    const { title, subtitle, image_url, cta_text, cta_link, is_active, display_order } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO banners (title, subtitle, image_url, cta_text, cta_link, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, subtitle, image_url, cta_text || 'Shop Now', cta_link || 'collections.html', is_active !== false ? 1 : 0, display_order || 0]
        );
        res.json({ id: result.lastID, success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add banner' });
    }
});

app.put('/api/admin/banners/:id', async (req, res) => {
    const { title, subtitle, image_url, cta_text, cta_link, is_active, display_order } = req.body;
    try {
        await db.run(
            'UPDATE banners SET title = ?, subtitle = ?, image_url = ?, cta_text = ?, cta_link = ?, is_active = ?, display_order = ? WHERE id = ?',
            [title, subtitle, image_url, cta_text || 'Shop Now', cta_link || 'collections.html', is_active ? 1 : 0, display_order || 0, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update banner' });
    }
});

app.delete('/api/admin/banners/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM banners WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete banner' });
    }
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
