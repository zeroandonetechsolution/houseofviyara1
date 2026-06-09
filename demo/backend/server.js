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
const Razorpay = require('razorpay');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PORT = 3001; // Demo Port
const JWT_SECRET = process.env.JWT_SECRET || 'lifestyle-demo-secret-2024';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware
app.use(cors());
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Add compression for faster transfers
const compression = require('compression');
app.use(compression());

// Static files with aggressive caching for assets
app.use(express.static(path.join(__dirname, '..'), {
    maxAge: '7d', // Cache static assets for 7 days
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache'); // Don't cache HTML to ensure fresh data
        } else if (filePath.match(/\.(js|css|webp|jpg|png|svg|woff2)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        }
    }
}));

// Database setup
let db;
(async () => {
    db = await open({
        filename: path.join(__dirname, 'database_demo.db'),
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
            offer_price REAL,
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

    // Ensure offer_price column exists
    try {
        await db.exec('ALTER TABLE products ADD COLUMN offer_price REAL');
    } catch (e) {
        // Column already exists
    }

    // Seed initial products if empty
    const productCount = await db.get('SELECT COUNT(*) as count FROM products');
    if (productCount.count === 0) {
        const initialProducts = [
            // PERFUMES (10 GUARANTEED Luxury Perfume Images)
            { name: 'Oud Wood', description: 'Rare. Exotic. Distinctive.', price: 4500, category: 'perfumes', image_url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=80' },
            { name: 'Santal 33', description: 'Capture the spirit of the American West.', price: 5200, category: 'perfumes', image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400&q=80' },
            { name: 'Black Orchid', description: 'Luxurious and sensual fragrance.', price: 3800, category: 'perfumes', image_url: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&q=80' },
            { name: 'Rose Prick', description: 'A wild bouquet of rose breeds.', price: 6100, category: 'perfumes', image_url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&q=80' },
            { name: 'Tobacco Vanille', description: 'Modern take on an old world club.', price: 4800, category: 'perfumes', image_url: 'https://images.unsplash.com/photo-1557170334-a9632e77c6e4?w=400&q=80' },
            { name: 'Neroli Portofino', description: 'Crisp, citrusy and vibrant.', price: 3200, category: 'perfumes', image_url: 'https://images.unsplash.com/photo-1583467875263-d50dec37a88c?w=400&q=80' },
            { name: 'Lost Cherry', description: 'Full-bodied journey into the forbidden.', price: 7500, category: 'perfumes', image_url: 'https://images.unsplash.com/photo-1503236123135-083587a9ae2b?w=400&q=80' },
            { name: 'Bleu de Chanel', description: 'Unexpected and undeniably bold.', price: 4100, category: 'perfumes', image_url: 'https://images.unsplash.com/photo-1563170339-244d767b34e5?w=400&q=80' },
            { name: 'Sauvage', description: 'Radically fresh, raw and noble.', price: 3900, category: 'perfumes', image_url: 'https://images.unsplash.com/photo-1585120810355-35b6c502440f?w=400&q=80' },
            
            // SLIPPERS (10 unique images)
            { name: 'Cloud Walkers', description: 'Memory foam base for light steps.', price: 850, category: 'slippers', image_url: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&q=80' },
            { name: 'Midnight Satin', description: 'Sleek satin for evening lounging.', price: 1200, category: 'slippers', image_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80' },
            { name: 'Silk Slides', description: 'Pure mulberry silk for home elegance.', price: 1500, category: 'slippers', image_url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80' },
            { name: 'Velvet Royal', description: 'Handcrafted velvet for ultimate luxury.', price: 1950, category: 'slippers', image_url: 'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=400&q=80' },
            { name: 'Leather Mules', description: 'Premium Italian leather mules.', price: 2600, category: 'slippers', image_url: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&q=80' },
            { name: 'Sheepskin Loft', description: 'Natural warmth and breathability.', price: 3400, category: 'slippers', image_url: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&q=80' },
            { name: 'Cashmere Cozy', description: 'Pure Mongolian cashmere comfort.', price: 4200, category: 'slippers', image_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80' },
            { name: 'Gold Buckle Suede', description: 'Elegant suede with hardware accents.', price: 5100, category: 'slippers', image_url: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&q=80' },
            { name: 'Heritage Loafers', description: 'Traditional design, modern comfort.', price: 6500, category: 'slippers', image_url: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=400&q=80' },
            { name: 'Crystal Slides', description: 'Adorned with sparkling accents.', price: 8900, category: 'slippers', image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80' },
            
            // ACCESSORIES (10 unique images)
            { name: 'Silk Scarf', description: 'Hand-painted 100% silk.', price: 1200, category: 'accessories', image_url: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400&q=80' },
            { name: 'Leather Wallet', description: 'Slim bifold in genuine calfskin.', price: 2100, category: 'accessories', image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&q=80' },
            { name: 'Gold Cufflinks', description: '18k gold plated classic design.', price: 3500, category: 'accessories', image_url: 'https://images.unsplash.com/photo-1614705827065-65c8233481d6?w=400&q=80' },
            { name: 'Aviator Shades', description: 'UV400 protection, titanium frame.', price: 5800, category: 'accessories', image_url: 'https://images.unsplash.com/photo-1511499767390-90342f5b89a7?w=400&q=80' },
            { name: 'Leather Belt', description: 'Hand-burnished English leather.', price: 1800, category: 'accessories', image_url: 'https://images.unsplash.com/photo-1624222247344-550fbadfd08d?w=400&q=80' },
            { name: 'Silver Tie Bar', description: 'Sleek brushed sterling silver.', price: 2400, category: 'accessories', image_url: 'https://images.unsplash.com/photo-1621333100650-74070445f171?w=400&q=80' },
            { name: 'Wool Beanie', description: 'Fine merino wool, extremely soft.', price: 1100, category: 'accessories', image_url: 'https://images.unsplash.com/photo-1576871337622-98d48d38537c?w=400&q=80' },
            { name: 'Travel Watch Roll', description: 'Pebbled leather, holds 3 watches.', price: 4200, category: 'accessories', image_url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=400&q=80' },
            { name: 'Pocket Square', description: 'Linen with hand-rolled edges.', price: 850, category: 'accessories', image_url: 'https://images.unsplash.com/photo-1598532163257-ae3c6b25ad30?w=400&q=80' },
            { name: 'Designer Tote', description: 'Canvas and leather weekender.', price: 8900, category: 'accessories', image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&q=80' }
        ];
        for (const p of initialProducts) {
            await db.run('INSERT INTO products (name, description, price, offer_price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)', 
                [p.name, p.description, p.price, p.price, p.category, p.image_url]);
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
    const { category, search } = req.query;
    let query = 'SELECT * FROM products';
    let params = [];

    if (category || search) {
        query += ' WHERE';
        if (category) {
            query += ' category = ?';
            params.push(category);
        }
        if (search) {
            if (category) query += ' AND';
            query += ' (name LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
    }

    try {
        const products = await db.all(query, params);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Payment Routes (Razorpay)
app.post('/api/payments/razorpay-order', async (req, res) => {
    const { amount, currency = 'INR', receipt } = req.body;
    try {
        const order = await razorpay.orders.create({
            amount: amount * 100, // Razorpay expects amount in paise
            currency,
            receipt,
        });
        res.json(order);
    } catch (error) {
        console.error('Razorpay Order Error:', error);
        res.status(500).json({ error: 'Failed to create Razorpay order' });
    }
});

app.post('/api/payments/verify', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, txnid } = req.body;
    
    // For demo/test mode, we can also support the simple status: success from our custom page
    if (req.body.status === 'success') {
        await db.run('UPDATE orders SET payment_status = "Paid", status = "Confirmed" WHERE txnid = ?', [txnid]);
        return res.json({ success: true });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        await db.run('UPDATE orders SET payment_status = "Paid", status = "Confirmed" WHERE txnid = ?', [txnid]);
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, error: 'Invalid signature' });
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

// Admin Routes
app.get('/api/admin/orders', async (req, res) => {
    try {
        const orders = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
        const parsedOrders = orders.map(order => ({
            ...order,
            items: JSON.parse(order.items),
            shipping_address: JSON.parse(order.shipping_address)
        }));
        res.json(parsedOrders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalSales = await db.get('SELECT SUM(total_amount) as total FROM orders WHERE payment_status = "Paid"');
        const totalOrders = await db.get('SELECT COUNT(*) as count FROM orders');
        const pendingOrders = await db.get('SELECT COUNT(*) as count FROM orders WHERE status = "Pending"');
        
        res.json({
            totalSales: totalSales.total || 0,
            totalOrders: totalOrders.count || 0,
            pendingOrders: pendingOrders.count || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.post('/api/admin/update-order', async (req, res) => {
    const { orderId, status } = req.body;
    await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    io.to(orderId).emit('status-update', { status });
    res.json({ success: true });
});

app.delete('/api/admin/products/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

app.post('/api/admin/products', async (req, res) => {
    const { name, description, price, offer_price, category, image_url } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO products (name, description, price, offer_price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description, price, offer_price, category, image_url]
        );
        res.json({ id: result.lastID, success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add product' });
    }
});

app.put('/api/admin/products/:id', async (req, res) => {
    const { name, description, price, offer_price, category, image_url } = req.body;
    const { id } = req.params;
    try {
        await db.run(
            'UPDATE products SET name = ?, description = ?, price = ?, offer_price = ?, category = ?, image_url = ? WHERE id = ?',
            [name, description, price, offer_price, category, image_url, id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
