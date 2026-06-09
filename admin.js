// Admin State
let adminToken = localStorage.getItem('lifestyle_admin_token') || null;
const API_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
    if (!adminToken) {
        showLogin();
    } else {
        showDashboard();
    }
});

function showLogin() {
    document.body.innerHTML = `
        <div class="admin-login-container" style="display: flex; align-items: center; justify-content: center; height: 100vh; background: var(--bg-color);">
            <div class="card" style="width: 400px; padding: 40px; border: 5px solid #000; background: #fff; box-shadow: 10px 10px 0px #000;">
                <h2 style="margin-bottom: 20px; font-size: 2rem;">ADMIN LOGIN</h2>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 800; margin-bottom: 5px;">USERNAME</label>
                    <input type="text" id="admin-user" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 10px;">
                </div>
                <div class="form-group" style="margin-bottom: 30px;">
                    <label style="display: block; font-weight: 800; margin-bottom: 5px;">PASSWORD</label>
                    <input type="password" id="admin-pass" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 10px;">
                </div>
                <button class="btn btn-primary" style="width: 100%; padding: 15px;" onclick="handleAdminLogin()">LOGIN</button>
            </div>
        </div>
    `;
}

function handleAdminLogin() {
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('admin-pass').value;

    // In a real app, this would be a server call.
    // For now, we use the env-like values (admin/lifestyle2024)
    if (user === 'admin' && pass === 'lifestyle2024') {
        adminToken = 'admin-secret-token';
        localStorage.setItem('lifestyle_admin_token', adminToken);
        showDashboard();
    } else {
        alert('Invalid credentials');
    }
}

async function showDashboard() {
    document.body.innerHTML = `
        <header class="header">
            <div class="header-container">
                <div class="logo"><h1>Life Style Admin</h1></div>
                <nav class="nav">
                    <ul class="nav-links">
                        <li><a href="#" onclick="loadOrders()">Orders</a></li>
                        <li><a href="#" onclick="loadProducts()">Products</a></li>
                        <li><a href="index.html">View Site</a></li>
                        <li><a href="#" onclick="logout()">Logout</a></li>
                    </ul>
                </nav>
            </div>
        </header>
        <main style="padding: 40px;">
            <div id="admin-content">
                <div class="section-header"><h2>DASHBOARD</h2></div>
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px;">
                    <div class="card" style="padding: 20px; border: 4px solid #000; background: var(--accent-blue);">
                        <h3>TOTAL SALES</h3>
                        <p id="stat-sales" style="font-size: 2rem; font-weight: 900;">₹0</p>
                    </div>
                    <div class="card" style="padding: 20px; border: 4px solid #000; background: var(--accent-yellow);">
                        <h3>TOTAL ORDERS</h3>
                        <p id="stat-orders" style="font-size: 2rem; font-weight: 900;">0</p>
                    </div>
                    <div class="card" style="padding: 20px; border: 4px solid #000; background: #fff;">
                        <h3>PENDING ORDERS</h3>
                        <p id="stat-pending" style="font-size: 2rem; font-weight: 900;">0</p>
                    </div>
                </div>
                <div id="dashboard-table"></div>
            </div>
        </main>
    `;
    loadStats();
}

async function loadStats() {
    // This is a placeholder. In a real app, you'd fetch this from the API.
    // For now, let's just load the orders to calculate.
    loadOrders();
}

async function loadOrders() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `<div class="section-header"><h2>ORDERS</h2></div><div id="orders-list">Loading...</div>`;
    
    // In a real app, you'd have an endpoint for this.
    // For now, let's assume we can fetch all orders.
    // We'll need to add a GET /api/admin/orders endpoint to server.js if not there.
    // Let's use the existing orders if we can.
}

async function loadProducts() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
        <div class="section-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h2>PRODUCTS</h2>
            <button class="btn btn-primary" onclick="showAddProduct()">ADD PRODUCT</button>
        </div>
        <div id="products-list" class="products-grid">Loading...</div>
    `;
    
    const res = await fetch(`${API_URL}/api/products`);
    const products = await res.json();
    
    document.getElementById('products-list').innerHTML = products.map(p => `
        <div class="product-card" style="border: 3px solid #000;">
            <img src="${p.image_url}" style="width: 100%; height: 200px; object-fit: cover;">
            <div style="padding: 15px;">
                <h4 style="font-weight: 900;">${p.name}</h4>
                <p>₹${p.price} | ${p.category}</p>
                <button class="btn btn-secondary" style="width: 100%; margin-top: 10px;" onclick="deleteProduct(${p.id})">DELETE</button>
            </div>
        </div>
    `).join('');
}

function logout() {
    localStorage.removeItem('lifestyle_admin_token');
    location.reload();
}
