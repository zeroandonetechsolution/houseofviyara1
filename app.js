// Global State
let cart = [];
let wishlist = [];
let user = JSON.parse(localStorage.getItem('lifestyle_user')) || null;
let googleClientId = '';
const FALLBACK_GOOGLE_CLIENT_ID = '1089096335322-36amhoadv49hb4mt8eh6f3rf1f49mag3.apps.googleusercontent.com';

// Supabase client (optional)
let appSupabase = null;
let USE_SUPABASE = false;

async function loadSupabaseClient() {
    if (appSupabase) return true;
    // try to load appSupabase-config if present
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        // attempt to load /appSupabase-config.js dynamically (if present)
        try {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = '/appSupabase-config.js';
                s.async = true;
                s.onload = resolve;
                s.onerror = () => reject(new Error('no appSupabase-config'));
                document.head.appendChild(s);
            });
        } catch (e) {
            // no config available
        }
    }

    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return false;

    // load supabase UMD if not present
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
        appSupabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        USE_SUPABASE = true;
        console.log('Supabase client loaded');
        return true;
    } catch (e) {
        console.warn('Supabase init failed', e);
        return false;
    }
}

// Fetch products preferring Supabase, then API_URL, then localStorage
async function fetchProductsPrefer() {
    if (await loadSupabaseClient() && USE_SUPABASE && appSupabase) {
        try {
            const { data, error } = await appSupabase.from('products').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        } catch (e) { console.warn('appSupabase fetch failed', e); }
    }
    // try backend API
    if (API_URL) {
        try {
            const r = await fetch(API_URL + '/api/products');
            if (r.ok) return await r.json();
        } catch (e) { }
    }
    return getStore(STORE_KEYS.products, []);
}

async function fetchProductByIdPrefer(id) {
    if (!id) return null;
    if (await loadSupabaseClient() && USE_SUPABASE && appSupabase) {
        try {
            const { data, error } = await appSupabase.from('products').select('*').eq('id', id).limit(1).single();
            if (!error && data) return data;
        } catch (e) { console.warn('appSupabase single fetch failed', e); }
    }
    if (API_URL) {
        try {
            const r = await fetch(`${API_URL}/api/products/${id}`);
            if (r.ok) return await r.json();
        } catch (e) { }
    }
    const products = getStore(STORE_KEYS.products, []);
    return products.find(p => Number(p.id) === Number(id)) || null;
}

async function fetchCategoriesPrefer() {
    if (await loadSupabaseClient() && USE_SUPABASE && appSupabase) {
        try {
            const { data, error } = await appSupabase.from('categories').select('*').order('display_order', { ascending: true });
            if (!error && data) return data;
        } catch (e) { console.warn('appSupabase categories fetch failed', e); }
    }
    if (API_URL) {
        try {
            const r = await fetch(API_URL + '/api/categories');
            if (r.ok) return await r.json();
        } catch (e) { }
    }
    return getStore(STORE_KEYS.categories, []);
}

async function fetchBannersPrefer() {
    if (await loadSupabaseClient() && USE_SUPABASE && appSupabase) {
        try {
            const { data, error } = await appSupabase.from('banners').select('*').eq('is_active', true).order('display_order', { ascending: true });
            if (!error && data) return data;
        } catch (e) { console.warn('appSupabase banners fetch failed', e); }
    }
    if (API_URL) {
        try {
            const r = await fetch(API_URL + '/api/banners');
            if (r.ok) return await r.json();
        } catch (e) { }
    }
    return getStore(STORE_KEYS.banners, []);
}

const AUTH_KEYS = {
    user: 'lifestyle_user',
    cart: 'lifestyle_cart',
    wishlist: 'lifestyle_wishlist'
};

function getUserScopedKey(baseKey) {
    return user && user.id ? `${baseKey}_${user.id}` : baseKey;
}

function loadUserScopedData(baseKey, fallback) {
    const raw = localStorage.getItem(getUserScopedKey(baseKey));
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

function saveUserScopedData(baseKey, data) {
    localStorage.setItem(getUserScopedKey(baseKey), JSON.stringify(data));
}

function storeUser(userData) {
    localStorage.setItem(AUTH_KEYS.user, JSON.stringify(userData));
    user = userData;
}

function clearUser() {
    localStorage.removeItem(AUTH_KEYS.user);
    user = null;
}

function openAuthModal() {
    renderAuthModalLogoutControls();
    const authModal = document.getElementById('auth-modal');
    const authOverlay = document.getElementById('auth-overlay');
    if (authModal) authModal.classList.add('active');
    if (authOverlay) authOverlay.classList.add('active');
}

function closeAuthModal() {
    const authModal = document.getElementById('auth-modal');
    const authOverlay = document.getElementById('auth-overlay');
    if (authModal) authModal.classList.remove('active');
    if (authOverlay) authOverlay.classList.remove('active');
}

function loadGoogleIdentityScript() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const existing = document.getElementById('google-identity-script');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
            return;
        }
        const script = document.createElement('script');
        script.id = 'google-identity-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
    });
}

function updateAuthButton() {
    const authBtn = document.getElementById('open-auth-btn');
    if (!authBtn) return;
    authBtn.innerHTML = `<i class="fas fa-user"></i>`;
    renderAuthModalLogoutControls();
}

function renderAuthModalLogoutControls() {
    const authContent = document.querySelector('#auth-modal .auth-content');
    if (!authContent) return;

    let statusText = document.getElementById('auth-user-status');
    if (!statusText) {
        statusText = document.createElement('p');
        statusText.id = 'auth-user-status';
        statusText.style.fontSize = '0.9rem';
        statusText.style.opacity = '0.8';
        statusText.style.textAlign = 'center';
        statusText.style.margin = '0';
        statusText.style.marginTop = '10px';
        const buttonContainer = authContent.querySelector('#google-login-btn');
        if (buttonContainer) {
            authContent.insertBefore(statusText, buttonContainer.nextSibling);
        } else {
            authContent.appendChild(statusText);
        }
    }

    let logoutBtn = document.getElementById('auth-logout-btn');
    if (!logoutBtn) {
        logoutBtn = document.createElement('button');
        logoutBtn.id = 'auth-logout-btn';
        logoutBtn.type = 'button';
        logoutBtn.className = 'logout-btn';
        logoutBtn.style.margin = '0 auto 20px';
        logoutBtn.style.display = 'none';
        logoutBtn.style.width = '100%';
        logoutBtn.textContent = 'Log out';
        authContent.insertBefore(logoutBtn, authContent.querySelector('div')?.nextSibling || authContent.firstChild);
    }
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            logoutUser();
            closeAuthModal();
        };
    }

    const googleLoginBtn = document.getElementById('google-login-btn');
    if (user) {
        if (statusText) statusText.textContent = `Signed in as ${user.email || user.name}`;
        logoutBtn.style.display = 'block';
        if (googleLoginBtn) googleLoginBtn.style.display = 'none';
    } else {
        if (statusText) statusText.textContent = 'Sign in with Google to continue.';
        logoutBtn.style.display = 'none';
        if (googleLoginBtn) googleLoginBtn.style.display = '';
    }
}

// Local-only mode: all storefront data is stored in localStorage or seeded from defaults.
const API_URL = ''; // no backend API calls in static mode

// Default product catalog for local mode.
const DEFAULT_PRODUCTS = [
    { id: 1, name: 'Banarasi Silk Saree', description: 'Elegant gold zari border with premium silk fabric.', price: 4500, offer_price: 4500, category: 'saree', image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80', is_trending: true },
    { id: 2, name: 'Kanjeevaram Saree', description: 'Pure mulberry silk with traditional temple patterns.', price: 6200, offer_price: 6200, category: 'saree', image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80', is_trending: false },
    { id: 3, name: 'Floral Organza Saree', description: 'Lightweight organza saree with delicate floral print.', price: 2800, offer_price: 2800, category: 'saree', image_url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&q=80', is_trending: false },
    { id: 4, name: 'Georgette Designer Saree', description: 'Glamorous saree with sequin work, perfect for cocktails.', price: 3500, offer_price: 3500, category: 'saree', image_url: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=800&q=80', is_trending: true },
    { id: 5, name: 'Cotton Handloom Saree', description: 'Comfortable and breathable handwoven cotton saree.', price: 1999, offer_price: 1999, category: 'saree', image_url: 'https://images.unsplash.com/photo-1621184455862-c163dfb30e0f?w=800&q=80', is_trending: false },
    { id: 6, name: 'Chikankari Cotton Kurti', description: 'Handcrafted Lucknowi chikankari embroidery on soft cotton.', price: 1800, offer_price: 1800, category: 'kurtis', image_url: 'https://images.unsplash.com/photo-1608748010899-18f300247112?w=800&q=80', is_trending: true },
    { id: 7, name: 'Floral Anarkali Kurta', description: 'Flowy flared silhouette with digital floral print details.', price: 2499, offer_price: 2499, category: 'kurtis', image_url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=800&q=80', is_trending: false },
    { id: 8, name: 'A-Line Rayon Kurti', description: 'Comfortable straight-cut daily wear rayon kurti.', price: 1200, offer_price: 1200, category: 'kurtis', image_url: 'https://images.unsplash.com/photo-1609357605199-0d12e9b1cb7a?w=800&q=80', is_trending: false },
    { id: 9, name: 'Embroidered Silk Kurta', description: 'Festive wear silk kurta with detailed hand-embroidery.', price: 3200, offer_price: 3200, category: 'kurtis', image_url: 'https://images.unsplash.com/photo-1609357605177-f23a07aa1b67?w=800&q=80', is_trending: false },
    { id: 10, name: 'Pastel Georgette Kurti', description: 'Elegant long kurti with bell sleeves and side slit.', price: 1600, offer_price: 1600, category: 'kurtis', image_url: 'https://images.unsplash.com/photo-1631857455684-a54a2f03665f?w=800&q=80', is_trending: true },
    { id: 11, name: 'Velvet Lehenga Choli', description: 'Heavy embroidered velvet lehenga set for bridal wear.', price: 8900, offer_price: 8900, category: 'ethnic', image_url: 'https://images.unsplash.com/photo-1610030470200-a616238b6d49?w=800&q=80', is_trending: true },
    { id: 12, name: 'Anarkali Suit Set', description: 'Traditional 3-piece georgette anarkali with net dupatta.', price: 4200, offer_price: 4200, category: 'ethnic', image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80', is_trending: false },
    { id: 13, name: 'Sharara Suit Set', description: 'Trendy sharara bottom with short kurti and matching dupatta.', price: 3800, offer_price: 3800, category: 'ethnic', image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80', is_trending: false },
    { id: 14, name: 'Palazzo Suit Set', description: 'Comfortable straight kurta with wide-leg printed palazzos.', price: 2600, offer_price: 2600, category: 'ethnic', image_url: 'https://images.unsplash.com/photo-1608748010899-18f300247112?w=800&q=80', is_trending: false },
    { id: 15, name: 'Banarasi Brocade Suit', description: 'Rich Banarasi brocade fabric with elegant design and details.', price: 5500, offer_price: 5500, category: 'ethnic', image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80', is_trending: false },
    { id: 16, name: 'Satin Evening Gown', description: 'Sleek and luxurious satin gown with cowl neck.', price: 7500, offer_price: 7500, category: 'party', image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80', is_trending: true },
    { id: 17, name: 'Sequin Bodycon Dress', description: 'Sparkling sequin party dress for clubbing and night events.', price: 4800, offer_price: 4800, category: 'party', image_url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80', is_trending: false },
    { id: 18, name: 'Off-Shoulder Velvet Dress', description: 'Classic luxury velvet dress with off-shoulder design.', price: 3900, offer_price: 3900, category: 'party', image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', is_trending: true },
    { id: 19, name: 'Chiffon Cocktail Dress', description: 'Flowy knee-length designer cocktail dress.', price: 3200, offer_price: 3200, category: 'party', image_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80', is_trending: false },
    { id: 20, name: 'Embroidered Party Gown', description: 'Floor-length net gown with gorgeous embellishments.', price: 6800, offer_price: 6800, category: 'party', image_url: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&q=80', is_trending: false },
    { id: 21, name: 'Linen Summer Dress', description: 'Lightweight breathable linen dress for sunny days.', price: 2200, offer_price: 2200, category: 'casual', image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80', is_trending: false },
    { id: 22, name: 'Denim Dungaree Set', description: 'Stylish classic blue denim dungarees with cotton inner.', price: 2600, offer_price: 2600, category: 'casual', image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80', is_trending: false },
    { id: 23, name: 'Oversized Cotton Tee', description: 'Casual everyday oversized tee made of organic cotton.', price: 999, offer_price: 999, category: 'casual', image_url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80', is_trending: false },
    { id: 24, name: 'Floral Printed Jumpsuit', description: 'Trendy one-piece jumpsuit with comfortable fit.', price: 1800, offer_price: 1800, category: 'casual', image_url: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=800&q=80', is_trending: true },
    { id: 25, name: 'Cropped Knit Cardigan', description: 'Soft cozy knitted cardigan, perfect for layering.', price: 1500, offer_price: 1500, category: 'casual', image_url: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&q=80', is_trending: false }
];
const MOCK_PRODUCTS = DEFAULT_PRODUCTS;

const STORE_KEYS = {
    products: 'hov_products',
    categories: 'hov_categories',
    header_links: 'hov_header_links',
    banners: 'hov_banners',
    hero_images: 'hov_hero_images',
    orders: 'hov_orders'
};

const defaultCategories = [
    { id: 1, name: 'Saree', slug: 'saree' },
    { id: 2, name: 'Kurtis', slug: 'kurtis' },
    { id: 3, name: 'Ethnic Wear', slug: 'ethnic' },
    { id: 4, name: 'Party Wear', slug: 'party' },
    { id: 5, name: 'Casual Wear', slug: 'casual' }
];

const defaultHeaderLinks = [
    { id: 1, label: 'All', slug: 'all', href: 'collections.html' },
    { id: 2, label: 'Saree', slug: 'saree', href: 'saree.html' },
    { id: 3, label: 'Kurtis', slug: 'kurtis', href: 'kurtis.html' },
    { id: 4, label: 'Ethnic Wear', slug: 'ethnic', href: 'ethnic.html' },
    { id: 5, label: 'Party Wear', slug: 'party', href: 'party.html' },
    { id: 6, label: 'Casual Wear', slug: 'casual', href: 'casual.html' }
];

const defaultBanners = [
    {
        id: 1,
        title: 'Saree Spotlight',
        subtitle: 'Handpicked premium sarees for every occasion',
        image_url: 'assets/1.jpeg',
        cta_link: 'saree.html',
        cta_text: 'Explore Sarees',
        is_active: true,
        display_order: 1
    },
    {
        id: 2,
        title: 'Kurtis Collection',
        subtitle: 'Soft prints and rich embroidery for daily wear',
        image_url: 'assets/2.jpeg',
        cta_link: 'kurtis.html',
        cta_text: 'Shop Kurtis',
        is_active: true,
        display_order: 2
    },
    {
        id: 3,
        title: 'Party Ready',
        subtitle: 'Glamorous evening looks with a modern edge',
        image_url: 'assets/6.jpeg',
        cta_link: 'party.html',
        cta_text: 'Shop Party',
        is_active: true,
        display_order: 3
    },
    {
        id: 4,
        title: 'Ethnic Fusion',
        subtitle: 'Bold prints and rich textures for special days',
        image_url: 'assets/11.jpeg',
        cta_link: 'ethnic.html',
        cta_text: 'Shop Ethnic',
        is_active: true,
        display_order: 4
    },
    {
        id: 5,
        title: 'Casual Comfort',
        subtitle: 'Easy summer silhouettes for everyday outings',
        image_url: 'assets/22.jpeg',
        cta_link: 'casual.html',
        cta_text: 'Shop Casual',
        is_active: true,
        display_order: 5
    }
];

const defaultHeroImages = [
    { id: 1, image_url: 'assets/1.jpeg', alt: 'Hero image 1', is_active: true, display_order: 1 },
    { id: 2, image_url: 'assets/2.jpeg', alt: 'Hero image 2', is_active: true, display_order: 2 },
    { id: 3, image_url: 'assets/6.jpeg', alt: 'Hero image 3', is_active: true, display_order: 3 },
    { id: 4, image_url: 'assets/11.jpeg', alt: 'Hero image 4', is_active: true, display_order: 4 },
    { id: 5, image_url: 'assets/22.jpeg', alt: 'Hero image 5', is_active: true, display_order: 5 }
];

function getStore(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
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

function seedStoreData() {
    const existingProducts = getStore(STORE_KEYS.products, null);
    if (!Array.isArray(existingProducts) || existingProducts.some(isLegacySampleProduct)) {
        saveStore(STORE_KEYS.products, DEFAULT_PRODUCTS);
    }

    const existingCategories = getStore(STORE_KEYS.categories, null);
    if (!Array.isArray(existingCategories)) {
        saveStore(STORE_KEYS.categories, defaultCategories);
    } else if (hasLegacySampleCategorySet(existingCategories)) {
        saveStore(STORE_KEYS.categories, defaultCategories);
    }

    const existingBanners = getStore(STORE_KEYS.banners, null);
    const isLegacyBanner = banners => Array.isArray(banners) && banners.length > 0 && banners.every(b => typeof b.image_url === 'string' && b.image_url.includes('unsplash.com'));
    if (!Array.isArray(existingBanners) || isLegacyBanner(existingBanners)) {
        saveStore(STORE_KEYS.banners, defaultBanners);
    }

    const existingHeroImages = getStore(STORE_KEYS.hero_images, null);
    if (!Array.isArray(existingHeroImages)) {
        saveStore(STORE_KEYS.hero_images, defaultHeroImages);
    }

    const existingHeaderLinks = getStore(STORE_KEYS.header_links, null);
    if (!Array.isArray(existingHeaderLinks)) {
        saveStore(STORE_KEYS.header_links, defaultHeaderLinks);
    }

    if (!localStorage.getItem(STORE_KEYS.orders)) saveStore(STORE_KEYS.orders, []);
}

// Client-side cache for products
const productCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
let bannerIntervalId = null;

function optimizeImg(url, w = 400, q = 60) {
    if (window.LifeStyleLoader) return LifeStyleLoader.optimizeImageUrl(url, w, q);
    if (url && url.includes('unsplash.com')) {
        return url.replace(/w=\d+/, 'w=' + w).replace(/q=\d+/, 'q=' + q);
    }
    return url;
}

function refreshLazyMedia(root) {
    if (window.LifeStyleLoader) LifeStyleLoader.initLazyMedia(root);
}

// Fetch with timeout helper
async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 5000 } = options;
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
document.addEventListener('DOMContentLoaded', async () => {
    seedStoreData();
    initTheme();
    await initAuth();

    cart = loadUserScopedData(AUTH_KEYS.cart, []);
    wishlist = loadUserScopedData(AUTH_KEYS.wishlist, []);
    updateCartBadge();
    updateWishlistBadge();
    
    // Check for SPA product link
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('product')) {
        const pid = parseInt(urlParams.get('product'));
        setTimeout(() => openProductPage(pid), 10);
    }
    
    if (window.location.pathname.includes('wishlist.html')) {
        renderWishlist();
    } else if (window.location.pathname.includes('product.html')) {
        initProductDetails();
    } else if (window.location.pathname.includes('cart.html')) {
        renderCartPage();
    } else {
        renderProducts();
        await renderCategories();
        await initHeroCarousel();
    }

    await renderHeaderNavigation();
    
    setupEventListeners();
    setupSearch();
    checkPaymentStatus();
    registerServiceWorker();
});


// --- Category Rendering ---
async function renderCategories() {
    const categoryGrid = document.getElementById('category-grid');
    if (!categoryGrid) return;

    const categories = await fetchCategoriesPrefer();
    renderCategoryList(categories, categoryGrid);
}

let heroCarouselInterval = null;
async function getHeroImages() {
    return await fetchBannersPrefer();
}

async function initHeroCarousel() {
    const heroImage = document.getElementById('hero-image');
    if (!heroImage) return;

    const heroImages = await getHeroImages();
    if (!heroImages.length) return;

    heroImage.src = heroImages[0].image_url || heroImage.src;
    let currentIndex = 0;
    const changeHeroImage = index => {
        if (!heroImage || !heroImages[index]) return;
        if (heroImage.src.endsWith(heroImages[index].image_url)) return;
        heroImage.classList.add('fade-out');
        setTimeout(() => {
            heroImage.src = heroImages[index].image_url;
            heroImage.classList.remove('fade-out');
        }, 300);
        currentIndex = index;
    };

    const nextImage = () => {
        const nextIndex = (currentIndex + 1) % heroImages.length;
        changeHeroImage(nextIndex);
    };

    if (heroCarouselInterval) clearInterval(heroCarouselInterval);
    heroCarouselInterval = setInterval(nextImage, 3000);
}

function renderCategoryList(categories, container) {
    if (!categories.length) {
        container.innerHTML = '<div class="empty-state"><p>No categories found. Add categories from the admin panel.</p></div>';
        return;
    }
    const categoryItems = categories;
    container.innerHTML = categoryItems.map(cat => `
        <a href="${cat.slug}.html" class="category-card" style="background: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.4)), url('${cat.banner_image || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=60'}'); background-size: cover; background-position: center;">
            <div class="cat-info">
                <h3>${cat.name.toUpperCase()}</h3>
                <span>SHOP NOW <i class="fas fa-arrow-right"></i></span>
            </div>
        </a>
    `).join('');
}

function getCurrentHeaderSlug() {
    if (window.category) return window.category;
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith('collections.html')) return 'all';
    return ['saree', 'kurtis', 'ethnic', 'party', 'casual'].find(slug => path.includes(`${slug}.html`)) || '';
}

async function renderHeaderNavigation() {
    const categories = await fetchCategoriesPrefer();
    const headerLinks = categories.length ? categories.map(cat => ({
        id: cat.id,
        label: cat.name,
        slug: cat.slug,
        href: `${cat.slug}.html`
    })) : getStore(STORE_KEYS.header_links, []);
    const navLinks = headerLinks.length ? headerLinks : [];
    const currentSlug = getCurrentHeaderSlug();

    const headerNavLists = document.querySelectorAll('header .nav-links');
    headerNavLists.forEach(nav => {
        nav.innerHTML = navLinks.map(link => `
            <li><a href="${link.href}" class="${currentSlug === link.slug ? 'active' : ''}">${link.label}</a></li>
        `).join('');
    });

    const mobileNav = document.querySelector('.mobile-nav-links');
    if (!mobileNav) return;

    let categorySectionIndex = -1;
    const children = Array.from(mobileNav.children);
    for (let i = 0; i < children.length; i++) {
        if (children[i].classList && children[i].classList.contains('section-title') && children[i].textContent.trim().toLowerCase() === 'categories') {
            categorySectionIndex = i;
            break;
        }
    }

    if (categorySectionIndex === -1) return;

    let removeIndex = categorySectionIndex + 1;
    while (removeIndex < mobileNav.children.length && mobileNav.children[removeIndex].tagName === 'LI') {
        mobileNav.children[removeIndex].remove();
    }

    navLinks.slice().reverse().forEach(link => {
        const item = document.createElement('li');
        item.innerHTML = `<a href="${link.href}"><i class="fas fa-female"></i> ${link.label}</a>`;
        mobileNav.insertBefore(item, mobileNav.children[categorySectionIndex + 1]);
    });
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Error:', err));
    }
}

// --- Payment Status Check ---
async function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('payment');
    const txnid = urlParams.get('txnid');

    if (status === 'success') {
        const orders = getStore(STORE_KEYS.orders, []);
        const order = orders.find(o => o.txnid === txnid);
        if (order) {
            showSuccessModal(order.id);
            cart = [];
            saveCart();
            updateCartBadge();
        }
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
async function initAuth() {
    updateAuthButton();
    initGoogleButton();
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Failed to parse JWT', error);
        return null;
    }
}

function handleGoogleResponse(response) {
    if (!response || !response.credential) {
        alert('Google sign-in failed. Please try again.');
        return;
    }
    const payload = parseJwt(response.credential);
    if (!payload) {
        alert('Unable to parse Google sign-in response.');
        return;
    }
    const googleUser = {
        id: payload.sub || payload.email || `google-${Date.now()}`,
        email: payload.email || '',
        name: payload.name || payload.email?.split('@')[0] || 'Google User',
        picture: payload.picture || '',
        token: response.credential
    };
    storeUser(googleUser);
    cart = loadUserScopedData(AUTH_KEYS.cart, []);
    wishlist = loadUserScopedData(AUTH_KEYS.wishlist, []);
    updateCartBadge();
    updateWishlistBadge();
    updateAuthButton();
    closeAuthModal();
    alert('Logged in.');
}

function initGoogleButton() {
    const googleBtn = document.getElementById('google-auth-btn') || document.getElementById('google-login-btn');
    if (!googleBtn) return;
    const renderGoogle = () => {
        if (!window.google || !window.google.accounts || !window.google.accounts.id) {
            console.warn('Google Identity Services not available.');
            googleBtn.style.opacity = '0.6';
            googleBtn.textContent = 'Google sign-in unavailable';
            return;
        }
        window.google.accounts.id.initialize({
            client_id: FALLBACK_GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            ux_mode: 'popup',
            cancel_on_tap_outside: false
        });
        googleBtn.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtn, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 280
        });
    };
    loadGoogleIdentityScript().then(renderGoogle).catch(error => {
        console.warn('Unable to load Google login script:', error);
        googleBtn.style.opacity = '0.6';
        googleBtn.textContent = 'Google sign-in unavailable';
    });
}

function requireAuth(action) {
    if (!user) {
        openAuthModal();
        alert(`Please log in to ${action}.`);
        return false;
    }
    return true;
}

function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) modal.classList.remove('active');
}

// Logout logic
function logoutUser() {
    closeAuthModal();
    clearUser();
    cart = [];
    wishlist = [];
    saveCart();
    saveWishlist();
    updateCartBadge();
    updateWishlistBadge();
    updateAuthButton();
    alert('You have been logged out.');
}

// --- Product Management ---
// Check if current device is mobile
function isMobile() {
    return window.innerWidth <= 768;
}

const productVariantSelections = {};

function escapeForAttr(value) {
    return String(value || '').replace(/'/g, "\\'");
}

function normalizeProductVariants(product) {
    const rawVariants = Array.isArray(product?.variants) ? product.variants : [];
    if (rawVariants.length > 0) {
        return rawVariants.map((variant, index) => ({
            id: variant.id || `${product.id || 'variant'}-${index + 1}`,
            color: variant.color || 'Default',
            size: variant.size || 'One Size',
            stock: Number(variant.stock || 0),
            image_url: variant.image_url || product.image_url || '',
            gallery: Array.isArray(variant.gallery) && variant.gallery.length ? variant.gallery : (Array.isArray(product.gallery) ? product.gallery : [product.image_url])
        }));
    }

    const rawSizes = Array.isArray(product?.sizes) && product.sizes.length ? product.sizes : ['One Size'];
    return rawSizes.map((size, index) => ({
        id: `${product?.id || 'default'}-${size || 'one-size'}-${index + 1}`,
        color: 'Default',
        size: size || 'One Size',
        stock: Number(product?.stock || 10),
        image_url: product?.image_url || '',
        gallery: Array.isArray(product?.gallery) && product.gallery.length ? product.gallery : [product?.image_url || '']
    }));
}

function getProductColors(product) {
    const variants = normalizeProductVariants(product);
    return [...new Set(variants.map(v => v.color || 'Default'))];
}

function getAvailableSizes(product, color) {
    const variants = normalizeProductVariants(product);
    const selectedColor = color || 'Default';
    return variants.filter(v => (v.color || 'Default') === selectedColor).map(v => v.size || 'One Size');
}

function getVariantForSelection(product, color, size) {
    const variants = normalizeProductVariants(product);
    const selectedColor = color || 'Default';
    const selectedSize = size || 'One Size';
    return variants.find(v => (v.color || 'Default') === selectedColor && (v.size || 'One Size') === selectedSize) || variants[0] || null;
}

function getDefaultSelection(product) {
    const colors = getProductColors(product);
    const selectedColor = colors[0] || 'Default';
    const sizes = getAvailableSizes(product, selectedColor);
    const selectedSize = sizes[0] || 'One Size';
    return { color: selectedColor, size: selectedSize };
}

function getProductSelection(product) {
    if (!product) return getDefaultSelection({ id: Date.now(), variants: [] });
    const state = productVariantSelections[product.id];
    if (state) {
        return state;
    }
    const defaultSelection = getDefaultSelection(product);
    productVariantSelections[product.id] = defaultSelection;
    return defaultSelection;
}

function setProductSelection(productId, color, size) {
    productVariantSelections[productId] = { color, size };
}

async function renderProductSkeletons(container, count = 8) {
    const skeletons = new Array(count).fill(null).map(() => `
        <div class="product-card skeleton-card">
            <div class="product-img skeleton-img"></div>
            <div class="product-info">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line skeleton-price"></div>
            </div>
        </div>
    `).join('');

    container.innerHTML = skeletons;
}

async function renderProducts(searchTerm = '') {
    const productList = document.getElementById('product-list');
    if (!productList) return;

    renderProductSkeletons(productList, 8);
    await new Promise(resolve => requestAnimationFrame(resolve));

    let category = window.category || '';
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    
    if (categoryParam) {
        category = categoryParam;
    } else if (!category) {
        if (window.location.pathname.includes('saree')) category = 'saree';
        if (window.location.pathname.includes('kurtis')) category = 'kurtis';
        if (window.location.pathname.includes('ethnic')) category = 'ethnic';
        if (window.location.pathname.includes('party')) category = 'party';
        if (window.location.pathname.includes('casual')) category = 'casual';
    }

    const isTrendingSection = productList.closest('#trending') !== null;

    const allProducts = await fetchProductsPrefer();
    const products = (Array.isArray(allProducts) ? allProducts : [])
        .filter(p => {
            if (p.parent_id != null) return false;
            if (isTrendingSection) return p.is_trending;
            return !category || p.category === category;
        });

    const filteredProducts = isTrendingSection ? products.slice(0, 4) : products;
    const searchedProducts = searchTerm
        ? filteredProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()))
        : filteredProducts;

    renderToDOM(searchedProducts, productList, category);
}

function renderToDOM(products, container, category) {
    if (!products || products.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px; font-size: 1.5rem; font-weight: 800;">NO PRODUCTS FOUND.</div>`;
        return;
    }

    container.innerHTML = products.map((p, idx) => {
        const optimizedImg = optimizeImg(p.image_url, 400, 60);
        const thumbImg = optimizeImg(p.image_url, 40, 30);
        const eager = idx < 4 ? 'eager' : 'lazy';
        const imgAttrs = eager === 'lazy'
            ? `src="${thumbImg}" data-src="${optimizedImg}" class="lazy-loading" loading="lazy"`
            : `src="${optimizedImg}" loading="eager"`;
        
        const isInWishlist = wishlist.some(item => item.id === p.id);
        const variantSummary = normalizeProductVariants(p).slice(0, 3).map(v => `${v.color} / ${v.size}`).join(', ');
        
        return `
        <div class="product-card" onclick="window.location.href='product.html?id=${p.id}'" style="cursor: pointer;">
            <div class="product-img" style="position: relative;">
                <img ${imgAttrs} alt="${p.name}" width="400" height="400" decoding="async">
                <button class="product-wishlist-btn" data-product-id="${p.id}" onclick="event.stopPropagation(); toggleWishlist(${p.id}, '${escapeForAttr(p.name)}', ${p.offer_price || p.price}, '${optimizedImg}')" style="color: ${isInWishlist ? '#FF007A' : '#000'};">
                    ${isInWishlist ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>'}
                </button>
                <button class="add-to-cart-overlay" onclick="event.stopPropagation(); addToCart(${p.id}, '${escapeForAttr(p.name)}', ${p.offer_price || p.price}, '${optimizedImg}')">
                    <i class="fas fa-plus"></i> ADD TO BAG
                </button>
            </div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <p>${p.description}</p>
                <div class="product-variant-summary">${variantSummary ? `Variants: ${variantSummary}` : 'Single variant'}</div>
                <div class="product-price">
                    <span class="current-price">₹${p.offer_price || p.price}</span>
                    ${p.offer_price && p.offer_price < p.price ? `<span class="original-price" style="text-decoration: line-through; color: #666; font-size: 0.9rem; margin-left: 10px;">₹${p.price}</span>` : ''}
                </div>
            </div>
        </div>
    `}).join('');

    refreshLazyMedia(container);
}

function renderWishlist() {
    const container = document.getElementById('wishlist-products');
    if (!container) return;
    
    if (wishlist.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-heart" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
                <p style="font-size: 1.2rem; font-weight: 700; color: #666; margin-bottom: 20px;">Your wishlist is empty!</p>
                <a href="index.html" class="btn btn-primary">BROWSE PRODUCTS</a>
            </div>
        `;
        return;
    }
    
    // Render wishlist items as product cards (we can reuse MOCK_PRODUCTS or fetch from API)
    // First, let's try to get full product data if available
    container.innerHTML = wishlist.map((item, idx) => {
        // Try to get full product from MOCK_PRODUCTS or API
        let product = MOCK_PRODUCTS.find(p => p.id === item.id);
        const optimizedImg = item.image || (product ? product.image_url : 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=60');
        
        return `
        <div class="product-card">
            <div class="product-img" onclick="openProductPage(${item.id})" style="cursor: pointer; position: relative;">
                <img src="${optimizedImg}" alt="${item.name}" width="400" height="400" loading="${idx < 4 ? 'eager' : 'lazy'}" decoding="async">
                <button class="product-wishlist-btn" data-product-id="${item.id}" onclick="event.stopPropagation(); toggleWishlist(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${item.price}, '${optimizedImg}')" style="position: absolute; top: 10px; right: 10px; width: 40px; height: 40px; border: 4px solid #000; background: #fff; box-shadow: 4px 4px 0px #000; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.1s; color: #FF007A;">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="add-to-cart-overlay" onclick="event.stopPropagation(); addToCart(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${item.price}, '${optimizedImg}')">
                    <i class="fas fa-plus"></i> ADD TO BAG
                </button>
            </div>
            <div class="product-info" onclick="openProductPage(${item.id})" style="cursor: pointer;">
                <h3>${item.name}</h3>
                <div class="product-price">
                    <span class="current-price">₹${item.price}</span>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// --- Product Details Page Logic (Instant SPA) ---
window.openProductPage = async function(productId, evt) {
    if (evt && typeof evt.preventDefault === 'function') {
        evt.preventDefault();
        evt.stopPropagation();
    }

    const pdpModal = document.getElementById('pdp-modal');
    const pdpContent = document.getElementById('pdp-content');
    if (!pdpModal || !pdpContent) return;

    if (!window.location.pathname.includes('product.html')) {
        window.location.href = `product.html?id=${productId}`;
        return;
    }

    window.history.pushState({ productId }, '', `?id=${productId}`);

    const products = getStore(STORE_KEYS.products, []);
    const product = products.find(p => p.id === productId);

    if (!product) {
        if (pdpModal) {
            pdpModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            pdpContent.innerHTML = `<div style="padding: 100px 20px; text-align: center;"><h2>Product not found</h2><button class="btn btn-primary" onclick="closeProductPage()" style="margin-top: 20px;">Return</button></div>`;
        }
        return;
        document.body.style.overflow = 'hidden';
        pdpContent.innerHTML = `<div style="padding: 100px 20px; text-align: center;"><h2>Product not found</h2><button class="btn btn-primary" onclick="closeProductPage()" style="margin-top: 20px;">Return</button></div>`;
        return;
    }

    renderProductDetails(product, pdpContent);
    pdpModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeProductPage = function() {
    const pdpModal = document.getElementById('pdp-modal');
    if(pdpModal) pdpModal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Revert URL
    const url = new URL(window.location);
    url.searchParams.delete('product');
    window.history.pushState({}, '', url);
}

window.addEventListener('popstate', (e) => {
    if (e.state && e.state.productId) {
        openProductPage(e.state.productId);
    } else {
        closeProductPage();
    }
});

async function initProductDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));
    
    const container = document.getElementById('pdp-main-content');
    if (!container) return;
    
    if (!productId) {
        container.innerHTML = '<div style="padding: 100px 20px; text-align: center;"><h2>Product not found</h2><a href="index.html" class="btn btn-primary" style="margin-top: 20px;">Return Home</a></div>';
        return;
    }

    let product = await fetchProductByIdPrefer(productId);
    if (!product) {
        product = MOCK_PRODUCTS.find(p => p.id === productId);
    }
    if (!product) {
        container.innerHTML = '<div style="padding: 100px 20px; text-align: center;"><h2>Product not found</h2><a href="index.html" class="btn btn-primary" style="margin-top: 20px;">Return Home</a></div>';
        return;
    }

    renderProductDetails(product, container);
}

function renderProductDetails(product, targetContainer) {
    // Generate Stars
    const fullStars = Math.floor(product.rating || 5);
    const halfStar = (product.rating || 5) % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    let starsHtml = '';
    for(let i=0; i<fullStars; i++) starsHtml += '<i class="fas fa-star"></i>';
    if(halfStar) starsHtml += '<i class="fas fa-star-half-alt"></i>';
    for(let i=0; i<emptyStars; i++) starsHtml += '<i class="far fa-star"></i>';

    const selection = getProductSelection(product);
    const colors = getProductColors(product);
    const sizes = getAvailableSizes(product, selection.color);
    const selectedVariant = getVariantForSelection(product, selection.color, selection.size) || normalizeProductVariants(product)[0];

    const reviews = Array.isArray(product.reviews) ? product.reviews : [];
    const reviewCount = reviews.length;
    const reviewHtml = reviews.length > 0 ? reviews.map(r => `
            <div class="review-card">
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="reviewer-avatar"><i class="fas fa-user"></i></div>
                        <div>
                            <strong>${r.user}</strong>
                            <div class="review-date">${r.date}</div>
                        </div>
                    </div>
                    <div class="review-stars">${'<i class="fas fa-star"></i>'.repeat(r.rating)}${'<i class="far fa-star"></i>'.repeat(5 - r.rating)}</div>
                </div>
                <p class="review-text">${r.comment}</p>
                ${r.image ? `<img class="review-media" src="${optimizeImg(r.image, 640, 360)}" alt="Review image" />` : ''}
                ${r.video_url ? `<video class="review-media" src="${r.video_url}" controls muted playsinline></video>` : ''}
            </div>
        `).join('') : '<p class="no-reviews">No reviews yet. Be the first to share your thoughts.</p>';

    const reviewFormHtml = `
        <div class="review-form-card">
            <h3>Share your review</h3>
            <div class="review-form-row">
                <label>Rating</label>
                <div class="review-rating-inputs">
                    ${[5,4,3,2,1].map(value => `
                        <label class="review-star-option">
                            <input type="radio" name="review-rating" value="${value}" ${value === 5 ? 'checked' : ''}>
                            ${value} <i class="fas fa-star"></i>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="review-form-row">
                <label>Name</label>
                <input id="review-name" type="text" placeholder="Your name" />
            </div>
            <div class="review-form-row">
                <label>Review</label>
                <textarea id="review-text" rows="4" placeholder="Write your experience."></textarea>
            </div>
            <div class="review-form-row review-upload-row">
                <label>Image URL or file</label>
                <input id="review-image-url" type="text" placeholder="Paste image URL" />
                <input id="review-image-file" type="file" accept="image/*" />
            </div>
            <div class="review-form-row review-upload-row">
                <label>Video URL or file</label>
                <input id="review-video-url" type="text" placeholder="Paste video URL" />
                <input id="review-video-file" type="file" accept="video/*" />
            </div>
            <button class="btn btn-primary review-submit-btn" onclick="submitProductReview(${product.id})">Post Review</button>
        </div>
    `;

    const allProducts = getStore(STORE_KEYS.products, []);
    let relatedProducts = allProducts.filter(p => p.parent_id === product.id);
    if (!relatedProducts.length) {
        relatedProducts = allProducts
            .filter(p => p.id !== product.id && p.category === product.category && p.parent_id == null)
            .slice(0, 8);
    }

    const relatedThumbsHtml = relatedProducts.slice(0, 4).map(r => `
        <div class="related-thumb" onclick="openProductPage(${r.id})">
            <img src="${optimizeImg(r.image_url, 120, 120)}" alt="${r.name}" />
        </div>
    `).join('');

    // Generate Gallery — first image eager, rest lazy; video deferred until selected
    const variantGallery = Array.isArray(selectedVariant.gallery) && selectedVariant.gallery.length ? selectedVariant.gallery : Array.isArray(product.gallery) && product.gallery.length ? product.gallery : [selectedVariant.image_url || product.image_url];
    const gallery = Array.isArray(variantGallery) && variantGallery.length ? variantGallery : [selectedVariant.image_url || product.image_url];
    let galleryDots = gallery.map((img, i) => {
        const dotBg = optimizeImg(img, 80, 40);
        return `<div class="gallery-dot ${i === 0 ? 'active' : ''}" style="background-image:url('${dotBg}')" onclick="changeGalleryImage(${i})"></div>`;
    }).join('');
    
    let mediaHtml = '';
    gallery.forEach((img, i) => {
        const fullImg = optimizeImg(img, 900, 75);
        const thumb = optimizeImg(img, 60, 30);
        if (i === 0) {
            mediaHtml += `<img src="${fullImg}" alt="${product.name} - view ${i+1}" class="gallery-item active" id="gallery-img-${i}" decoding="async">`;
        } else {
            mediaHtml += `<img src="${thumb}" data-src="${fullImg}" alt="${product.name} - view ${i+1}" class="gallery-item lazy-loading" id="gallery-img-${i}" decoding="async">`;
        }
    });
    
    if (product.video_url) {
        mediaHtml += `
            <div class="gallery-item video-placeholder" id="gallery-img-${gallery.length}" data-video-src="${product.video_url}" onclick="loadGalleryVideo(${gallery.length})">
                <i class="fas fa-play"></i>
            </div>
            <video class="gallery-item" id="gallery-video-${gallery.length}" controls preload="none" playsinline style="display:none">
            </video>
        `;
        galleryDots += `<div class="gallery-dot video-dot" onclick="changeGalleryImage(${gallery.length})"><i class="fas fa-play"></i></div>`;
    }

    // Generate Reviews
    let reviewsHtml = '';
    if (product.reviews && product.reviews.length > 0) {
        reviewsHtml = product.reviews.map(r => `
            <div class="review-card">
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="reviewer-avatar"><i class="fas fa-user"></i></div>
                        <div>
                            <strong>${r.user}</strong>
                            <div class="review-date">${r.date}</div>
                        </div>
                    </div>
                    <div class="review-stars">${'<i class="fas fa-star"></i>'.repeat(r.rating)}</div>
                </div>
                <p class="review-text">${r.comment}</p>
            </div>
        `).join('');
    } else {
        reviewsHtml = '<p>No reviews yet.</p>';
    }

    const html = `
        <div class="pdp-container">
            <!-- Left: Media Showcase -->
            <div class="pdp-media-section">
                <div class="pdp-main-media">
                    ${mediaHtml}
                </div>
                <div class="pdp-gallery-nav">
                    ${galleryDots}
                </div>
                <div class="pdp-similar-label">Similar Products</div>
                <div class="pdp-related-thumbs">
                    ${relatedThumbsHtml}
                </div>
            </div>

            <!-- Right: Details -->
            <div class="pdp-details-section">
                <div class="pdp-breadcrumbs">
                    <a href="index.html">Home</a> / <a href="${product.category}.html" style="text-transform: capitalize;">${product.category}</a> / <span>${product.name}</span>
                </div>
                
                <h1 class="pdp-title">${product.name}</h1>
                
                <div class="pdp-rating">
                    <span class="stars">${starsHtml}</span>
                    <span class="rating-number">${product.rating || 5.0}</span>
                    <span class="review-count">(${product.reviews_count || 0} reviews)</span>
                </div>
                
                <div class="pdp-price-container">
                    <span class="pdp-current-price">₹${product.offer_price || product.price}</span>
                    ${product.offer_price && product.offer_price < product.price ? `<span class="pdp-original-price">₹${product.price}</span><span class="pdp-discount">SAVE ₹${product.price - product.offer_price}</span>` : ''}
                </div>
                
                <div class="pdp-short-desc">
                    <div class="pdp-description-title">Description</div>
                    <div class="pdp-description-text">${product.description || ''}</div>
                </div>
                
                <div class="pdp-variant-block">
                    <div class="pdp-variant-group">
                        <label>Colour</label>
                        <div class="pdp-variant-options">
                            ${colors.map(color => `<button class="pdp-variant-btn ${selection.color === color ? 'active' : ''}" onclick="selectPdpVariant(${product.id}, '${escapeForAttr(color)}', '${escapeForAttr(selection.size || 'One Size')}')">${color}</button>`).join('')}
                        </div>
                    </div>
                    <div class="pdp-variant-group">
                        <label>Size</label>
                        <div class="pdp-variant-options">
                            ${(sizes.length ? sizes : ['One Size']).map(size => `<button class="pdp-variant-btn ${selection.size === size ? 'active' : ''}" onclick="selectPdpVariant(${product.id}, '${escapeForAttr(selection.color || 'Default')}', '${escapeForAttr(size)}')">${size}</button>`).join('')}
                        </div>
                    </div>
                    <div class="pdp-stock-info">${selectedVariant ? `${selectedVariant.color} / ${selectedVariant.size} • ${selectedVariant.stock > 0 ? `${selectedVariant.stock} in stock` : 'Out of stock'}` : 'Select a variant'}</div>
                </div>

                <div class="pdp-actions">
                    <div class="pdp-cta-wrap">
                        <div class="qty-selector">
                            <button onclick="updatePdpQty(-1)"><i class="fas fa-minus"></i></button>
                            <input type="number" id="pdp-qty" value="1" min="1" max="10" readonly>
                            <button onclick="updatePdpQty(1)"><i class="fas fa-plus"></i></button>
                        </div>
                        <div class="pdp-cta-buttons">
                            <button class="btn btn-primary pdp-add-btn" onclick="addFromPdp(${product.id}, '${escapeForAttr(product.name)}', ${product.offer_price || product.price}, '${selectedVariant.image_url || product.image_url}', '${escapeForAttr(selectedVariant.color || 'Default')}', '${escapeForAttr(selectedVariant.size || 'One Size')}', ${selectedVariant.stock})">
                                <i class="fas fa-shopping-cart"></i> ADD TO BAG
                            </button>
                            <button class="btn btn-secondary pdp-buy-btn" onclick="buyNowFromPdp(${product.id}, '${escapeForAttr(product.name)}', ${product.offer_price || product.price}, '${selectedVariant.image_url || product.image_url}', '${escapeForAttr(selectedVariant.color || 'Default')}', '${escapeForAttr(selectedVariant.size || 'One Size')}', ${selectedVariant.stock})">
                                BUY NOW <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                    <button class="pdp-wishlist-btn" onclick="toggleWishlist(${product.id}, '${escapeForAttr(product.name)}', ${product.offer_price || product.price}, '${selectedVariant.image_url || product.image_url}')" data-product-id="${product.id}">
                        <i class="${wishlist.some(item => item.id === product.id) ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                </div>
                
                <div class="pdp-benefits">
                    <div class="benefit-item">
                        <i class="fas fa-shipping-fast"></i>
                        <span>Free Express Shipping</span>
                    </div>
                    <div class="benefit-item">
                        <i class="fas fa-undo"></i>
                        <span>30-Day Easy Returns</span>
                    </div>
                    <div class="benefit-item">
                        <i class="fas fa-shield-alt"></i>
                        <span>Authenticity Guaranteed</span>
                    </div>
                </div>
                ${reviewFormHtml}
            </div>
        </div>
        
        <!-- Reviews Section -->
        <div class="reviews-section">
            <div class="reviews-header">
                <h2>CUSTOMER REVIEWS</h2>
                <div class="overall-rating">
                    <h2>${product.rating || 5.0}</h2>
                    <div class="stars">${starsHtml}</div>
                    <p>Based on ${product.reviews_count || 0} reviews</p>
                </div>
            </div>
            <div class="reviews-grid">
                ${reviewsHtml}
            </div>
        </div>
    `;

    if (targetContainer) {
        targetContainer.innerHTML = html;
        // Scroll to top
        if(targetContainer.parentElement) {
            targetContainer.parentElement.scrollTop = 0;
        } else {
            window.scrollTo(0,0);
        }
        
        refreshLazyMedia(targetContainer);

        // Ensure close button works if in modal
        const closeBtn = targetContainer.parentElement.querySelector('.close-modal-btn');
        if (closeBtn) closeBtn.onclick = closeProductPage;
    } else {
        const pdpMain = document.getElementById('pdp-main-content');
        if (pdpMain) pdpMain.innerHTML = html;
    }
}

window.loadGalleryVideo = function(index) {
    const placeholder = document.getElementById(`gallery-img-${index}`);
    const video = document.getElementById(`gallery-video-${index}`);
    if (!placeholder || !video || !placeholder.dataset.videoSrc) return;

    if (!video.querySelector('source')) {
        const source = document.createElement('source');
        source.src = placeholder.dataset.videoSrc;
        source.type = 'video/mp4';
        video.appendChild(source);
        video.load();
    }

    placeholder.style.display = 'none';
    video.style.display = 'block';
    video.classList.add('active');
    changeGalleryImage(index);
};

window.changeGalleryImage = function(index) {
    document.querySelectorAll('.gallery-item, .video-placeholder').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.gallery-dot').forEach(el => el.classList.remove('active'));

    const video = document.getElementById(`gallery-video-${index}`);
    const placeholder = document.getElementById(`gallery-img-${index}`);
    const target = video && video.querySelector('source') ? video : placeholder;

    if (target) {
        if (target.classList.contains('video-placeholder')) {
            loadGalleryVideo(index);
            return;
        }

        target.classList.add('active');
        if (target.tagName === 'IMG' && target.dataset.src && window.LifeStyleLoader) {
            LifeStyleLoader.loadLazyElement(target);
        }
        if (target.tagName === 'VIDEO') {
            target.style.display = 'block';
            if (placeholder && placeholder.classList.contains('video-placeholder')) placeholder.style.display = 'none';
            target.play().catch(() => {});
        } else {
            document.querySelectorAll('video.gallery-item').forEach(v => { v.pause(); v.style.display = v.querySelector('source') ? 'none' : v.style.display; });
            document.querySelectorAll('.video-placeholder').forEach(v => { if (v.id !== `gallery-img-${index}`) v.style.display = ''; });
        }
    }

    const dots = document.querySelectorAll('.gallery-dot');
    if (dots[index]) dots[index].classList.add('active');
}

window.updatePdpQty = function(delta) {
    const input = document.getElementById('pdp-qty');
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    if (val > 10) val = 10;
    input.value = val;
}

window.selectPdpVariant = function(productId, color, size) {
    const product = getStore(STORE_KEYS.products, []).find(p => p.id === productId);
    if (!product) return;

    const normalizedColor = color || 'Default';
    const normalizedSize = size || 'One Size';
    let variant = getVariantForSelection(product, normalizedColor, normalizedSize);

    if (!variant) {
        const sizesForColor = getAvailableSizes(product, normalizedColor);
        if (sizesForColor.length) {
            variant = getVariantForSelection(product, normalizedColor, sizesForColor[0]);
        } else {
            variant = normalizeProductVariants(product).find(v => v.size === normalizedSize) || normalizeProductVariants(product)[0];
        }
    }

    setProductSelection(productId, variant.color, variant.size);
    renderProductDetails(product, document.getElementById('pdp-content') || document.getElementById('pdp-main-content'));
}

window.addFromPdp = function(id, name, price, image, color, size, stock) {
    const qty = parseInt(document.getElementById('pdp-qty').value) || 1;
    if (stock !== undefined && stock <= 0) {
        alert('Selected variant is out of stock.');
        return;
    }
    const existing = cart.find(item => item.id === id && item.variantColor === color && item.variantSize === size);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({ id, name, price, image, quantity: qty, variantColor: color || 'Default', variantSize: size || 'One Size', variantLabel: `${color || 'Default'} / ${size || 'One Size'}` });
    }
    saveCart();
    updateCartBadge();
    
    // Show visual feedback
    const btn = document.querySelector('.pdp-add-btn');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> ADDED TO BAG';
        btn.style.background = 'var(--accent-green)';
        btn.style.color = '#fff';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
            btn.style.color = '';
            openCart();
            renderCartItems();
        }, 1000);
    }
}

// --- Cart Logic ---
function addToCart(id, name, price, image, color = 'Default', size = 'One Size') {
    const existing = cart.find(item => item.id === id && item.variantColor === color && item.variantSize === size);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ id, name, price, image, quantity: 1, variantColor: color, variantSize: size, variantLabel: `${color} / ${size}` });
    }
    saveCart();
    updateCartBadge();
    openCart();
    renderCartItems();
}

function saveCart() {
    saveUserScopedData(AUTH_KEYS.cart, cart);
}

window.buyNowFromPdp = function(id, name, price, image, color, size, stock) {
    const qty = parseInt(document.getElementById('pdp-qty').value) || 1;
    if (stock !== undefined && stock <= 0) {
        alert('Selected variant is out of stock.');
        return;
    }
    const existing = cart.find(item => item.id === id && item.variantColor === color && item.variantSize === size);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({ id, name, price, image, quantity: qty, variantColor: color || 'Default', variantSize: size || 'One Size', variantLabel: `${color || 'Default'} / ${size || 'One Size'}` });
    }
    saveCart();
    updateCartBadge();
    renderCartItems();
    openCart();
    setTimeout(() => {
        const checkoutBtn = document.querySelector('.checkout-btn');
        if (checkoutBtn) checkoutBtn.focus();
    }, 200);
}

window.submitProductReview = function(productId) {
    const name = document.getElementById('review-name')?.value.trim() || 'Guest';
    const comment = document.getElementById('review-text')?.value.trim();
    const ratingInput = document.querySelector('input[name="review-rating"]:checked');
    const rating = ratingInput ? Number(ratingInput.value) : 5;
    const imageUrl = document.getElementById('review-image-url')?.value.trim();
    const videoUrl = document.getElementById('review-video-url')?.value.trim();
    const imageFile = document.getElementById('review-image-file')?.files?.[0];
    const videoFile = document.getElementById('review-video-file')?.files?.[0];

    if (!comment) {
        alert('Please write a review before posting.');
        return;
    }

    const products = getStore(STORE_KEYS.products, []);
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
        alert('Unable to save review. Product not found.');
        return;
    }

    const review = {
        user: name,
        rating,
        comment,
        date: new Date().toLocaleDateString('en-IN'),
        image: imageUrl || '',
        video_url: videoUrl || ''
    };

    const fileToDataUrl = async file => {
        if (!file) return '';
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
        });
    };

    Promise.all([fileToDataUrl(imageFile), fileToDataUrl(videoFile)]).then(([imageData, videoData]) => {
        if (imageData) review.image = imageData;
        if (videoData) review.video_url = videoData;

        if (!products[productIndex].reviews) {
            products[productIndex].reviews = [];
        }
        products[productIndex].reviews.unshift(review);
        products[productIndex].reviews_count = (products[productIndex].reviews_count || 0) + 1;
        saveStore(STORE_KEYS.products, products);

        alert('Thank you! Your review has been posted.');
        initProductDetails();
    });
};

window.scrollRelatedProducts = function(direction) {
    const container = document.querySelector('.related-scroll');
    if (!container) return;
    const distance = container.offsetWidth * 0.7;
    if (direction === 'right') {
        container.scrollBy({ left: distance, behavior: 'smooth' });
    } else {
        container.scrollBy({ left: -distance, behavior: 'smooth' });
    }
}

function updateCartBadge() {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const badges = document.querySelectorAll('.cart-count, #cart-badge, #mobile-cart-badge');
    badges.forEach(badge => {
        if (badge) {
            badge.innerText = totalItems;
            badge.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    });
}

function updateWishlistBadge() {
    const totalItems = wishlist.length;
    const badges = document.querySelectorAll('#wishlist-badge, #mobile-wishlist-badge, #bottom-wishlist-badge');
    badges.forEach(badge => {
        if (badge) {
            badge.innerText = totalItems;
            badge.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    });
}

function saveWishlist() {
    saveUserScopedData(AUTH_KEYS.wishlist, wishlist);
    updateWishlistBadge();
}

function toggleWishlist(productId, productName, price, imageUrl) {
    const existingIndex = wishlist.findIndex(item => item.id === productId);
    if (existingIndex > -1) {
        // Remove from wishlist
        wishlist.splice(existingIndex, 1);
    } else {
        // Add to wishlist
        wishlist.push({ id: productId, name: productName, price: price, image: imageUrl });
    }
    saveWishlist();
    
    // Re-render wishlist page if we're on it
    if (document.getElementById('wishlist-products')) {
        renderWishlist();
    }
    
    // Re-render products to update heart icons if needed
    const productGrids = document.querySelectorAll('#product-list, #wishlist-products');
    productGrids.forEach(grid => {
        if (grid.id !== 'wishlist-products') {
            const currentCategory = window.category || '';
            // We could re-render but let's just update the individual button if possible
            const buttons = grid.querySelectorAll('.product-wishlist-btn');
            buttons.forEach(btn => {
                if (parseInt(btn.dataset.productId) === productId) {
                    const isInWishlist = wishlist.some(item => item.id === productId);
                    btn.innerHTML = isInWishlist ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
                    btn.style.color = isInWishlist ? '#FF007A' : '#000';
                }
            });
        }
    });
    
    // Update PDP wishlist button if present
    const pdpBtn = document.querySelector('.pdp-wishlist-btn');
    if (pdpBtn && parseInt(pdpBtn.dataset.productId) === productId) {
        const isInWishlist = wishlist.some(item => item.id === productId);
        const icon = pdpBtn.querySelector('i');
        if (icon) {
            icon.className = isInWishlist ? 'fas fa-heart' : 'far fa-heart';
        }
    }
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
                <p>${item.variantLabel ? `${item.variantLabel} • ` : ''}₹${item.price} x ${item.quantity}</p>
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
    renderCartPage();
}

function removeItem(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartBadge();
    renderCartItems();
    renderCartPage();
}

// --- Checkout Logic ---
function getCheckoutPayload() {
    const name = (document.getElementById('checkout-name') || {}).value?.trim();
    const email = (document.getElementById('checkout-email') || {}).value?.trim();
    const phone = (document.getElementById('checkout-phone') || {}).value?.trim();
    const street = (document.getElementById('checkout-street') || {}).value?.trim();
    const city = (document.getElementById('checkout-city') || {}).value?.trim();
    const state = (document.getElementById('checkout-state') || {}).value?.trim();
    const pin = (document.getElementById('checkout-pin') || {}).value?.trim();

    if (!name || !email || !street || !city || !state || !pin) {
        return { error: 'Please fill in all required shipping fields.' };
    }

    return {
        name,
        email,
        phone: phone || '9999999999',
        shipping_address: { name, email, phone: phone || '9999999999', street, city, state, pin },
    };
}

async function completeCheckout() {
    if (!requireAuth('complete checkout')) {
        return;
    }

    if (!cart.length) {
        alert('Your cart is empty. Please add items before checking out.');
        return;
    }

    const checkout = getCheckoutPayload();
    if (checkout.error) {
        alert(checkout.error);
        return;
    }

    const amount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0) + 100;
    const txnid = 'TXN' + Date.now();
    const orderId = `LS-${Date.now()}`;
    const order = {
        id: orderId,
        txnid,
        customer: checkout.name,
        email: checkout.email,
        phone: checkout.phone || '',
        items: cart.map(item => ({ name: item.name, qty: item.quantity, price: item.price, variant: item.variantLabel || 'Default / One Size' })),
        total: amount,
        shipping_address: checkout.shipping_address,
        date: new Date().toLocaleDateString('en-IN'),
        status: 'Pending',
        payment_status: 'Pending'
    };

    const orders = getStore(STORE_KEYS.orders, []);
    orders.unshift(order);
    saveStore(STORE_KEYS.orders, orders);

    window.location.href = `payment.html?txnid=${txnid}&amount=${amount}&email=${encodeURIComponent(checkout.email)}&name=${encodeURIComponent(checkout.name)}&orderId=${encodeURIComponent(orderId)}`;
}

function renderCartPage() {
    const container = document.getElementById('cart-page-content');
    if (!container) return;

    if (!Array.isArray(cart) || cart.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align:center; padding: 50px; border: 4px solid #000; background: #fff;">
                <i class="fas fa-shopping-bag" style="font-size: 3rem; margin-bottom: 20px; display:block;"></i>
                <h3>Your bag is empty</h3>
                <p style="margin: 20px 0; color: #666;">Add items to your cart to view them here.</p>
                <a href="collections.html" class="btn btn-primary">Continue Shopping</a>
            </div>
        `;
        return;
    }

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const itemsHtml = cart.map((item, index) => `
        <div class="cart-page-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-page-item-info">
                <h4>${item.name}</h4>
                <p>${item.variantLabel ? `${item.variantLabel} • ` : ''}₹${item.price}</p>
                <div class="cart-item-qty" style="margin-top:10px;">
                    <button onclick="changeQty(${index}, -1)"><i class="fas fa-minus"></i></button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQty(${index}, 1)"><i class="fas fa-plus"></i></button>
                </div>
            </div>
            <div class="cart-page-item-actions">
                <span class="cart-page-item-total">₹${item.price * item.quantity}</span>
                <button class="remove-item" onclick="removeItem(${index})"><i class="fas fa-times"></i></button>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="cart-page-grid">
            <div class="cart-page-list">
                ${itemsHtml}
            </div>
            <aside class="cart-page-summary card" style="padding: 30px;">
                <h3>Shipping Details</h3>
                <div style="display: grid; gap: 16px; margin-bottom: 20px;">
                    <input type="text" id="checkout-name" class="brutal-input" placeholder="Full Name" style="width: 100%; border: 3px solid #000; padding: 12px;" required>
                    <input type="email" id="checkout-email" class="brutal-input" placeholder="Email" style="width: 100%; border: 3px solid #000; padding: 12px;" required>
                    <input type="text" id="checkout-phone" class="brutal-input" placeholder="Phone" style="width: 100%; border: 3px solid #000; padding: 12px;">
                    <input type="text" id="checkout-street" class="brutal-input" placeholder="Street Address" style="width: 100%; border: 3px solid #000; padding: 12px;" required>
                    <input type="text" id="checkout-city" class="brutal-input" placeholder="City" style="width: 100%; border: 3px solid #000; padding: 12px;" required>
                    <input type="text" id="checkout-state" class="brutal-input" placeholder="State" style="width: 100%; border: 3px solid #000; padding: 12px;" required>
                    <input type="text" id="checkout-pin" class="brutal-input" placeholder="PIN Code" style="width: 100%; border: 3px solid #000; padding: 12px;" required>
                </div>
                <h3>Order Summary</h3>
                <div style="display:flex; justify-content:space-between; margin: 15px 0; font-weight: 700;">
                    <span>Subtotal</span>
                    <span>₹${total}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom: 20px; font-weight: 700;">
                    <span>Shipping</span>
                    <span>₹100</span>
                </div>
                <div style="display:flex; justify-content:space-between; padding: 20px; background: var(--accent-yellow); font-size: 1.8rem; font-weight: 900; border: 4px solid #000;">
                    <span>Total</span>
                    <span>₹${total + 100}</span>
                </div>
                <button class="btn btn-primary" id="cart-page-checkout-btn" style="width:100%; margin-top: 25px;">Proceed to Checkout</button>
            </aside>
        </div>
    `;

    const checkoutBtn = document.getElementById('cart-page-checkout-btn');
    if (checkoutBtn) checkoutBtn.onclick = completeCheckout;
}

function showSuccessModal(orderId) {
    const modal = document.getElementById('success-modal');
    const orderIdElem = document.getElementById('order-id');
    if (modal && orderIdElem) {
        modal.classList.add('active');
        orderIdElem.innerText = orderId;
        return;
    }
    if (orderId) {
        alert(`Order completed successfully. Order ID: ${orderId}`);
    }
}

// --- UI Helpers ---
window.openCart = function() {
    const drawer = document.getElementById('cart-drawer');
    if (drawer) {
        document.getElementById('cart-drawer').classList.add('active');
        document.getElementById('cart-overlay').classList.add('active');
        document.body.style.overflow = 'hidden';
        renderCartItems();
        return;
    }
    window.location.href = 'cart.html';
}

window.openCheckout = window.openCart;

window.closeCart = function() {
    document.getElementById('cart-drawer').classList.remove('active');
    document.getElementById('cart-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

window.toggleCart = function() {
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) {
        openCart();
        return;
    }
    if (drawer.classList.contains('active')) {
        closeCart();
    } else {
        openCart();
    }
}

window.toggleMenu = function() {
    const menu = document.getElementById('mobile-menu');
    if (menu) {
        menu.classList.toggle('active');
        // Prevent body scroll when menu is open
        if (menu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

function setupEventListeners() {
    // Mobile Menu
    const menuBtn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    const closeMenuBtn = document.getElementById('close-menu-btn');

    if (menuBtn && menu) menuBtn.onclick = () => menu.classList.add('active');
    if (closeMenuBtn && menu) closeMenuBtn.onclick = () => menu.classList.remove('active');

    // Auth Modal
    const authBtn = document.getElementById('open-auth-btn');
    const authModal = document.getElementById('auth-modal');
    const authOverlay = document.getElementById('auth-overlay');
    const closeAuthBtn = document.getElementById('close-auth-btn');

    if (authBtn) authBtn.onclick = openAuthModal;
    if (authOverlay) authOverlay.onclick = closeAuthModal;
    if (closeAuthBtn) closeAuthBtn.onclick = closeAuthModal;

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
            headerText = 'House Of Viyara Plus';
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
