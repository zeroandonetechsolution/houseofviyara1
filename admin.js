// Admin State
let adminToken = localStorage.getItem('lifestyle_admin_token') || null;
// Determine API URL: Use current hostname but port 3001 if not already on it
const API_URL = window.location.port === '3001' ? '' : `${window.location.protocol}//${window.location.hostname}:3001`;

// Cache for optimized loading
const cache = {
    stats: null,
    orders: null,
    products: null,
    lastFetch: {
        stats: 0,
        orders: 0,
        products: 0
    }
};
const CACHE_DURATION = 30000; // 30 seconds

// Fetch with timeout helper
async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 8000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, { ...options, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(id);
    }
}

const adminPageStartTime = Date.now();
document.addEventListener('DOMContentLoaded', () => {
    if (!adminToken) {
        showLogin();
    } else {
        initAdminShell();
        showDashboard();
    }
    
    const preloader = document.getElementById('preloader');
    if (preloader) {
        const elapsed = Date.now() - adminPageStartTime;
        const remaining = Math.max(0, 5500 - elapsed);
        setTimeout(() => preloader.classList.add('fade-out'), remaining);
    }
});

function showPreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.classList.remove('fade-out');
}

function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('fade-out');
        }, 1000); // Shorter delay for tab transitions
    }
}

function initAdminShell() {
    document.body.innerHTML = `
        <header class="header" style="background: #fff; border-bottom: 4px solid #000; padding: 15px 40px; position: sticky; top: 0; z-index: 1000;">
            <div class="header-container" style="max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
                <div class="logo"><h1 style="font-weight: 900; background: #FFD100; padding: 5px 15px; border: 3px solid #000; box-shadow: 4px 4px 0px #000;">Life Style Admin</h1></div>
                <nav class="nav">
                    <ul class="nav-links" style="display: flex; gap: 30px; list-style: none;">
                        <li><a href="javascript:void(0)" onclick="showDashboard()" class="admin-nav-link" id="nav-dashboard">Dashboard</a></li>
                        <li><a href="javascript:void(0)" onclick="loadOrders()" class="admin-nav-link" id="nav-orders">Orders</a></li>
                        <li><a href="javascript:void(0)" onclick="loadProducts()" class="admin-nav-link" id="nav-products">Products</a></li>
                        <li><a href="index.html" style="text-decoration: none; color: #000; font-weight: 800; text-transform: uppercase;">View Site</a></li>
                        <li><a href="javascript:void(0)" onclick="logout()" style="text-decoration: none; color: #000; font-weight: 800; text-transform: uppercase;">Logout</a></li>
                    </ul>
                </nav>
            </div>
        </header>
        <main style="padding: 40px; max-width: 1400px; margin: 0 auto;">
            <div id="admin-content"></div>
        </main>
    `;
    
    // Add active state styles
    const style = document.createElement('style');
    style.textContent = `
        .admin-nav-link { text-decoration: none; color: #000; font-weight: 800; text-transform: uppercase; padding: 5px 10px; transition: all 0.2s; }
        .admin-nav-link:hover { background: #00E0FF; }
        .admin-nav-link.active { background: #FFD100; border: 2px solid #000; box-shadow: 2px 2px 0px #000; }
    `;
    document.head.appendChild(style);
}

function updateActiveNav(id) {
    document.querySelectorAll('.admin-nav-link').forEach(link => link.classList.remove('active'));
    const activeLink = document.getElementById(`nav-${id}`);
    if (activeLink) activeLink.classList.add('active');
}

function showLogin() {
    document.body.innerHTML = `
        <div class="admin-login-container" style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #f4f4f4;">
            <div class="card" style="width: 400px; max-width: 90%; padding: 40px; border: 5px solid #000; background: #fff; box-shadow: 10px 10px 0px #000;">
                <h2 style="margin-bottom: 20px; font-size: 2rem; font-weight: 900;">ADMIN LOGIN</h2>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 800; margin-bottom: 5px;">USERNAME</label>
                    <input type="text" id="admin-user" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 10px; font-weight: 700;">
                </div>
                <div class="form-group" style="margin-bottom: 30px;">
                    <label style="display: block; font-weight: 800; margin-bottom: 5px;">PASSWORD</label>
                    <input type="password" id="admin-pass" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 10px; font-weight: 700;">
                </div>
                <button class="btn btn-primary" style="width: 100%; padding: 15px; background: #FFD100; border: 3px solid #000; font-weight: 900; cursor: pointer;" onclick="handleAdminLogin()">LOGIN</button>
            </div>
        </div>
    `;
}

function handleAdminLogin() {
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('admin-pass').value;

    if (user === 'admin' && pass === 'admin') {
        adminToken = 'admin-secret-token';
        localStorage.setItem('lifestyle_admin_token', adminToken);
        initAdminShell();
        showDashboard();
    } else {
        alert('Invalid credentials');
    }
}

async function showDashboard() {
    showPreloader();
    updateActiveNav('dashboard');
    const content = document.getElementById('admin-content');
    content.innerHTML = `
        <div class="section-header" style="border-bottom: 4px solid #000; margin-bottom: 30px; padding-bottom: 10px;"><h2 style="font-size: 2.5rem; font-weight: 900;">DASHBOARD</h2></div>
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-bottom: 40px;">
            <div class="card" style="padding: 30px; border: 4px solid #000; background: #00E0FF; box-shadow: 8px 8px 0px #000;">
                <h3 style="font-weight: 900; margin-bottom: 10px;">TOTAL SALES</h3>
                <p id="stat-sales" style="font-size: 3rem; font-weight: 900;">₹...</p>
            </div>
            <div class="card" style="padding: 30px; border: 4px solid #000; background: #FFD100; box-shadow: 8px 8px 0px #000;">
                <h3 style="font-weight: 900; margin-bottom: 10px;">TOTAL ORDERS</h3>
                <p id="stat-orders" style="font-size: 3rem; font-weight: 900;">...</p>
            </div>
            <div class="card" style="padding: 30px; border: 4px solid #000; background: #fff; box-shadow: 8px 8px 0px #000;">
                <h3 style="font-weight: 900; margin-bottom: 10px;">PENDING ORDERS</h3>
                <p id="stat-pending" style="font-size: 3rem; font-weight: 900;">...</p>
            </div>
        </div>
        <div id="recent-orders-container">
            <h3 style="font-weight: 900; margin-bottom: 20px; font-size: 1.8rem;">RECENT ORDERS</h3>
            <div id="dashboard-table">Loading...</div>
        </div>
    `;
    await loadStats();
    hidePreloader();
}

async function loadStats() {
    try {
        const now = Date.now();
        let stats, orders;

        // Parallel fetching for optimization
        const fetchPromises = [];
        
        if (!cache.stats || (now - cache.lastFetch.stats > CACHE_DURATION)) {
            fetchPromises.push(fetchWithTimeout(`${API_URL}/api/admin/stats`).then(res => res.json()).then(data => {
                cache.stats = data;
                cache.lastFetch.stats = now;
                return data;
            }));
        } else {
            stats = cache.stats;
        }

        if (!cache.orders || (now - cache.lastFetch.orders > CACHE_DURATION)) {
            fetchPromises.push(fetchWithTimeout(`${API_URL}/api/admin/orders`).then(res => res.json()).then(data => {
                cache.orders = data;
                cache.lastFetch.orders = now;
                return data;
            }));
        } else {
            orders = cache.orders;
        }

        if (fetchPromises.length > 0) {
            const results = await Promise.all(fetchPromises);
            // Assign results based on what was fetched
            let resultIdx = 0;
            if (!stats) stats = results[resultIdx++];
            if (!orders) orders = results[resultIdx++];
        }
        
        document.getElementById('stat-sales').innerText = `₹${stats.totalSales || 0}`;
        document.getElementById('stat-orders').innerText = stats.totalOrders || 0;
        document.getElementById('stat-pending').innerText = stats.pendingOrders || 0;
        
        renderRecentOrders(orders);
    } catch (error) {
        console.error('Stats error:', error);
        if (document.getElementById('stat-sales')) {
            document.getElementById('stat-sales').innerText = 'Error';
            document.getElementById('stat-orders').innerText = 'Error';
            document.getElementById('stat-pending').innerText = 'Error';
        }
    }
}

function renderRecentOrders(orders) {
    const container = document.getElementById('dashboard-table');
    if (!container) return;

    const recentOrders = (orders || []).slice(0, 5);
    
    if (recentOrders.length === 0) {
        container.innerHTML = '<p style="font-weight: 800; padding: 20px; text-align: center;">No orders found.</p>';
        return;
    }
    
    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; border: 4px solid #000;">
            <thead style="background: #000; color: #fff;">
                <tr>
                    <th style="padding: 15px; text-align: left;">ORDER ID</th>
                    <th style="padding: 15px; text-align: left;">CUSTOMER</th>
                    <th style="padding: 15px; text-align: left;">AMOUNT</th>
                    <th style="padding: 15px; text-align: left;">STATUS</th>
                    <th style="padding: 15px; text-align: left;">DATE</th>
                </tr>
            </thead>
            <tbody>
                ${recentOrders.map(order => `
                    <tr style="border-bottom: 3px solid #000; background: #fff;">
                        <td style="padding: 15px; font-weight: 900;">${order.id}</td>
                        <td style="padding: 15px; font-weight: 700;">${order.shipping_address ? order.shipping_address.street : 'N/A'}</td>
                        <td style="padding: 15px; font-weight: 900;">₹${order.total_amount}</td>
                        <td style="padding: 15px;">
                            <span style="padding: 5px 10px; border: 2px solid #000; font-weight: 800; background: ${getStatusColor(order.status)}">${order.status}</span>
                        </td>
                        <td style="padding: 15px; font-weight: 700;">${new Date(order.created_at).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function loadRecentOrders() {
    // This function is now replaced by renderRecentOrders which is called from loadStats
    // but we keep the signature for compatibility if called elsewhere
    if (cache.orders) {
        renderRecentOrders(cache.orders);
    } else {
        const res = await fetchWithTimeout(`${API_URL}/api/admin/orders`);
        const orders = await res.json();
        cache.orders = orders;
        cache.lastFetch.orders = Date.now();
        renderRecentOrders(orders);
    }
}

function getStatusColor(status) {
    switch(status) {
        case 'Confirmed': return '#00FF94';
        case 'Pending': return '#FFD100';
        case 'Shipped': return '#00E0FF';
        case 'Delivered': return '#00FF94';
        case 'Cancelled': return '#FF007A';
        default: return '#eee';
    }
}

async function loadOrders() {
    showPreloader();
    updateActiveNav('orders');
    const content = document.getElementById('admin-content');
    content.innerHTML = `
        <div class="section-header" style="border-bottom: 4px solid #000; margin-bottom: 30px; padding-bottom: 10px;">
            <h2 style="font-size: 2.5rem; font-weight: 900;">ALL ORDERS</h2>
        </div>
        <div id="orders-list">Loading...</div>
    `;
    
    try {
        const now = Date.now();
        let orders;

        if (!cache.orders || (now - cache.lastFetch.orders > CACHE_DURATION)) {
            const res = await fetchWithTimeout(`${API_URL}/api/admin/orders`);
            if (!res.ok) throw new Error('Failed to fetch orders');
            orders = await res.json();
            cache.orders = orders;
            cache.lastFetch.orders = now;
        } else {
            orders = cache.orders;
        }
        
        const container = document.getElementById('orders-list');
        if (orders.length === 0) {
            container.innerHTML = '<p style="font-weight: 800; padding: 40px; text-align: center;">No orders found.</p>';
            hidePreloader();
            return;
        }
        
        container.innerHTML = orders.map(order => `
            <div class="card" style="border: 4px solid #000; background: #fff; padding: 25px; margin-bottom: 25px; box-shadow: 8px 8px 0px #000;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div>
                        <h4 style="font-size: 1.5rem; font-weight: 900;">ORDER ${order.id}</h4>
                        <p style="font-weight: 700; color: #666;">Placed on ${new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.8rem; font-weight: 900; color: #FF007A;">₹${order.total_amount}</div>
                        <div style="font-weight: 800; margin-top: 5px;">
                            Status: <select onchange="updateOrderStatus('${order.id}', this.value)" style="padding: 5px 10px; border: 3px solid #000; font-weight: 800; background: ${getStatusColor(order.status)}">
                                <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                                <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                                <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; border-top: 3 solid #000; padding-top: 20px;">
                    <div>
                        <h5 style="font-weight: 900; margin-bottom: 10px; text-transform: uppercase;">Items</h5>
                        ${(order.items || []).map(item => `
                            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                                <img src="${item.image}" style="width: 50px; height: 50px; border: 2px solid #000; object-fit: cover;" onerror="this.src='https://via.placeholder.com/50'">
                                <div>
                                    <div style="font-weight: 800;">${item.name}</div>
                                    <div style="font-weight: 700; color: #666;">₹${item.price} x ${item.quantity}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div>
                        <h5 style="font-weight: 900; margin-bottom: 10px; text-transform: uppercase;">Shipping Address</h5>
                        <p style="font-weight: 700;">${order.shipping_address ? order.shipping_address.street : 'N/A'}</p>
                        <p style="font-weight: 700;">${order.shipping_address ? `${order.shipping_address.city}, ${order.shipping_address.pin}` : ''}</p>
                        <p style="font-weight: 900; margin-top: 10px;">Payment: <span style="color: ${order.payment_status === 'Paid' ? '#00FF94' : '#FF007A'}">${order.payment_status}</span></p>
                        <p style="font-weight: 700; font-size: 0.8rem; color: #666;">TXN ID: ${order.txnid}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Load orders error:', error);
        document.getElementById('orders-list').innerHTML = `<p style="color: #FF007A; font-weight: 800; padding: 40px; text-align: center;">Error loading orders. Is the server running?</p>`;
    } finally {
        hidePreloader();
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const res = await fetchWithTimeout(`${API_URL}/api/admin/update-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, status })
        });
        if (res.ok) {
            // Invalidate orders cache
            cache.lastFetch.orders = 0;
            cache.lastFetch.stats = 0;
            alert(`Order ${orderId} status updated to ${status}`);
            loadOrders();
        }
    } catch (error) {
        alert('Failed to update status');
    }
}

async function loadProducts() {
    showPreloader();
    updateActiveNav('products');
    const content = document.getElementById('admin-content');
    content.innerHTML = `
        <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #000; margin-bottom: 30px; padding-bottom: 10px;">
            <h2 style="font-size: 2.5rem; font-weight: 900;">PRODUCTS</h2>
            <button class="btn btn-primary" onclick="showAddProduct()" style="background: #FFD100; border: 3px solid #000; padding: 10px 20px; font-weight: 900; cursor: pointer;">ADD PRODUCT</button>
        </div>
        <div id="products-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 30px;">Loading...</div>
    `;
    
    try {
        const now = Date.now();
        let products;

        if (!cache.products || (now - cache.lastFetch.products > CACHE_DURATION)) {
            const res = await fetchWithTimeout(`${API_URL}/api/products`);
            if (!res.ok) throw new Error('Failed to fetch products');
            products = await res.json();
            cache.products = products;
            cache.lastFetch.products = now;
        } else {
            products = cache.products;
        }
        
        const container = document.getElementById('products-list');
        if (products.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; font-weight: 800; padding: 40px; text-align: center;">No products found.</p>';
            hidePreloader();
            return;
        }

        container.innerHTML = products.map(p => {
            const optimizedImg = p.image_url.includes('unsplash.com') 
                ? p.image_url.replace(/w=\d+/, 'w=400').replace(/q=\d+/, 'q=60')
                : p.image_url;

            return `
            <div class="product-card" style="border: 4px solid #000; background: #fff; box-shadow: 8px 8px 0px #000; overflow: hidden; display: flex; flex-direction: column;">
                <img src="${optimizedImg}" style="width: 100%; height: 200px; object-fit: cover; border-bottom: 3px solid #000;" onerror="this.src='https://via.placeholder.com/200'" loading="lazy">
                <div style="padding: 20px; flex: 1;">
                    <h4 style="font-weight: 900; font-size: 1.2rem; margin-bottom: 5px;">${p.name}</h4>
                    <div style="display: flex; gap: 10px; align-items: baseline; margin-bottom: 5px;">
                        <span style="font-weight: 800; color: #FF007A; font-size: 1.1rem;">₹${p.offer_price || p.price}</span>
                        ${p.offer_price && p.offer_price < p.price ? `<span style="text-decoration: line-through; color: #666; font-size: 0.9rem;">₹${p.price}</span>` : ''}
                    </div>
                    <p style="font-weight: 700; color: #666; font-size: 0.9rem; text-transform: uppercase;">${p.category}</p>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn" style="flex: 1; background: #00E0FF; border: 3px solid #000; padding: 10px; font-weight: 900; cursor: pointer;" onclick="showEditProduct(${p.id})">EDIT</button>
                        <button class="btn" style="flex: 1; background: #FF007A; color: #fff; border: 3px solid #000; padding: 10px; font-weight: 900; cursor: pointer;" onclick="deleteProduct(${p.id})">DELETE</button>
                    </div>
                </div>
            </div>
        `}).join('');
    } catch (error) {
        console.error('Load products error:', error);
        document.getElementById('products-list').innerHTML = `<p style="grid-column: 1/-1; color: #FF007A; font-weight: 800; padding: 40px; text-align: center;">Error loading products. Is the server running?</p>`;
    } finally {
        hidePreloader();
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const res = await fetchWithTimeout(`${API_URL}/api/admin/products/${id}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            loadProducts();
        }
    } catch (error) {
        alert('Failed to delete product');
    }
}

async function showEditProduct(id) {
    try {
        const res = await fetchWithTimeout(`${API_URL}/api/products`);
        const products = await res.json();
        const product = products.find(p => p.id === id);
        
        if (!product) return alert('Product not found');

        const content = document.getElementById('admin-content');
        content.innerHTML = `
            <div class="section-header" style="border-bottom: 4px solid #000; margin-bottom: 30px; padding-bottom: 10px;">
                <h2 style="font-size: 2.5rem; font-weight: 900;">EDIT PRODUCT</h2>
            </div>
            <div class="card" style="max-width: 600px; border: 4px solid #000; background: #fff; padding: 40px; box-shadow: 8px 8px 0px #000;">
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 800; margin-bottom: 8px;">PRODUCT NAME</label>
                    <input type="text" id="p-name" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 12px; font-weight: 700;" value="${product.name}">
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 800; margin-bottom: 8px;">DESCRIPTION</label>
                    <textarea id="p-desc" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 12px; font-weight: 700; height: 100px;">${product.description}</textarea>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div class="form-group">
                        <label style="display: block; font-weight: 800; margin-bottom: 8px;">EXACT PRICE (₹)</label>
                        <input type="number" id="p-price" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 12px; font-weight: 700;" value="${product.price}">
                    </div>
                    <div class="form-group">
                        <label style="display: block; font-weight: 800; margin-bottom: 8px;">OFFER PRICE (₹)</label>
                        <input type="number" id="p-offer-price" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 12px; font-weight: 700;" value="${product.offer_price || product.price}">
                    </div>
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; font-weight: 800; margin-bottom: 8px;">CATEGORY</label>
                    <select id="p-cat" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 12px; font-weight: 700;">
                        <option value="perfumes" ${product.category === 'perfumes' ? 'selected' : ''}>Perfumes</option>
                        <option value="slippers" ${product.category === 'slippers' ? 'selected' : ''}>Slippers</option>
                        <option value="accessories" ${product.category === 'accessories' ? 'selected' : ''}>Accessories</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 30px;">
                    <label style="display: block; font-weight: 800; margin-bottom: 8px;">IMAGE URL</label>
                    <input type="text" id="p-img" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 12px; font-weight: 700;" value="${product.image_url}">
                </div>
                <div style="display: flex; gap: 15px;">
                    <button class="btn btn-primary" style="flex: 1; background: #00E0FF; border: 3px solid #000; padding: 15px; font-weight: 900; cursor: pointer;" onclick="handleEditProduct(${product.id})">UPDATE PRODUCT</button>
                    <button class="btn" style="flex: 1; background: #eee; border: 3px solid #000; padding: 15px; font-weight: 900; cursor: pointer;" onclick="loadProducts()">CANCEL</button>
                </div>
            </div>
        `;
    } catch (error) {
        alert('Failed to load product details');
    }
}

async function handleEditProduct(id) {
    const name = document.getElementById('p-name').value;
    const description = document.getElementById('p-desc').value;
    const price = document.getElementById('p-price').value;
    const offer_price = document.getElementById('p-offer-price').value || price;
    const category = document.getElementById('p-cat').value;
    const image_url = document.getElementById('p-img').value;
    
    if (!name || !price || !image_url) return alert('Please fill required fields');
    
    try {
        const res = await fetchWithTimeout(`${API_URL}/api/admin/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, price, offer_price, category, image_url })
        });
        if (res.ok) {
            alert('Product updated successfully');
            loadProducts();
        }
    } catch (error) {
        alert('Failed to update product');
    }
}

function showAddProduct() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
        <div class="section-header" style="border-bottom: 4px solid #000; margin-bottom: 30px; padding-bottom: 10px;">
            <h2 style="font-size: 2.5rem; font-weight: 900;">ADD NEW PRODUCT</h2>
        </div>
        <div class="card" style="max-width: 600px; border: 4px solid #000; background: #fff; padding: 40px; box-shadow: 8px 8px 0px #000;">
            <div class="form-group" style="margin-bottom: 20px;">
                <label style="display: block; font-weight: 800; margin-bottom: 8px;">PRODUCT NAME</label>
                <input type="text" id="p-name" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 12px; font-weight: 700;">
            </div>
            <div class="form-group" style="margin-bottom: 20px;">
                <label style="display: block; font-weight: 800; margin-bottom: 8px;">DESCRIPTION</label>
                <textarea id="p-desc" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 12px; font-weight: 700; height: 100px;"></textarea>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div class="form-group">
                    <label style="display: block; font-weight: 800; margin-bottom: 8px;">EXACT PRICE (₹)</label>
                    <input type="number" id="p-price" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 12px; font-weight: 700;">
                </div>
                <div class="form-group">
                    <label style="display: block; font-weight: 800; margin-bottom: 8px;">OFFER PRICE (₹)</label>
                    <input type="number" id="p-offer-price" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 12px; font-weight: 700;">
                </div>
            </div>
            <div class="form-group" style="margin-bottom: 20px;">
                <label style="display: block; font-weight: 800; margin-bottom: 8px;">CATEGORY</label>
                <select id="p-cat" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 12px; font-weight: 700;">
                    <option value="perfumes">Perfumes</option>
                    <option value="slippers">Slippers</option>
                    <option value="accessories">Accessories</option>
                </select>
            </div>
            <div class="form-group" style="margin-bottom: 30px;">
                <label style="display: block; font-weight: 800; margin-bottom: 8px;">IMAGE URL</label>
                <input type="text" id="p-img" class="brutal-input" style="width: 100%; border: 3px solid #000; padding: 12px; font-weight: 700;" placeholder="https://unsplash.com/...">
            </div>
            <div style="display: flex; gap: 15px;">
                <button class="btn btn-primary" style="flex: 1; background: #FFD100; border: 3px solid #000; padding: 15px; font-weight: 900; cursor: pointer;" onclick="handleAddProduct()">ADD PRODUCT</button>
                <button class="btn" style="flex: 1; background: #eee; border: 3px solid #000; padding: 15px; font-weight: 900; cursor: pointer;" onclick="loadProducts()">CANCEL</button>
            </div>
        </div>
    `;
}

async function handleAddProduct() {
    const name = document.getElementById('p-name').value;
    const description = document.getElementById('p-desc').value;
    const price = document.getElementById('p-price').value;
    const offer_price = document.getElementById('p-offer-price').value || price;
    const category = document.getElementById('p-cat').value;
    const image_url = document.getElementById('p-img').value;
    
    if (!name || !price || !image_url) return alert('Please fill required fields');
    
    try {
        const res = await fetchWithTimeout(`${API_URL}/api/admin/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, price, offer_price, category, image_url })
        });
        if (res.ok) {
            alert('Product added successfully');
            loadProducts();
        }
    } catch (error) {
        alert('Failed to add product');
    }
}

function logout() {
    localStorage.removeItem('lifestyle_admin_token');
    location.reload();
}

