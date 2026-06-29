// ═══════════════════════════════════════════════════════════════
// HOUSE OF VIYARA — ADMIN PANEL
// ═══════════════════════════════════════════════════════════════

// DEBUG: Check Supabase config
console.log('🔍 [ADMIN] window.SUPABASE_URL:', window.SUPABASE_URL);
console.log('🔍 [ADMIN] window.SUPABASE_ANON_KEY:', window.SUPABASE_ANON_KEY ? 'Set' : 'NOT SET');
console.log('🔍 [ADMIN] window.SUPABASE_BUCKET:', window.SUPABASE_BUCKET);

const API_URL = window.API_URL || ((['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.hostname.startsWith('192.168.'))
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : window.location.origin);
let adminToken = localStorage.getItem('hov_admin_token') || null;
let currentSection = 'dashboard';
let adminSupabase = null;

// Convert dataURL to Blob
function dataURLToBlob(dataURL) {
  const parts = dataURL.split(',');
  const meta = parts[0];
  const base64 = parts[1];
  const mime = meta.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

// Upload file to Supabase Storage
async function supabaseUploadFile(fileOrData, pathPrefix = 'products') {
  console.log('🚀 supabaseUploadFile called');
  if (!await loadSupabaseClient() || !adminSupabase) throw new Error('Supabase not initialized');
  let file = fileOrData;
  if (typeof fileOrData === 'string' && fileOrData.startsWith('data:')) {
    file = dataURLToBlob(fileOrData);
  }
  if (!(file instanceof Blob) && !(file instanceof File)) throw new Error('Invalid file');
  const filename = `${pathPrefix}/${Date.now()}_${(file.name || 'upload').replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
  const bucket = window.SUPABASE_BUCKET || 'public';
  console.log('📁 Bucket:', bucket);
  const { data, error } = await adminSupabase.storage.from(bucket).upload(filename, file, { upsert: true });
  if (error) {
    console.warn('❌ Supabase storage upload error', error);
    throw error;
  }
  console.log('📤 Uploaded file to path:', data.path);
  
  // ALWAYS CONSTRUCT URL MANUALLY
  const baseUrl = window.SUPABASE_URL;
  const url = `${baseUrl}/storage/v1/object/public/${bucket}/${data.path}`;
  console.log('✅ Final uploaded file URL:', url);
  return url;
}

// Load Supabase client
async function loadSupabaseClient() {
  if (adminSupabase) return true;
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/supabase-config.js';
        s.async = true;
        s.onload = resolve;
        s.onerror = () => reject(new Error('no supabase-config'));
        document.head.appendChild(s);
      });
    } catch (e) {}
  }
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return false;
  
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.js';
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load supabase-js'));
      document.head.appendChild(s);
    }).catch(() => null);
  }
  
  try {
    const createClient = window.supabase && window.supabase.createClient ? window.supabase.createClient : (window.supabase ? window.supabase : null);
    if (!createClient) return false;
    adminSupabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    console.log('Supabase client loaded in admin');
    return true;
  } catch (e) {
    console.warn('Supabase init failed in admin', e);
    return false;
  }
}

// ── Fetch helper ──
async function apiFetch(endpoint, options = {}) {
    const headers = options.body instanceof FormData
        ? { ...(options.headers || {}) }
        : { 'Content-Type': 'application/json', ...(options.headers || {}) };

    const res = await fetch(API_URL + endpoint, {
        ...options,
        headers
    });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    return res.json();
}

async function uploadAdminImage(fileInput, urlInput) {
    if (!fileInput || !fileInput.files.length) throw new Error('No file selected');
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    const data = await apiFetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData
    });
    if (!data.url) throw new Error('Upload failed');
    urlInput.value = data.url;
    return data.url;
}

// ═══════════════════════════════════════
// BOOT
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const preloader = document.getElementById('preloader');
    if (!adminToken) {
        if (preloader) setTimeout(() => preloader.classList.add('fade-out'), 800);
        renderLogin();
    } else {
        if (preloader) setTimeout(() => preloader.classList.add('fade-out'), 1200);
        renderShell();
        navigateTo('dashboard');
    }
});

// ═══════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════
function renderLogin() {
    document.body.innerHTML = `
    <div class="admin-login-wrap">
      <div class="admin-login-card">
        <div class="admin-login-logo">
          <span>HOV</span>
          <p>House Of Viyara</p>
        </div>
        <h2>Admin Portal</h2>
        <p class="admin-login-sub">Sign in to manage your store</p>
        <div class="afield">
          <label>USERNAME</label>
          <input type="text" id="al-user" placeholder="admin" autocomplete="username">
        </div>
        <div class="afield">
          <label>PASSWORD</label>
          <input type="password" id="al-pass" placeholder="••••••••" autocomplete="current-password">
        </div>
        <button class="admin-btn admin-btn-primary" id="al-btn" onclick="handleLogin()">SIGN IN</button>
        <p class="admin-login-hint"><a href="index.html">← Back to Store</a></p>
      </div>
    </div>`;

    document.getElementById('al-pass').addEventListener('keydown', e => e.key === 'Enter' && handleLogin());
}

function handleLogin() {
    const user = document.getElementById('al-user').value.trim();
    const pass = document.getElementById('al-pass').value;
    if (user === 'admin' && pass === 'admin') {
        adminToken = 'hov-admin-token';
        localStorage.setItem('hov_admin_token', adminToken);
        renderShell();
        navigateTo('dashboard');
    } else {
        showToast('Invalid username or password', 'error');
    }
}

function logout() {
    localStorage.removeItem('hov_admin_token');
    adminToken = null;
    renderLogin();
}

// ═══════════════════════════════════════
// SHELL — Sidebar + Main Layout
// ═══════════════════════════════════════
function renderShell() {
    document.body.innerHTML = `
    <div class="admin-shell">
      <!-- Sidebar -->
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="admin-sidebar-logo">
          <div class="sidebar-logo-icon">HOV</div>
          <div class="sidebar-logo-text">
            <strong>House Of Viyara</strong>
            <span>Admin Panel</span>
          </div>
        </div>
        <nav class="admin-nav">
          <a class="admin-nav-item" id="nav-dashboard" onclick="navigateTo('dashboard')">
            <i class="fas fa-chart-line"></i><span>Dashboard</span>
          </a>
          <a class="admin-nav-item" id="nav-products" onclick="navigateTo('products')">
            <i class="fas fa-box-open"></i><span>Products</span>
          </a>
          <a class="admin-nav-item" id="nav-categories" onclick="navigateTo('categories')">
            <i class="fas fa-th-large"></i><span>Categories</span>
          </a>
          <a class="admin-nav-item" id="nav-banners" onclick="navigateTo('banners')">
            <i class="fas fa-image"></i><span>Banners</span>
          </a>
          <a class="admin-nav-item" id="nav-hero-images" onclick="navigateTo('hero-images')">
            <i class="fas fa-star"></i><span>Hero Section</span>
          </a>
          <a class="admin-nav-item" id="nav-orders" onclick="navigateTo('orders')">
            <i class="fas fa-shopping-bag"></i><span>Orders</span>
          </a>
        </nav>
        <div class="admin-sidebar-footer">
          <a href="index.html" class="sidebar-footer-link"><i class="fas fa-external-link-alt"></i> View Store</a>
          <button class="sidebar-footer-link" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
        </div>
      </aside>

      <!-- Main -->
      <div class="admin-main" id="admin-main">
        <header class="admin-topbar">
          <button class="admin-sidebar-toggle" onclick="toggleSidebar()"><i class="fas fa-bars"></i></button>
          <div class="admin-topbar-title" id="topbar-title">Dashboard</div>
          <div class="admin-topbar-actions" id="topbar-actions"></div>
        </header>
        <div class="admin-content" id="admin-content">
          <div class="admin-loader"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div class="admin-modal-overlay" id="modal-overlay" onclick="closeModal()"></div>
    <div class="admin-modal" id="admin-modal">
      <button class="admin-modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
      <div class="admin-modal-body" id="modal-body"></div>
    </div>

    <!-- Toast -->
    <div id="toast-container"></div>
    `;
}

function toggleSidebar() {
    document.getElementById('admin-sidebar').classList.toggle('open');
}

function navigateTo(section) {
    currentSection = section;
    document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById(`nav-${section}`);
    if (navEl) navEl.classList.add('active');

    const titles = { dashboard: 'Dashboard', products: 'Products', categories: 'Categories', banners: 'Banners', 'hero-images': 'Hero Section', orders: 'Orders' };
    document.getElementById('topbar-title').textContent = titles[section] || section;
    document.getElementById('topbar-actions').innerHTML = '';

    const content = document.getElementById('admin-content');
    content.innerHTML = '<div class="admin-loader"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    const sectionMap = { dashboard: renderDashboard, products: renderProducts, categories: renderCategories, banners: renderBanners, 'hero-images': renderHeroImages, orders: renderOrders };
    if (sectionMap[section]) sectionMap[section]();
}

// ═══════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════
function showToast(msg, type = 'success') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `admin-toast admin-toast-${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${msg}`;
    c.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
}

// ═══════════════════════════════════════
// MODAL
// ═══════════════════════════════════════
function openModal(html) {
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('admin-modal').classList.add('open');
    document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() {
    document.getElementById('admin-modal').classList.remove('open');
    document.getElementById('modal-overlay').classList.remove('open');
}

// ═══════════════════════════════════════
// CONFIRM DIALOG
// ═══════════════════════════════════════
function confirmAction(msg, onConfirm) {
    window.pendingConfirmAction = onConfirm;
    openModal(`
      <div style="text-align:center; padding: 10px 0;">
        <i class="fas fa-exclamation-triangle" style="font-size:2.5rem; color:#FF007A; margin-bottom:15px;"></i>
        <h3 style="margin-bottom:10px;">Are you sure?</h3>
        <p style="color:#666; margin-bottom:25px;">${msg}</p>
        <div style="display:flex; gap:12px; justify-content:center;">
          <button class="admin-btn admin-btn-danger" onclick="if (window.pendingConfirmAction) { window.pendingConfirmAction(); window.pendingConfirmAction = null; } closeModal();">YES, DELETE</button>
          <button class="admin-btn admin-btn-ghost" onclick="closeModal()">CANCEL</button>
        </div>
      </div>
    `);
}

// ═══════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════
async function renderDashboard() {
    const content = document.getElementById('admin-content');
    try {
        await loadSupabaseClient();
        let stats, orders;
        if (adminSupabase) {
            const [productsRes, ordersRes] = await Promise.all([
                adminSupabase.from('products').select('id, is_trending'),
                adminSupabase.from('orders').select('id, total_amount, status, payment_status, created_at').order('created_at', { ascending: false })
            ]);
            if (productsRes.error) throw productsRes.error;
            if (ordersRes.error) throw ordersRes.error;
            const products = productsRes.data;
            orders = ordersRes.data;
            stats = {
                totalSales: orders.filter(o => o.payment_status === 'Paid').reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
                totalOrders: orders.length,
                pendingOrders: orders.filter(o => o.status === 'Pending').length,
                totalProducts: products.length,
                trendingProducts: products.filter(p => p.is_trending).length
            };
        } else {
            stats = await apiFetch('/api/admin/stats');
            orders = await apiFetch('/api/admin/orders');
        }
        const recentOrders = orders.slice(0, 8);

        content.innerHTML = `
        <div class="admin-stats-grid">
          <div class="stat-card stat-green">
            <div class="stat-icon"><i class="fas fa-rupee-sign"></i></div>
            <div class="stat-info"><div class="stat-value">₹${Number(stats.totalSales || 0).toLocaleString('en-IN')}</div><div class="stat-label">Total Revenue</div></div>
          </div>
          <div class="stat-card stat-blue">
            <div class="stat-icon"><i class="fas fa-shopping-bag"></i></div>
            <div class="stat-info"><div class="stat-value">${stats.totalOrders}</div><div class="stat-label">Total Orders</div></div>
          </div>
          <div class="stat-card stat-yellow">
            <div class="stat-icon"><i class="fas fa-clock"></i></div>
            <div class="stat-info"><div class="stat-value">${stats.pendingOrders}</div><div class="stat-label">Pending Orders</div></div>
          </div>
          <div class="stat-card stat-purple">
            <div class="stat-icon"><i class="fas fa-box-open"></i></div>
            <div class="stat-info"><div class="stat-value">${stats.totalProducts}</div><div class="stat-label">Total Products</div></div>
          </div>
          <div class="stat-card stat-pink">
            <div class="stat-icon"><i class="fas fa-fire"></i></div>
            <div class="stat-info"><div class="stat-value">${stats.trendingProducts}</div><div class="stat-label">Trending Products</div></div>
          </div>
        </div>

        <div class="admin-quick-actions">
          <h3>Quick Actions</h3>
          <div class="quick-action-grid">
            <button class="quick-action-btn" onclick="navigateTo('products'); setTimeout(openAddProduct, 300)"><i class="fas fa-plus"></i> Add Product</button>
            <button class="quick-action-btn" onclick="navigateTo('banners'); setTimeout(openAddBanner, 300)"><i class="fas fa-image"></i> Add Banner</button>
            <button class="quick-action-btn" onclick="navigateTo('categories'); setTimeout(openAddCategory, 300)"><i class="fas fa-th-large"></i> Add Category</button>
            <button class="quick-action-btn" onclick="navigateTo('orders')"><i class="fas fa-shipping-fast"></i> View Orders</button>
          </div>
        </div>

        <div class="admin-section-card">
          <div class="admin-section-card-header">
            <h3>Recent Orders</h3>
            <button class="admin-btn admin-btn-ghost admin-btn-sm" onclick="navigateTo('orders')">View All</button>
          </div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead><tr><th>Order ID</th><th>Amount</th><th>Status</th><th>Payment</th><th>Date</th></tr></thead>
              <tbody>
                ${recentOrders.length === 0 ? '<tr><td colspan="5" class="admin-empty">No orders yet</td></tr>' : recentOrders.map(o => `
                  <tr>
                    <td><strong>${o.id}</strong></td>
                    <td><strong>₹${o.total_amount}</strong></td>
                    <td><span class="status-badge status-${(o.status || '').toLowerCase()}">${o.status}</span></td>
                    <td><span class="payment-badge payment-${(o.payment_status || '').toLowerCase()}">${o.payment_status}</span></td>
                    <td>${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    } catch (e) {
        content.innerHTML = `<div class="admin-error"><i class="fas fa-exclamation-triangle"></i> <p>Could not load dashboard. Make sure the server is running on port 3000.</p><code>${e.message}</code></div>`;
    }
}

// ═══════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════
let allProducts = [];
let productFilter = 'all';

async function renderProducts() {
    document.getElementById('topbar-actions').innerHTML = `
        <button class="admin-btn admin-btn-primary" onclick="openAddProduct()"><i class="fas fa-plus"></i> Add Product</button>`;

    const content = document.getElementById('admin-content');
    try {
        await loadSupabaseClient();
        if (adminSupabase) {
            const { data, error } = await adminSupabase.from('products').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            allProducts = data;
        } else {
            allProducts = await apiFetch('/api/admin/products');
        }

        content.innerHTML = `
        <div class="admin-filter-bar">
            <div class="admin-filter-tabs" id="product-filter-tabs">
                <button class="filter-tab active" onclick="filterProducts('all', this)">All (${allProducts.length})</button>
                <button class="filter-tab" onclick="filterProducts('trending', this)"><i class="fas fa-fire"></i> Trending (${allProducts.filter(p => p.is_trending).length})</button>
                <button class="filter-tab" onclick="filterProducts('saree', this)">Saree</button>
                <button class="filter-tab" onclick="filterProducts('kurtis', this)">Kurtis</button>
                <button class="filter-tab" onclick="filterProducts('ethnic', this)">Ethnic</button>
                <button class="filter-tab" onclick="filterProducts('party', this)">Party</button>
                <button class="filter-tab" onclick="filterProducts('casual', this)">Casual</button>
            </div>
            <input class="admin-search-input" type="text" placeholder="Search products..." oninput="searchProducts(this.value)" id="product-search">
        </div>
        <div class="admin-products-grid" id="products-grid"></div>`;

        renderProductGrid(allProducts);
    } catch (e) {
        content.innerHTML = `<div class="admin-error"><i class="fas fa-exclamation-triangle"></i><p>Failed to load products. Is the server running?</p><code>${e.message}</code></div>`;
    }
}

function filterProducts(filter, btn) {
    productFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    let filtered = allProducts;
    if (filter === 'trending') filtered = allProducts.filter(p => p.is_trending);
    else if (filter !== 'all') filtered = allProducts.filter(p => p.category === filter);
    renderProductGrid(filtered);
}

function searchProducts(q) {
    const search = q.toLowerCase();
    let base = productFilter === 'all' ? allProducts
        : productFilter === 'trending' ? allProducts.filter(p => p.is_trending)
        : allProducts.filter(p => p.category === productFilter);
    renderProductGrid(base.filter(p => p.name.toLowerCase().includes(search) || (p.description || '').toLowerCase().includes(search)));
}

function renderProductGrid(products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    if (products.length === 0) {
        grid.innerHTML = '<div class="admin-empty-state"><i class="fas fa-box-open"></i><p>No products found</p></div>';
        return;
    }
    grid.innerHTML = products.map(p => `
      <div class="admin-product-card">
        <div class="apc-img-wrap">
          <img src="${p.image_url}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'" loading="lazy">
          ${p.is_trending ? '<div class="apc-trending-badge"><i class="fas fa-fire"></i> Trending</div>' : ''}
        </div>
        <div class="apc-body">
          <div class="apc-cat">${p.category}</div>
          <div class="apc-name">${p.name}</div>
          <div class="apc-price">
            <span class="apc-offer">₹${p.offer_price || p.price}</span>
            ${p.offer_price && p.offer_price < p.price ? `<span class="apc-original">₹${p.price}</span>` : ''}
          </div>
          <div class="apc-actions">
            <button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openEditProduct(${p.id})"><i class="fas fa-edit"></i> Edit</button>
            <button class="admin-btn admin-btn-sm ${p.is_trending ? 'admin-btn-fire active-fire' : 'admin-btn-outline-fire'}" onclick="toggleTrending(${p.id}, ${p.is_trending ? 0 : 1})">
              <i class="fas fa-fire"></i> ${p.is_trending ? 'Trending' : 'Set Trending'}
            </button>
            <button class="admin-btn admin-btn-sm admin-btn-danger" onclick='deleteProduct(${p.id}, ${JSON.stringify(p.name)})'><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>`).join('');
}

async function toggleTrending(id, newVal) {
    try {
        await loadSupabaseClient();
        if (adminSupabase) {
            const { error } = await adminSupabase.from('products').update({ is_trending: newVal }).eq('id', id);
            if (error) throw error;
        } else {
            await apiFetch(`/api/admin/products/${id}/trending`, {
                method: 'PATCH',
                body: JSON.stringify({ is_trending: newVal })
            });
        }
        showToast(newVal ? '🔥 Product marked as Trending!' : 'Product removed from Trending', 'success');
        renderProducts();
    } catch (e) {
        showToast('Failed to update trending status', 'error');
    }
}

async function deleteProduct(id, name) {
    confirmAction(`Delete "<strong>${name}</strong>"? This cannot be undone.`, async () => {
        try {
            await loadSupabaseClient();
            if (adminSupabase) {
                const { error } = await adminSupabase.from('products').delete().eq('id', id);
                if (error) throw error;
            } else {
                await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
            }
            showToast('Product deleted successfully', 'success');
            renderProducts();
        } catch (e) {
            showToast('Failed to delete product', 'error');
        }
    });
}

function productFormHTML(p = {}, categories = []) {
    const gallery = Array.isArray(p.gallery) ? p.gallery : (p.image_url ? [p.image_url] : []);
    const videos = Array.isArray(p.videos) ? p.videos : (p.video_url ? [p.video_url] : []);
    return `
    <h3>${p.id ? 'Edit Product' : 'Add New Product'}</h3>
    <div class="admin-form">
      <div class="aform-group">
        <label>Product Name *</label>
        <input class="aform-input" id="pf-name" value="${p.name || ''}" placeholder="e.g. Banarasi Silk Saree">
      </div>
      <div class="aform-group">
        <label>Description</label>
        <textarea class="aform-input" id="pf-desc" rows="3" placeholder="Short product description...">${p.description || ''}</textarea>
      </div>
      <div class="aform-row">
        <div class="aform-group">
          <label>Price (₹) *</label>
          <input class="aform-input" id="pf-price" type="number" value="${p.price || ''}" placeholder="4500">
        </div>
        <div class="aform-group">
          <label>Offer Price (₹)</label>
          <input class="aform-input" id="pf-offer" type="number" value="${p.offer_price || ''}" placeholder="3999">
        </div>
      </div>
      <div class="aform-row">
        <div class="aform-group">
          <label>Category *</label>
          <select class="aform-input" id="pf-cat">
            ${categories.map(c => `<option value="${c.slug}" ${p.category === c.slug ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="aform-group">
          <label>Stock</label>
          <input class="aform-input" id="pf-stock" type="number" value="${p.stock || 10}" placeholder="10">
        </div>
      </div>
      <!-- Gallery Images Section -->
      <div class="aform-group">
        <label>Product Gallery Images (up to 10)</label>
        <div id="pf-gallery-container" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
            ${gallery.map((img, idx) => `
                <div class="gallery-item" style="position:relative;width:100px;height:100px;border:2px solid #eee;border-radius:8px;overflow:hidden;">
                    <img src="${img}" style="width:100%;height:100px;object-fit:cover;">
                    <button type="button" onclick="window.pf_removeGalleryItem(${idx})" style="position:absolute;top:2px;right:2px;background:#FF007A;color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
                </div>
            `).join('')}
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <input type="file" id="pf-gallery-files" accept="image/*" multiple style="flex:1;">
            <input type="text" id="pf-gallery-url" placeholder="Or paste an image URL" style="flex:1;">
            <button type="button" class="admin-btn admin-btn-sm" onclick="window.pf_addGalleryUrl()">Add URL</button>
        </div>
        <small class="admin-form-hint">Add up to 10 images (upload files or paste URLs)</small>
      </div>

      <!-- Videos Section -->
      <div class="aform-group">
        <label>Product Videos (up to 5)</label>
        <div id="pf-videos-container" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
            ${videos.map((vid, idx) => `
                <div class="video-item" style="position:relative;width:150px;border:2px solid #eee;border-radius:8px;overflow:hidden;">
                    <video src="${vid}" style="width:100%;height:100px;object-fit:cover;" controls></video>
                    <button type="button" onclick="window.pf_removeVideoItem(${idx})" style="position:absolute;top:2px;right:2px;background:#FF007A;color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
                </div>
            `).join('')}
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <input type="file" id="pf-video-files" accept="video/*" multiple style="flex:1;">
            <input type="text" id="pf-video-url" placeholder="Or paste a video URL" style="flex:1;">
            <button type="button" class="admin-btn admin-btn-sm" onclick="window.pf_addVideoUrl()">Add URL</button>
        </div>
        <small class="admin-form-hint">Add up to 5 videos (upload files or paste URLs)</small>
      </div>
      <div class="aform-check">
        <input type="checkbox" id="pf-trending" ${p.is_trending ? 'checked' : ''}>
        <label for="pf-trending"><i class="fas fa-fire" style="color:#FF6B35"></i> Mark as Trending</label>
      </div>
      <div class="aform-actions">
        <button class="admin-btn admin-btn-primary" onclick="${p.id ? `handleEditProduct(${p.id})` : 'handleAddProduct()'}">
          <i class="fas fa-save"></i> ${p.id ? 'Update Product' : 'Add Product'}
        </button>
        <button class="admin-btn admin-btn-ghost" onclick="closeModal()">Cancel</button>
      </div>
    </div>
    <script>
      // Store gallery and videos state on window
      window.pf_currentGallery = ${JSON.stringify(gallery)};
      window.pf_currentVideos = ${JSON.stringify(videos)};

      // Render gallery container
      window.pf_renderGallery = function() {
        const container = document.getElementById('pf-gallery-container');
        container.innerHTML = window.pf_currentGallery.map((img, idx) => \`
          <div class="gallery-item" style="position:relative;width:100px;height:100px;border:2px solid #eee;border-radius:8px;overflow:hidden;">
            <img src="\${img}" style="width:100%;height:100px;object-fit:cover;">
            <button type="button" onclick="window.pf_removeGalleryItem(\${idx})" style="position:absolute;top:2px;right:2px;background:#FF007A;color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
          </div>
        \`).join('');
      };

      // Render videos container
      window.pf_renderVideos = function() {
        const container = document.getElementById('pf-videos-container');
        container.innerHTML = window.pf_currentVideos.map((vid, idx) => \`
          <div class="video-item" style="position:relative;width:150px;border:2px solid #eee;border-radius:8px;overflow:hidden;">
            <video src="\${vid}" style="width:100%;height:100px;object-fit:cover;" controls></video>
            <button type="button" onclick="window.pf_removeVideoItem(\${idx})" style="position:absolute;top:2px;right:2px;background:#FF007A;color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
          </div>
        \`).join('');
      };

      // Remove gallery item
      window.pf_removeGalleryItem = function(idx) {
        window.pf_currentGallery.splice(idx, 1);
        window.pf_renderGallery();
      };

      // Remove video item
      window.pf_removeVideoItem = function(idx) {
        window.pf_currentVideos.splice(idx, 1);
        window.pf_renderVideos();
      };

      // Add gallery URL
      window.pf_addGalleryUrl = function() {
        const urlInput = document.getElementById('pf-gallery-url');
        const url = urlInput.value.trim();
        if (url && window.pf_currentGallery.length < 10) {
          window.pf_currentGallery.push(url);
          window.pf_renderGallery();
          urlInput.value = '';
        } else if (window.pf_currentGallery.length >= 10) {
          alert('Maximum 10 images allowed');
        }
      };

      // Add video URL
      window.pf_addVideoUrl = function() {
        const urlInput = document.getElementById('pf-video-url');
        const url = urlInput.value.trim();
        if (url && window.pf_currentVideos.length < 5) {
          window.pf_currentVideos.push(url);
          window.pf_renderVideos();
          urlInput.value = '';
        } else if (window.pf_currentVideos.length >= 5) {
          alert('Maximum 5 videos allowed');
        }
      };

      // Handle gallery file selection
      document.getElementById('pf-gallery-files').addEventListener('change', async function(e) {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        for (const file of files) {
          if (window.pf_currentGallery.length >= 10) break;
          try {
            // Read as data URL and add to gallery temporarily - we'll upload on save
            const reader = new FileReader();
            reader.onload = (event) => {
              window.pf_currentGallery.push(event.target.result);
              window.pf_renderGallery();
            };
            reader.readAsDataURL(file);
          } catch (err) {
            console.error('File read error', err);
          }
        }
      });

      // Handle video file selection
      document.getElementById('pf-video-files').addEventListener('change', async function(e) {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        for (const file of files) {
          if (window.pf_currentVideos.length >= 5) break;
          try {
            // Read as data URL and add to videos temporarily - we'll upload on save
            const reader = new FileReader();
            reader.onload = (event) => {
              window.pf_currentVideos.push(event.target.result);
              window.pf_renderVideos();
            };
            reader.readAsDataURL(file);
          } catch (err) {
            console.error('File read error', err);
          }
        }
      });
    <\/script>`;
}

async function openAddProduct() {
    try {
        await loadSupabaseClient();
        let categories = [];
        if (adminSupabase) {
            const { data, error } = await adminSupabase.from('categories').select('*').order('display_order', { ascending: true });
            if (error) throw error;
            categories = data || [];
        } else {
            categories = await apiFetch('/api/categories');
        }
        openModal(productFormHTML({}, categories));
    } catch (e) {
        showToast('Could not load categories', 'error');
    }
}

async function openEditProduct(id) {
    try {
        let p;
        let categories = [];
        await loadSupabaseClient();
        if (adminSupabase) {
            const [productResult, catResult] = await Promise.all([
                adminSupabase.from('products').select('*').eq('id', id).single(),
                adminSupabase.from('categories').select('*').order('display_order', { ascending: true })
            ]);
            if (productResult.error) throw productResult.error;
            if (catResult.error) throw catResult.error;
            p = productResult.data;
            categories = catResult.data || [];
        } else {
            p = await apiFetch(`/api/products/${id}`);
            categories = await apiFetch('/api/categories');
        }
        openModal(productFormHTML(p, categories));
    } catch (e) {
        showToast('Could not load product', 'error');
    }
}

async function handleAddProduct() {
    const name = document.getElementById('pf-name').value.trim();
    const price = document.getElementById('pf-price').value;
    if (!name || !price) return showToast('Name and Price are required', 'error');

    try {
        await loadSupabaseClient();
        let gallery = window.pf_currentGallery || [];
        let videos = window.pf_currentVideos || [];

        // Upload any data URLs (from file inputs) to Supabase Storage
        if (adminSupabase) {
            const uploadedGallery = [];
            for (const img of gallery) {
                if (img.startsWith('data:')) {
                    const url = await supabaseUploadFile(img, 'products');
                    uploadedGallery.push(url);
                } else {
                    uploadedGallery.push(img);
                }
            }
            gallery = uploadedGallery;

            const uploadedVideos = [];
            for (const vid of videos) {
                if (vid.startsWith('data:')) {
                    const url = await supabaseUploadFile(vid, 'products');
                    uploadedVideos.push(url);
                } else {
                    uploadedVideos.push(vid);
                }
            }
            videos = uploadedVideos;
        }

        const image_url = gallery.length > 0 ? gallery[0] : (document.getElementById('pf-img') ? document.getElementById('pf-img').value.trim() : '');
        const video_url = videos.length > 0 ? videos[0] : (document.getElementById('pf-video') ? document.getElementById('pf-video').value.trim() : '');

        if (adminSupabase) {
            const { error } = await adminSupabase.from('products').insert({
                name,
                description: document.getElementById('pf-desc').value,
                price: Number(price),
                offer_price: Number(document.getElementById('pf-offer').value || price),
                category: document.getElementById('pf-cat').value,
                stock: Number(document.getElementById('pf-stock').value || 10),
                image_url,
                video_url,
                gallery,
                videos,
                is_trending: document.getElementById('pf-trending').checked
            });
            if (error) throw error;
        } else {
            await apiFetch('/api/admin/products', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    description: document.getElementById('pf-desc').value,
                    price: Number(price),
                    offer_price: Number(document.getElementById('pf-offer').value || price),
                    category: document.getElementById('pf-cat').value,
                    stock: Number(document.getElementById('pf-stock').value || 10),
                    image_url,
                    video_url,
                    gallery,
                    videos,
                    is_trending: document.getElementById('pf-trending').checked
                })
            });
        }
        closeModal();
        showToast('Product added successfully!', 'success');
        renderProducts();
    } catch (e) {
        showToast('Failed to add product: ' + e.message, 'error');
    }
}

async function handleEditProduct(id) {
    const name = document.getElementById('pf-name').value.trim();
    const price = document.getElementById('pf-price').value;
    if (!name || !price) return showToast('Name and Price are required', 'error');

    try {
        await loadSupabaseClient();
        let gallery = window.pf_currentGallery || [];
        let videos = window.pf_currentVideos || [];

        // Upload any data URLs (from file inputs) to Supabase Storage
        if (adminSupabase) {
            const uploadedGallery = [];
            for (const img of gallery) {
                if (img.startsWith('data:')) {
                    const url = await supabaseUploadFile(img, 'products');
                    uploadedGallery.push(url);
                } else {
                    uploadedGallery.push(img);
                }
            }
            gallery = uploadedGallery;

            const uploadedVideos = [];
            for (const vid of videos) {
                if (vid.startsWith('data:')) {
                    const url = await supabaseUploadFile(vid, 'products');
                    uploadedVideos.push(url);
                } else {
                    uploadedVideos.push(vid);
                }
            }
            videos = uploadedVideos;
        }

        const image_url = gallery.length > 0 ? gallery[0] : (document.getElementById('pf-img') ? document.getElementById('pf-img').value.trim() : '');
        const video_url = videos.length > 0 ? videos[0] : (document.getElementById('pf-video') ? document.getElementById('pf-video').value.trim() : '');

        if (adminSupabase) {
            const { error } = await adminSupabase.from('products').update({
                name,
                description: document.getElementById('pf-desc').value,
                price: Number(price),
                offer_price: Number(document.getElementById('pf-offer').value || price),
                category: document.getElementById('pf-cat').value,
                stock: Number(document.getElementById('pf-stock').value || 10),
                image_url,
                video_url,
                gallery,
                videos,
                is_trending: document.getElementById('pf-trending').checked
            }).eq('id', id);
            if (error) throw error;
        } else {
            await apiFetch(`/api/admin/products/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name,
                    description: document.getElementById('pf-desc').value,
                    price: Number(price),
                    offer_price: Number(document.getElementById('pf-offer').value || price),
                    category: document.getElementById('pf-cat').value,
                    stock: Number(document.getElementById('pf-stock').value || 10),
                    image_url,
                    video_url,
                    gallery,
                    videos,
                    is_trending: document.getElementById('pf-trending').checked
                })
            });
        }
        closeModal();
        showToast('Product updated successfully!', 'success');
        renderProducts();
    } catch (e) {
        showToast('Failed to update product: ' + e.message, 'error');
    }
}

// ═══════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════
async function renderCategories() {
    document.getElementById('topbar-actions').innerHTML = `
        <button class="admin-btn admin-btn-primary" onclick="openAddCategory()"><i class="fas fa-plus"></i> Add Category</button>`;

    const content = document.getElementById('admin-content');
    try {
        let categories;
        await loadSupabaseClient();
        if (adminSupabase) {
            const { data, error } = await adminSupabase.from('categories').select('*').order('display_order', { ascending: true });
            if (error) throw error;
            categories = data;
        } else {
            categories = await apiFetch('/api/admin/categories');
        }
        
        content.innerHTML = `
        <div class="admin-section-card">
            <p class="admin-section-hint">Categories define the shopping sections of your store. Each category gets its own page.</p>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead><tr><th>Order</th><th>Icon</th><th>Name</th><th>Slug</th><th>Banner</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${categories.length === 0
                            ? '<tr><td colspan="6" class="admin-empty">No categories found</td></tr>'
                            : categories.map(cat => `
                        <tr>
                            <td><span class="order-badge">${cat.display_order}</span></td>
                            <td><i class="${cat.icon || 'fas fa-tag'}" style="font-size:1.2rem;color:#FF007A;"></i></td>
                            <td><strong>${cat.name}</strong></td>
                            <td><code class="slug-badge">${cat.slug}</code></td>
                            <td>
                                ${cat.banner_image
                                    ? `<img src="${cat.banner_image}" style="width:80px;height:45px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'">`
                                    : '<span style="color:#999;font-size:0.8rem;">None</span>'}
                            </td>
                            <td>
                                <div class="table-actions">
                                    <button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openEditCategory(${cat.id})"><i class="fas fa-edit"></i> Edit</button>
                                    <button class="admin-btn admin-btn-sm admin-btn-danger" onclick='deleteCategory(${cat.id}, ${JSON.stringify(cat.name)})'><i class="fas fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    } catch (e) {
        content.innerHTML = `<div class="admin-error"><i class="fas fa-exclamation-triangle"></i><p>Failed to load categories.</p><code>${e.message}</code></div>`;
    }
}

function categoryFormHTML(c = {}) {
    const icons = ['fas fa-female', 'fas fa-tshirt', 'fas fa-star', 'fas fa-glass-cheers', 'fas fa-leaf', 'fas fa-tag', 'fas fa-gem', 'fas fa-heart', 'fas fa-crown', 'fas fa-shopping-bag'];
    return `
    <h3>${c.id ? 'Edit Category' : 'Add New Category'}</h3>
    <div class="admin-form">
      <div class="aform-row">
        <div class="aform-group">
          <label>Category Name *</label>
          <input class="aform-input" id="cf-name" value="${c.name || ''}" placeholder="e.g. Saree">
        </div>
        <div class="aform-group">
          <label>Slug * <span style="color:#999;font-size:0.75rem;">(URL key, no spaces)</span></label>
          <input class="aform-input" id="cf-slug" value="${c.slug || ''}" placeholder="e.g. saree">
        </div>
      </div>
      <div class="aform-row">
        <div class="aform-group">
          <label>Icon Class</label>
          <select class="aform-input" id="cf-icon">
            ${icons.map(ic => `<option value="${ic}" ${c.icon === ic ? 'selected' : ''}>${ic}</option>`).join('')}
          </select>
        </div>
        <div class="aform-group">
          <label>Display Order</label>
          <input class="aform-input" id="cf-order" type="number" value="${c.display_order || 0}" placeholder="1">
        </div>
      </div>
      
      <div class="aform-group">
        <label style="font-weight:bold;">Choose Banner Image Source <span style="color:#999;font-weight:normal;">(Select one: upload OR URL)</span></label>
      </div>
      
      <div style="display:flex;gap:15px;align-items:flex-start;margin-bottom:15px;">
        <div style="flex:1;">
          <div class="aform-group" style="margin-bottom:0;">
            <label style="display:flex;align-items:center;gap:8px;">
              <i class="fas fa-upload" style="color:#FF007A;"></i> Upload From Device
            </label>
            <input class="aform-input" id="cf-banner-file" type="file" accept="image/*">
          </div>
        </div>
        
        <div style="display:flex;align-items:center;justify-content:center;padding:10px 0;font-size:18px;font-weight:bold;color:#999;">OR</div>
        
        <div style="flex:1;">
          <div class="aform-group" style="margin-bottom:0;">
            <label style="display:flex;align-items:center;gap:8px;">
              <i class="fas fa-link" style="color:#FF007A;"></i> Enter Banner URL
            </label>
            <input class="aform-input" id="cf-banner" value="${c.banner_image || ''}" placeholder="https://images.unsplash.com/...">
          </div>
        </div>
      </div>
      
      <div id="cf-preview-wrap" style="display:${c.banner_image ? 'block' : 'none'}">
        <img id="cf-preview" src="${c.banner_image || ''}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:15px;" onerror="this.style.display='none'">
      </div>
      <div class="aform-actions">
        <button class="admin-btn admin-btn-primary" onclick="${c.id ? `handleEditCategory(${c.id})` : 'handleAddCategory()'}">
          <i class="fas fa-save"></i> ${c.id ? 'Update Category' : 'Add Category'}
        </button>
        <button class="admin-btn admin-btn-ghost" onclick="closeModal()">Cancel</button>
      </div>
    </div>
    <script>
      // Store temporary image data URL here
      window._cfTempImage = null;
      
      document.getElementById('cf-name').addEventListener('input', function(){
        const slugEl = document.getElementById('cf-slug');
        if(!slugEl.dataset.edited) slugEl.value = this.value.toLowerCase().replace(/\\s+/g,'-').replace(/[^a-z0-9-]/g,'');
      });
      document.getElementById('cf-slug').addEventListener('input', function(){ this.dataset.edited = '1'; });

      // Category banner file upload
      document.getElementById('cf-banner-file').addEventListener('change', async function(){
        const fileInput = this;
        const urlInput = document.getElementById('cf-banner');
        const wrap = document.getElementById('cf-preview-wrap');
        const img = document.getElementById('cf-preview');
        if (!fileInput.files.length) return;
        try {
          // Read file as data URL for preview
          const reader = new FileReader();
          reader.onload = function(e) {
            window._cfTempImage = e.target.result;
            wrap.style.display = 'block';
            img.src = e.target.result;
            // Clear the URL input since we're using a file
            urlInput.value = '';
          };
          reader.readAsDataURL(fileInput.files[0]);
        } catch (e) {
          console.error('Upload failed:', e);
          showToast('Image upload failed', 'error');
        }
      });

      // Update preview when URL changes
      document.getElementById('cf-banner').addEventListener('input', function(){
        const wrap = document.getElementById('cf-preview-wrap');
        const img = document.getElementById('cf-preview');
        if (this.value) {
          wrap.style.display = 'block';
          img.src = this.value;
          // Clear temp image since we're using a URL
          window._cfTempImage = null;
        } else {
          wrap.style.display = 'none';
        }
      });
    <\/script>`;
}

function setupCategoryForm() {
    window._cfTempImage = null;
    const fileInput = document.getElementById('cf-banner-file');
    const urlInput = document.getElementById('cf-banner');
    const previewWrap = document.getElementById('cf-preview-wrap');
    const previewImg = document.getElementById('cf-preview');
    
    if (fileInput) {
        fileInput.addEventListener('change', function(){
            if (!fileInput.files.length) return;
            try {
                const reader = new FileReader();
                reader.onload = function(e) {
                    window._cfTempImage = e.target.result;
                    previewWrap.style.display = 'block';
                    previewImg.src = e.target.result;
                    urlInput.value = '';
                };
                reader.readAsDataURL(fileInput.files[0]);
            } catch (e) {
                console.error('Upload failed:', e);
                showToast('Image upload failed', 'error');
            }
        });
    }
    
    if (urlInput) {
        urlInput.addEventListener('input', function(){
            if (this.value) {
                previewWrap.style.display = 'block';
                previewImg.src = this.value;
                window._cfTempImage = null;
            } else {
                previewWrap.style.display = 'none';
            }
        });
    }
}

function openAddCategory() { 
    openModal(categoryFormHTML()); 
    setupCategoryForm();
}
async function openEditCategory(id) {
    try {
        let cat;
        await loadSupabaseClient();
        if (adminSupabase) {
            const { data, error } = await adminSupabase.from('categories').select('*').eq('id', id).single();
            if (error) throw error;
            cat = data;
        } else {
            const cats = await apiFetch('/api/admin/categories');
            cat = cats.find(c => c.id === id);
        }
        if (!cat) return showToast('Category not found', 'error');
        openModal(categoryFormHTML(cat));
        setupCategoryForm();
    } catch (e) { showToast('Could not load category', 'error'); }
}

async function handleAddCategory() {
    const name = document.getElementById('cf-name').value.trim();
    const slug = document.getElementById('cf-slug').value.trim();
    const banner_url_input = document.getElementById('cf-banner').value.trim();
    if (!name || !slug) return showToast('Name and Slug are required', 'error');
    try {
        await loadSupabaseClient();
        let final_banner_url = banner_url_input;
        
        // Check if we have a temporary image from file upload
        if (window._cfTempImage) {
            if (adminSupabase) {
                final_banner_url = await supabaseUploadFile(window._cfTempImage, 'categories');
            }
        }
        
        if (adminSupabase) {
            const { error } = await adminSupabase.from('categories').insert({
                name,
                slug,
                icon: document.getElementById('cf-icon').value,
                banner_image: final_banner_url,
                display_order: Number(document.getElementById('cf-order').value || 0)
            });
            if (error) throw error;
        } else {
            await apiFetch('/api/admin/categories', {
                method: 'POST',
                body: JSON.stringify({ name, slug, icon: document.getElementById('cf-icon').value, banner_image: final_banner_url, display_order: Number(document.getElementById('cf-order').value || 0) })
            });
        }
        // Clear temp image
        window._cfTempImage = null;
        closeModal(); showToast('Category added!', 'success'); renderCategories();
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
}

async function handleEditCategory(id) {
    const name = document.getElementById('cf-name').value.trim();
    const slug = document.getElementById('cf-slug').value.trim();
    const banner_url_input = document.getElementById('cf-banner').value.trim();
    if (!name || !slug) return showToast('Name and Slug are required', 'error');
    try {
        await loadSupabaseClient();
        let final_banner_url = banner_url_input;
        
        // Check if we have a temporary image from file upload
        if (window._cfTempImage) {
            if (adminSupabase) {
                final_banner_url = await supabaseUploadFile(window._cfTempImage, 'categories');
            }
        }
        
        if (adminSupabase) {
            const { error } = await adminSupabase.from('categories').update({
                name,
                slug,
                icon: document.getElementById('cf-icon').value,
                banner_image: final_banner_url,
                display_order: Number(document.getElementById('cf-order').value || 0)
            }).eq('id', id);
            if (error) throw error;
        } else {
            await apiFetch(`/api/admin/categories/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ name, slug, icon: document.getElementById('cf-icon').value, banner_image: final_banner_url, display_order: Number(document.getElementById('cf-order').value || 0) })
            });
        }
        // Clear temp image
        window._cfTempImage = null;
        closeModal(); showToast('Category updated!', 'success'); renderCategories();
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
}

async function deleteCategory(id, name) {
    confirmAction(`Delete category "<strong>${name}</strong>"? Products in this category will NOT be deleted.`, async () => {
        try {
            await loadSupabaseClient();
            if (adminSupabase) {
                const { error } = await adminSupabase.from('categories').delete().eq('id', id);
                if (error) throw error;
            } else {
                await apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
            }
            showToast('Category deleted', 'success'); renderCategories();
        } catch (e) { showToast('Failed to delete', 'error'); }
    });
}

// ═══════════════════════════════════════
// BANNERS
// ═══════════════════════════════════════
async function renderBanners() {
    document.getElementById('topbar-actions').innerHTML = `
      <button class="admin-btn admin-btn-primary" onclick="openAddBanner()"><i class="fas fa-plus"></i> Add Banner</button>`;

    const content = document.getElementById('admin-content');
    try {
        let banners;
        await loadSupabaseClient();
        if (adminSupabase) {
            const { data, error } = await adminSupabase.from('banners').select('*').order('display_order', { ascending: true });
            if (error) throw error;
            banners = data;
        } else {
            banners = await apiFetch('/api/admin/banners');
        }
        
        content.innerHTML = `
        <div class="admin-section-card">
          <p class="admin-section-hint">Banners appear in the homepage hero slider. Toggle active/inactive to control visibility.</p>
          <div class="admin-banners-grid" id="banners-grid">
            ${banners.length === 0
                ? '<div class="admin-empty-state"><i class="fas fa-image"></i><p>No banners yet. Add your first banner!</p></div>'
                : banners.map(b => `
              <div class="admin-banner-card ${b.is_active ? '' : 'banner-inactive'}">
                <div class="abc-img-wrap">
                  <img src="${b.image_url}" alt="${b.title || 'Banner'}" onerror="this.src='https://via.placeholder.com/600x200?text=No+Image'" loading="lazy">
                  <div class="abc-overlay">
                    <div class="abc-title">${b.title || ''}</div>
                    <div class="abc-sub">${b.subtitle || ''}</div>
                    <span class="abc-cta">${b.cta_text || 'Shop Now'}</span>
                  </div>
                  <div class="abc-status-badge ${b.is_active ? 'badge-active' : 'badge-inactive'}">${b.is_active ? 'Active' : 'Inactive'}</div>
                </div>
                <div class="abc-meta">
                  <span>Order: ${b.display_order}</span>
                  <span>→ ${b.cta_link}</span>
                </div>
                <div class="abc-actions">
                  <button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openEditBanner(${b.id})"><i class="fas fa-edit"></i> Edit</button>
                  <button class="admin-btn admin-btn-sm ${b.is_active ? 'admin-btn-warning' : 'admin-btn-success'}" onclick="toggleBannerActive(${b.id}, ${b.is_active ? 0 : 1})">
                    <i class="fas fa-${b.is_active ? 'eye-slash' : 'eye'}"></i> ${b.is_active ? 'Hide' : 'Show'}
                  </button>
                  <button class="admin-btn admin-btn-sm admin-btn-danger" onclick='deleteBanner(${b.id}, ${JSON.stringify(b.title || 'Banner')})'><i class="fas fa-trash"></i></button>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
    } catch (e) {
        content.innerHTML = `<div class="admin-error"><i class="fas fa-exclamation-triangle"></i><p>Failed to load banners.</p><code>${e.message}</code></div>`;
    }
}

function bannerFormHTML(b = {}) {
    return `
    <h3>${b.id ? 'Edit Banner' : 'Add New Banner'}</h3>
    <div class="admin-form">
      <div class="aform-group">
        <label style="font-weight:bold;">Choose Image Source <span style="color:#999;font-weight:normal;">(Select one: upload OR URL)</span></label>
      </div>
      
      <div style="display:flex;gap:15px;align-items:flex-start;margin-bottom:15px;">
        <div style="flex:1;">
          <div class="aform-group" style="margin-bottom:0;">
            <label style="display:flex;align-items:center;gap:8px;">
              <i class="fas fa-upload" style="color:#FF007A;"></i> Upload From Device
            </label>
            <input class="aform-input" id="bf-img-file" type="file" accept="image/*">
          </div>
        </div>
        
        <div style="display:flex;align-items:center;justify-content:center;padding:10px 0;font-size:18px;font-weight:bold;color:#999;">OR</div>
        
        <div style="flex:1;">
          <div class="aform-group" style="margin-bottom:0;">
            <label style="display:flex;align-items:center;gap:8px;">
              <i class="fas fa-link" style="color:#FF007A;"></i> Enter Image URL
            </label>
            <input class="aform-input" id="bf-img" value="${b.image_url || ''}" placeholder="https://images.unsplash.com/..." oninput="updateBannerPreview(this.value)">
          </div>
        </div>
      </div>
      
      <div id="bf-preview-wrap" style="display:${b.image_url ? 'block' : 'none'}">
        <img id="bf-preview" src="${b.image_url || ''}" style="width:100%;height:160px;object-fit:cover;border-radius:8px;border:2px solid #eee;margin-bottom:15px;" onerror="this.style.display='none'">
      </div>
      <div class="aform-row">
        <div class="aform-group">
          <label>Title</label>
          <input class="aform-input" id="bf-title" value="${b.title || ''}" placeholder="e.g. New Arrivals">
        </div>
        <div class="aform-group">
          <label>Display Order</label>
          <input class="aform-input" id="bf-order" type="number" value="${b.display_order || 0}" placeholder="1">
        </div>
      </div>
      <div class="aform-group">
        <label>Subtitle</label>
        <input class="aform-input" id="bf-sub" value="${b.subtitle || ''}" placeholder="e.g. Discover the latest collection">
      </div>
      <div class="aform-row">
        <div class="aform-group">
          <label>Button Text</label>
          <input class="aform-input" id="bf-cta-text" value="${b.cta_text || 'Shop Now'}" placeholder="Shop Now">
        </div>
        <div class="aform-group">
          <label>Button Link</label>
          <input class="aform-input" id="bf-cta-link" value="${b.cta_link || 'collections.html'}" placeholder="collections.html">
        </div>
      </div>
      <div class="aform-check">
        <input type="checkbox" id="bf-active" ${b.id === undefined || b.is_active ? 'checked' : ''}>
        <label for="bf-active">Active (show on homepage)</label>
      </div>
      <div class="aform-actions">
        <button class="admin-btn admin-btn-primary" onclick="${b.id ? `handleEditBanner(${b.id})` : 'handleAddBanner()'}">
          <i class="fas fa-save"></i> ${b.id ? 'Update Banner' : 'Add Banner'}
        </button>
        <button class="admin-btn admin-btn-ghost" onclick="closeModal()">Cancel</button>
      </div>
    </div>
    <script>
      // Store temporary image data URL here
      window._bfTempImage = null;
      
      document.getElementById('bf-img-file').addEventListener('change', async function(){
        const fileInput = this;
        const urlInput = document.getElementById('bf-img');
        const wrap = document.getElementById('bf-preview-wrap');
        const img = document.getElementById('bf-preview');
        if (!fileInput.files.length) return;
        try {
          // Read file as data URL for preview
          const reader = new FileReader();
          reader.onload = function(e) {
            window._bfTempImage = e.target.result;
            wrap.style.display = 'block';
            img.src = e.target.result;
            img.style.display = 'block';
            // Clear the URL input since we're using a file
            urlInput.value = '';
          };
          reader.readAsDataURL(fileInput.files[0]);
        } catch (err) {
          showToast('Upload failed: ' + err.message, 'error');
        }
      });
    <\/script>`;
}

function updateBannerPreview(url) {
    const wrap = document.getElementById('bf-preview-wrap');
    const img = document.getElementById('bf-preview');
    if (url) { wrap.style.display = 'block'; img.src = url; img.style.display = 'block'; }
    else { wrap.style.display = 'none'; }
}



function setupBannerForm() {
    window._bfTempImage = null;
    const fileInput = document.getElementById('bf-img-file');
    const urlInput = document.getElementById('bf-img');
    const previewWrap = document.getElementById('bf-preview-wrap');
    const previewImg = document.getElementById('bf-preview');
    
    if (fileInput) {
        fileInput.addEventListener('change', function(){
            if (!fileInput.files.length) return;
            try {
                const reader = new FileReader();
                reader.onload = function(e) {
                    window._bfTempImage = e.target.result;
                    previewWrap.style.display = 'block';
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                    urlInput.value = '';
                };
                reader.readAsDataURL(fileInput.files[0]);
            } catch (e) {
                console.error('Upload failed:', e);
                showToast('Image upload failed', 'error');
            }
        });
    }
    
    if (urlInput) {
        urlInput.addEventListener('input', function(){
            if (this.value) {
                previewWrap.style.display = 'block';
                previewImg.src = this.value;
                previewImg.style.display = 'block';
                window._bfTempImage = null;
            } else {
                previewWrap.style.display = 'none';
            }
        });
    }
}

function openAddBanner() { 
    openModal(bannerFormHTML()); 
    setupBannerForm();
}
async function openEditBanner(id) {
    try {
        let banners;
        await loadSupabaseClient();
        if (adminSupabase) {
            const { data, error } = await adminSupabase.from('banners').select('*').eq('id', id);
            if (error) throw error;
            banners = data;
        } else {
            banners = await apiFetch('/api/admin/banners');
        }
        const b = banners.find(x => x.id === id);
        if (!b) return showToast('Banner not found', 'error');
        openModal(bannerFormHTML(b));
        setupBannerForm();
    } catch (e) { showToast('Could not load banner', 'error'); }
}

async function handleAddBanner() {
    const image_url_input = document.getElementById('bf-img').value.trim();
    try {
        await loadSupabaseClient();
        let final_image_url = image_url_input;
        
        // Check if we have a temporary image from file upload
        if (window._bfTempImage) {
            if (adminSupabase) {
                final_image_url = await supabaseUploadFile(window._bfTempImage, 'banners');
            }
        }
        
        // Require at least one of temp image or URL
        if (!final_image_url && !window._bfTempImage) {
            return showToast('Please upload an image or enter an image URL', 'error');
        }
        
        if (adminSupabase) {
            const { error } = await adminSupabase.from('banners').insert({
                title: document.getElementById('bf-title').value,
                subtitle: document.getElementById('bf-sub').value,
                image_url: final_image_url,
                cta_text: document.getElementById('bf-cta-text').value,
                cta_link: document.getElementById('bf-cta-link').value,
                is_active: document.getElementById('bf-active').checked,
                display_order: Number(document.getElementById('bf-order').value || 0)
            });
            if (error) throw error;
        } else {
            await apiFetch('/api/admin/banners', {
                method: 'POST',
                body: JSON.stringify({
                    title: document.getElementById('bf-title').value,
                    subtitle: document.getElementById('bf-sub').value,
                    image_url: final_image_url,
                    cta_text: document.getElementById('bf-cta-text').value,
                    cta_link: document.getElementById('bf-cta-link').value,
                    is_active: document.getElementById('bf-active').checked,
                    display_order: Number(document.getElementById('bf-order').value || 0)
                })
            });
        }
        // Clear temp image
        window._bfTempImage = null;
        closeModal(); showToast('Banner added!', 'success'); renderBanners();
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
}

async function handleEditBanner(id) {
    const image_url_input = document.getElementById('bf-img').value.trim();
    try {
        await loadSupabaseClient();
        let final_image_url = image_url_input;
        
        // Check if we have a temporary image from file upload
        if (window._bfTempImage) {
            if (adminSupabase) {
                final_image_url = await supabaseUploadFile(window._bfTempImage, 'banners');
            }
        }
        
        // Require at least one of temp image, URL, or existing image
        if (!final_image_url && !window._bfTempImage) {
            // Get existing banner to check if it has an image
            if (adminSupabase) {
                const { data: existingBanner } = await adminSupabase.from('banners').select('image_url').eq('id', id).single();
                if (!existingBanner || !existingBanner.image_url) {
                    return showToast('Please upload an image or enter an image URL', 'error');
                }
                final_image_url = existingBanner.image_url;
            } else {
                return showToast('Please upload an image or enter an image URL', 'error');
            }
        }
        
        if (adminSupabase) {
            const { error } = await adminSupabase.from('banners').update({
                title: document.getElementById('bf-title').value,
                subtitle: document.getElementById('bf-sub').value,
                image_url: final_image_url,
                cta_text: document.getElementById('bf-cta-text').value,
                cta_link: document.getElementById('bf-cta-link').value,
                is_active: document.getElementById('bf-active').checked,
                display_order: Number(document.getElementById('bf-order').value || 0)
            }).eq('id', id);
            if (error) throw error;
        } else {
            await apiFetch(`/api/admin/banners/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: document.getElementById('bf-title').value,
                    subtitle: document.getElementById('bf-sub').value,
                    image_url: final_image_url,
                    cta_text: document.getElementById('bf-cta-text').value,
                    cta_link: document.getElementById('bf-cta-link').value,
                    is_active: document.getElementById('bf-active').checked,
                    display_order: Number(document.getElementById('bf-order').value || 0)
                })
            });
        }
        // Clear temp image
        window._bfTempImage = null;
        closeModal(); showToast('Banner updated!', 'success'); renderBanners();
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
}

async function toggleBannerActive(id, newVal) {
    try {
        await loadSupabaseClient();
        if (adminSupabase) {
            const { error } = await adminSupabase.from('banners').update({ is_active: newVal }).eq('id', id);
            if (error) throw error;
        } else {
            const banners = await apiFetch('/api/admin/banners');
            const b = banners.find(x => x.id === id);
            if (!b) return;
            await apiFetch(`/api/admin/banners/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ ...b, is_active: newVal })
            });
        }
        showToast(newVal ? 'Banner is now active' : 'Banner hidden', 'success');
        renderBanners();
    } catch (e) { showToast('Failed to update banner', 'error'); }
}

async function deleteBanner(id, title) {
    confirmAction(`Delete banner "<strong>${title}</strong>"?`, async () => {
        try {
            await loadSupabaseClient();
            if (adminSupabase) {
                const { error } = await adminSupabase.from('banners').delete().eq('id', id);
                if (error) throw error;
            } else {
                await apiFetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
            }
            showToast('Banner deleted', 'success'); renderBanners();
        } catch (e) { showToast('Failed to delete', 'error'); }
    });
}

// ═══════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════
async function renderOrders() {
    const content = document.getElementById('admin-content');
    document.getElementById('topbar-actions').innerHTML = ``;
    try {
        await loadSupabaseClient();
        let orders;
        if (adminSupabase) {
            const { data, error } = await adminSupabase.from('orders').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            orders = data.map(o => ({
                ...o,
                items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
                shipping_address: typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : o.shipping_address
            }));
        } else {
            orders = await apiFetch('/api/admin/orders');
        }
        content.innerHTML = `
        <div class="admin-filter-bar">
          <div class="admin-filter-tabs">
            <button class="filter-tab active" onclick="filterOrdersByStatus('all', this)">All (${orders.length})</button>
            <button class="filter-tab" onclick="filterOrdersByStatus('Pending', this)">Pending</button>
            <button class="filter-tab" onclick="filterOrdersByStatus('Confirmed', this)">Confirmed</button>
            <button class="filter-tab" onclick="filterOrdersByStatus('Shipped', this)">Shipped</button>
            <button class="filter-tab" onclick="filterOrdersByStatus('Delivered', this)">Delivered</button>
            <button class="filter-tab" onclick="filterOrdersByStatus('Cancelled', this)">Cancelled</button>
          </div>
        </div>
        <div id="orders-table-wrap">
          ${renderOrdersTable(orders)}
        </div>`;

        window._allOrders = orders;
    } catch (e) {
        content.innerHTML = `<div class="admin-error"><i class="fas fa-exclamation-triangle"></i><p>Failed to load orders.</p><code>${e.message}</code></div>`;
    }
}

function filterOrdersByStatus(status, btn) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const filtered = status === 'all' ? window._allOrders : window._allOrders.filter(o => o.status === status);
    document.getElementById('orders-table-wrap').innerHTML = renderOrdersTable(filtered);
}

function renderOrdersTable(orders) {
    if (orders.length === 0) return '<div class="admin-empty-state"><i class="fas fa-shopping-bag"></i><p>No orders found</p></div>';
    return `
    <div class="admin-section-card">
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Order ID</th><th>Items</th><th>Amount</th><th>Status</th><th>Payment</th><th>Date</th><th>Update</th></tr></thead>
          <tbody>
            ${orders.map(o => `
              <tr id="order-row-${o.id}">
                <td><strong class="order-id-cell">${o.id}</strong></td>
                <td>
                  <div class="order-items-preview">
                    ${(o.items || []).slice(0, 2).map(item => `<span class="order-item-pill">${item.name}</span>`).join('')}
                    ${o.items && o.items.length > 2 ? `<span class="order-item-more">+${o.items.length - 2} more</span>` : ''}
                  </div>
                </td>
                <td><strong>₹${o.total_amount}</strong></td>
                <td><span class="status-badge status-${(o.status || '').toLowerCase()}">${o.status}</span></td>
                <td><span class="payment-badge payment-${(o.payment_status || '').toLowerCase()}">${o.payment_status}</span></td>
                <td>${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  <select class="admin-status-select status-select-${(o.status || '').toLowerCase()}" onchange="updateOrderStatus('${o.id}', this.value, this)">
                    <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Confirmed" ${o.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                  </select>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function updateOrderStatus(orderId, status, selectEl) {
    try {
        await loadSupabaseClient();
        if (adminSupabase) {
            const { error } = await adminSupabase.from('orders').update({ status }).eq('id', orderId);
            if (error) throw error;
        } else {
            await apiFetch('/api/admin/update-order', {
                method: 'POST',
                body: JSON.stringify({ orderId, status })
            });
        }
        showToast(`Order ${orderId} → ${status}`, 'success');
        if (selectEl) {
            selectEl.className = `admin-status-select status-select-${status.toLowerCase()}`;
        }
        // Update in-memory order list
        if (window._allOrders) {
            const o = window._allOrders.find(x => x.id === orderId);
            if (o) o.status = status;
        }
    } catch (e) {
        showToast('Failed to update order status', 'error');
    }
}

// ═══════════════════════════════════════
// HEADER LINKS (NAV BAR)
// ═══════════════════════════════════════
async function renderHeaderLinks() {
    document.getElementById('topbar-actions').innerHTML = `
      <button class="admin-btn admin-btn-primary" onclick="openAddHeaderLink()"><i class="fas fa-plus"></i> Add Nav Link</button>`;

    const content = document.getElementById('admin-content');
    try {
        let links;
        await loadSupabaseClient();
        if (adminSupabase) {
            const { data, error } = await adminSupabase.from('header_links').select('*').order('display_order', { ascending: true });
            if (error) throw error;
            links = data;
        } else {
            links = []; // Fallback if no API yet
        }
        
        content.innerHTML = `
        <div class="admin-section-card">
          <p class="admin-section-hint">Manage navigation links for your store header.</p>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead><tr><th>Name</th><th>Slug</th><th>Link</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${links.length === 0 
                    ? '<tr><td colspan="6" style="text-align:center;padding:40px;"><i class="fas fa-link" style="font-size:2rem;color:#ddd;margin-bottom:10px;display:block;"></i><p style="color:#888;margin:0;">No nav links yet!</p></td></tr>' 
                    : links.map(l => `
                  <tr>
                    <td><strong>${l.name}</strong></td>
                    <td>${l.slug}</td>
                    <td><code>${l.href}</code></td>
                    <td>${l.display_order}</td>
                    <td><span class="status-badge status-${l.is_active ? 'active' : 'inactive'}">${l.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openEditHeaderLink(${l.id})"><i class="fas fa-edit"></i></button>
                      <button class="admin-btn admin-btn-sm ${l.is_active ? 'admin-btn-warning' : 'admin-btn-success'}" onclick="toggleHeaderLinkActive(${l.id}, ${l.is_active ? 0 : 1})">
                        <i class="fas fa-${l.is_active ? 'eye-slash' : 'eye'}"></i>
                      </button>
                      <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteHeaderLink(${l.id}, '${l.name}')"><i class="fas fa-trash"></i></button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    } catch (e) {
        content.innerHTML = `<div class="admin-error"><i class="fas fa-exclamation-triangle"></i><p>Failed to load nav links.</p><code>${e.message}</code></div>`;
    }
}

function headerLinkFormHTML(l = {}) {
    return `
    <h3>${l.id ? 'Edit Nav Link' : 'Add New Nav Link'}</h3>
    <div class="admin-form">
      <div class="aform-group">
        <label>Name *</label>
        <input class="aform-input" id="hl-name" value="${l.name || ''}" placeholder="e.g. Sarees">
      </div>
      <div class="aform-group">
        <label>Slug</label>
        <input class="aform-input" id="hl-slug" value="${l.slug || ''}" placeholder="e.g. sarees" data-edited="${l.id ? '1' : ''}">
      </div>
      <div class="aform-group">
        <label>Link (href) *</label>
        <input class="aform-input" id="hl-href" value="${l.href || ''}" placeholder="e.g. sarees.html">
      </div>
      <div class="aform-group">
        <label>Display Order</label>
        <input class="aform-input" type="number" id="hl-order" value="${l.display_order || 0}" placeholder="0">
      </div>
      <div class="aform-check">
        <input type="checkbox" id="hl-active" ${l.is_active ? 'checked' : 'checked'}>
        <label for="hl-active">Active</label>
      </div>
      <div class="aform-actions">
        <button class="admin-btn admin-btn-primary" onclick="${l.id ? `handleEditHeaderLink(${l.id})` : 'handleAddHeaderLink()'}">
          <i class="fas fa-save"></i> ${l.id ? 'Update Nav Link' : 'Add Nav Link'}
        </button>
        <button class="admin-btn admin-btn-ghost" onclick="closeModal()">Cancel</button>
      </div>
    </div>
    <script>
      document.getElementById('hl-name').addEventListener('input', function(){
        const slugEl = document.getElementById('hl-slug');
        if(!slugEl.dataset.edited) slugEl.value = this.value.toLowerCase().replace(/\\s+/g,'-').replace(/[^a-z0-9-]/g,'');
      });
      document.getElementById('hl-slug').addEventListener('input', function(){ this.dataset.edited = '1'; });
    <\/script>`;
}

function openAddHeaderLink() { openModal(headerLinkFormHTML()); }
async function openEditHeaderLink(id) {
    try {
        let link;
        await loadSupabaseClient();
        if (adminSupabase) {
            const { data, error } = await adminSupabase.from('header_links').select('*').eq('id', id).single();
            if (error) throw error;
            link = data;
        } else {
            link = null;
        }
        if (!link) return showToast('Nav link not found', 'error');
        openModal(headerLinkFormHTML(link));
    } catch (e) { showToast('Could not load nav link', 'error'); }
}

async function handleAddHeaderLink() {
    const name = document.getElementById('hl-name').value.trim();
    const slug = document.getElementById('hl-slug').value.trim();
    const href = document.getElementById('hl-href').value.trim();
    if (!name || !href) return showToast('Name and Link are required', 'error');
    try {
        await loadSupabaseClient();
        if (adminSupabase) {
            const { error } = await adminSupabase.from('header_links').insert({
                name,
                slug: slug || name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''),
                href,
                display_order: Number(document.getElementById('hl-order').value || 0),
                is_active: document.getElementById('hl-active').checked
            });
            if (error) throw error;
        }
        closeModal(); showToast('Nav link added!', 'success'); renderHeaderLinks();
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
}

async function handleEditHeaderLink(id) {
    const name = document.getElementById('hl-name').value.trim();
    const slug = document.getElementById('hl-slug').value.trim();
    const href = document.getElementById('hl-href').value.trim();
    if (!name || !href) return showToast('Name and Link are required', 'error');
    try {
        await loadSupabaseClient();
        if (adminSupabase) {
            const { error } = await adminSupabase.from('header_links').update({
                name,
                slug,
                href,
                display_order: Number(document.getElementById('hl-order').value || 0),
                is_active: document.getElementById('hl-active').checked
            }).eq('id', id);
            if (error) throw error;
        }
        closeModal(); showToast('Nav link updated!', 'success'); renderHeaderLinks();
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
}

async function toggleHeaderLinkActive(id, newVal) {
    try {
        await loadSupabaseClient();
        if (adminSupabase) {
            const { error } = await adminSupabase.from('header_links').update({ is_active: newVal }).eq('id', id);
            if (error) throw error;
        }
        showToast(newVal ? 'Nav link is now active' : 'Nav link hidden', 'success');
        renderHeaderLinks();
    } catch (e) { showToast('Failed to update nav link', 'error'); }
}

async function deleteHeaderLink(id, name) {
    confirmAction(`Delete nav link "<strong>${name}</strong>"?`, async () => {
        try {
            await loadSupabaseClient();
            if (adminSupabase) {
                const { error } = await adminSupabase.from('header_links').delete().eq('id', id);
                if (error) throw error;
            }
            showToast('Nav link deleted', 'success'); renderHeaderLinks();
        } catch (e) { showToast('Failed to delete', 'error'); }
    });
}

// ═══════════════════════════════════════
// HERO IMAGES (HERO SECTION)
// ═══════════════════════════════════════
async function renderHeroImages() {
    document.getElementById('topbar-actions').innerHTML = `
      <button class="admin-btn admin-btn-primary" onclick="openAddHeroImage()"><i class="fas fa-plus"></i> Add Hero Image</button>`;

    const content = document.getElementById('admin-content');
    try {
        let images;
        await loadSupabaseClient();
        if (adminSupabase) {
            const { data, error } = await adminSupabase.from('hero_images').select('*').order('display_order', { ascending: true });
            if (error) throw error;
            images = data;
        } else {
            images = []; // Fallback if no API yet
        }
        
        content.innerHTML = `
        <div class="admin-section-card">
          <p class="admin-section-hint">Manage images for your homepage hero section. Set custom duration per image (in milliseconds).</p>
          <div class="admin-banners-grid" id="hero-grid">
            ${images.length === 0
                ? '<div class="admin-empty-state"><i class="fas fa-star"></i><p>No hero images yet. Add your first image!</p></div>'
                : images.map(img => `
              <div class="admin-banner-card ${img.is_active ? '' : 'banner-inactive'}">
                <div class="abc-img-wrap">
                  <img src="${img.image_url}" alt="${img.alt || 'Hero Image'}" onerror="this.src='https://via.placeholder.com/600x200?text=No+Image'" loading="lazy">
                  <div class="abc-overlay">
                    <div class="abc-title">${img.alt || 'Hero Image'}</div>
                    <div class="abc-sub">${(img.duration || 3000) / 1000}s</div>
                  </div>
                  <div class="abc-status-badge ${img.is_active ? 'badge-active' : 'badge-inactive'}">${img.is_active ? 'Active' : 'Inactive'}</div>
                </div>
                <div class="abc-meta">
                  <span>Order: ${img.display_order}</span>
                  <span>Duration: ${(img.duration || 3000) / 1000}s</span>
                </div>
                <div class="abc-actions">
                  <button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openEditHeroImage(${img.id})"><i class="fas fa-edit"></i> Edit</button>
                  <button class="admin-btn admin-btn-sm ${img.is_active ? 'admin-btn-warning' : 'admin-btn-success'}" onclick="toggleHeroImageActive(${img.id}, ${img.is_active ? 0 : 1})">
                    <i class="fas fa-${img.is_active ? 'eye-slash' : 'eye'}"></i> ${img.is_active ? 'Hide' : 'Show'}
                  </button>
                  <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteHeroImage(${img.id}, '${img.alt || 'Hero Image'}')"><i class="fas fa-trash"></i></button>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
    } catch (e) {
        content.innerHTML = `<div class="admin-error"><i class="fas fa-exclamation-triangle"></i><p>Failed to load hero images.</p><code>${e.message}</code></div>`;
    }
}

function heroImageFormHTML(img = {}) {
    return `
    <h3>${img.id ? 'Edit Hero Image' : 'Add New Hero Image'}</h3>
    <div class="admin-form">
      <div class="aform-group">
        <label style="font-weight:bold;">Choose Image Source <span style="color:#999;font-weight:normal;">(Select one: upload OR URL)</span></label>
      </div>
      
      <div style="display:flex;gap:15px;align-items:flex-start;margin-bottom:15px;">
        <div style="flex:1;">
          <div class="aform-group" style="margin-bottom:0;">
            <label style="display:flex;align-items:center;gap:8px;">
              <i class="fas fa-upload" style="color:#FF007A;"></i> Upload From Device
            </label>
            <input class="aform-input" id="hi-img-file" type="file" accept="image/*">
          </div>
        </div>
        
        <div style="display:flex;align-items:center;justify-content:center;padding:10px 0;font-size:18px;font-weight:bold;color:#999;">OR</div>
        
        <div style="flex:1;">
          <div class="aform-group" style="margin-bottom:0;">
            <label style="display:flex;align-items:center;gap:8px;">
              <i class="fas fa-link" style="color:#FF007A;"></i> Enter Image URL
            </label>
            <input class="aform-input" id="hi-img" value="${img.image_url || ''}" placeholder="https://images.unsplash.com/..." oninput="updateHeroPreview(this.value)">
          </div>
        </div>
      </div>
      
      <div id="hi-preview-wrap" style="display:${img.image_url ? 'block' : 'none'}">
        <img id="hi-preview" src="${img.image_url || ''}" style="width:100%;height:160px;object-fit:cover;border-radius:8px;border:2px solid #eee;margin-bottom:15px;" onerror="this.style.display='none'">
      </div>
      <div class="aform-group">
        <label>Alt Text</label>
        <input class="aform-input" id="hi-alt" value="${img.alt || ''}" placeholder="e.g. Premium Sarees Collection">
      </div>
      <div class="aform-row">
        <div class="aform-group">
          <label>Duration (seconds)</label>
          <input class="aform-input" type="number" id="hi-duration" value="${(img.duration || 3000) / 1000}" placeholder="3">
        </div>
        <div class="aform-group">
          <label>Display Order</label>
          <input class="aform-input" type="number" id="hi-order" value="${img.display_order || 0}" placeholder="0">
        </div>
      </div>
      <div class="aform-check">
        <input type="checkbox" id="hi-active" ${img.is_active ? 'checked' : 'checked'}>
        <label for="hi-active">Active</label>
      </div>
      <div class="aform-actions">
        <button class="admin-btn admin-btn-primary" onclick="${img.id ? `handleEditHeroImage(${img.id})` : 'handleAddHeroImage()'}">
          <i class="fas fa-save"></i> ${img.id ? 'Update Hero Image' : 'Add Hero Image'}
        </button>
        <button class="admin-btn admin-btn-ghost" onclick="closeModal()">Cancel</button>
      </div>
    </div>
    <script>
      // Store temporary image data URL here
      window._hiTempImage = null;
      
      document.getElementById('hi-img-file').addEventListener('change', async function(){
        const fileInput = this;
        const urlInput = document.getElementById('hi-img');
        const wrap = document.getElementById('hi-preview-wrap');
        const imgEl = document.getElementById('hi-preview');
        if (!fileInput.files.length) return;
        try {
          // Read file as data URL for preview
          const reader = new FileReader();
          reader.onload = function(e) {
            window._hiTempImage = e.target.result;
            wrap.style.display = 'block';
            imgEl.src = e.target.result;
            // Clear the URL input since we're using a file
            urlInput.value = '';
          };
          reader.readAsDataURL(fileInput.files[0]);
        } catch (e) {
          console.error('Upload failed:', e);
          showToast('Image upload failed', 'error');
        }
      });
      document.getElementById('hi-img').addEventListener('input', function(){
        const wrap = document.getElementById('hi-preview-wrap');
        const imgEl = document.getElementById('hi-preview');
        if (this.value) {
          wrap.style.display = 'block';
          imgEl.src = this.value;
          // Clear temp image since we're using a URL
          window._hiTempImage = null;
        } else {
          wrap.style.display = 'none';
        }
      });
      function updateHeroPreview(url){
        const wrap = document.getElementById('hi-preview-wrap');
        const imgEl = document.getElementById('hi-preview');
        if(url) { wrap.style.display = 'block'; imgEl.src = url; }
        else wrap.style.display = 'none';
      }
    <\/script>`;
}

function setupHeroImageForm() {
    console.log('🔧 setupHeroImageForm called!');
    window._hiTempImage = null;
    const fileInput = document.getElementById('hi-img-file');
    const urlInput = document.getElementById('hi-img');
    const previewWrap = document.getElementById('hi-preview-wrap');
    const previewImg = document.getElementById('hi-preview');
    
    if (fileInput) {
        fileInput.addEventListener('change', function(){
            if (!fileInput.files.length) return;
            try {
                const reader = new FileReader();
                reader.onload = function(e) {
                    window._hiTempImage = e.target.result;
                    previewWrap.style.display = 'block';
                    previewImg.src = e.target.result;
                    urlInput.value = '';
                };
                reader.readAsDataURL(fileInput.files[0]);
            } catch (e) {
                console.error('Upload failed:', e);
                showToast('Image upload failed', 'error');
            }
        });
    }
    
    if (urlInput) {
        urlInput.addEventListener('input', function(){
            if (this.value) {
                previewWrap.style.display = 'block';
                previewImg.src = this.value;
                window._hiTempImage = null;
            } else {
                previewWrap.style.display = 'none';
            }
        });
    }
}

function openAddHeroImage() { 
    openModal(heroImageFormHTML()); 
    setupHeroImageForm();
}
async function openEditHeroImage(id) {
    try {
        let img;
        await loadSupabaseClient();
        if (adminSupabase) {
            const { data, error } = await adminSupabase.from('hero_images').select('*').eq('id', id).single();
            if (error) throw error;
            img = data;
        } else {
            img = null;
        }
        if (!img) return showToast('Hero image not found', 'error');
        openModal(heroImageFormHTML(img));
        setupHeroImageForm();
    } catch (e) { showToast('Could not load hero image', 'error'); }
}

async function handleAddHeroImage() {
    const image_url_input = document.getElementById('hi-img').value.trim();
    try {
        await loadSupabaseClient();
        let final_image_url = image_url_input;
        
        // Check if we have a temporary image from file upload
        if (window._hiTempImage) {
            if (adminSupabase) {
                final_image_url = await supabaseUploadFile(window._hiTempImage, 'hero');
            }
        }
        
        // Require at least one of temp image or URL
        if (!final_image_url && !window._hiTempImage) {
            return showToast('Please upload an image or enter an image URL', 'error');
        }
        
        if (adminSupabase) {
            const { error } = await adminSupabase.from('hero_images').insert({
                image_url: final_image_url,
                alt: document.getElementById('hi-alt').value,
                duration: Number(document.getElementById('hi-duration').value || 3) * 1000,
                display_order: Number(document.getElementById('hi-order').value || 0),
                is_active: document.getElementById('hi-active').checked
            });
            if (error) throw error;
        }
        // Clear temp image
        window._hiTempImage = null;
        closeModal(); showToast('Hero image added!', 'success'); renderHeroImages();
    } catch (e) {
        console.error('❌ handleAddHeroImage error:', e);
        showToast('Failed: ' + e.message, 'error');
    }
}

async function handleEditHeroImage(id) {
    const image_url_input = document.getElementById('hi-img').value.trim();
    try {
        await loadSupabaseClient();
        let final_image_url = image_url_input;
        
        // Check if we have a temporary image from file upload
        if (window._hiTempImage) {
            if (adminSupabase) {
                final_image_url = await supabaseUploadFile(window._hiTempImage, 'hero');
            }
        }
        
        // Require at least one of temp image, URL, or existing image
        if (!final_image_url && !window._hiTempImage) {
            // Get existing hero image to check if it has an image
            if (adminSupabase) {
                const { data: existingHero } = await adminSupabase.from('hero_images').select('image_url').eq('id', id).single();
                if (!existingHero || !existingHero.image_url) {
                    return showToast('Please upload an image or enter an image URL', 'error');
                }
                final_image_url = existingHero.image_url;
            } else {
                return showToast('Please upload an image or enter an image URL', 'error');
            }
        }
        
        if (adminSupabase) {
            const { error } = await adminSupabase.from('hero_images').update({
                image_url: final_image_url,
                alt: document.getElementById('hi-alt').value,
                duration: Number(document.getElementById('hi-duration').value || 3) * 1000,
                display_order: Number(document.getElementById('hi-order').value || 0),
                is_active: document.getElementById('hi-active').checked
            }).eq('id', id);
            if (error) throw error;
        }
        // Clear temp image
        window._hiTempImage = null;
        closeModal(); showToast('Hero image updated!', 'success'); renderHeroImages();
    } catch (e) { showToast('Failed: ' + e.message, 'error'); }
}

async function toggleHeroImageActive(id, newVal) {
    try {
        await loadSupabaseClient();
        if (adminSupabase) {
            const { error } = await adminSupabase.from('hero_images').update({ is_active: newVal }).eq('id', id);
            if (error) throw error;
        }
        showToast(newVal ? 'Hero image is now active' : 'Hero image hidden', 'success');
        renderHeroImages();
    } catch (e) { showToast('Failed to update hero image', 'error'); }
}

async function deleteHeroImage(id, altText) {
    confirmAction(`Delete hero image "<strong>${altText}</strong>"?`, async () => {
        try {
            await loadSupabaseClient();
            if (adminSupabase) {
                const { error } = await adminSupabase.from('hero_images').delete().eq('id', id);
                if (error) throw error;
            }
            showToast('Hero image deleted', 'success'); renderHeroImages();
        } catch (e) { showToast('Failed to delete', 'error'); }
    });
}
