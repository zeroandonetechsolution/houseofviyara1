// Global State
let cart = [];
let wishlist = [];
let user = JSON.parse(localStorage.getItem('lifestyle_user')) || null;
let googleClientId = '';
const FALLBACK_GOOGLE_CLIENT_ID = '1089096335322-36amhoadv49hb4mt8eh6f3rf1f49mag3.apps.googleusercontent.com';
let currentGlobalVersion = parseInt(localStorage.getItem('current_global_version')) || 1;

// Aadi Sale Discount
const AADI_DISCOUNT = 0.05; // 5% off

function calculateDiscountedPrice(price) {
    return Math.round(price * (1 - AADI_DISCOUNT));
}
// DEBUG: Check Supabase config
console.log('🔍 window.SUPABASE_URL:', window.SUPABASE_URL);
console.log('🔍 window.SUPABASE_ANON_KEY:', window.SUPABASE_ANON_KEY ? 'Set' : 'NOT SET');
console.log('🔍 window.SUPABASE_BUCKET:', window.SUPABASE_BUCKET);

// Clear old localStorage to avoid conflicts with Supabase (only when Supabase is active)
if (window.SUPABASE_URL && window.USE_SUPABASE !== false) {
    console.log('🧹 Clearing old localStorage to use Supabase exclusively...');
    const keysToKeep = ['lifestyle_user', 'hov_admin_token'];
    Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key)) {
            localStorage.removeItem(key);
        }
    });
}

// Supabase client (optional)
let appSupabase = null;
let USE_SUPABASE = false;
async function loadSupabaseClient() {
    if (window.USE_SUPABASE === false) {
        USE_SUPABASE = false;
        return false;
    }
    if (appSupabase) return true;
    // try to load supabase-config if present
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        // attempt to load /supabase-config.js dynamically (if present)
        try {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = '/supabase-config.js';
                s.async = true;
                s.onload = resolve;
                s.onerror = () => reject(new Error('no supabase-config'));
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

        // Fetch current global version from database to ensure we have the latest
        try {
            const { data: currentConfig } = await appSupabase
                .from('system_config')
                .select('global_version')
                .eq('id', 'global')
                .maybeSingle();
            if (currentConfig && currentConfig.global_version) {
                currentGlobalVersion = currentConfig.global_version;
                localStorage.setItem('current_global_version', currentGlobalVersion);
                console.log('📦 Loaded current global version from database:', currentGlobalVersion);
            }
        } catch (e) {
            console.warn('⚠️ Could not load current global version from database:', e);
        }

        // Subscribe to realtime changes
        setupRealtimeSubscriptions();

        return true;
    } catch (e) {
        console.warn('Supabase init failed', e);
        return false;
    }
}

async function setupRealtimeSubscriptions() {
    if (!USE_SUPABASE || !appSupabase) {
        console.warn('⚠️ Skipping Realtime subscriptions: Supabase not ready');
        return;
    }

    console.log('📡 Setting up Realtime subscriptions...');

    // Subscribe to system config (version) changes
    appSupabase
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'system_config',
                filter: 'id=eq.global'
            },
            (payload) => {
                console.log('🔄 System config version changed:', payload.new);
                if (payload.new && payload.new.global_version) {
                    const newVersion = payload.new.global_version;
                    if (newVersion > currentGlobalVersion) {
                        console.log(`🚀 Newer global version detected: ${newVersion} (current: ${currentGlobalVersion}). Reloading store data...`);
                        currentGlobalVersion = newVersion;
                        localStorage.setItem('current_global_version', currentGlobalVersion);
                        
                        // Force refresh products/categories
                        localStorage.removeItem(STORE_KEYS.products);
                        localStorage.removeItem(STORE_KEYS.categories);
                        localStorage.removeItem(STORE_KEYS.banners);
                        localStorage.removeItem(STORE_KEYS.hero_images);
                        
                        window.location.reload();
                    }
                }
            }
        )
        .subscribe((status) => {
            console.log('📡 Realtime system config channel status:', status);
        });

    // Subscribe to products changes
    appSupabase
        .channel('realtime-products')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            async (payload) => {
                console.log('🔄 Realtime products update:', payload);
                // Clear local cache
                localStorage.removeItem(STORE_KEYS.products);
                // Re-render if we are on appropriate page
                if (typeof renderProducts === 'function') {
                    await renderProducts();
                }
            }
        )
        .subscribe((status) => {
            console.log('📡 Products channel status:', status);
        });

    // Subscribe to hero images changes
    appSupabase
        .channel('realtime-hero-images')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'hero_images' },
            async (payload) => {
                console.log('🔄 Hero image changed:', payload);
                await initHeroCarousel();
            }
        )
        .subscribe((status) => {
            console.log('📡 Hero images channel status:', status);
        });

    console.log('✅ Realtime subscriptions set up!');
}

// Fetch helper for static JSON files and browser storage
async function fetchGithubJson(filename, fallbackData) {
    try {
        const localUrl = `/data/${filename}.json?t=${Date.now()}`;
        const response = await fetch(localUrl);
        if (response.ok) {
            const data = await response.json();
            if (data && (Array.isArray(data) || typeof data === 'object')) {
                saveStore(`hov_${filename}`, data);
                return data;
            }
        }
    } catch (e) {
        console.warn(`Static data fetch for ${filename} failed.`, e);
    }
    return getStore(`hov_${filename}`, fallbackData);
}

// Fetch products preferring static JSON when it is intentionally empty, otherwise fall back to Supabase/GitHub/API/localStorage
async function fetchProductsPrefer() {
    const staticProducts = await fetchGithubJson('products', DEFAULT_PRODUCTS);
    if (Array.isArray(staticProducts) && staticProducts.length === 0) {
        return staticProducts;
    }

    if (await loadSupabaseClient() && USE_SUPABASE && appSupabase) {
        try {
            const { data, error } = await appSupabase.from('products').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        } catch (e) { console.warn('appSupabase fetch failed', e); }
    }
    if (window.USE_GITHUB_DATABASE) {
        return staticProducts;
    }
    if (API_URL) {
        try {
            const r = await fetch(API_URL + '/api/products');
            if (r.ok) return await r.json();
        } catch (e) { }
    }
    return getStore(STORE_KEYS.products, DEFAULT_PRODUCTS);
}

async function fetchProductByIdPrefer(id) {
    if (!id) return null;
    if (await loadSupabaseClient() && USE_SUPABASE && appSupabase) {
        try {
            const { data, error } = await appSupabase.from('products').select('*').eq('id', id).limit(1).single();
            if (!error && data) return data;
        } catch (e) { console.warn('appSupabase single fetch failed', e); }
    }
    const products = await fetchProductsPrefer();
    return products.find(p => Number(p.id) === Number(id)) || null;
}

async function fetchCategoriesPrefer() {
    if (await loadSupabaseClient() && USE_SUPABASE && appSupabase) {
        try {
            const { data, error } = await appSupabase.from('categories').select('*').order('display_order', { ascending: true });
            if (!error && data) return data;
        } catch (e) { console.warn('appSupabase categories fetch failed', e); }
    }
    if (window.USE_GITHUB_DATABASE) {
        return await fetchGithubJson('categories', defaultCategories);
    }
    if (API_URL) {
        try {
            const r = await fetch(API_URL + '/api/categories');
            if (r.ok) return await r.json();
        } catch (e) { }
    }
    return getStore(STORE_KEYS.categories, defaultCategories);
}

async function fetchBannersPrefer() {
    if (await loadSupabaseClient() && USE_SUPABASE && appSupabase) {
        try {
            const { data, error } = await appSupabase.from('banners').select('*').eq('is_active', true).order('display_order', { ascending: true });
            if (!error && data) return data;
        } catch (e) { console.warn('appSupabase banners fetch failed', e); }
    }
    if (window.USE_GITHUB_DATABASE) {
        return await fetchGithubJson('banners', defaultBanners);
    }
    if (API_URL) {
        try {
            const r = await fetch(API_URL + '/api/banners');
            if (r.ok) return await r.json();
        } catch (e) { }
    }
    return getStore(STORE_KEYS.banners, defaultBanners);
}

async function fetchHeaderLinksPrefer() {
    if (await loadSupabaseClient() && USE_SUPABASE && appSupabase) {
        try {
            const { data, error } = await appSupabase.from('header_links').select('*').eq('is_active', true).order('display_order', { ascending: true });
            if (!error && data) return data.map(link => ({
                id: link.id,
                label: link.name,
                slug: link.slug,
                href: link.href
            }));
        } catch (e) { console.warn('appSupabase header_links fetch failed', e); }
    }
    if (window.USE_GITHUB_DATABASE) {
        const links = await fetchGithubJson('header_links', defaultHeaderLinks);
        return links.map(link => ({
            id: link.id,
            label: link.name || link.label,
            slug: link.slug,
            href: link.href
        }));
    }
    if (API_URL) {
        try {
            const r = await fetch(API_URL + '/api/header-links');
            if (r.ok) return await r.json();
        } catch (e) { }
    }
    return getStore(STORE_KEYS.header_links, defaultHeaderLinks);
}

async function fetchOrdersPrefer() {
    const localOrders = getStore(STORE_KEYS.orders, []);
    if (await loadSupabaseClient() && USE_SUPABASE && appSupabase) {
        try {
            const { data, error } = await appSupabase.from('orders').select('*').order('created_at', { ascending: false });
            if (!error && data) {
                // Merge Supabase orders with local orders, Supabase takes precedence
                const supabaseOrderIds = new Set(data.map(o => o.id));
                const mergedOrders = [
                    ...data.map(o => ({
                        ...o,
                        id: o.id,
                        customer: o.customer,
                        email: o.email,
                        phone: o.phone,
                        items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
                        total: o.total_amount,
                        status: o.status,
                        payment_status: o.payment_status,
                        shipping_address: typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : o.shipping_address,
                        date: o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
                    })),
                    ...localOrders.filter(o => !supabaseOrderIds.has(o.id))
                ];
                saveStore(STORE_KEYS.orders, mergedOrders);
                return mergedOrders;
            }
        } catch (e) { console.warn('appSupabase orders fetch failed', e); }
    }
    return localOrders;
}

async function fetchOrderByIdPrefer(orderId) {
    const localOrders = getStore(STORE_KEYS.orders, []);
    const localOrder = localOrders.find(o => o.id === orderId);
    if (await loadSupabaseClient() && USE_SUPABASE && appSupabase) {
        try {
            const { data, error } = await appSupabase.from('orders').select('*').eq('id', orderId).limit(1).single();
            if (!error && data) {
                const order = {
                    ...data,
                    id: data.id,
                    customer: data.customer,
                    email: data.email,
                    phone: data.phone,
                    items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items,
                    total: data.total_amount,
                    status: data.status,
                    payment_status: data.payment_status,
                    shipping_address: typeof data.shipping_address === 'string' ? JSON.parse(data.shipping_address) : data.shipping_address,
                    date: data.created_at ? new Date(data.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
                };
                // Update local storage
                const updatedOrders = localOrders.map(o => o.id === orderId ? order : o);
                if (!localOrders.find(o => o.id === orderId)) updatedOrders.unshift(order);
                saveStore(STORE_KEYS.orders, updatedOrders);
                return order;
            }
        } catch (e) { console.warn('appSupabase order by id fetch failed', e); }
    }
    return localOrder;
}

async function fetchHeroImagesPrefer() {
    if (await loadSupabaseClient() && USE_SUPABASE && appSupabase) {
        try {
            const { data, error } = await appSupabase.from('hero_images').select('*').eq('is_active', true).order('display_order', { ascending: true });
            if (!error && data) {
                console.log('📸 Loaded hero images from Supabase:', data);
                return data;
            }
        } catch (e) { console.warn('appSupabase hero_images fetch failed', e); }
    }
    if (window.USE_GITHUB_DATABASE) {
        return await fetchGithubJson('hero_images', defaultHeroImages);
    }
    if (API_URL) {
        try {
            const r = await fetch(API_URL + '/api/hero-images');
            if (r.ok) return await r.json();
        } catch (e) { }
    }
    return getStore(STORE_KEYS.hero_images, defaultHeroImages);
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
const DEFAULT_PRODUCTS = [];
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
    { id: 1, name: 'Maxis', slug: 'maxis' },
    { id: 2, name: 'Cord sets', slug: 'cord-sets' },
    { id: 3, name: 'Kurti', slug: 'kurti' },
    { id: 4, name: 'Kurti sets', slug: 'kurti-sets' },
    { id: 5, name: 'Pure Cotton', slug: 'pure-cotton' }
];

const defaultHeaderLinks = [
    { id: 1, label: 'Maxis', slug: 'maxis', href: 'Maxis.html' },
    { id: 2, label: 'Cord sets', slug: 'cord-sets', href: 'Cord sets.html' },
    { id: 3, label: 'Kurti', slug: 'kurti', href: 'Kurti.html' },
    { id: 4, label: 'Kurti sets', slug: 'kurti-sets', href: 'Kurti sets.html' }
    , { id: 5, label: 'Pure Cotton', slug: 'pure-cotton', href: 'pure-cotton.html' }
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
    // Only use default hero images if we don't have Supabase or if existing is not array
    const isDefaultHeroImages = Array.isArray(existingHeroImages) && existingHeroImages.every(img => img.image_url?.startsWith('assets/'));
    if (!Array.isArray(existingHeroImages) || isDefaultHeroImages) {
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

function isHeicUrl(url) {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.heic') || lowerUrl.includes('.heif');
}

// House of Viyara clean branded SVG placeholder data URI (always works, 0 network requests)
const HOV_PLACEHOLDER = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%27400%27%20height%3D%27400%27%20viewBox%3D%270%200%20400%20400%27%3E%3Crect%20width%3D%27400%27%20height%3D%27400%27%20fill%3D%27%23f9f9f9%27/%3E%3Crect%20x%3D%2710%27%20y%3D%2710%27%20width%3D%27380%27%20height%3D%27380%27%20fill%3D%27none%27%20stroke%3D%27%23000000%27%20stroke-width%3D%274%27/%3E%3Ctext%20x%3D%27200%27%20y%3D%27180%27%20font-family%3D%27Outfit%2C%20sans-serif%27%20font-size%3D%2718%27%20font-weight%3D%27900%27%20text-anchor%3D%27middle%27%20fill%3D%27%23000000%27%20letter-spacing%3D%272%27%3EHOUSE%20OF%20VIYARA%3C/text%3E%3Cpath%20d%3D%27M170%20230%20C170%20210%2C%20230%20210%2C%20230%20230%20L250%20320%20L150%20320%20Z%27%20fill%3D%27%23FFE500%27%20stroke%3D%27%23000000%27%20stroke-width%3D%273%27/%3E%3Ccircle%20cx%3D%27200%27%20cy%3D%27210%27%20r%3D%2710%27%20fill%3D%27%23FF007A%27%20stroke%3D%27%23000000%27%20stroke-width%3D%272%27/%3E%3Ctext%20x%3D%27200%27%20y%3D%27360%27%20font-family%3D%27Outfit%2C%20sans-serif%27%20font-size%3D%2712%27%20font-weight%3D%27700%27%20text-anchor%3D%27middle%27%20fill%3D%27%23666666%27%3EIMAGE%20PENDING%20UPLOAD%3C/text%3E%3C/svg%3E";
const SUPABASE_BLOCKED_HOST = 'embvkfuwevutfwpxemfe.supabase.co';

function isSupabaseBlocked(url) {
    return url && url.includes(SUPABASE_BLOCKED_HOST);
}

function optimizeImg(url, w = 400, q = 60) {
    // If it's a blocked Supabase URL, return placeholder immediately
    if (isSupabaseBlocked(url)) {
        return HOV_PLACEHOLDER;
    }
    if (window.LifeStyleLoader) return LifeStyleLoader.optimizeImageUrl(url, w, q);
    if (url && url.includes('unsplash.com')) {
        return url.replace(/w=\d+/, 'w=' + w).replace(/q=\d+/, 'q=' + q);
    }
    // Cloudinary optimization: if it's a Cloudinary URL add transformations
    if (url && url.includes('res.cloudinary.com')) {
        return url.replace('/upload/', `/upload/w_${w},q_${q},f_auto/`);
    }
    return url || HOV_PLACEHOLDER;
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

    // Auto-open auth modal for unauthenticated users
    if (!user) {
        setTimeout(() => {
            openAuthModal();
        }, 500);
    }

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
    } else if (window.location.pathname.includes('product.html') && !window.location.pathname.includes('/catalog/')) {
        initProductDetails();
    } else if (window.location.pathname.includes('cart.html')) {
        renderCartPage();
    } else if (!window.location.pathname.includes('/catalog/')) {
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
    const heroImgs = await fetchHeroImagesPrefer();
    if (!heroImgs.length) return await fetchBannersPrefer(); // Fallback to banners if no hero images
    return heroImgs;
}

async function initHeroCarousel() {
    const heroImage = document.getElementById('hero-image');
    if (!heroImage) return;

    const heroImages = await getHeroImages();
    console.log('🎠 Hero images to display:', heroImages);
    if (!heroImages.length) return;

    // Filter out hero images without an image_url
    const validHeroImages = heroImages.filter(img => img.image_url && img.image_url.trim() !== '');
    console.log('✅ Valid hero images:', validHeroImages);
    if (!validHeroImages.length) return;

    // Set initial image
    const initialImage = validHeroImages[0].image_url;
    console.log('📸 Initial hero image:', initialImage);
    heroImage.src = initialImage;
    let currentIndex = 0;
    let changeHeroImage = index => {
        if (!heroImage || !validHeroImages[index]) return;
        const targetUrl = validHeroImages[index].image_url;
        console.log('🔄 Changing to hero image:', targetUrl);
        if (heroImage.src.endsWith(targetUrl)) return;
        heroImage.classList.add('fade-out');
        setTimeout(() => {
            heroImage.src = targetUrl;
            heroImage.classList.remove('fade-out');
        }, 300);
        currentIndex = index;
    };

    const nextImage = () => {
        const nextIndex = (currentIndex + 1) % validHeroImages.length;
        changeHeroImage(nextIndex);
    };

    if (heroCarouselInterval) clearInterval(heroCarouselInterval);
    // Use custom duration from hero image, or fallback to 3000ms
    const currentDuration = validHeroImages[0].duration ? validHeroImages[0].duration : 3000;
    heroCarouselInterval = setInterval(nextImage, currentDuration);
    
    // Update interval when image changes to use each image's custom duration
    const originalChangeHeroImage = changeHeroImage;
    changeHeroImage = index => {
        originalChangeHeroImage(index);
        if (heroCarouselInterval) clearInterval(heroCarouselInterval);
        const duration = validHeroImages[index].duration ? validHeroImages[index].duration : 3000;
        heroCarouselInterval = setInterval(nextImage, duration);
    };
}

function getCategoryFileName(slug) {
    // Map slugs to actual file names (with spaces and capitalization)
    const slugToFile = {
        'maxis': 'Maxis.html',
        'cord-sets': 'Cord sets.html',
        'kurti': 'Kurti.html',
        'kurti-sets': 'Kurti sets.html',
        'pure-cotton': 'pure-cotton.html'
    };
    // Return the mapped file name if it exists, otherwise slug.html (fallback)
    return slugToFile[slug] || `${slug}.html`;
}

function renderCategoryList(categories, container) {
    if (!categories.length) {
        container.innerHTML = '<div class="empty-state"><p>No categories found. Add categories from the admin panel.</p></div>';
        return;
    }
    const categoryItems = categories;
    container.innerHTML = categoryItems.map(cat => `
        <a href="${getCategoryFileName(cat.slug)}" class="category-card">
            <img src="${cat.banner_image || 'design-assets/images/saree.png'}" alt="${cat.name}" style="width:100%;height:100%;object-fit:cover;">
            <div class="category-overlay">
                <h3>${cat.name}</h3>
                <span>25+ Products</span>
            </div>
        </a>
    `).join('');
}

async function getCurrentHeaderSlug() {
    if (window.category) return window.category;
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith('collections.html')) return 'all';
    // Try to get categories from Supabase
    const categories = await fetchCategoriesPrefer();
    // Check both slug.html and mapped file name
    for (const cat of categories) {
        const fileName = getCategoryFileName(cat.slug).toLowerCase();
        if (path.includes(fileName)) {
            return cat.slug;
        }
        if (path.includes(`${cat.slug}.html`)) {
            return cat.slug;
        }
    }
    return '';
}

async function renderHeaderNavigation() {
    const headerLinks = await fetchHeaderLinksPrefer();
    const navLinks = headerLinks.length ? headerLinks : (await fetchCategoriesPrefer()).map(cat => ({
        id: cat.id,
        label: cat.name,
        slug: cat.slug,
        href: getCategoryFileName(cat.slug)
    }));
    const currentSlug = getCurrentHeaderSlug();
    
    // Check if we're in the catalog folder
    const isInCatalog = window.location.pathname.includes('/catalog/');
    const prefix = isInCatalog ? '' : '';

    const headerNavLists = document.querySelectorAll('header .nav-links');
    headerNavLists.forEach(nav => {
        nav.innerHTML = navLinks.map(link => {
            if (isInCatalog) {
                // If in catalog, link to catalog.html with category filter
                const isActive = new URLSearchParams(window.location.search).get('category') === link.slug || 
                                 window.location.pathname.includes('/catalog/') && currentSlug === link.slug;
                return `<li><a href="catalog.html?category=${link.slug}" class="${isActive ? 'active' : ''}">${link.label}</a></li>`;
            } else {
                // Normal main site behavior
                return `<li><a href="${link.href}" class="${currentSlug === link.slug ? 'active' : ''}">${link.label}</a></li>`;
            }
        }).join('');
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
    const mobileSearch = document.getElementById('mobile-search-input');

    const handleSearch = (e) => {
        clearTimeout(searchTimeout);
        const term = e.target.value.trim();
        searchTimeout = setTimeout(() => {
            renderProducts(window.category || '', term);
        }, 500);
    };

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

    // Generate variants from simple colors and sizes
    const rawColors = Array.isArray(product?.colors) && product.colors.length ? product.colors : ['Default'];
    const rawSizes = Array.isArray(product?.sizes) && product.sizes.length ? product.sizes : ['One Size'];
    
    // Generate all color × size combinations
    const generatedVariants = [];
    let index = 0;
    for (const color of rawColors) {
        for (const size of rawSizes) {
            index++;
            generatedVariants.push({
                id: `${product?.id || 'default'}-${color || 'default'}-${size || 'one-size'}-${index}`,
                color: color || 'Default',
                size: size || 'One Size',
                stock: Number(product?.stock || 10),
                image_url: product?.image_url || '',
                gallery: Array.isArray(product?.gallery) && product.gallery.length ? product.gallery : [product?.image_url || '']
            });
        }
    }
    return generatedVariants;
}

function getProductColors(product) {
    // Use product.colors field if available
    if (Array.isArray(product.colors) && product.colors.length) {
        return product.colors;
    }
    // Fall back to variants
    const variants = normalizeProductVariants(product);
    return [...new Set(variants.map(v => v.color || 'Default'))];
}

function getAvailableSizes(product, color) {
    // Use product.sizes field if available
    if (Array.isArray(product.sizes) && product.sizes.length) {
        return product.sizes;
    }
    // Fall back to variants
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
        if (window.location.pathname.includes('maxis')) category = 'maxis';
        if (window.location.pathname.toLowerCase().includes('cord sets')) category = 'cord-sets';
        if (window.location.pathname.toLowerCase().includes('cord-sets')) category = 'cord-sets';
        if (window.location.pathname.includes('kurti')) category = 'kurti';
        if (window.location.pathname.toLowerCase().includes('kurti sets')) category = 'kurti-sets';
        if (window.location.pathname.includes('kurti-sets')) category = 'kurti-sets';
        if (window.location.pathname.includes('pure-cotton')) category = 'pure-cotton';
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
        const placeholder = 'https://via.placeholder.com/400x400?text=Product+Image';
        const imgAttrs = eager === 'lazy'
            ? `src="${thumbImg}" data-src="${optimizedImg}" class="lazy-loading" loading="lazy" onerror="this.onerror=null; this.src='${placeholder}'; if(this.dataset.src) this.dataset.src='${placeholder}';"`
            : `src="${optimizedImg}" loading="eager" onerror="this.onerror=null; this.src='${placeholder}';"`;
        
        const isInWishlist = wishlist.some(item => item.id === p.id);
        const isOutOfStock = p.stock === 0;
        const originalPrice = p.offer_price || p.price;
        const discountedPrice = calculateDiscountedPrice(originalPrice);
        
        return `
        <div class="product-card" onclick="window.location.href='product.html?id=${p.id}'" style="cursor: pointer;">
            <div class="product-image">
                <img ${imgAttrs} alt="${p.name}" width="400" height="400" decoding="async">
                ${isOutOfStock ? '<span class="product-badge sale" style="background:#e74c3c;">OUT OF STOCK</span>' : (p.is_trending ? '<span class="product-badge">NEW</span>' : '')}
                <div class="product-actions">
                    <button onclick="event.stopPropagation(); toggleWishlist(${p.id}, '${escapeForAttr(p.name)}', ${discountedPrice}, '${optimizedImg}')">
                        <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <button onclick="event.stopPropagation(); openProductQuickView(${p.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="event.stopPropagation(); ${!isOutOfStock ? `addToCart(${p.id}, '${escapeForAttr(p.name)}', ${discountedPrice}, '${optimizedImg}', ${p.shipping_price || 0}, 'Default', 'One Size', ${p.stock})` : ''}">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="product-rating">
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star-half-alt"></i>
                </div>
                <div class="product-price">
                    ${originalPrice > discountedPrice ? `<span class="old-price">₹${originalPrice}</span>` : ''}
                    ₹${discountedPrice}
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

    if (!window.location.pathname.includes('product.html')) {
        window.location.href = `product.html?id=${productId}`;
        return;
    }

    const pdpModal = document.getElementById('pdp-modal');
    const pdpContent = document.getElementById('pdp-content');
    if (!pdpModal || !pdpContent) return;

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

    // Fetch all products to get similar products
    const allProducts = await fetchProductsPrefer();
    renderProductDetails(product, container, allProducts);
}

function colorNameToHex(name) {
    const map = {
        gold: '#d4af37', yellow: '#d4af37', black: '#0a0a0a', white: '#ffffff',
        cream: '#e6c547', beige: '#f5f1eb', red: '#c0392b', blue: '#3498db',
        green: '#27ae60', pink: '#ff69b4', maroon: '#800000', navy: '#001f3f',
        orange: '#e67e22', purple: '#9b59b6', brown: '#8b4513', grey: '#95a5a6', gray: '#95a5a6'
    };
    const key = String(name || '').toLowerCase().trim();
    return map[key] || '#d4af37';
}

function renderDesignProductCard(p) {
    const optimizedImg = optimizeImg(p.image_url, 400, 60);
    const thumbImg = optimizeImg(p.image_url, 40, 30);
    const placeholder = 'https://via.placeholder.com/400x400?text=Product+Image';
    const isInWishlist = wishlist.some(item => item.id === p.id);
    const isOutOfStock = p.stock === 0;
    const originalPrice = p.offer_price || p.price;
    const discountedPrice = calculateDiscountedPrice(originalPrice);
    const imgAttrs = `src="${optimizedImg}" loading="lazy" onerror="this.onerror=null; this.src='${placeholder}';"`;

    return `
        <div class="product-card" onclick="window.location.href='product.html?id=${p.id}'" style="cursor: pointer;">
            <div class="product-image">
                <img ${imgAttrs} alt="${p.name}" width="400" height="400" decoding="async">
                ${isOutOfStock ? '<span class="product-badge sale" style="background:#e74c3c;">OUT OF STOCK</span>' : (p.is_trending ? '<span class="product-badge">NEW</span>' : (originalPrice > discountedPrice ? '<span class="product-badge sale">SALE</span>' : ''))}
                <div class="product-actions">
                    <button onclick="event.stopPropagation(); toggleWishlist(${p.id}, '${escapeForAttr(p.name)}', ${discountedPrice}, '${optimizedImg}')">
                        <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <button onclick="event.stopPropagation(); window.location.href='product.html?id=${p.id}'">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="event.stopPropagation(); ${!isOutOfStock ? `addToCart(${p.id}, '${escapeForAttr(p.name)}', ${discountedPrice}, '${optimizedImg}', ${p.shipping_price || 0})` : ''}">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="product-rating">
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star-half-alt"></i>
                </div>
                <div class="product-price">
                    ${originalPrice > discountedPrice ? `<span class="old-price">₹${originalPrice}</span>` : ''}
                    ₹${discountedPrice}
                </div>
            </div>
        </div>
    `;
}

function renderProductDetails(product, targetContainer, allProducts = []) {
    window._pdpAllProducts = allProducts;
    document.title = `${product.name} - House Of Viyara`;

    const fullStars = Math.floor(product.rating || 5);
    const halfStar = (product.rating || 5) % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    let starsHtml = '';
    for (let i = 0; i < fullStars; i++) starsHtml += '<i class="fas fa-star"></i>';
    if (halfStar) starsHtml += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < emptyStars; i++) starsHtml += '<i class="far fa-star"></i>';

    const selection = getProductSelection(product);
    const colors = getProductColors(product);
    const displayColors = colors.filter(c => c && c !== 'Default');
    const sizes = getAvailableSizes(product, selection.color);
    const displaySizes = (sizes.length ? sizes : ['Free Size']);
    const selectedVariant = getVariantForSelection(product, selection.color, selection.size) || normalizeProductVariants(product)[0];
    const originalPrice = product.offer_price || product.price;
    const discountedPrice = calculateDiscountedPrice(originalPrice);
    const reviewCount = product.reviews_count || (Array.isArray(product.reviews) ? product.reviews.length : 0);
    const categoryLabel = String(product.category || 'shop').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const categoryHref = getCategoryFileName(product.category || '');

    const reviews = Array.isArray(product.reviews) ? product.reviews : [];
    const reviewsHtml = reviews.length > 0 ? reviews.map(r => {
        const initial = (r.user || 'G').charAt(0).toUpperCase();
        const reviewStars = '<i class="fas fa-star"></i>'.repeat(r.rating || 5) + '<i class="far fa-star"></i>'.repeat(Math.max(0, 5 - (r.rating || 5)));
        const mediaHtml = [
            r.image ? `<div class="review-photo"><img src="${optimizeImg(r.image, 200, 60)}" alt="Review photo"></div>` : '',
            r.video_url ? `<div class="review-video"><video src="${r.video_url}" controls muted playsinline></video></div>` : ''
        ].filter(Boolean).join('');
        return `
            <div class="review-card">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 50px; height: 50px; border-radius: 50%; background: #d4af37; display: flex; align-items: center; justify-content: center; color: white; font-family: 'Poppins', sans-serif; font-weight: 800;">${initial}</div>
                        <div>
                            <h4 style="font-family: 'Poppins', sans-serif; margin-bottom: 5px;">${r.user || 'Guest'}</h4>
                            <div class="product-rating" style="font-size: 0.9rem;">${reviewStars}</div>
                        </div>
                    </div>
                    <span style="font-family: 'Montserrat', sans-serif; color: #999; font-size: 0.9rem;">${r.date || ''}</span>
                </div>
                <p style="color: #666; font-family: 'Montserrat', sans-serif; line-height: 1.6;">${r.comment || ''}</p>
                ${mediaHtml ? `<div class="review-media">${mediaHtml}</div>` : ''}
            </div>
        `;
    }).join('') : '<p style="color:#666;font-family:\'Montserrat\',sans-serif;">No reviews yet. Be the first to share your thoughts.</p>';

    const reviewFormHtml = `
        <div class="review-card" style="margin-top: 30px;">
            <h3 style="font-family: 'Poppins', sans-serif; margin-bottom: 20px;">Share your review</h3>
            <div style="margin-bottom: 15px;">
                <label style="font-weight: 600; display: block; margin-bottom: 8px;">Rating</label>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${[5,4,3,2,1].map(value => `
                        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                            <input type="radio" name="review-rating" value="${value}" ${value === 5 ? 'checked' : ''}>
                            ${value} <i class="fas fa-star" style="color:#d4af37;"></i>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="font-weight: 600; display: block; margin-bottom: 8px;">Name</label>
                <input id="review-name" type="text" placeholder="Your name" class="brutal-input" style="box-shadow:none;border:1px solid #ddd;" />
            </div>
            <div style="margin-bottom: 15px;">
                <label style="font-weight: 600; display: block; margin-bottom: 8px;">Review</label>
                <textarea id="review-text" rows="4" placeholder="Write your experience." class="brutal-input" style="box-shadow:none;border:1px solid #ddd;resize:vertical;"></textarea>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="font-weight: 600; display: block; margin-bottom: 8px;">Image URL or file</label>
                <input id="review-image-url" type="text" placeholder="Paste image URL" class="brutal-input" style="box-shadow:none;border:1px solid #ddd;margin-bottom:8px;" />
                <input id="review-image-file" type="file" accept="image/*" />
            </div>
            <div style="margin-bottom: 20px;">
                <label style="font-weight: 600; display: block; margin-bottom: 8px;">Video URL or file</label>
                <input id="review-video-url" type="text" placeholder="Paste video URL" class="brutal-input" style="box-shadow:none;border:1px solid #ddd;margin-bottom:8px;" />
                <input id="review-video-file" type="file" accept="video/*" />
            </div>
            <button class="btn btn-primary" onclick="submitProductReview(${product.id})">Post Review</button>
        </div>
    `;

    let similarProducts = [];
    if (Array.isArray(product.similar_products) && product.similar_products.length > 0) {
        similarProducts = product.similar_products
            .map(id => allProducts.find(p => p.id === id))
            .filter(Boolean)
            .slice(0, 4);
    }
    if (similarProducts.length === 0) {
        similarProducts = allProducts
            .filter(p => p.id !== product.id && p.category === product.category)
            .slice(0, 4);
    }
    const similarProductsHtml = similarProducts.length > 0
        ? similarProducts.map(p => renderDesignProductCard(p)).join('')
        : '';

    const variantGallery = Array.isArray(selectedVariant.gallery) && selectedVariant.gallery.length
        ? selectedVariant.gallery
        : (Array.isArray(product.gallery) && product.gallery.length ? product.gallery : [selectedVariant.image_url || product.image_url]);
    const gallery = variantGallery.filter(Boolean);
    const galleryPlaceholder = 'https://via.placeholder.com/900x900?text=Product+View';
    const productVideos = Array.isArray(product.videos) && product.videos.length ? product.videos : (product.video_url ? [product.video_url] : []);

    window._pdpGalleryData = gallery.map(img => ({ type: 'image', src: optimizeImg(img, 900, 75), thumb: optimizeImg(img, 120, 50) }));
    productVideos.forEach(videoUrl => {
        window._pdpGalleryData.push({ type: 'video', src: videoUrl, thumb: '' });
    });

    const thumbnailHtml = window._pdpGalleryData.map((item, i) => {
        if (item.type === 'video') {
            return `<div class="thumbnail ${i === 0 ? 'active' : ''}" data-gallery-index="${i}" onclick="changeGalleryImage(${i})" style="display:flex;align-items:center;justify-content:center;background:#0a0a0a;color:#fff;"><i class="fas fa-play"></i></div>`;
        }
        return `<div class="thumbnail ${i === 0 ? 'active' : ''}" data-gallery-index="${i}" onclick="changeGalleryImage(${i})"><img src="${item.thumb}" alt="View ${i + 1}"></div>`;
    }).join('');

    const mainImageSrc = window._pdpGalleryData[0]?.src || galleryPlaceholder;
    const colorSwatchesHtml = displayColors.length > 0
        ? displayColors.map(color => `
            <div class="pdp-color-swatch ${selection.color === color ? 'active' : ''}"
                 style="background:${colorNameToHex(color)};"
                 title="${color}"
                 onclick="selectPdpVariant(${product.id}, '${escapeForAttr(color)}', '${escapeForAttr(selection.size || displaySizes[0])}')"></div>
        `).join('')
        : '';

    const sizeButtonsHtml = displaySizes.map(size => `
        <button type="button" class="pdp-size-btn ${selection.size === size ? 'active' : ''}"
                onclick="selectPdpVariant(${product.id}, '${escapeForAttr(selection.color || 'Default')}', '${escapeForAttr(size)}')">${size}</button>
    `).join('');

    const isWishlisted = wishlist.some(item => item.id === product.id);
    const stock = selectedVariant?.stock ?? product.stock ?? 0;
    const outOfStock = stock <= 0;

    const html = `
        <div class="page-header">
            <div class="container">
                <h1>Product Detail</h1>
                <div class="breadcrumb">
                    <a href="index.html">Home</a> / <a href="collections.html">Shop</a> / <a href="${categoryHref}">${categoryLabel}</a> / ${product.name}
                </div>
            </div>
        </div>
        <div class="page-content">
            <div class="container">
                <div class="pdp-grid">
                    <div class="product-gallery">
                        <div class="thumbnail-list">${thumbnailHtml}</div>
                        <div class="main-image">
                            <img id="mainProductImg" src="${mainImageSrc}" alt="${product.name}" onerror="this.onerror=null; this.src='${galleryPlaceholder}';">
                            <video id="mainProductVideo" controls playsinline style="display:none;width:100%;height:100%;object-fit:cover;"></video>
                        </div>
                    </div>
                    <div>
                        <h1 style="font-family: 'Poppins', sans-serif; font-weight: 800; margin-bottom: 15px;">${product.name}</h1>
                        <div class="product-rating" style="margin-bottom: 20px;">
                            ${starsHtml}
                            <span style="font-family: 'Montserrat', sans-serif; margin-left: 8px;">(${reviewCount} reviews)</span>
                        </div>
                        <div class="product-price" style="margin-bottom: 25px;">
                            ${originalPrice > discountedPrice ? `<span class="old-price" style="font-size: 1.2rem;">₹${originalPrice}</span>` : ''}
                            <span style="font-size: 1.8rem; font-weight: 600; margin-left: 10px;">₹${discountedPrice}</span>
                        </div>
                        <p style="color: #666; font-family: 'Montserrat', sans-serif; line-height: 1.8; margin-bottom: 30px;">
                            ${product.description || ''}
                        </p>
                        ${displayColors.length > 0 ? `
                        <div style="margin-bottom: 25px;">
                            <label style="font-weight: 600; margin-bottom: 10px; display: block;">Color:</label>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">${colorSwatchesHtml}</div>
                        </div>` : ''}
                        <div style="margin-bottom: 25px;">
                            <label style="font-weight: 600; margin-bottom: 10px; display: block;">Size:</label>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">${sizeButtonsHtml}</div>
                        </div>
                        <p style="font-family: 'Montserrat', sans-serif; color: #666; margin-bottom: 20px; font-size: 0.9rem;">
                            ${selectedVariant ? `${selectedVariant.color || 'Default'} / ${selectedVariant.size || 'Free Size'} • ${stock > 0 ? `${stock} in stock` : 'Out of stock'}` : ''}
                        </p>
                        <div style="display: flex; gap: 15px; margin-bottom: 25px; flex-wrap: wrap;">
                            <div class="quantity-control" style="display: flex; align-items: center; border: 1px solid #ddd; border-radius: 5px; overflow: hidden;">
                                <button type="button" onclick="updatePdpQty(-1)" style="width: 40px; height: 45px; border: none; background: #f5f1eb; cursor: pointer;" ${outOfStock ? 'disabled' : ''}><i class="fas fa-minus"></i></button>
                                <input type="number" id="pdp-qty" value="1" min="1" max="${Math.max(1, stock)}" readonly style="width: 50px; text-align: center; border: none; height: 45px; font-family: 'Montserrat', sans-serif;">
                                <button type="button" onclick="updatePdpQty(1)" style="width: 40px; height: 45px; border: none; background: #f5f1eb; cursor: pointer;" ${outOfStock ? 'disabled' : ''}><i class="fas fa-plus"></i></button>
                            </div>
                            <button class="btn btn-primary pdp-add-btn" style="flex: 1; min-width: 180px;" onclick="addFromPdp(${product.id}, '${escapeForAttr(product.name)}', ${discountedPrice}, '${selectedVariant.image_url || product.image_url}', ${product.shipping_price || 0}, '${escapeForAttr(selectedVariant.color || 'Default')}', '${escapeForAttr(selectedVariant.size || 'Free Size')}', ${stock})" ${outOfStock ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
                                ${outOfStock ? 'Out of Stock' : 'Add to Cart'}
                            </button>
                            <button type="button" class="btn btn-secondary" style="background: #fff; color: #0a0a0a; border: 1px solid #d4af37; width: 50px;" onclick="toggleWishlist(${product.id}, '${escapeForAttr(product.name)}', ${discountedPrice}, '${selectedVariant.image_url || product.image_url}')" data-product-id="${product.id}">
                                <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
                            </button>
                        </div>
                        <div style="display: flex; gap: 20px; font-family: 'Montserrat', sans-serif; flex-wrap: wrap; font-size: 0.9rem;">
                            <span><i class="fas fa-truck" style="color: #d4af37; margin-right: 8px;"></i> ${product.shipping_price ? `Shipping: ₹${product.shipping_price}` : 'Free shipping on orders above ₹2000'}</span>
                            <span><i class="fas fa-undo" style="color: #d4af37; margin-right: 8px;"></i> 7-day easy returns</span>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 80px;">
                    <div style="border-bottom: 2px solid #ddd; margin-bottom: 40px;">
                        <button type="button" class="pdp-tab-btn active" id="detailsBtn" onclick="showPdpTab('details')">Product Details</button>
                        <button type="button" class="pdp-tab-btn" id="reviewsBtn" onclick="showPdpTab('reviews')">Customer Reviews</button>
                    </div>
                    <div id="detailsTab">
                        <h3 style="font-family: 'Poppins', sans-serif; margin-bottom: 20px;">Description</h3>
                        <p style="color: #666; font-family: 'Montserrat', sans-serif; line-height: 1.8;">${product.description || 'No description available.'}</p>
                        <h3 style="font-family: 'Poppins', sans-serif; margin: 30px 0 15px;">Product Specifications</h3>
                        <ul style="color: #666; font-family: 'Montserrat', sans-serif; line-height: 2; padding-left: 20px;">
                            <li>Category: ${categoryLabel}</li>
                            <li>Material: Premium quality fabric</li>
                            <li>Available sizes: ${displaySizes.join(', ')}</li>
                            ${displayColors.length ? `<li>Available colors: ${displayColors.join(', ')}</li>` : ''}
                            <li>Care: Dry clean recommended</li>
                        </ul>
                    </div>
                    <div id="reviewsTab" style="display: none;">
                        <h3 style="font-family: 'Poppins', sans-serif; margin-bottom: 30px;">Customer Reviews</h3>
                        ${reviewsHtml}
                        ${reviewFormHtml}
                    </div>
                </div>

                ${similarProductsHtml ? `
                <h2 style="font-family: 'Poppins', sans-serif; text-align: center; margin-bottom: 50px;">Related Products</h2>
                <div class="product-grid">${similarProductsHtml}</div>
                ` : ''}
            </div>
        </div>
    `;

    const container = targetContainer || document.getElementById('pdp-main-content');
    if (container) {
        container.innerHTML = html;
        window.scrollTo(0, 0);
        refreshLazyMedia(container);
        const closeBtn = container.parentElement?.querySelector('.close-modal-btn');
        if (closeBtn) closeBtn.onclick = closeProductPage;
    }
}

window.showPdpTab = function(tabName) {
    const detailsTab = document.getElementById('detailsTab');
    const reviewsTab = document.getElementById('reviewsTab');
    const detailsBtn = document.getElementById('detailsBtn');
    const reviewsBtn = document.getElementById('reviewsBtn');
    if (!detailsTab || !reviewsTab) return;
    const showDetails = tabName === 'details';
    detailsTab.style.display = showDetails ? 'block' : 'none';
    reviewsTab.style.display = showDetails ? 'none' : 'block';
    if (detailsBtn) detailsBtn.classList.toggle('active', showDetails);
    if (reviewsBtn) reviewsBtn.classList.toggle('active', !showDetails);
};

window.loadGalleryVideo = function(index) {
    changeGalleryImage(index);
};

window.changeGalleryImage = function(index) {
    const galleryData = window._pdpGalleryData || [];
    const item = galleryData[index];
    const mainImg = document.getElementById('mainProductImg');
    const mainVideo = document.getElementById('mainProductVideo');
    if (!item || !mainImg) return;

    document.querySelectorAll('.thumbnail').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });

    if (item.type === 'video') {
        mainImg.style.display = 'none';
        if (mainVideo) {
            mainVideo.style.display = 'block';
            if (!mainVideo.querySelector('source')) {
                const source = document.createElement('source');
                source.src = item.src;
                source.type = 'video/mp4';
                mainVideo.appendChild(source);
                mainVideo.load();
            }
            mainVideo.play().catch(() => {});
        }
    } else {
        if (mainVideo) {
            mainVideo.pause();
            mainVideo.style.display = 'none';
        }
        mainImg.style.display = 'block';
        mainImg.src = item.src;
    }
};
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
    renderProductDetails(product, document.getElementById('pdp-content') || document.getElementById('pdp-main-content'), window._pdpAllProducts || []);
}

window.addFromPdp = function(id, name, price, image, shipping_price, color, size, stock) {
    const qty = parseInt(document.getElementById('pdp-qty').value) || 1;
    if (stock !== undefined && stock <= 0) {
        alert('Selected variant is out of stock.');
        return;
    }
    const existing = cart.find(item => item.id === id && item.variantColor === color && item.variantSize === size);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({ id, name, price, image, quantity: qty, variantColor: color || 'Default', variantSize: size || 'One Size', variantLabel: `${color || 'Default'} / ${size || 'One Size'}`, shipping_price: shipping_price });
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
function addToCart(id, name, price, image, shipping_price = 0, color = 'Default', size = 'One Size') {
    const existing = cart.find(item => item.id === id && item.variantColor === color && item.variantSize === size);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ id, name, price, image, quantity: 1, variantColor: color, variantSize: size, variantLabel: `${color} / ${size}`, shipping_price: shipping_price });
    }
    saveCart();
    updateCartBadge();
    openCart();
    renderCartItems();
}

function saveCart() {
    saveUserScopedData(AUTH_KEYS.cart, cart);
}

window.buyNowFromPdp = function(id, name, price, image, shipping_price, color, size, stock) {
    const qty = parseInt(document.getElementById('pdp-qty').value) || 1;
    if (stock !== undefined && stock <= 0) {
        alert('Selected variant is out of stock.');
        return;
    }
    const existing = cart.find(item => item.id === id && item.variantColor === color && item.variantSize === size);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({ id, name, price, image, quantity: qty, variantColor: color || 'Default', variantSize: size || 'One Size', variantLabel: `${color || 'Default'} / ${size || 'One Size'}`, shipping_price: shipping_price });
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
    const badges = document.querySelectorAll('.cart-count, #cart-badge, #mobile-cart-badge, #cartCount');
    badges.forEach(badge => {
        if (badge) {
            badge.innerText = totalItems;
            badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
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
                <p>${item.variantLabel ? `${item.variantLabel} • ` : ''}₹${item.price} x ${item.quantity}${item.shipping_price ? `<br><small><i class="fas fa-truck"></i> Shipping: ₹${item.shipping_price}/item</small>` : ''}</p>
                <div class="cart-item-qty">
                    <button onclick="changeQty(${index}, -1)"><i class="fas fa-minus"></i></button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQty(${index}, 1)"><i class="fas fa-plus"></i></button>
                </div>
            </div>
            <button class="remove-item" onclick="removeItem(${index})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalShipping = cart.reduce((acc, item) => acc + (item.shipping_price || 0) * item.quantity, 0);
    const total = subtotal + totalShipping;
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

    // Close all modals/drawers
    closeCheckoutModal();
    closeCart();

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalShipping = cart.reduce((acc, item) => acc + (item.shipping_price || 0) * item.quantity, 0);
    const amount = subtotal + totalShipping;
    const txnid = 'TXN' + Date.now();
    const orderId = `LS-${Date.now()}`;
    const order = {
        id: orderId,
        txnid,
        customer: checkout.name,
        email: checkout.email,
        phone: checkout.phone || '',
        items: cart.map(item => ({ id: item.id, name: item.name, qty: item.quantity, price: item.price, variant: item.variantLabel || 'Default / One Size', variantColor: item.variantColor || 'Default', variantSize: item.variantSize || 'One Size' })),
        total: amount,
        shipping_address: checkout.shipping_address,
        date: new Date().toLocaleDateString('en-IN'),
        status: 'Pending',
        payment_status: 'Pending'
    };

    // Save to localStorage
    const orders = getStore(STORE_KEYS.orders, []);
    orders.unshift(order);
    saveStore(STORE_KEYS.orders, orders);

    console.log('📦 Starting checkout, order:', order);

    // Save to Supabase if available
    try {
        const supabaseReady = await loadSupabaseClient();
        console.log('✅ Supabase ready?', supabaseReady);
        console.log('✅ appSupabase?', !!appSupabase);
        if (supabaseReady && appSupabase) {
            const payload = {
                id: orderId,
                user_id: user?.id || null,
                customer: checkout.name,
                email: checkout.email,
                phone: checkout.phone || '',
                street: checkout.shipping_address.street,
                city: checkout.shipping_address.city,
                state: checkout.shipping_address.state,
                pincode: checkout.shipping_address.pin,
                items: order.items,
                total_amount: amount,
                status: 'Pending',
                shipping_address: checkout.shipping_address,
                txnid: txnid,
                payment_status: 'Pending',
                payment_gateway: 'demo'
            };
            console.log('🚀 Sending payload to Supabase:', payload);
                const { data, error } = await appSupabase.from('orders').insert(payload).select();
                if (error) {
                    console.error('❌ Error saving order to Supabase:', error);
                    alert('Error saving order to database: ' + error.message);
                } else {
                    console.log('✅ Order saved to Supabase successfully:', data);
                }
        } else {
            console.warn('⚠️ Supabase not available, saving only to localStorage');
        }
    } catch (e) {
        console.error('❌ Supabase order save failed:', e);
        alert('Error saving order: ' + e.message);
    }

    window.location.href = `payment.html?txnid=${txnid}&amount=${amount}&email=${encodeURIComponent(checkout.email)}&name=${encodeURIComponent(checkout.name)}&orderId=${encodeURIComponent(orderId)}`;
}

window.completeCheckout = completeCheckout;
window.fetchOrdersPrefer = fetchOrdersPrefer;
window.fetchOrderByIdPrefer = fetchOrderByIdPrefer;

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

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalShipping = cart.reduce((acc, item) => acc + (item.shipping_price || 0) * item.quantity, 0);
    const total = subtotal + totalShipping;
    const itemsHtml = cart.map((item, index) => `
        <div class="cart-page-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-page-item-info">
                <h4>${item.name}</h4>
                <p>${item.variantLabel ? `${item.variantLabel} • ` : ''}₹${item.price}${item.shipping_price ? ` <small><i class="fas fa-truck"></i> ₹${item.shipping_price}/item</small>` : ''}</p>
                <div class="cart-item-qty" style="margin-top:10px;">
                    <button onclick="changeQty(${index}, -1)"><i class="fas fa-minus"></i></button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQty(${index}, 1)"><i class="fas fa-plus"></i></button>
                </div>
            </div>
            <div class="cart-page-item-actions">
                <span class="cart-page-item-total">₹${(item.price * item.quantity) + (item.shipping_price || 0) * item.quantity}</span>
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
                    <span>₹${subtotal}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom: 20px; font-weight: 700;">
                    <span>Shipping</span>
                    <span>₹${totalShipping}</span>
                </div>
                <div style="display:flex; justify-content:space-between; padding: 20px; background: var(--accent-yellow); font-size: 1.8rem; font-weight: 900; border: 4px solid #000;">
                    <span>Total</span>
                    <span>₹${total}</span>
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
    const prefix = window.location.pathname.includes('/catalog/') ? '../' : '';
    window.location.href = prefix + 'cart.html';
}

window.openCheckout = window.openCart;

window.closeCart = function() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer) drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

window.openCheckoutModal = function() {
    const modal = document.getElementById('checkout-modal');
    const overlay = document.getElementById('checkout-overlay');
    const itemsContainer = document.getElementById('checkout-items');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const grandtotalEl = document.getElementById('checkout-grandtotal');
    
    if (!modal) {
        // If there's no checkout modal, go to cart.html
        openCart();
        return;
    }
    
    // Close cart drawer if open
    const cartDrawer = document.getElementById('cart-drawer');
    const cartOverlay = document.getElementById('cart-drawer-overlay');
    if (cartDrawer) cartDrawer.classList.remove('active');
    if (cartOverlay) cartOverlay.classList.remove('active');
    
    // Render items
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalShipping = cart.reduce((acc, item) => acc + (item.shipping_price || 0) * item.quantity, 0);
    const total = subtotal + totalShipping;
    
    if (itemsContainer) {
        itemsContainer.innerHTML = cart.map(item => `
            <div style="display:flex; justify-content: space-between; margin-bottom: 10px;">
                <span>${item.name} (${item.variantLabel || 'Default'}) x ${item.quantity}</span>
                <span>₹${item.price * item.quantity}${item.shipping_price ? ` (Shipping: ₹${item.shipping_price * item.quantity})` : ''}</span>
            </div>
        `).join('');
    }
    
    if (subtotalEl) subtotalEl.innerText = `₹${subtotal}`;
    // Update shipping display in checkout modal (we need to update index.html too)
    const shippingEl = document.querySelector('#checkout-modal [data-shipping]') || 
                       document.querySelector('#checkout-modal').querySelectorAll('div')[2];
    if (document.getElementById('checkout-shipping')) {
        document.getElementById('checkout-shipping').innerText = `₹${totalShipping}`;
    }
    if (grandtotalEl) grandtotalEl.innerText = `₹${total}`;
    
    modal.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeCheckoutModal = function() {
    const modal = document.getElementById('checkout-modal');
    const overlay = document.getElementById('checkout-overlay');
    if (modal) modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
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
    const desktopSearchIcon = document.getElementById('desktop-search-icon');
    const desktopSearchInput = document.getElementById('desktop-search-input');

    if (cartBtn) cartBtn.onclick = openCart;
    if (closeCartBtn) closeCartBtn.onclick = closeCart;
    if (cartOverlay) cartOverlay.onclick = closeCart;
    if (desktopSearchIcon && desktopSearchInput) desktopSearchIcon.onclick = (e) => {
        e.preventDefault();
        desktopSearchInput.focus();
    };

    // Checkout
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) checkoutBtn.onclick = openCheckoutModal;
    
    // Close Checkout Modal
    const closeCheckoutBtn = document.getElementById('close-checkout-btn');
    const checkoutOverlay = document.getElementById('checkout-overlay');
    if (closeCheckoutBtn) closeCheckoutBtn.onclick = closeCheckoutModal;
    if (checkoutOverlay) checkoutOverlay.onclick = closeCheckoutModal;
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
