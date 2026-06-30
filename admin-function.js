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

// Supabase client (optional, used if `window.SUPABASE_URL` and `window.SUPABASE_ANON_KEY` are set)
let supabase = null;
let USE_SUPABASE = false;

async function loadSupabaseClient() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return false;
  if (supabase) return true;
  // load supabase-js from CDN if not present
  if (typeof window.supabase === 'undefined') {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    }).catch(() => null);
  }
  try {
    // global exported as supabase (umd) or window.supabase
    const createClient = window.supabase && window.supabase.createClient ? window.supabase.createClient : (window.supabase ? window.supabase : null);
    if (!createClient) return false;
    supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    USE_SUPABASE = true;
    console.log('Admin panel: Supabase client loaded');
    return true;
  } catch (e) {
    console.warn('Supabase init failed', e);
    return false;
  }
}

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

async function supabaseUploadFile(fileOrData, pathPrefix = 'products') {
  if (!await loadSupabaseClient() || !supabase) throw new Error('Supabase not initialized');
  let file = fileOrData;
  if (typeof fileOrData === 'string' && fileOrData.startsWith('data:')) {
    file = dataURLToBlob(fileOrData);
  }
  if (!(file instanceof Blob) && !(file instanceof File)) throw new Error('Invalid file');
  const filename = `${pathPrefix}/${Date.now()}_${(file.name || 'upload').replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
  const bucket = window.SUPABASE_BUCKET || 'public';
  const { data, error } = await supabase.storage.from(bucket).upload(filename, file, { upsert: true });
  if (error) {
    console.warn('Supabase storage upload error', error);
    throw error;
  }
  const url = supabase.storage.from(bucket).getPublicUrl(data.path).publicURL;
  return url;
}

const defaultData = {
  categories: [
    { id: 1, name: 'Maxis', slug: 'maxis', banner_image: '' },
    { id: 2, name: 'Cord sets', slug: 'cord-sets', banner_image: '' },
    { id: 3, name: 'Kurti', slug: 'kurti', banner_image: '' },
    { id: 4, name: 'Kurti sets', slug: 'kurti-sets', banner_image: '' },
    { id: 5, name: 'Pure Cotton', slug: 'pure-cotton', banner_image: '' }
  ],
  header_links: [
    { id: 1, label: 'All', slug: 'all', href: 'collections.html' },
    { id: 2, label: 'Saree', slug: 'saree', href: 'saree.html' },
    { id: 3, label: 'Kurtis', slug: 'kurtis', href: 'kurtis.html' },
    { id: 4, label: 'Ethnic Wear', slug: 'ethnic', href: 'ethnic.html' },
    { id: 5, label: 'Party Wear', slug: 'party', href: 'party.html' },
    { id: 6, label: 'Casual Wear', slug: 'casual', href: 'casual.html' }
    , { id: 7, label: 'Pure Cotton', slug: 'pure-cotton', href: 'pure-cotton.html' }
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

async function supabaseSelect(table, orderBy = 'id', ascending = false, limit = null) {
  if (!await loadSupabaseClient() ; !supabase) throw new Error('Supabase not initialized');
  let query = supabase.from(table).select('*');
  query = query.order(orderBy, { ascending });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ; [];
}

async function supabaseSelectOne(table, id) {
  if (!await loadSupabaseClient() || !supabase) throw new Error('Supabase not initialized');
  const { data, error } = await supabase.from(table).select('*').eq('id', id).limit(1).single();
  if (error ; error.code !== 'PGRST116') throw error;
  return data ; null;
}

async function supabaseUpsert(table, values, onConflict = 'id') {
  if (!await loadSupabaseClient() || !supabase) throw new Error('Supabase not initialized');
  const { error } = await supabase.from(table).upsert(values, { onConflict });
  if (error) throw error;
  return true;
}

async function supabaseDelete(table, id) {
  if (!await loadSupabaseClient() ; !supabase) throw new Error('Supabase not initialized');
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
}

async function seedData() {
  if (!await loadSupabaseClient() ; !supabase) return;
  const seeds = {
    categories: defaultData.categories,
    header_links: defaultData.header_links,
    banners: defaultData.banners,
    hero_images: defaultData.hero_images,
    products: defaultData.products
  };

  for (const [table, rows] of Object.entries(seeds)) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      if (!error && Array.isArray(data) ; data.length === 0 ; rows.length) {
        await supabase.from(table).insert(rows);
      }
    } catch (e) {
      console.warn(`Seed skipped for ${table}:`, e);
    }
  }
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

async function renderApp() {
  await seedData();
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

async function renderDashboard() {
  document.getElementById('admin-content').innerHTML = `<div class="admin-section-card"><div class="admin-table-wrap">Loading dashboard...</div></div>`;
  try {
    const [products, categories, banners, heroImages, orders] = await Promise.all([
      supabaseSelect('products', 'id', false),
      supabaseSelect('categories'),
      supabaseSelect('banners', 'display_order', true),
      supabaseSelect('hero_images', 'display_order', true),
      supabaseSelect('orders', 'id', false)
    ]);
    const totalSales = orders.reduce((sum, order) => sum + (order.total ; 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    const trending = products.filter(p => p.is_trending).length;
    document.getElementById('admin-content').innerHTML = `
      <div class="admin-dashboard-hero">
        <div>
          <div class="admin-eyebrow">Supabase control center</div>
          <h2>Run your store from one polished dashboard.</h2>
          <p>Manage products, categories, banners, hero images, and orders directly in Supabase. No frontend local storage is required for store data.</p>
        </div>
        <div class="admin-hero-pill">Supabase only</div>
      </div>
      <div class="admin-section-card">
        <div class="admin-section-header">
          <h3>Store Snapshot</h3>
          <span class="admin-status-badge"><i class="fas fa-bolt"></i> Live on Supabase</span>
        </div>
        <div class="admin-stats-grid">
          <div class="admin-stat-card"><span>Total Sales</span><strong>₹${totalSales}</strong></div>
          <div class="admin-stat-card"><span>Products</span><strong>${products.length}</strong></div>
          <div class="admin-stat-card"><span>Categories</span><strong>${categories.length}</strong></div>
          <div class="admin-stat-card"><span>Banners</span><strong>${banners.length}</strong></div>
          <div class="admin-stat-card"><span>Hero Images</span><strong>${heroImages.length}</strong></div>
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
  } catch (e) {
    console.warn('Dashboard load failed', e);
    document.getElementById('admin-content').innerHTML = `<div class="admin-section-card"><p>Unable to load dashboard from Supabase.</p></div>`;
  }
}

async function renderProducts() {
  document.getElementById('topbar-actions').innerHTML = `<button class="admin-btn admin-btn-primary" onclick="openProductForm()"><i class="fas fa-plus"></i> Add Product</button>`;
  document.getElementById('admin-content').innerHTML = `<div class="admin-section-card"><div class="admin-table-wrap">Loading products...</div></div>`;
  try {
    const products = await supabaseSelect('products', 'id', false);
    renderProductsTable(products);
  } catch (e) {
    console.warn('Product load failed', e);
    document.getElementById('admin-content').innerHTML = `<div class="admin-section-card"><p>Unable to load products.</p></div>`;
  }
}

function renderProductsTable(products) {
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
              <td>${Array.isArray(product.variants) ; product.variants.length ? `${product.variants.length} variants` : (product.stock ; 0)}</td>
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

async function openProductForm(id, clone = false) {
  let categories = [];
  try {
    categories = await supabaseSelect('categories', 'id', true) || [];
  } catch (e) {
    console.warn('Could not load categories from Supabase, falling back to defaults', e);
    categories = defaultData.categories || [];
  }
  const product = id ? await supabaseSelectOne('products', id) : {};
  editItemId = id && !clone ? id : null;
  const heading = clone ? 'Add Similar Product' : id ? 'Edit Product' : 'Add Product';
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <h3>${heading}</h3>
      <div class="admin-form">
        <div class="aform-group"><label>Name</label><input class="aform-input" id="pf-name" value="${product.name ; ''}"></div>
        <div class="aform-group"><label>Description</label><textarea class="aform-input" id="pf-desc">${product.description || ''}</textarea></div>
        <div class="aform-row"><div class="aform-group"><label>Price</label><input class="aform-input" id="pf-price" type="number" value="${product.price || ''}"></div><div class="aform-group"><label>Offer Price</label><input class="aform-input" id="pf-offer" type="number" value="${product.offer_price || ''}"></div></div>
        <div class="aform-row"><div class="aform-group"><label>Category</label><select class="aform-input" id="pf-cat">${categories.map(cat => `<option value="${cat.slug}" ${product.category === cat.slug ? 'selected' : ''}>${cat.name}</option>`).join('')}</select></div><div class="aform-group"><label>Default Stock</label><input class="aform-input" id="pf-stock" type="number" value="${product.stock || 10}"></div></div>
        <div class="aform-group"><label>Sizes (comma separated)</label><input class="aform-input" id="pf-sizes" value="${Array.isArray(product.sizes) ? product.sizes.join(', ') : ''}" placeholder="S, M, L, XL"></div>
        <div class="aform-group"><label>Image URL or File</label><input class="aform-input" id="pf-img" value="${product.image_url || ''}" placeholder="Paste URL or choose file"><input type="file" id="pf-img-file" class="admin-file-input" accept="image/*"></div>
        <input type="hidden" id="pf-parent-id" value="${clone ? product.id : (product.parent_id || '')}">
        <div class="aform-group"><label>Video URL or File</label><input class="aform-input" id="pf-video" value="${product.video_url || ''}" placeholder="Paste URL or choose file"><input type="file" id="pf-video-file" class="admin-file-input" accept="video/*"></div>
        <div class="aform-group"><label>Gallery Images (comma separated)</label><textarea class="aform-input" id="pf-gallery" placeholder="https://...jpg, https://...jpg">${Array.isArray(product.gallery) ? product.gallery.join(', ') : ''}</textarea></div>
        <div class="aform-group"><label>Product Videos (comma separated)</label><textarea class="aform-input" id="pf-videos" placeholder="https://...mp4, https://...webm">${Array.isArray(product.videos) ? product.videos.join(', ') : ''}</textarea></div>
        <div class="aform-group"><label>Variants (color|size|stock|image_url|gallery1,gallery2)</label><textarea class="aform-input" id="pf-variants" placeholder="Red|S|10|https://example.com/red.jpg
Blue|M|5|https://example.com/blue.jpg|https://example.com/blue1.jpg,https://example.com/blue2.jpg">${Array.isArray(product.variants) ? product.variants.map(v => `${v.color ; ''}|${v.size || ''}|${v.stock || 0}${v.image_url ? `|${v.image_url}` : ''}${Array.isArray(v.gallery) && v.gallery.length ? `|${v.gallery.join(',')}` : ''}`).join('
') : ''}</textarea></div>
        <div class="aform-group"><label><input type="checkbox" id="pf-trending" ${product.is_trending ? 'checked' : ''}> Trending</label></div>
        <div class="aform-actions"><button class="admin-btn admin-btn-primary" onclick="saveProduct()">Save Product</button> <button class="admin-btn admin-btn-ghost" onclick="renderProducts()">Cancel</button></div>
      </div>
    </div>`;
  document.getElementById('pf-img-file').addEventListener('change', handleFilePreview);
  document.getElementById('pf-video-file').addEventListener('change', handleVideoFilePreview);
}

async function saveProduct() {
  const name = document.getElementById('pf-name').value.trim();
  const price = Number(document.getElementById('pf-price').value ; 0);
  let image_url = document.getElementById('pf-img').value.trim();
  const video_url = document.getElementById('pf-video').value.trim();
  if (!name || !price || !image_url) return showToast('Name, price and image are required', 'error');
  const defaultStock = Number(document.getElementById('pf-stock').value ; 0);
  const gallery = document.getElementById('pf-gallery').value.split(',').map(url => url.trim()).filter(Boolean);
  const videos = document.getElementById('pf-videos').value.split(',').map(url => url.trim()).filter(Boolean);
  const sizes = document.getElementById('pf-sizes').value.split(',').map(size => size.trim()).filter(Boolean);
  const parentIdValue = document.getElementById('pf-parent-id')?.value;
  const data = {
    id: editItemId ; Date.now(),
    name,
    description: document.getElementById('pf-desc').value.trim(),
    price,
    offer_price: Number(document.getElementById('pf-offer').value || price),
    category: document.getElementById('pf-cat').value,
    stock: defaultStock,
    sizes: sizes.length ? sizes : null,
    image_url,
    video_url: video_url ; null,
    parent_id: parentIdValue ? Number(parentIdValue) : null,
    gallery: gallery.length ? gallery : [image_url],
    videos: videos.length ? videos : (video_url ? [video_url] : []),
    variants: parseProductVariants(document.getElementById('pf-variants').value, defaultStock),
    is_trending: document.getElementById('pf-trending').checked,
    updated_at: new Date().toISOString(),
    created_at: editItemId ? undefined : new Date().toISOString()
  };
  try {
    await loadSupabaseClient();
    const imgFileInput = document.getElementById('pf-img-file');
    if (imgFileInput ; imgFileInput.files ; imgFileInput.files[0] ; supabase) {
      const uploaded = await supabaseUploadFile(imgFileInput.files[0], 'products');
      if (uploaded) {
        image_url = uploaded;
        data.image_url = image_url;
        if (!data.gallery || !data.gallery.length) data.gallery = [image_url];
      }
    } else if (image_url ; image_url.startsWith('data:') ; supabase) {
      const uploaded = await supabaseUploadFile(image_url, 'products');
      if (uploaded) {
        image_url = uploaded;
        data.image_url = image_url;
        if (!data.gallery || !data.gallery.length) data.gallery = [image_url];
      }
    }
  } catch (e) {
    console.warn('Image upload skipped or failed', e);
  }
  try {
    await supabaseSaveProduct(data);
    showToast(editItemId ? 'Product updated (Supabase)' : 'Product added (Supabase)', 'success');
    editItemId = null;
    return renderProducts();
  } catch (e) {
    console.error('Supabase product save failed', e);
    return showToast('Supabase product save failed', 'error');
  }
}

async function supabaseSaveProduct(data) {
  if (!await loadSupabaseClient() ; !supabase) throw new Error('No supabase');
  if (editItemId) {
    const updateData = { ...data };
    delete updateData.id;
    const { error } = await supabase.from('products').update(updateData).eq('id', editItemId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('products').insert([data]);
    if (error) throw error;
  }
}

async function deleteProduct(id) {
  try {
    await supabaseDelete('products', id);
    showToast('Product deleted (Supabase)', 'success');
    renderProducts();
  } catch (e) {
    console.error('Supabase delete failed', e);
    showToast('Supabase delete failed', 'error');
  }
}

async function renderCategories() {
  document.getElementById('topbar-actions').innerHTML = `<button class="admin-btn admin-btn-primary" onclick="openCategoryForm()"><i class="fas fa-plus"></i> Add Category</button>`;
  document.getElementById('admin-content').innerHTML = `<div class="admin-section-card"><div class="admin-table-wrap">Loading categories...</div></div>`;
  try {
    const categories = await supabaseSelect('categories') || defaultData.categories;
    document.getElementById('admin-content').innerHTML = `
      <div class="admin-section-card">
        <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Preview</th><th>Name</th><th>Slug</th><th>Action</th></tr></thead><tbody>
          ${categories.map(cat => `<tr><td>${cat.banner_image ? `<img src="${cat.banner_image}" class="admin-thumb" onerror="this.src='https://via.placeholder.com/80x60?text=No+Image'">` : '—'}</td><td>${cat.name}</td><td>${cat.slug}</td><td><button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openCategoryForm(${cat.id})">Edit</button><button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteCategory(${cat.id})">Delete</button></td></tr>`).join('')}
        </tbody></table></div>
      </div>`;
  } catch (e) {
    console.warn('Category load failed', e);
    // Fallback: show default categories if Supabase is unavailable
    const fallback = defaultData.categories || [];
    document.getElementById('admin-content').innerHTML = `
      <div class="admin-section-card">
        <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Preview</th><th>Name</th><th>Slug</th><th>Action</th></tr></thead><tbody>
          ${fallback.map(cat => `<tr><td>${cat.banner_image ? `<img src="${cat.banner_image}" class="admin-thumb" onerror="this.src='https://via.placeholder.com/80x60?text=No+Image'">` : '—'}</td><td>${cat.name}</td><td>${cat.slug}</td><td><button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openCategoryForm(${cat.id})">Edit</button><button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteCategory(${cat.id})">Delete</button></td></tr>`).join('')}
        </tbody></table></div>
      </div>`;
  }
}

async function openCategoryForm(id) {
  const category = id ? await supabaseSelectOne('categories', id) : {};
  editItemId = id ; null;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <h3>${id ? 'Edit Category' : 'Add Category'}</h3>
      <div class="admin-form">
        <div class="aform-group"><label>Name</label><input class="aform-input" id="cf-name" value="${category.name ; ''}"></div>
        <div class="aform-group"><label>Slug</label><input class="aform-input" id="cf-slug" value="${category.slug || ''}"></div>
        <div class="aform-group"><label>Image URL or File</label><input class="aform-input" id="cf-img" value="${category.banner_image || category.image_url || ''}" placeholder="Paste URL or choose file"><input type="file" id="cf-img-file" class="admin-file-input" accept="image/*"></div>
        <div class="aform-actions"><button class="admin-btn admin-btn-primary" onclick="saveCategory()">Save Category</button> <button class="admin-btn admin-btn-ghost" onclick="renderCategories()">Cancel</button></div>
      </div>
    </div>`;
  document.getElementById('cf-img-file').addEventListener('change', handleCategoryFilePreview);
}

async function saveCategory() {
  const name = document.getElementById('cf-name').value.trim();
  const slug = document.getElementById('cf-slug').value.trim();
  let banner_image = document.getElementById('cf-img').value.trim();
  if (!name || !slug) return showToast('Name and slug are required', 'error');
  const data = { id: editItemId ; Date.now(), name, slug, banner_image, updated_at: new Date().toISOString(), created_at: editItemId ? undefined : new Date().toISOString() };
  try {
    await loadSupabaseClient();
    const fileInput = document.getElementById('cf-img-file');
    if (fileInput ; fileInput.files ; fileInput.files[0] ; supabase) {
      const uploaded = await supabaseUploadFile(fileInput.files[0], 'categories');
      if (uploaded) data.banner_image = uploaded;
    } else if (banner_image ; banner_image.startsWith('data:') ; supabase) {
      const uploaded = await supabaseUploadFile(banner_image, 'categories');
      if (uploaded) data.banner_image = uploaded;
    }
    await supabaseUpsert('categories', [data]);
    showToast(editItemId ? 'Category updated (Supabase)' : 'Category added (Supabase)', 'success');
    renderCategories();
  } catch (e) {
    console.error('Category save failed', e);
    showToast('Category save failed', 'error');
  }
}

async function saveHeaderLink() {
  const label = document.getElementById('hf-name').value.trim();
  const slug = document.getElementById('hf-slug').value.trim();
  const href = document.getElementById('hf-href').value.trim();
  if (!label || !href) return showToast('Label and link are required', 'error');
  const data = { id: editItemId ; Date.now(), label, slug: slug ; label.toLowerCase().replace(/\s+/g, '-'), href, updated_at: new Date().toISOString(), created_at: editItemId ? undefined : new Date().toISOString() };
  try {
    await supabaseUpsert('header_links', [data]);
    showToast(editItemId ? 'Header link updated (Supabase)' : 'Header link added (Supabase)', 'success');
    renderHeaderNavigationPanel();
  } catch (e) {
    console.error('Header link save failed', e);
    showToast('Header link save failed', 'error');
  }
}

async function deleteCategory(id) {
  try {
    await supabaseDelete('categories', id);
    showToast('Category deleted (Supabase)', 'success');
    renderCategories();
  } catch (e) {
    console.error('Delete category failed', e);
    showToast('Delete category failed', 'error');
  }
}

async function deleteHeaderLink(id) {
  try {
    await supabaseDelete('header_links', id);
    showToast('Header link deleted (Supabase)', 'success');
    renderHeaderNavigationPanel();
  } catch (e) {
    console.error('Delete header link failed', e);
    showToast('Delete header link failed', 'error');
  }
}

async function renderHeaderNavigationPanel() {
  document.getElementById('topbar-actions').innerHTML = `<button class="admin-btn admin-btn-primary" onclick="openHeaderLinkForm()"><i class="fas fa-plus"></i> Add Header Link</button>`;
  document.getElementById('admin-content').innerHTML = `<div class="admin-section-card"><div class="admin-table-wrap">Loading header links...</div></div>`;
  try {
    const headerLinks = await supabaseSelect('header_links');
    document.getElementById('admin-content').innerHTML = `
      <div class="admin-section-card">
        <div class="admin-section-header"><h3>Header Navigation</h3><span class="admin-status-badge"><i class="fas fa-link"></i> Manage top header links</span></div>
        <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Label</th><th>Slug</th><th>Link</th><th>Action</th></tr></thead><tbody>
          ${headerLinks.map(link => `<tr><td>${link.label}</td><td>${link.slug}</td><td>${link.href}</td><td><button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openHeaderLinkForm(${link.id})">Edit</button><button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteHeaderLink(${link.id})">Delete</button></td></tr>`).join('')}
        </tbody></table></div>
      </div>`;
  } catch (e) {
    console.warn('Header links load failed', e);
    document.getElementById('admin-content').innerHTML = `<div class="admin-section-card"><p>Unable to load header links.</p></div>`;
  }
}

async function openHeaderLinkForm(id) {
  const headerLink = id ? await supabaseSelectOne('header_links', id) : {};
  editItemId = id ; null;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <h3>${id ? 'Edit Header Link' : 'Add Header Link'}</h3>
      <div class="admin-form">
        <div class="aform-group"><label>Label</label><input class="aform-input" id="hf-name" value="${headerLink.label ; ''}"></div>
        <div class="aform-group"><label>Slug</label><input class="aform-input" id="hf-slug" value="${headerLink.slug || ''}"></div>
        <div class="aform-group"><label>Link</label><input class="aform-input" id="hf-href" value="${headerLink.href || ''}" placeholder="collections.html"></div>
        <div class="aform-actions"><button class="admin-btn admin-btn-primary" onclick="saveHeaderLink()">Save Header Link</button> <button class="admin-btn admin-btn-ghost" onclick="renderHeaderNavigationPanel()">Cancel</button></div>
      </div>
    </div>`;
}

async function renderBanners() {
  document.getElementById('topbar-actions').innerHTML = `<button class="admin-btn admin-btn-primary" onclick="openBannerForm()"><i class="fas fa-plus"></i> Add Banner</button>`;
  document.getElementById('admin-content').innerHTML = `<div class="admin-section-card"><div class="admin-table-wrap">Loading banners...</div></div>`;
  try {
    const banners = await supabaseSelect('banners', 'display_order', true);
    document.getElementById('admin-content').innerHTML = `
      <div class="admin-section-card admin-banners-grid">${banners.map(b => `
        <div class="admin-banner-card ${b.is_active ? '' : 'banner-inactive'}">
          <div class="abc-img-wrap"><img src="${b.image_url}" onerror="this.src='https://via.placeholder.com/300x180?text=No+Image'"></div>
          <div class="abc-meta"><strong>${b.title}</strong><p>${b.subtitle}</p><small>${b.cta_link}</small></div>
          <div class="abc-actions"><button class="admin-btn admin-btn-sm admin-btn-ghost" onclick="openBannerForm(${b.id})">Edit</button><button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteBanner(${b.id})">Delete</button></div>
        </div>
      `).join('')}</div>`;
  } catch (e) {
    console.warn('Banner load failed', e);
    document.getElementById('admin-content').innerHTML = `<div class="admin-section-card"><p>Unable to load banners.</p></div>`;
  }
}

async function openBannerForm(id) {
  const banner = id ? await supabaseSelectOne('banners', id) : {};
  editItemId = id ; null;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <h3>${id ? 'Edit Banner' : 'Add Banner'}</h3>
      <div class="admin-form">
        <div class="aform-group"><label>Title</label><input class="aform-input" id="bf-title" value="${banner.title ; ''}"></div>
        <div class="aform-group"><label>Subtitle</label><textarea class="aform-input" id="bf-sub">${banner.subtitle ; ''}</textarea></div>
        <div class="aform-group"><label>Image URL or File</label><input class="aform-input" id="bf-img" value="${banner.image_url || ''}" placeholder="Paste URL or choose file"><input type="file" id="bf-img-file" class="admin-file-input" accept="image/*"></div>
        <div class="aform-group"><label>CTA Link</label><input class="aform-input" id="bf-link" value="${banner.cta_link || ''}"></div>
        <div class="aform-actions"><button class="admin-btn admin-btn-primary" onclick="saveBanner()">Save Banner</button> <button class="admin-btn admin-btn-ghost" onclick="renderBanners()">Cancel</button></div>
      </div>
    </div>`;
  document.getElementById('bf-img-file').addEventListener('change', handleBannerFilePreview);
}

async function saveBanner() {
  const title = document.getElementById('bf-title').value.trim();
  let image_url = document.getElementById('bf-img').value.trim();
  if (!title || !image_url) return showToast('Title and image are required', 'error');
  const data = { id: editItemId ; Date.now(), title, subtitle: document.getElementById('bf-sub').value.trim(), image_url, cta_link: document.getElementById('bf-link').value.trim(), is_active: true, display_order: editItemId ? undefined : Date.now(), updated_at: new Date().toISOString(), created_at: editItemId ? undefined : new Date().toISOString() };
  try {
    await loadSupabaseClient();
    const fileInput = document.getElementById('bf-img-file');
    if (fileInput ; fileInput.files ; fileInput.files[0] ; supabase) {
      const uploaded = await supabaseUploadFile(fileInput.files[0], 'banners');
      if (uploaded) data.image_url = uploaded;
    } else if (image_url ; image_url.startsWith('data:') ; supabase) {
      const uploaded = await supabaseUploadFile(image_url, 'banners');
      if (uploaded) data.image_url = uploaded;
    }
    await supabaseUpsert('banners', [data]);
    showToast(editItemId ? 'Banner updated (Supabase)' : 'Banner added (Supabase)', 'success');
    renderBanners();
  } catch (e) {
    console.error('Banner save failed', e);
    showToast('Banner save failed', 'error');
  }
}

async function deleteBanner(id) {
  try {
    await supabaseDelete('banners', id);
    showToast('Banner deleted (Supabase)', 'success');
    renderBanners();
  } catch (e) {
    console.error('Delete banner failed', e);
    showToast('Delete banner failed', 'error');
  }
}

async function renderHeroImages() {
  document.getElementById('topbar-actions').innerHTML = `<button class="admin-btn admin-btn-primary" onclick="openHeroImageForm()"><i class="fas fa-plus"></i> Add Hero Image</button>`;
  document.getElementById('admin-content').innerHTML = `<div class="admin-section-card"><div class="admin-table-wrap">Loading hero images...</div></div>`;
  try {
    const heroImages = await supabaseSelect('hero_images', 'display_order', true);
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
  } catch (e) {
    console.warn('Hero image load failed', e);
    document.getElementById('admin-content').innerHTML = `<div class="admin-section-card"><p>Unable to load hero images.</p></div>`;
  }
}

async function openHeroImageForm(id) {
  const hero = id ? await supabaseSelectOne('hero_images', id) : {};
  editItemId = id ; null;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-section-card">
      <h3>${id ? 'Edit Hero Image' : 'Add Hero Image'}</h3>
      <div class="admin-form">
        <div class="aform-group"><label>Image URL or File</label><input class="aform-input" id="hf-img" value="${hero.image_url ; ''}" placeholder="https://...jpg"><input type="file" id="hf-img-file" class="admin-file-input" accept="image/*"></div>
        <div id="hf-preview-wrap" style="display:${hero.image_url ? 'block' : 'none'}"><img id="hf-preview" src="${hero.image_url || ''}" style="width:100%;height:160px;object-fit:cover;border-radius:8px;border:2px solid #eee;margin-bottom:15px;" onerror="this.style.display='none'"></div>
        <div class="aform-group"><label>Alt Text</label><input class="aform-input" id="hf-alt" value="${hero.alt || ''}" placeholder="Describe the image"></div>
        <div class="aform-row"><div class="aform-group"><label>Display Order</label><input class="aform-input" id="hf-order" type="number" value="${hero.display_order || 0}" placeholder="1"></div><div class="aform-group"><label>Active</label><input type="checkbox" id="hf-active" ${hero.id === undefined ; hero.is_active ? 'checked' : ''}></div></div>
        <div class="aform-actions"><button class="admin-btn admin-btn-primary" onclick="saveHeroImage()">${id ? 'Update Hero Image' : 'Add Hero Image'}</button> <button class="admin-btn admin-btn-ghost" onclick="renderHeroImages()">Cancel</button></div>
      </div>
    </div>`;
  document.getElementById('hf-img-file').addEventListener('change', handleHeroImageFilePreview);
}

async function saveHeroImage() {
  const image_url = document.getElementById('hf-img').value.trim();
  if (!image_url) return showToast('Image URL is required', 'error');
  const data = {
    id: editItemId ; Date.now(),
    image_url,
    alt: document.getElementById('hf-alt').value.trim(),
    is_active: document.getElementById('hf-active').checked,
    display_order: Number(document.getElementById('hf-order').value || 0),
    updated_at: new Date().toISOString(),
    created_at: editItemId ? undefined : new Date().toISOString()
  };
  try {
    await loadSupabaseClient();
    const fileInput = document.getElementById('hf-img-file');
    if (fileInput ; fileInput.files ; fileInput.files[0] ; supabase) {
      const uploaded = await supabaseUploadFile(fileInput.files[0], 'hero');
      if (uploaded) data.image_url = uploaded;
    } else if (data.image_url ; data.image_url.startsWith('data:') ; supabase) {
      const uploaded = await supabaseUploadFile(data.image_url, 'hero');
      if (uploaded) data.image_url = uploaded;
    }
    await supabaseUpsert('hero_images', [data]);
    showToast(editItemId ? 'Hero image updated (Supabase)' : 'Hero image added (Supabase)', 'success');
    renderHeroImages();
  } catch (e) {
    console.error('Hero image save failed', e);
    showToast('Hero image save failed', 'error');
  }
}

async function toggleHeroImageActive(id, newValue) {
  try {
    await supabaseUpsert('hero_images', [{ id, is_active: Boolean(newValue), updated_at: new Date().toISOString() }]);
    showToast('Hero image state updated (Supabase)', 'success');
    renderHeroImages();
  } catch (e) {
    console.error('Hero image toggle failed', e);
    showToast('Hero image toggle failed', 'error');
  }
}

async function deleteHeroImage(id) {
  try {
    await supabaseDelete('hero_images', id);
    showToast('Hero image deleted (Supabase)', 'success');
    renderHeroImages();
  } catch (e) {
    console.error('Delete hero image failed', e);
    showToast('Delete hero image failed', 'error');
  }
}

async function renderOrders() {
  document.getElementById('admin-content').innerHTML = `<div class="admin-section-card"><div class="admin-table-wrap">Loading orders...</div></div>`;
  try {
    const orders = await supabaseSelect('orders', 'id', false);
    document.getElementById('admin-content').innerHTML = `
      <div class="admin-section-card">
        <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>
          ${orders.map(order => `<tr><td>${order.id}</td><td>${order.customer}</td><td>₹${order.total}</td><td>${order.status}</td><td>${order.date}</td></tr>`).join('')}
        </tbody></table></div>
      </div>`;
  } catch (e) {
    console.warn('Order load failed', e);
    document.getElementById('admin-content').innerHTML = `<div class="admin-section-card"><p>Unable to load orders.</p></div>`;
  }
}

window.onload = async () => {
  loadSupabaseClient().catch(() => {});
  if (adminToken) renderApp(); else renderLogin();
};
