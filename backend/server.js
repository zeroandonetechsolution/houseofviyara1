require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 1. CLOUDINARY CONFIGURATION (Image DB)
// ==========================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ecommerce_products',
    allowedFormats: ['jpeg', 'png', 'jpg', 'webp'],
  },
});
const upload = multer({ storage: storage });

// ==========================================
// 2. SUPABASE CONFIGURATION (Database)
// ==========================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

let supabase;
if (supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_project_url') {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase Client Initialized');
} else {
    console.warn('⚠️ Supabase credentials missing. Please add them to your .env file.');
}

// ==========================================
// 3. SOCKET.IO (Real-time Live Tracking)
// ==========================================
io.on('connection', (socket) => {
    console.log('🔗 A user connected:', socket.id);

    // Clients join a room named after their orderId
    socket.on('join-order-tracking', (orderId) => {
        socket.join(orderId);
        console.log(`📦 User joined tracking room for order: ${orderId}`);
    });

    socket.on('disconnect', () => {
        console.log('🔌 User disconnected:', socket.id);
    });
});

// ==========================================
// 4. API ROUTES
// ==========================================

// ----- ORDER ROUTES (Including live updates) -----
app.get('/api/orders/:id', async (req, res) => {
    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select('*')
            .eq('order_id', req.params.id)
            .single();

        if (error || !order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Ensure frontend compatibility (frontend uses orderId)
        order.orderId = order.order_id;
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    const { id, customer_name, email, total, items } = req.body;
    try {
        const { data, error } = await supabase
            .from('orders')
            .insert([
                {
                    order_id: id,
                    customer_name,
                    email,
                    total,
                    items: JSON.stringify(items), // Storing items as JSON string, or use JSONB column in Supabase
                    status: 'Processing'
                }
            ])
            .select();

        if (error) throw error;
        res.status(201).json({ id, status: 'Processing' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Route: Update order status & Emit Real-Time Socket Event
app.post('/api/admin/update-order', async (req, res) => {
    const { id, status } = req.body;
    try {
        const { data, error } = await supabase
            .from('orders')
            .update({ status: status })
            .eq('order_id', id)
            .select();
        
        if (error || !data || data.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // 🔥 Emit real-time update to the specific order's tracking room
        io.to(id).emit('order-status-update', { id, status });
        
        res.json({ success: true, id, status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----- PRODUCT ROUTES (Cloudinary Image Upload) -----
app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const { name, price, description, category } = req.body;
        // 'req.file.path' will contain the Cloudinary URL
        const imageUrl = req.file ? req.file.path : null;

        const { data, error } = await supabase
            .from('products')
            .insert([
                {
                    name,
                    price,
                    description,
                    category,
                    image_url: imageUrl
                }
            ])
            .select();

        if (error) throw error;
        res.status(201).json({ success: true, product: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 5. SERVER STARTUP
// ==========================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
