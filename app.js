// Global State
let cart = JSON.parse(localStorage.getItem('lifestyle_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('lifestyle_wishlist')) || [];
let user = JSON.parse(localStorage.getItem('lifestyle_user')) || null;

// Determine API URL: Use port 3000 for localhost, otherwise current origin
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.')) 
    ? `${window.location.protocol}//${window.location.hostname}:3000` 
    : window.location.origin;

// Mock Data Fallback (to ensure UI works even if server is slow/down)
const MOCK_PRODUCTS = [
    { 
        id: 1, 
        name: "Banarasi Silk Saree", 
        description: "Elegant gold zari border with premium silk fabric.", 
        price: 4500, 
        offer_price: 3999, 
        category: "saree", 
        image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=60",
        rating: 4.8,
        reviews_count: 124,
        gallery: ["https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80"],
        video_url: "",
        full_details: "A classic Banarasi Silk Saree features complex gold thread work and traditional patterns. Elegant and timeless.",
        reviews: [
            { user: "Sarah L.", rating: 5, date: "May 10, 2026", comment: "Absolutely stunning! The silk is very soft and premium." }
        ]
    },
    { 
        id: 2, 
        name: "Chikankari Cotton Kurti", 
        description: "Handcrafted Lucknowi chikankari embroidery on soft cotton.", 
        price: 1800, 
        offer_price: 1499, 
        category: "kurtis", 
        image_url: "https://images.unsplash.com/photo-1608748010899-18f300247112?w=400&q=60",
        rating: 4.7,
        reviews_count: 89,
        gallery: ["https://images.unsplash.com/photo-1608748010899-18f300247112?w=800&q=80"],
        video_url: "",
        full_details: "Intricate hand-embroidered chikankari designs on premium breathable cotton. Ideal for hot days.",
        reviews: [
            { user: "Priya M.", rating: 5, date: "June 1, 2026", comment: "Very beautiful handwork." }
        ]
    },
    { 
        id: 3, 
        name: "Velvet Lehenga Choli", 
        description: "Heavy embroidered velvet lehenga set for bridal wear.", 
        price: 8900, 
        offer_price: 7999, 
        category: "ethnic", 
        image_url: "https://images.unsplash.com/photo-1610030470200-a616238b6d49?w=400&q=60",
        rating: 4.9,
        reviews_count: 45,
        gallery: ["https://images.unsplash.com/photo-1610030470200-a616238b6d49?w=800&q=80"],
        video_url: "",
        full_details: "Luxurious velvet fabric with heavy golden embroidery, matching choli, and net dupatta.",
        reviews: [
            { user: "Neha S.", rating: 5, date: "June 12, 2026", comment: "Wore it for my reception, received so many compliments!" }
        ]
    },
    { 
        id: 4, 
        name: "Satin Evening Gown", 
        description: "Sleek and luxurious satin gown with cowl neck.", 
        price: 7500, 
        offer_price: 6800, 
        category: "party", 
        image_url: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=60",
        rating: 4.6,
        reviews_count: 72,
        gallery: ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80"],
        video_url: "",
        full_details: "Premium heavy satin gown featuring a beautiful drape, cowl neckline, and side slit.",
        reviews: [
            { user: "Aisha T.", rating: 4, date: "May 25, 2026", comment: "Beautiful drape and luxurious satin." }
        ]
    },
    { 
        id: 5, 
        name: "Linen Summer Dress", 
        description: "Lightweight breathable linen dress for sunny days.", 
        price: 2200, 
        offer_price: 1899, 
        category: "casual", 
        image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=60",
        rating: 4.5,
        reviews_count: 56,
        gallery: ["https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80"],
        video_url: "",
        full_details: "A loose-fitting casual dress made from 100% organic linen. Kept light and breathable.",
        reviews: [
            { user: "Dia R.", rating: 5, date: "June 20, 2026", comment: "So comfortable and breezy." }
        ]
    }
];

// Client-side cache for products
const productCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

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
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initAuth();
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
    } else {
        renderProducts();
        renderBanners();
        renderCategories();
    }
    
    setupEventListeners();
    setupSearch();
    checkPaymentStatus();
    registerServiceWorker();
});

// --- Banner Rendering ---
async function renderBanners() {
    const bannersSection = document.getElementById('banners-section');
    const bannersCarousel = document.getElementById('banners-carousel');
    if (!bannersSection || !bannersCarousel) return;

    try {
        const response = await fetchWithTimeout(`${API_URL}/api/banners`, { timeout: 5000 });
        if (!response.ok) throw new Error('Failed to fetch banners');
        const banners = await response.json();
        
        if (banners.length > 0) {
            bannersSection.style.display = 'block';
            bannersCarousel.innerHTML = banners.map(banner => `
                <a href="${banner.cta_link || '#'}" class="banner-card">
                    <img src="${banner.image_url}" alt="${banner.title || 'Banner'}" loading="lazy">
                    <div class="banner-overlay">
                        ${banner.title ? `<h3 class="banner-title">${banner.title}</h3>` : ''}
                        ${banner.subtitle ? `<p class="banner-subtitle">${banner.subtitle}</p>` : ''}
                        <span class="banner-cta">${banner.cta_text || 'SHOP NOW'} <i class="fas fa-arrow-right"></i></span>
                    </div>
                </a>
            `).join('');
        }
    } catch (error) {
        console.warn('Failed to load banners:', error);
    }
}

// --- Category Rendering ---
async function renderCategories() {
    const categoryGrid = document.getElementById('category-grid');
    if (!categoryGrid) return;

    // Fallback categories
    const fallbackCategories = [
        { name: 'SAREE', slug: 'saree', icon: 'fas fa-female', banner_image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=60' },
        { name: 'KURTIS', slug: 'kurtis', icon: 'fas fa-tshirt', banner_image: 'https://images.unsplash.com/photo-1608748010899-18f300247112?w=600&q=60' },
        { name: 'ETHNIC WEAR', slug: 'ethnic', icon: 'fas fa-star', banner_image: 'https://images.unsplash.com/photo-1610030470200-a616238b6d49?w=600&q=60' },
        { name: 'PARTY WEAR', slug: 'party', icon: 'fas fa-glass-cheers', banner_image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=60' },
        { name: 'CASUAL WEAR', slug: 'casual', icon: 'fas fa-leaf', banner_image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=60' }
    ];

    // Render fallback first
    renderCategoryList(fallbackCategories, categoryGrid);

    try {
        const response = await fetchWithTimeout(`${API_URL}/api/categories`, { timeout: 5000 });
        if (!response.ok) throw new Error('Failed to fetch categories');
        const categories = await response.json();
        
        if (categories.length > 0) {
            renderCategoryList(categories, categoryGrid);
        }
    } catch (error) {
        console.warn('Failed to load categories:', error);
    }
}

function renderCategoryList(categories, container) {
    container.innerHTML = categories.map(cat => `
        <a href="${cat.slug}.html" class="category-card" style="background: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.4)), url('${cat.banner_image || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=60'}'); background-size: cover; background-position: center;">
            <div class="cat-info">
                <h3>${cat.name.toUpperCase()}</h3>
                <span>SHOP NOW <i class="fas fa-arrow-right"></i></span>
            </div>
        </a>
    `).join('');
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Error:', err));
    }
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

    // Step 1: Render Mock Data IMMEDIATELY for instant loading
    let initialProducts = MOCK_PRODUCTS.filter(p => {
        if (isTrendingSection) return p.is_trending;
        return !category || p.category === category;
    });
    if (isTrendingSection) initialProducts = initialProducts.slice(0, 4);
    renderToDOM(initialProducts, productList, category);

    // Step 2: Try to fetch real products in the background
    try {
        let cacheKey = `${category}-${searchTerm}-${isTrendingSection ? 'trending' : 'all'}`;
        let products;

        if (productCache.has(cacheKey) && (Date.now() - productCache.get(cacheKey).timestamp < CACHE_EXPIRY)) {
            products = productCache.get(cacheKey).data;
        } else {
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            if (searchTerm) params.append('search', searchTerm);
            if (isTrendingSection) params.append('trending', '1');
            
            const url = `${API_URL}/api/products${params.toString() ? '?' + params.toString() : ''}`;

            const res = await fetchWithTimeout(url, { timeout: 2000 }); // Even faster timeout
            if (!res.ok) throw new Error('Failed to fetch');
            
            products = await res.json();
            productCache.set(cacheKey, { data: products, timestamp: Date.now() });
        }

        if (products && products.length > 0) {
            if (isTrendingSection) {
                products = products.slice(0, 4);
            }
            renderToDOM(products, productList, category);
        }
    } catch (error) {
        console.warn('Background fetch failed, keeping mock data:', error);
    }
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
        
        return `
        <div class="product-card">
            <div class="product-img" onclick="openProductPage(${p.id})" style="cursor: pointer; position: relative;">
                <img ${imgAttrs} alt="${p.name}" width="400" height="400" decoding="async">
                <button class="product-wishlist-btn" data-product-id="${p.id}" onclick="event.stopPropagation(); toggleWishlist(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.offer_price || p.price}, '${optimizedImg}')" style="color: ${isInWishlist ? '#FF007A' : '#000'};">
                    ${isInWishlist ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>'}
                </button>
                <button class="add-to-cart-overlay" onclick="event.stopPropagation(); addToCart(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.offer_price || p.price}, '${optimizedImg}')">
                    <i class="fas fa-plus"></i> ADD TO BAG
                </button>
            </div>
            <div class="product-info" onclick="openProductPage(${p.id})" style="cursor: pointer;">
                <h3>${p.name}</h3>
                <p>${p.description}</p>
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
window.openProductPage = async function(productId) {
    if(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const pdpModal = document.getElementById('pdp-modal');
    const pdpContent = document.getElementById('pdp-content');
    if (!pdpModal || !pdpContent) return; // Fallback if missing
    
    // Update URL to match instantly
    window.history.pushState({ productId }, '', `?product=${productId}`);
    
    let product = MOCK_PRODUCTS.find(p => p.id === productId);
    
    if (!product) {
        try {
            const res = await fetch(`${API_URL}/api/products/${productId}`);
            if (res.ok) product = await res.json();
        } catch (e) {
            console.error('Failed to fetch product details', e);
        }
    }

    if (!product) {
        pdpModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        pdpContent.innerHTML = '<div style="padding: 100px 20px; text-align: center;"><h2>Product not found</h2><button class="btn btn-primary" onclick="closeProductPage()" style="margin-top: 20px;">Return</button></div>';
        return;
    }

    // Render directly without loading screen
    renderProductDetails(product, pdpContent);
    
    // Show modal after rendering to prevent empty flash
    pdpModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
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

    let product = MOCK_PRODUCTS.find(p => p.id === productId);
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

    // Generate Gallery — first image eager, rest lazy; video deferred until selected
    const gallery = product.gallery || [product.image_url];
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
                
                <p class="pdp-short-desc">${product.description}</p>
                
                <div class="pdp-actions">
                    <div class="qty-selector">
                        <button onclick="updatePdpQty(-1)"><i class="fas fa-minus"></i></button>
                        <input type="number" id="pdp-qty" value="1" min="1" max="10" readonly>
                        <button onclick="updatePdpQty(1)"><i class="fas fa-plus"></i></button>
                    </div>
                    <button class="btn btn-primary pdp-add-btn" onclick="addFromPdp(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.offer_price || product.price}, '${product.image_url}')">
                        ADD TO BAG
                    </button>
                    <button class="pdp-wishlist-btn" onclick="toggleWishlist(${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.offer_price || product.price}, '${product.image_url}')" data-product-id="${product.id}">
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
                
                <div class="pdp-full-details">
                    <h3>PRODUCT DETAILS</h3>
                    <div class="details-content">
                        <p>${product.full_details || product.description}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Reviews Section -->
        <div class="pdp-reviews-section">
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

window.addFromPdp = function(id, name, price, image) {
    const qty = parseInt(document.getElementById('pdp-qty').value) || 1;
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({ id, name, price, image, quantity: qty });
    }
    saveCart();
    updateCartBadge();
    
    // Show visual feedback
    const btn = document.querySelector('.pdp-add-btn');
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
    localStorage.setItem('lifestyle_wishlist', JSON.stringify(wishlist));
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
window.openCart = function() {
    document.getElementById('cart-drawer').classList.add('active');
    document.getElementById('cart-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderCartItems();
}

window.closeCart = function() {
    document.getElementById('cart-drawer').classList.remove('active');
    document.getElementById('cart-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

window.toggleCart = function() {
    const drawer = document.getElementById('cart-drawer');
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
