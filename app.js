// Global State
let cart = JSON.parse(localStorage.getItem('lifestyle_cart')) || [];
let user = JSON.parse(localStorage.getItem('lifestyle_user')) || null;

// Determine API URL: Use current hostname but port 3001 if not already on it
const API_URL = window.location.port === '3001' ? '' : `${window.location.protocol}//${window.location.hostname}:3001`;

// Client-side cache for products
const productCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

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

let searchTimeout;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initAuth();
    updateCartBadge();
    renderProducts();
    setupEventListeners();
    setupSearch();
    checkPaymentStatus();
    registerServiceWorker();
});

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Error:', err));
    }
}

// Hide Preloader on Window Load (Minimum 5.5 seconds)
const pageStartTime = Date.now();
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        const elapsed = Date.now() - pageStartTime;
        const remaining = Math.max(0, 5500 - elapsed);
        
        setTimeout(() => {
            preloader.classList.add('fade-out');
        }, remaining);
    }
});

function showPreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.classList.remove('fade-out');
}

function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.classList.add('fade-out');
}

// --- Payment Status Check ---
function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('payment');
    const txnid = urlParams.get('txnid');

    if (status === 'success') {
        // Find order ID from backend using txnid
        fetch(`${API_URL}/api/admin/orders`)
            .then(res => res.json())
            .then(orders => {
                const order = orders.find(o => o.txnid === txnid);
                if (order) {
                    showSuccessModal(order.id);
                    cart = [];
                    saveCart();
                    updateCartBadge();
                }
            });
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'failed') {
        alert('Payment was cancelled or failed.');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// --- Search Implementation ---
function setupSearch() {
    const desktopSearch = document.getElementById('desktop-search-input');
    const mobileSearch = document.getElementById('mobile-search-input');

    const handleSearch = (e) => {
        clearTimeout(searchTimeout);
        const term = e.target.value.trim();
        searchTimeout = setTimeout(() => {
            renderProducts(window.category || '', term);
        }, 500);
    };

    if (desktopSearch) desktopSearch.addEventListener('input', handleSearch);
    if (mobileSearch) mobileSearch.addEventListener('input', handleSearch);
}

// --- Theme Management ---
function initTheme() {
    const savedTheme = localStorage.getItem('lifestyle_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeIcon = document.querySelector('#theme-toggle-btn i');
    if (themeIcon) {
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('lifestyle_theme', newTheme);
    const themeIcon = document.querySelector('#theme-toggle-btn i');
    if (themeIcon) {
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// --- Authentication ---
function initAuth() {
    if (user) {
        const authBtn = document.getElementById('open-auth-btn');
        if (authBtn) {
            authBtn.innerHTML = `<i class="fas fa-user"></i>`;
        }
    }

    // Google Sign-In Initialization
    if (window.google) {
        google.accounts.id.initialize({
            client_id: "572682440348-vfaaljc997ee9q3175i3rj3155lvs13t.apps.googleusercontent.com",
            callback: handleGoogleResponse
        });
        
        // One Tap prompt
        google.accounts.id.prompt();

        // Handle Custom Google Button Click
        const customGoogleBtn = document.getElementById('google-auth-btn');
        if (customGoogleBtn) {
            customGoogleBtn.onclick = () => {
                google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        console.log('Google prompt not displayed.');
                    }
                });
            };
        }
    }
}

async function handleGoogleResponse(response) {
    const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    if (data.token) {
        localStorage.setItem('lifestyle_token', data.token);
        localStorage.setItem('lifestyle_user', JSON.stringify(data.user));
        user = data.user;
        location.reload();
    }
}

// Logout logic
function logoutUser() {
    localStorage.removeItem('lifestyle_user');
    user = null;
    location.reload();
}

// --- Product Management ---
// Check if current device is mobile
function isMobile() {
    return window.innerWidth <= 768;
}

async function renderProducts(searchTerm = '') {
    const productList = document.getElementById('product-list');
    if (!productList) return;

    productList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px; font-weight: 800;">LOADING LUXURY COLLECTION...</div>`;

    let category = window.category || '';
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    
    if (categoryParam) {
        category = categoryParam;
    } else if (!category) {
        if (window.location.pathname.includes('perfumes')) category = 'perfumes';
        if (window.location.pathname.includes('slippers')) category = 'slippers';
        if (window.location.pathname.includes('accessories')) category = 'accessories';
    }

    try {
        let cacheKey = `${category}-${searchTerm}`;
        let products;

        if (productCache.has(cacheKey) && (Date.now() - productCache.get(cacheKey).timestamp < CACHE_EXPIRY)) {
            products = productCache.get(cacheKey).data;
        } else {
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            if (searchTerm) params.append('search', searchTerm);
            
            const url = `${API_URL}/api/products${params.toString() ? '?' + params.toString() : ''}`;

            const res = await fetchWithTimeout(url, { cache: 'default' });
            if (!res.ok) throw new Error('Failed to fetch products');
            
            products = await res.json();
            productCache.set(cacheKey, { data: products, timestamp: Date.now() });
        }

        if (productList.closest('#trending')) {
            products = products.slice(0, 4);
        }

        if (products.length === 0) {
            productList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px; font-size: 1.5rem; font-weight: 800;">NO PRODUCTS FOUND.</div>`;
            return;
        }

        productList.innerHTML = products.map(p => {
            // Optimize image size by requesting smaller thumbnails from Unsplash
            const optimizedImg = p.image_url.includes('unsplash.com') 
                ? p.image_url.replace(/w=\d+/, 'w=400').replace(/q=\d+/, 'q=60')
                : p.image_url;

            return `
            <div class="product-card">
                <div class="product-img">
                    <img src="${optimizedImg}" alt="${p.name}" loading="lazy" width="400" height="400">
                    <button class="add-to-cart-overlay" onclick="addToCart(${p.id}, '${p.name}', ${p.offer_price || p.price}, '${optimizedImg}')">
                        <i class="fas fa-plus"></i> ADD TO BAG
                    </button>
                </div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p>${p.description}</p>
                    <div class="product-price">
                        <span class="current-price">₹${p.offer_price || p.price}</span>
                        ${p.offer_price && p.offer_price < p.price ? `<span class="original-price" style="text-decoration: line-through; color: #666; font-size: 0.9rem; margin-left: 10px;">₹${p.price}</span>` : ''}
                    </div>
                </div>
            </div>
        `}).join('');
    } catch (error) {
        console.error('Render Error:', error);
        productList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--accent-pink); font-weight: 800;">ERROR CONNECTING TO SERVER.</div>`;
    }
}

// --- Cart Logic ---
function addToCart(id, name, price, image) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ id, name, price, image, quantity: 1 });
    }
    saveCart();
    updateCartBadge();
    openCart();
    renderCartItems();
}

function saveCart() {
    localStorage.setItem('lifestyle_cart', JSON.stringify(cart));
}

function updateCartBadge() {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const badges = document.querySelectorAll('.cart-count, #cart-badge');
    badges.forEach(badge => {
        if (badge) {
            badge.innerText = totalItems;
            badge.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    });
}

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const totalPrice = document.getElementById('cart-total-price');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `<div class="empty-cart"><i class="fas fa-box-open"></i><p>Your bag is empty.</p></div>`;
        if (totalPrice) totalPrice.innerText = '₹0';
        return;
    }

    container.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>₹${item.price} x ${item.quantity}</p>
                <div class="cart-item-qty">
                    <button onclick="changeQty(${index}, -1)"><i class="fas fa-minus"></i></button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQty(${index}, 1)"><i class="fas fa-plus"></i></button>
                </div>
            </div>
            <button class="remove-item" onclick="removeItem(${index})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    if (totalPrice) totalPrice.innerText = `₹${total}`;
}

function changeQty(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity < 1) cart.splice(index, 1);
    saveCart();
    updateCartBadge();
    renderCartItems();
}

function removeItem(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartBadge();
    renderCartItems();
}

// --- Checkout Logic ---
async function completeCheckout() {
    if (!user) {
        document.getElementById('cart-drawer').classList.remove('active');
        document.getElementById('cart-overlay').classList.remove('active');
        document.getElementById('auth-modal').classList.add('active');
        document.getElementById('auth-overlay').classList.add('active');
        alert('Please login to complete your order.');
        return;
    }

    const name = user.email.split('@')[0];
    const email = user.email;
    const amount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0) + 100;
    const txnid = 'TXN' + Date.now();

    try {
        const orderRes = await fetch(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                items: cart,
                total_amount: amount,
                shipping_address: { street: 'Default Street', city: 'Default City', state: 'Default State', pin: '000000' },
                txnid
            })
        });
        
        if (!orderRes.ok) throw new Error('Order creation failed');

        const orderData = await orderRes.json();
        window.location.href = `payment.html?txnid=${txnid}&amount=${amount}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&orderId=${orderData.orderId}`;

    } catch (error) {
        console.error('Checkout Error:', error);
        alert('Checkout failed.');
    }
}

function showSuccessModal(orderId) {
    document.getElementById('success-modal').classList.add('active');
    document.getElementById('order-id').innerText = orderId;
}

// --- UI Helpers ---
function openCart() {
    document.getElementById('cart-drawer').classList.add('active');
    document.getElementById('cart-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderCartItems();
}

function closeCart() {
    document.getElementById('cart-drawer').classList.remove('active');
    document.getElementById('cart-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

function setupEventListeners() {
    // Mobile Menu
    const menuBtn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    const closeMenuBtn = document.getElementById('close-menu-btn');

    if (menuBtn) menuBtn.onclick = () => menu.classList.add('active');
    if (closeMenuBtn) closeMenuBtn.onclick = () => menu.classList.remove('active');

    // Auth Modal
    const authBtn = document.getElementById('open-auth-btn');
    const authModal = document.getElementById('auth-modal');
    const authOverlay = document.getElementById('auth-overlay');
    const closeAuthBtn = document.getElementById('close-auth-btn');

    if (authBtn) authBtn.onclick = () => {
        authModal.classList.add('active');
        authOverlay.classList.add('active');
    };
    if (closeAuthBtn) closeAuthBtn.onclick = () => {
        authModal.classList.remove('active');
        authOverlay.classList.remove('active');
    };

    // Settings Modal
    const settingsModal = document.getElementById('settings-modal');
    const settingsOverlay = document.getElementById('settings-overlay');
    const closeSettingsBtn = document.getElementById('close-settings-btn');

    if (closeSettingsBtn) closeSettingsBtn.onclick = () => {
        settingsModal.classList.remove('active');
        settingsOverlay.classList.remove('active');
    };

    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.onclick = toggleTheme;

    // Cart Drawer
    const cartBtn = document.getElementById('open-cart-btn');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartOverlay = document.getElementById('cart-overlay');

    if (cartBtn) cartBtn.onclick = openCart;
    if (closeCartBtn) closeCartBtn.onclick = closeCart;
    if (cartOverlay) cartOverlay.onclick = closeCart;

    // Checkout
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) checkoutBtn.onclick = completeCheckout;
}

// --- Settings Implementation ---
function openSettings(type) {
    const modal = document.getElementById('settings-modal');
    const overlay = document.getElementById('settings-overlay');
    const title = document.getElementById('settings-title');
    const content = document.getElementById('settings-content');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenu) mobileMenu.classList.remove('active');

    let html = '';
    let headerText = '';

    switch(type) {
        case 'plus':
            headerText = 'Life Style Plus';
            html = `<div style="text-align:center; padding: 20px;"><i class="fas fa-crown" style="font-size: 4rem; color: var(--accent-yellow); margin-bottom: 20px;"></i><h3>GOLD MEMBER</h3><p>Exclusive benefits active.</p></div>`;
            break;
        case 'devices':
            headerText = 'Manage Devices';
            html = `<div class="settings-row"><div><h4>This Device</h4><p>Active Now</p></div><span style="color: var(--accent-green);">ACTIVE</span></div>`;
            break;
        case 'profile':
            headerText = 'Edit Profile';
            html = `<div class="form-group"><label>Full Name</label><input type="text" class="brutal-input" value="${user ? user.email.split('@')[0].toUpperCase() : 'GUEST'}"></div><button class="btn btn-primary" style="width:100%" onclick="alert('Profile Updated!')">SAVE</button>`;
            break;
        case 'cards':
            headerText = 'Saved Cards';
            html = `<div class="settings-row" style="background:#000; color:#fff; padding:15px; border:3px solid #000;"><h4>VISA •••• 4242</h4></div>`;
            break;
        case 'addresses':
            headerText = 'Saved Addresses';
            html = `<div class="settings-row" style="border:3px solid #000; padding:15px;"><h4>Home</h4><p>123 Luxury Lane, Beverly Hills</p></div>`;
            break;
        case 'language':
            headerText = 'Language';
            html = `<div class="custom-radio"><input type="radio" checked> <label>English (UK)</label></div>`;
            break;
        case 'notifications':
            headerText = 'Notifications';
            html = `<div class="settings-row"><div><h4>Order Updates</h4></div><label class="toggle-switch"><input type="checkbox" checked><span class="slider"></span></label></div>`;
            break;
        case 'reviews':
            headerText = 'My Reviews';
            html = `<div style="text-align:center; padding:20px;"><p>No reviews yet.</p></div>`;
            break;
        case 'qa':
            headerText = 'Questions & Answers';
            html = `<div style="text-align:center; padding:20px;"><p>No questions yet.</p></div>`;
            break;
        case 'policies':
            headerText = 'Policies';
            html = `<div style="font-size:0.9rem;"><h4>Privacy Policy</h4><p>Your data is safe.</p></div>`;
            break;
        case 'faqs':
            headerText = 'FAQs';
            html = `<div style="font-size:0.9rem;"><h4>How to return?</h4><p>Contact support within 30 days.</p></div>`;
            break;
    }

    if (title) title.innerText = headerText.toUpperCase();
    if (content) content.innerHTML = html;
    if (modal) modal.classList.add('active');
    if (overlay) overlay.classList.add('active');
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    const overlay = document.getElementById('settings-overlay');
    if (modal) modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}
