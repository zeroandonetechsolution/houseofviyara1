// Simple static admin panel for House Of Viyara
// Uses localStorage so it works without any backend.

const ADMIN_KEY = 'hov_admin_token';
const PRODUCTS_KEY = 'hov_products';
const CATEGORIES_KEY = 'hov_categories';
const HEADER_LINKS_KEY = 'hov_header_links';
const BANNERS_KEY = 'hov_banners';
const HERO_IMAGES_KEY = 'hov_hero_images';
const ORDERS_KEY = 'hov_orders';

let adminToken = localStorage.getItem(ADMIN_KEY);
let currentSection = 'dashboard';
let editItemId = null;

const defaultData = {
  categories: [],
  header_links: [
    { id: 1, label: 'All', slug: 'all', href: 'collections.html' },
    { id: 2, label: 'Saree', slug: 'saree', href: 'saree.html' },
    { id: 3, label: 'Kurtis', slug: 'kurtis', href: 'kurtis.html' },
    { id: 4, label: 'Ethnic Wear', slug: 'ethnic', href: 'ethnic.html' },
    { id: 5, label: 'Party Wear', slug: 'party', href: 'party.html' },
    { id: 6, label: 'Casual Wear', slug: 'casual', href: 'casual.html' }
  ],
  products: [],
  banners: [
    { id: 1, title: 'New Arrivals', subtitle: 'Fresh styles ready to shine this season', image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80', cta_link: 'collections.html', is_active: true, display_order: 1 },
    { id: 2, title: 'Party Wear', subtitle: 'Elegant outfits for evenings to remember', image_url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80', cta_link: 'party.html', is_active: true, display_order: 2 },
    { id: 3, title: 'Ethnic Elegance', subtitle: 'Graceful picks for every special moment', image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80', cta_link: 'ethnic.html', is_active: true, display_order: 3 }
  ],
  hero_images: [
    { id: 1, image_url: 'assets/1.jpeg', alt: 'Hero image 1', is_active: true, display_order: 1 },
    { id: 2, image_url: 'assets/2.jpeg', alt: 'Hero image 2', is_active: true, display_order: 2 },
    { id: 3, image_url: 'assets/6.jpeg', alt: 'Hero image 3', is_active: true, display_order: 3 },
    { id: 4, image_url: 'assets/11.jpeg', alt: 'Hero image 4', is_active: true, display_order: 4 },
    { id: 5, image_url: 'assets/22.jpeg', alt: 'Hero image 5', is_active: true, display_order: 5 }
  ],
  orders: []
};

function getStore(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch (e) { return fallback; }
}

function saveStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isLegacySampleProduct(product) {
  return !!product && (
    /^Product \d+$/.test(product.name || '') ||
    /assets\/\d+\.jpeg/.test(product.image_url || '') ||
    (product.description || '').includes('Showcase product')
  );
}

function isLegacySampleCategory(category) {
  const sampleNames = ['Saree', 'Kurtis', 'Ethnic Wear', 'Party Wear', 'Casual Wear'];
  const sampleSlugs = ['saree', 'kurtis', 'ethnic', 'party', 'casual'];
  const name = (category && category.name || '').trim();
  const slug = (category && category.slug || '').toLowerCase();
  return sampleNames.includes(name) && sampleSlugs.includes(slug);
}

function hasLegacySampleCategorySet(categories) {
  return Array.isArray(categories) && categories.length === 5 && categories.every(isLegacySampleCategory);
}

function seedData() {
  const existingProducts = getStore(PRODUCTS_KEY, null);
  if (!Array.isArray(existingProducts) || existingProducts.some(isLegacySampleProduct)) {
    saveStore(PRODUCTS_KEY, defaultData.products);
  }

  const existingCategories = getStore(CATEGORIES_KEY, null);
  if (!Array.isArray(existingCategories)) {
    saveStore(CATEGORIES_KEY, defaultData.categories);
  } else if (hasLegacySampleCategorySet(existingCategories)) {
    saveStore(CATEGORIES_KEY, defaultData.categories);
  }

  const existingBanners = getStore(BANNERS_KEY, null);
  if (!Array.isArray(existingBanners)) saveStore(BANNERS_KEY, defaultData.banners);

  const existingHeaderLinks = getStore(HEADER_LINKS_KEY, null);
  if (!Array.isArray(existingHeaderLinks)) saveStore(HEADER_LINKS_KEY, defaultData.header_links);

  if (!Array.isArray(getStore(ORDERS_KEY, null))) saveStore(ORDERS_KEY, defaultData.orders);
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
        <a class="admin-nav-item" id="nav-header" onclick="navigate('header')"><i class="fas fa-link"></i><span>Header</span></a>
        <a class="admin-nav-item" id="nav-banners" onclick="navigate('banners')"><i class="fas fa-image"></i><span>Banners</span></a>
        <a class="admin-nav-item" id="nav-hero" onclick="navigate('hero')"><i class="fas fa-photo-film"></i><span>Hero Images</span></a>
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
  if (section === 'header') renderHeaderNavigationPanel();
  if (section === 'banners') renderBanners();
  if (section === 'hero') renderHeroImages();
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
    <div class="admin-dashboard-hero">
      <div>
        <div class="admin-eyebrow">Local-only control center</div>
        <h2>Run your store from one polished dashboard.</h2>
        <p>Manage products, categories, banners, and orders instantly. Everything stays inside your browser, so the storefront works even without a backend server.</p>
      </div>
      <div class="admin-hero-pill">No npm backend</div>
    </div>
    <div class="admin-section-card">
      <div class="admin-section-header">
        <h3>Store Snapshot</h3>
        <span class="admin-status-badge"><i class="fas fa-bolt"></i> Live locally</span>
      </div>
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
      <div class="admin-section-header">
        <h3>Recent Orders</h3>
        <span class="admin-status-badge"><i class="fas fa-shopping-bag"></i> ${orders.length} total</span>
      </div>
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
              <td>${Array.isArray(product.variants) && product.variants.length ? `${product.variants.length} variants` : (product.stock || 0)}</td>
              <td>${product.is_trending ? 'Trending' : 'Normal'}</td>
              <td>
          <button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openProductForm(${product.id})">Edit</button>
          <button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openSimilarProductForm(${product.id})">Add Similar Product</button>
          <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteProduct(${product.id})">Delete</button>
        </td>
            </tr>
          `).join('')}
        </tbody></table>
      </div>
    </div>`;
}

function openProductForm(id, clone = false) {
  const categories = getStore(CATEGORIES_KEY, []);
  const product = id ? getStore(PRODUCTS_KEY, []).find(p => p.id === id) : {};
  editItemId = id && !clone ? id : null;
  const heading = clone ? 'Add Similar Product' : id ? 'Edit Product' : 'Add Product';
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <h3>${heading}</h3>
      <div class="admin-form">
        <div class="aform-group"><label>Name</label><input class="aform-input" id="pf-name" value="${product.name || ''}"></div>
        <div class="aform-group"><label>Description</label><textarea class="aform-input" id="pf-desc">${product.description || ''}</textarea></div>
        <div class="aform-row"><div class="aform-group"><label>Price</label><input class="aform-input" id="pf-price" type="number" value="${product.price || ''}"></div><div class="aform-group"><label>Offer Price</label><input class="aform-input" id="pf-offer" type="number" value="${product.offer_price || ''}"></div></div>
        <div class="aform-row"><div class="aform-group"><label>Category</label><select class="aform-input" id="pf-cat">${categories.map(cat => `<option value="${cat.slug}" ${product.category === cat.slug ? 'selected' : ''}>${cat.name}</option>`).join('')}</select></div><div class="aform-group"><label>Default Stock</label><input class="aform-input" id="pf-stock" type="number" value="${product.stock || 10}"></div></div>
        <div class="aform-group"><label>Sizes (comma separated)</label><input class="aform-input" id="pf-sizes" value="${Array.isArray(product.sizes) ? product.sizes.join(', ') : ''}" placeholder="S, M, L, XL"></div>
        <div class="aform-group"><label>Image URL or File</label><input class="aform-input" id="pf-img" value="${product.image_url || ''}" placeholder="Paste URL or choose file"><input type="file" id="pf-img-file" class="admin-file-input" accept="image/*"></div>
        <input type="hidden" id="pf-parent-id" value="${clone ? product.id : (product.parent_id || '')}">
        <div class="aform-group"><label>Video URL or File</label><input class="aform-input" id="pf-video" value="${product.video_url || ''}" placeholder="Paste URL or choose file"><input type="file" id="pf-video-file" class="admin-file-input" accept="video/*"></div>
        <div class="aform-group"><label>Gallery Images (comma separated)</label><textarea class="aform-input" id="pf-gallery" placeholder="https://...jpg, https://...jpg">${Array.isArray(product.gallery) ? product.gallery.join(', ') : ''}</textarea></div>
        <div class="aform-group"><label>Variants (color|size|stock|image_url|gallery1,gallery2)</label><textarea class="aform-input" id="pf-variants" placeholder="Red|S|10|https://example.com/red.jpg\nBlue|M|5|https://example.com/blue.jpg|https://example.com/blue1.jpg,https://example.com/blue2.jpg">${Array.isArray(product.variants) ? product.variants.map(v => `${v.color || ''}|${v.size || ''}|${v.stock || 0}${v.image_url ? `|${v.image_url}` : ''}${Array.isArray(v.gallery) && v.gallery.length ? `|${v.gallery.join(',')}` : ''}` ).join('\n') : ''}</textarea></div>
        <div class="aform-group"><label><input type="checkbox" id="pf-trending" ${product.is_trending ? 'checked' : ''}> Trending</label></div>
        <div class="aform-actions"><button class="admin-btn admin-btn-primary" onclick="saveProduct()">Save Product</button> <button class="admin-btn admin-btn-ghost" onclick="renderProducts()">Cancel</button></div>
      </div>
    </div>`;

  document.getElementById('pf-img-file').addEventListener('change', handleFilePreview);
  document.getElementById('pf-video-file').addEventListener('change', handleVideoFilePreview);
}

function handleFilePreview(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { document.getElementById('pf-img').value = reader.result; };
  reader.readAsDataURL(file);
}

function handleVideoFilePreview(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { document.getElementById('pf-video').value = reader.result; };
  reader.readAsDataURL(file);
}

function openSimilarProductForm(id) {
  openProductForm(id, true);
}

function parseProductVariants(rawValue, defaultStock) {
  const lines = String(rawValue || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) {
    return [{ color: 'Default', size: 'One Size', stock: Number(defaultStock || 10), image_url: '', gallery: [] }];
  }

  return lines.map(line => {
    const parts = line.split('|').map(part => part.trim());
    const color = parts[0] || 'Default';
    const size = parts[1] || 'One Size';
    const stock = Number(parts[2] || defaultStock || 0);
    const image_url = parts[3] || '';
    const gallery = parts[4] ? parts[4].split(',').map(url => url.trim()).filter(Boolean) : [];
    return { color, size, stock, image_url, gallery };
  });
}

function saveProduct() {
  const name = document.getElementById('pf-name').value.trim();
  const price = Number(document.getElementById('pf-price').value || 0);
  const image_url = document.getElementById('pf-img').value.trim();
  const video_url = document.getElementById('pf-video').value.trim();
  if (!name || !price || !image_url) return showToast('Name, price and image are required', 'error');

  const products = getStore(PRODUCTS_KEY, []);
  const defaultStock = Number(document.getElementById('pf-stock').value || 0);
  const gallery = document.getElementById('pf-gallery').value.split(',').map(url => url.trim()).filter(Boolean);
  const sizes = document.getElementById('pf-sizes').value.split(',').map(size => size.trim()).filter(Boolean);
  const parentIdValue = document.getElementById('pf-parent-id')?.value;
  const data = {
    id: editItemId || Date.now(),
    name,
    description: document.getElementById('pf-desc').value.trim(),
    price,
    offer_price: Number(document.getElementById('pf-offer').value || price),
    category: document.getElementById('pf-cat').value,
    stock: defaultStock,
    sizes: sizes.length ? sizes : undefined,
    image_url,
    video_url: video_url || undefined,
    parent_id: parentIdValue ? Number(parentIdValue) : undefined,
    gallery: gallery.length ? gallery : [image_url],
    variants: parseProductVariants(document.getElementById('pf-variants').value, defaultStock),
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
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Preview</th><th>Name</th><th>Slug</th><th>Action</th></tr></thead><tbody>
        ${categories.map(cat => `<tr><td>${cat.banner_image ? `<img src="${cat.banner_image}" class="admin-thumb" onerror="this.src='https://via.placeholder.com/80x60?text=No+Image'">` : '—'}</td><td>${cat.name}</td><td>${cat.slug}</td><td><button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openCategoryForm(${cat.id})">Edit</button><button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteCategory(${cat.id})">Delete</button></td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
}

function renderHeaderNavigationPanel() {
  const headerLinks = getStore(HEADER_LINKS_KEY, []);
  document.getElementById('topbar-actions').innerHTML = `<button class="admin-btn admin-btn-primary" onclick="openHeaderLinkForm()"><i class="fas fa-plus"></i> Add Header Link</button>`;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <div class="admin-section-header">
        <h3>Header Navigation</h3>
        <span class="admin-status-badge"><i class="fas fa-link"></i> Manage top header links</span>
      </div>
      <p class="admin-section-note">These entries are used in the storefront header navigation. Edit labels, slugs, or link targets here.</p>
      <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Label</th><th>Slug</th><th>Link</th><th>Action</th></tr></thead><tbody>
        ${headerLinks.map(link => `<tr><td>${link.label}</td><td>${link.slug}</td><td>${link.href}</td><td><button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openHeaderLinkForm(${link.id})">Edit</button><button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteHeaderLink(${link.id})">Delete</button></td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
}

function openHeaderLinkForm(id) {
  const headerLink = id ? getStore(HEADER_LINKS_KEY, []).find(link => link.id === id) : {};
  editItemId = id || null;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <h3>${id ? 'Edit Header Link' : 'Add Header Link'}</h3>
      <div class="admin-form">
        <div class="aform-group"><label>Label</label><input class="aform-input" id="hf-name" value="${headerLink.label || ''}"></div>
        <div class="aform-group"><label>Slug</label><input class="aform-input" id="hf-slug" value="${headerLink.slug || ''}"></div>
        <div class="aform-group"><label>Link</label><input class="aform-input" id="hf-href" value="${headerLink.href || ''}" placeholder="collections.html"></div>
        <div class="aform-actions"><button class="admin-btn admin-btn-primary" onclick="saveHeaderLink()">Save Header Link</button> <button class="admin-btn admin-btn-ghost" onclick="renderHeaderNavigationPanel()">Cancel</button></div>
      </div>
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
        <div class="aform-group"><label>Image URL or File</label><input class="aform-input" id="cf-img" value="${category.banner_image || category.image_url || ''}" placeholder="Paste URL or choose file"><input type="file" id="cf-img-file" class="admin-file-input" accept="image/*"></div>
        <div class="aform-actions"><button class="admin-btn admin-btn-primary" onclick="saveCategory()">Save Category</button> <button class="admin-btn admin-btn-ghost" onclick="renderCategories()">Cancel</button></div>
      </div>
    </div>`;

  document.getElementById('cf-img-file').addEventListener('change', handleCategoryFilePreview);
}

function saveCategory() {
  const name = document.getElementById('cf-name').value.trim();
  const slug = document.getElementById('cf-slug').value.trim();
  const banner_image = document.getElementById('cf-img').value.trim();
  if (!name || !slug) return showToast('Name and slug are required', 'error');
  const categories = getStore(CATEGORIES_KEY, []);
  const data = { id: editItemId || Date.now(), name, slug, banner_image };
  if (editItemId) {
    const index = categories.findIndex(c => c.id === editItemId);
    categories[index] = data;
    showToast('Category updated', 'success');
  } else { categories.unshift(data); showToast('Category added', 'success'); }
  saveStore(CATEGORIES_KEY, categories);
  renderCategories();
}

function saveHeaderLink() {
  const label = document.getElementById('hf-name').value.trim();
  const slug = document.getElementById('hf-slug').value.trim();
  const href = document.getElementById('hf-href').value.trim();
  if (!label || !href) return showToast('Label and link are required', 'error');
  const links = getStore(HEADER_LINKS_KEY, []);
  const data = { id: editItemId || Date.now(), label, slug: slug || label.toLowerCase().replace(/\s+/g, '-'), href };
  if (editItemId) {
    const index = links.findIndex(link => link.id === editItemId);
    links[index] = data;
    showToast('Header link updated', 'success');
  } else { links.unshift(data); showToast('Header link added', 'success'); }
  saveStore(HEADER_LINKS_KEY, links);
  renderHeaderNavigationPanel();
}

function deleteCategory(id) {
  const categories = getStore(CATEGORIES_KEY, []).filter(c => c.id !== id);
  saveStore(CATEGORIES_KEY, categories);
  showToast('Category deleted', 'success');
  renderCategories();
}

function deleteHeaderLink(id) {
  const links = getStore(HEADER_LINKS_KEY, []).filter(link => link.id !== id);
  saveStore(HEADER_LINKS_KEY, links);
  showToast('Header link deleted', 'success');
  renderHeaderNavigationPanel();
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

function renderHeroImages() {
  const heroImages = getStore(HERO_IMAGES_KEY, []);
  document.getElementById('topbar-actions').innerHTML = `<button class="admin-btn admin-btn-primary" onclick="openHeroImageForm()"><i class="fas fa-plus"></i> Add Hero Image</button>`;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <p class="admin-section-hint">Manage the homepage hero placeholder images shown in the top section.</p>
      <div class="admin-banners-grid">${heroImages.map(h => `
        <div class="admin-banner-card ${h.is_active ? '' : 'banner-inactive'}">
          <div class="abc-img-wrap"><img src="${h.image_url}" onerror="this.src='https://via.placeholder.com/300x180?text=No+Image'"></div>
          <div class="abc-meta"><strong>${h.alt || 'Hero Image'}</strong><p>Order: ${h.display_order}</p><small>${h.is_active ? 'Active' : 'Inactive'}</small></div>
          <div class="abc-actions">
            <button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openHeroImageForm(${h.id})">Edit</button>
            <button class="admin-btn admin-btn-sm ${h.is_active ? 'admin-btn-warning' : 'admin-btn-success'}" onclick="toggleHeroImageActive(${h.id}, ${h.is_active ? 0 : 1})">${h.is_active ? '<i class="fas fa-eye-slash"></i> Hide' : '<i class="fas fa-eye"></i> Show'}</button>
            <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteHeroImage(${h.id})">Delete</button>
          </div>
        </div>
      `).join('')}</div>
    </div>`;
}

function openHeroImageForm(id) {
  const heroImages = getStore(HERO_IMAGES_KEY, []);
  const hero = id ? heroImages.find(h => h.id === id) : {};
  editItemId = id || null;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <h3>${id ? 'Edit Hero Image' : 'Add Hero Image'}</h3>
      <div class="admin-form">
        <div class="aform-group"><label>Image URL or File</label><input class="aform-input" id="hf-img" value="${hero.image_url || ''}" placeholder="https://...jpg"><input type="file" id="hf-img-file" class="admin-file-input" accept="image/*"></div>
        <div id="hf-preview-wrap" style="display:${hero.image_url ? 'block' : 'none'}"><img id="hf-preview" src="${hero.image_url || ''}" style="width:100%;height:160px;object-fit:cover;border-radius:8px;border:2px solid #eee;margin-bottom:15px;" onerror="this.style.display='none'"></div>
        <div class="aform-group"><label>Alt Text</label><input class="aform-input" id="hf-alt" value="${hero.alt || ''}" placeholder="Describe the image"></div>
        <div class="aform-row"><div class="aform-group"><label>Display Order</label><input class="aform-input" id="hf-order" type="number" value="${hero.display_order || 0}" placeholder="1"></div><div class="aform-group"><label>Active</label><input type="checkbox" id="hf-active" ${hero.id === undefined || hero.is_active ? 'checked' : ''}></div></div>
        <div class="aform-actions"><button class="admin-btn admin-btn-primary" onclick="saveHeroImage()">${id ? 'Update Hero Image' : 'Add Hero Image'}</button> <button class="admin-btn admin-btn-ghost" onclick="renderHeroImages()">Cancel</button></div>
      </div>
    </div>`;
  document.getElementById('hf-img-file').addEventListener('change', handleHeroImageFilePreview);
}

function handleHeroImageFilePreview(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById('hf-img').value = reader.result;
    document.getElementById('hf-preview').src = reader.result;
    document.getElementById('hf-preview-wrap').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function saveHeroImage() {
  const image_url = document.getElementById('hf-img').value.trim();
  if (!image_url) return showToast('Image URL is required', 'error');
  const heroImages = getStore(HERO_IMAGES_KEY, []);
  const data = {
    id: editItemId || Date.now(),
    image_url,
    alt: document.getElementById('hf-alt').value.trim(),
    is_active: document.getElementById('hf-active').checked,
    display_order: Number(document.getElementById('hf-order').value || 0)
  };
  if (editItemId) {
    const index = heroImages.findIndex(h => h.id === editItemId);
    heroImages[index] = data;
    showToast('Hero image updated', 'success');
  } else {
    heroImages.unshift(data);
    showToast('Hero image added', 'success');
  }
  saveStore(HERO_IMAGES_KEY, heroImages);
  renderHeroImages();
}

function toggleHeroImageActive(id, newValue) {
  const heroImages = getStore(HERO_IMAGES_KEY, []);
  const index = heroImages.findIndex(h => h.id === id);
  if (index === -1) return;
  heroImages[index].is_active = Boolean(newValue);
  saveStore(HERO_IMAGES_KEY, heroImages);
  showToast(heroImages[index].is_active ? 'Hero image visible' : 'Hero image hidden', 'success');
  renderHeroImages();
}

function deleteHeroImage(id) {
  const heroImages = getStore(HERO_IMAGES_KEY, []).filter(h => h.id !== id);
  saveStore(HERO_IMAGES_KEY, heroImages);
  showToast('Hero image deleted', 'success');
  renderHeroImages();
}

function handleBannerFilePreview(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { document.getElementById('bf-img').value = reader.result; };
  reader.readAsDataURL(file);
}

function handleCategoryFilePreview(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { document.getElementById('cf-img').value = reader.result; };
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
