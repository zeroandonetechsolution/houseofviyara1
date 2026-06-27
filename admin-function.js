// Simple static admin panel for House Of Viyara
// Uses localStorage so it works without any backend.

const ADMIN_KEY = 'hov_admin_token';
const PRODUCTS_KEY = 'hov_products';
const CATEGORIES_KEY = 'hov_categories';
const BANNERS_KEY = 'hov_banners';
const ORDERS_KEY = 'hov_orders';

let adminToken = localStorage.getItem(ADMIN_KEY);
let currentSection = 'dashboard';
let editItemId = null;

const defaultData = {
  categories: [
    { id: 1, name: 'Saree', slug: 'saree' },
    { id: 2, name: 'Kurtis', slug: 'kurtis' },
    { id: 3, name: 'Ethnic', slug: 'ethnic' },
    { id: 4, name: 'Party', slug: 'party' },
    { id: 5, name: 'Casual', slug: 'casual' }
  ],
  products: [
    { id: 1, name: 'Banarasi Silk Saree', category: 'saree', price: 4500, offer_price: 3999, stock: 12, image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80', is_trending: true },
    { id: 2, name: 'Floral Organza Saree', category: 'saree', price: 2800, offer_price: 2499, stock: 8, image_url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=400&q=80', is_trending: false },
    { id: 3, name: 'Chikankari Cotton Kurti', category: 'kurtis', price: 1800, offer_price: 1599, stock: 20, image_url: 'https://images.unsplash.com/photo-1608748010899-18f300247112?w=400&q=80', is_trending: true }
  ],
  banners: [
    { id: 1, title: 'New Arrivals', subtitle: 'Latest Saree & Kurti collections', image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80', cta_link: 'collections.html', is_active: true, display_order: 1 },
    { id: 2, title: 'Party Season', subtitle: 'Shine with our party wear', image_url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80', cta_link: 'party.html', is_active: true, display_order: 2 }
  ],
  orders: [
    { id: 'HOV-001', customer: 'Riya Sharma', total: 8700, status: 'Pending', date: '2026-06-28', items: [{ name: 'Banarasi Silk Saree', qty: 1 }] },
    { id: 'HOV-002', customer: 'Anita Rao', total: 3200, status: 'Confirmed', date: '2026-06-27', items: [{ name: 'Chikankari Cotton Kurti', qty: 2 }] }
  ]
};

function getStore(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch (e) { return fallback; }
}

function saveStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedData() {
  if (!localStorage.getItem(CATEGORIES_KEY)) saveStore(CATEGORIES_KEY, defaultData.categories);
  if (!localStorage.getItem(PRODUCTS_KEY)) saveStore(PRODUCTS_KEY, defaultData.products);
  if (!localStorage.getItem(BANNERS_KEY)) saveStore(BANNERS_KEY, defaultData.banners);
  if (!localStorage.getItem(ORDERS_KEY)) saveStore(ORDERS_KEY, defaultData.orders);
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `admin-toast admin-toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function login() {
  const username = document.getElementById('admin-user').value.trim();
  const password = document.getElementById('admin-pass').value;
  if (username === 'admin' && password === 'admin') {
    adminToken = 'hov-admin-token';
    localStorage.setItem(ADMIN_KEY, adminToken);
    renderApp();
  } else {
    showToast('Invalid username or password', 'error');
  }
}

function logout() {
  localStorage.removeItem(ADMIN_KEY);
  adminToken = null;
  renderLogin();
}

function renderLogin() {
  document.body.innerHTML = `
  <div class="admin-login-wrap">
    <div class="admin-login-card">
      <div class="admin-login-logo"><span>HOV</span><p>House Of Viyara</p></div>
      <h2>Admin Portal</h2>
      <p class="admin-login-sub">Sign in to manage your store</p>
      <div class="afield"><label>USERNAME</label><input id="admin-user" type="text" placeholder="admin"></div>
      <div class="afield"><label>PASSWORD</label><input id="admin-pass" type="password" placeholder="admin"></div>
      <button class="admin-btn admin-btn-primary" onclick="login()">SIGN IN</button>
    </div>
  </div>
  <div id="toast-container"></div>`;
}

function renderApp() {
  seedData();
  document.body.innerHTML = `
  <div class="admin-shell">
    <aside class="admin-sidebar" id="admin-sidebar">
      <div class="admin-sidebar-logo">
        <div class="sidebar-logo-icon">HOV</div>
        <div class="sidebar-logo-text"><strong>House Of Viyara</strong><span>Admin Panel</span></div>
      </div>
      <nav class="admin-nav">
        <a class="admin-nav-item" id="nav-dashboard" onclick="navigate('dashboard')"><i class="fas fa-chart-line"></i><span>Dashboard</span></a>
        <a class="admin-nav-item" id="nav-products" onclick="navigate('products')"><i class="fas fa-box-open"></i><span>Products</span></a>
        <a class="admin-nav-item" id="nav-categories" onclick="navigate('categories')"><i class="fas fa-th-large"></i><span>Categories</span></a>
        <a class="admin-nav-item" id="nav-banners" onclick="navigate('banners')"><i class="fas fa-image"></i><span>Banners</span></a>
        <a class="admin-nav-item" id="nav-orders" onclick="navigate('orders')"><i class="fas fa-shopping-bag"></i><span>Orders</span></a>
      </nav>
      <div class="admin-sidebar-footer">
        <button class="sidebar-footer-link" onclick="window.open('index.html', '_blank')"><i class="fas fa-external-link-alt"></i>View Store</button>
        <button class="sidebar-footer-link" onclick="logout()"><i class="fas fa-sign-out-alt"></i>Logout</button>
      </div>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar"><button class="admin-sidebar-toggle" onclick="toggleSidebar()"><i class="fas fa-bars"></i></button><div class="admin-topbar-title" id="topbar-title">Dashboard</div><div id="topbar-actions"></div></header>
      <div class="admin-content" id="admin-content"></div>
    </div>
  </div>
  <div id="toast-container"></div>`;

  navigate('dashboard');
}

function toggleSidebar() {
  document.getElementById('admin-sidebar').classList.toggle('open');
}

function navigate(section) {
  currentSection = section;
  document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`nav-${section}`).classList.add('active');
  document.getElementById('topbar-title').textContent = section.charAt(0).toUpperCase() + section.slice(1);
  document.getElementById('topbar-actions').innerHTML = '';

  if (section === 'dashboard') renderDashboard();
  if (section === 'products') renderProducts();
  if (section === 'categories') renderCategories();
  if (section === 'banners') renderBanners();
  if (section === 'orders') renderOrders();
}

function renderDashboard() {
  const products = getStore(PRODUCTS_KEY, []);
  const categories = getStore(CATEGORIES_KEY, []);
  const banners = getStore(BANNERS_KEY, []);
  const orders = getStore(ORDERS_KEY, []);
  const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'Pending').length;
  const trending = products.filter(p => p.is_trending).length;

  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <div class="admin-stats-grid">
        <div class="admin-stat-card"><span>Total Sales</span><strong>₹${totalSales}</strong></div>
        <div class="admin-stat-card"><span>Products</span><strong>${products.length}</strong></div>
        <div class="admin-stat-card"><span>Categories</span><strong>${categories.length}</strong></div>
        <div class="admin-stat-card"><span>Banners</span><strong>${banners.length}</strong></div>
        <div class="admin-stat-card"><span>Orders</span><strong>${orders.length}</strong></div>
        <div class="admin-stat-card"><span>Pending</span><strong>${pendingOrders}</strong></div>
        <div class="admin-stat-card"><span>Trending</span><strong>${trending}</strong></div>
      </div>
    </div>
    <div class="admin-section-card">
      <h3>Recent Orders</h3>
      <div class="admin-table-wrap">
        <table class="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>
          ${orders.slice(0, 5).map(order => `
            <tr><td>${order.id}</td><td>${order.customer}</td><td>₹${order.total}</td><td>${order.status}</td><td>${order.date}</td></tr>
          `).join('')}
        </tbody></table>
      </div>
    </div>`;
}

function renderProducts() {
  const products = getStore(PRODUCTS_KEY, []);
  const categories = getStore(CATEGORIES_KEY, []);

  document.getElementById('topbar-actions').innerHTML = `<button class="admin-btn admin-btn-primary" onclick="openProductForm()"><i class="fas fa-plus"></i> Add Product</button>`;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <div class="admin-table-wrap">
        <table class="admin-table"><thead><tr><th>Preview</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Action</th></tr></thead><tbody>
          ${products.map(product => `
            <tr>
              <td><img src="${product.image_url}" class="admin-thumb" onerror="this.src='https://via.placeholder.com/80x60?text=No+Image'"></td>
              <td>${product.name}</td>
              <td>${product.category}</td>
              <td>₹${product.price}</td>
              <td>${product.stock}</td>
              <td>${product.is_trending ? 'Trending' : 'Normal'}</td>
              <td><button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openProductForm(${product.id})">Edit</button> <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteProduct(${product.id})">Delete</button></td>
            </tr>
          `).join('')}
        </tbody></table>
      </div>
    </div>`;
}

function openProductForm(id) {
  const categories = getStore(CATEGORIES_KEY, []);
  const product = id ? getStore(PRODUCTS_KEY, []).find(p => p.id === id) : {};
  editItemId = id || null;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <h3>${id ? 'Edit Product' : 'Add Product'}</h3>
      <div class="admin-form">
        <div class="aform-group"><label>Name</label><input class="aform-input" id="pf-name" value="${product.name || ''}"></div>
        <div class="aform-group"><label>Description</label><textarea class="aform-input" id="pf-desc">${product.description || ''}</textarea></div>
        <div class="aform-row"><div class="aform-group"><label>Price</label><input class="aform-input" id="pf-price" type="number" value="${product.price || ''}"></div><div class="aform-group"><label>Offer Price</label><input class="aform-input" id="pf-offer" type="number" value="${product.offer_price || ''}"></div></div>
        <div class="aform-row"><div class="aform-group"><label>Category</label><select class="aform-input" id="pf-cat">${categories.map(cat => `<option value="${cat.slug}" ${product.category === cat.slug ? 'selected' : ''}>${cat.name}</option>`).join('')}</select></div><div class="aform-group"><label>Stock</label><input class="aform-input" id="pf-stock" type="number" value="${product.stock || 10}"></div></div>
        <div class="aform-group"><label>Image URL or File</label><input class="aform-input" id="pf-img" value="${product.image_url || ''}" placeholder="Paste URL or choose file"><input type="file" id="pf-img-file" class="admin-file-input" accept="image/*"></div>
        <div class="aform-group"><label><input type="checkbox" id="pf-trending" ${product.is_trending ? 'checked' : ''}> Trending</label></div>
        <div class="aform-actions"><button class="admin-btn admin-btn-primary" onclick="saveProduct()">Save Product</button> <button class="admin-btn admin-btn-ghost" onclick="renderProducts()">Cancel</button></div>
      </div>
    </div>`;

  document.getElementById('pf-img-file').addEventListener('change', handleFilePreview);
}

function handleFilePreview(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { document.getElementById('pf-img').value = reader.result; };
  reader.readAsDataURL(file);
}

function saveProduct() {
  const name = document.getElementById('pf-name').value.trim();
  const price = Number(document.getElementById('pf-price').value || 0);
  const image_url = document.getElementById('pf-img').value.trim();
  if (!name || !price || !image_url) return showToast('Name, price and image are required', 'error');

  const products = getStore(PRODUCTS_KEY, []);
  const data = {
    id: editItemId || Date.now(),
    name,
    description: document.getElementById('pf-desc').value.trim(),
    price,
    offer_price: Number(document.getElementById('pf-offer').value || price),
    category: document.getElementById('pf-cat').value,
    stock: Number(document.getElementById('pf-stock').value || 0),
    image_url,
    is_trending: document.getElementById('pf-trending').checked
  };

  if (editItemId) {
    const index = products.findIndex(p => p.id === editItemId);
    products[index] = data;
    showToast('Product updated', 'success');
  } else {
    products.unshift(data);
    showToast('Product added', 'success');
  }
  saveStore(PRODUCTS_KEY, products);
  renderProducts();
}

function deleteProduct(id) {
  const products = getStore(PRODUCTS_KEY, []).filter(p => p.id !== id);
  saveStore(PRODUCTS_KEY, products);
  showToast('Product deleted', 'success');
  renderProducts();
}

function renderCategories() {
  const categories = getStore(CATEGORIES_KEY, []);
  document.getElementById('topbar-actions').innerHTML = `<button class="admin-btn admin-btn-primary" onclick="openCategoryForm()"><i class="fas fa-plus"></i> Add Category</button>`;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Name</th><th>Slug</th><th>Action</th></tr></thead><tbody>
        ${categories.map(cat => `<tr><td>${cat.name}</td><td>${cat.slug}</td><td><button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openCategoryForm(${cat.id})">Edit</button><button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteCategory(${cat.id})">Delete</button></td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
}

function openCategoryForm(id) {
  const category = id ? getStore(CATEGORIES_KEY, []).find(c => c.id === id) : {};
  editItemId = id || null;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <h3>${id ? 'Edit Category' : 'Add Category'}</h3>
      <div class="admin-form">
        <div class="aform-group"><label>Name</label><input class="aform-input" id="cf-name" value="${category.name || ''}"></div>
        <div class="aform-group"><label>Slug</label><input class="aform-input" id="cf-slug" value="${category.slug || ''}"></div>
        <div class="aform-actions"><button class="admin-btn admin-btn-primary" onclick="saveCategory()">Save Category</button> <button class="admin-btn admin-btn-ghost" onclick="renderCategories()">Cancel</button></div>
      </div>
    </div>`;
}

function saveCategory() {
  const name = document.getElementById('cf-name').value.trim();
  const slug = document.getElementById('cf-slug').value.trim();
  if (!name || !slug) return showToast('Name and slug are required', 'error');
  const categories = getStore(CATEGORIES_KEY, []);
  const data = { id: editItemId || Date.now(), name, slug };
  if (editItemId) {
    const index = categories.findIndex(c => c.id === editItemId);
    categories[index] = data;
    showToast('Category updated', 'success');
  } else { categories.unshift(data); showToast('Category added', 'success'); }
  saveStore(CATEGORIES_KEY, categories);
  renderCategories();
}

function deleteCategory(id) {
  const categories = getStore(CATEGORIES_KEY, []).filter(c => c.id !== id);
  saveStore(CATEGORIES_KEY, categories);
  showToast('Category deleted', 'success');
  renderCategories();
}

function renderBanners() {
  const banners = getStore(BANNERS_KEY, []);
  document.getElementById('topbar-actions').innerHTML = `<button class="admin-btn admin-btn-primary" onclick="openBannerForm()"><i class="fas fa-plus"></i> Add Banner</button>`;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card admin-banners-grid">${banners.map(b => `
      <div class="admin-banner-card ${b.is_active ? '' : 'banner-inactive'}">
        <div class="abc-img-wrap"><img src="${b.image_url}" onerror="this.src='https://via.placeholder.com/300x180?text=No+Image'"></div>
        <div class="abc-meta"><strong>${b.title}</strong><p>${b.subtitle}</p><small>${b.cta_link}</small></div>
        <div class="abc-actions"><button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openBannerForm(${b.id})">Edit</button><button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteBanner(${b.id})">Delete</button></div>
      </div>
    `).join('')}</div>`;
}

function openBannerForm(id) {
  const banner = id ? getStore(BANNERS_KEY, []).find(b => b.id === id) : {};
  editItemId = id || null;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <h3>${id ? 'Edit Banner' : 'Add Banner'}</h3>
      <div class="admin-form">
        <div class="aform-group"><label>Title</label><input class="aform-input" id="bf-title" value="${banner.title || ''}"></div>
        <div class="aform-group"><label>Subtitle</label><input class="aform-input" id="bf-sub" value="${banner.subtitle || ''}"></div>
        <div class="aform-group"><label>Image URL or File</label><input class="aform-input" id="bf-img" value="${banner.image_url || ''}" placeholder="Paste URL or choose file"><input type="file" id="bf-img-file" class="admin-file-input" accept="image/*"></div>
        <div class="aform-group"><label>Link</label><input class="aform-input" id="bf-link" value="${banner.cta_link || ''}"></div>
        <div class="aform-actions"><button class="admin-btn admin-btn-primary" onclick="saveBanner()">Save Banner</button> <button class="admin-btn admin-btn-ghost" onclick="renderBanners()">Cancel</button></div>
      </div>
    </div>`;
  document.getElementById('bf-img-file').addEventListener('change', handleBannerFilePreview);
}

function handleBannerFilePreview(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { document.getElementById('bf-img').value = reader.result; };
  reader.readAsDataURL(file);
}

function saveBanner() {
  const title = document.getElementById('bf-title').value.trim();
  const image_url = document.getElementById('bf-img').value.trim();
  if (!title || !image_url) return showToast('Title and image are required', 'error');
  const banners = getStore(BANNERS_KEY, []);
  const data = { id: editItemId || Date.now(), title, subtitle: document.getElementById('bf-sub').value.trim(), image_url, cta_link: document.getElementById('bf-link').value.trim(), is_active: true, display_order: banners.length + 1 };
  if (editItemId) {
    const index = banners.findIndex(b => b.id === editItemId);
    banners[index] = data;
    showToast('Banner updated', 'success');
  } else { banners.unshift(data); showToast('Banner added', 'success'); }
  saveStore(BANNERS_KEY, banners);
  renderBanners();
}

function deleteBanner(id) {
  const banners = getStore(BANNERS_KEY, []).filter(b => b.id !== id);
  saveStore(BANNERS_KEY, banners);
  showToast('Banner deleted', 'success');
  renderBanners();
}

function renderOrders() {
  const orders = getStore(ORDERS_KEY, []);
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>
        ${orders.map(order => `<tr><td>${order.id}</td><td>${order.customer}</td><td>₹${order.total}</td><td>${order.status}</td><td>${order.date}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
}

window.onload = () => {
  if (adminToken) renderApp(); else renderLogin();
};
