// Product Data
let products = []; // Now fetched from backend

async function fetchProductsFromBackend() {
    try {
        const response = await fetch(`${API_URL}/api/products`);
        if (response.ok) {
            products = await response.json();
            // Adapt backend field names to frontend if needed
            products = products.map(p => ({
                id: p.id,
                title: p.name,
                brand: p.brand || 'LUMINA',
                price: p.price,
                originalPrice: p.original_price,
                discount: p.original_price ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0,
                rating: 4.8, // Mock rating if not in DB
                reviews: 120, // Mock reviews if not in DB
                image: p.image_url.startsWith('/') ? `${API_URL}${p.image_url}` : p.image_url,
                isNew: p.is_new === 1,
                category: p.category
            }));
            
            if (document.getElementById('product-list')) {
                applyFilters();
            }
        }
    } catch (err) {
        console.error('Failed to fetch products:', err);
    }
}

// State
let cart = JSON.parse(localStorage.getItem('zubrikaCart')) || [];
let selectedSize = 'L'; // Default size for modal

// Dynamic API URL: Use production backend if on live site, else localhost
const API_URL = window.location.hostname === 'life-style-gamma.vercel.app' 
    ? 'https://life-style-production.up.railway.app' // Replace with your actual deployed backend URL
    : 'http://localhost:3000';

let socket;
let currentUser = JSON.parse(localStorage.getItem('luminaUser')) || null;

// DOM Elements for Auth
const authModal = document.getElementById('auth-modal');
const authOverlay = document.getElementById('auth-overlay');
const openAuthBtn = document.getElementById('open-auth-btn');
const closeAuthBtn = document.getElementById('close-auth-btn');
const sendOtpBtn = document.getElementById('send-otp-btn');
const verifyOtpBtn = document.getElementById('verify-otp-btn');
const otpRequestStep = document.getElementById('otp-request-step');
const otpVerifyStep = document.getElementById('otp-verify-step');

// Initialize Socket.io
if (typeof io !== 'undefined') {
    socket = io(API_URL);
    socket.on('order-status-update', (data) => {
        updateTrackingUI(data.status);
    });
}

// Initialize Google Login
window.onload = function () {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: "572682440348-vfaaljc997ee9q3175i3rj3155lvs13t.apps.googleusercontent.com",
            callback: handleGoogleLogin
        });
        google.accounts.id.renderButton(
            document.getElementById("google-login-btn"),
            { theme: "outline", size: "large", width: "100%" }
        );
    }
}

async function handleGoogleLogin(response) {
    try {
        const res = await fetch(`${API_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });
        const data = await res.json();
        if (data.success) {
            loginUser(data);
        }
    } catch (err) {
        console.error('Google login error:', err);
    }
}

function loginUser(data) {
    currentUser = data.user;
    localStorage.setItem('luminaUser', JSON.stringify(data.user));
    localStorage.setItem('luminaToken', data.token);
    closeAuth();
    updateAuthUI();
}

function updateAuthUI() {
    if (currentUser) {
        openAuthBtn.innerHTML = `<i class="fas fa-user-check"></i>`;
        openAuthBtn.title = `Logged in as ${currentUser.name || currentUser.email || currentUser.phone}`;
    } else {
        openAuthBtn.innerHTML = `<i class="fas fa-user-circle"></i>`;
    }
}

// Auth Handlers
function openAuth() {
    authModal.classList.add('active');
    authOverlay.classList.add('active');
}

function closeAuth() {
    authModal.classList.remove('active');
    authOverlay.classList.remove('active');
    otpRequestStep.style.display = 'block';
    otpVerifyStep.style.display = 'none';
}

if (openAuthBtn) openAuthBtn.addEventListener('click', openAuth);
if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeAuth);
if (authOverlay) authOverlay.addEventListener('click', closeAuth);

if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', async () => {
        const target = document.getElementById('auth-target').value;
        if (!target) return alert('Please enter email or phone');
        
        try {
            const isEmail = target.includes('@');
            const res = await fetch(`${API_URL}/api/auth/otp/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isEmail ? { email: target } : { phone: target })
            });
            if (res.ok) {
                otpRequestStep.style.display = 'none';
                otpVerifyStep.style.display = 'block';
            }
        } catch (err) {
            alert('Failed to send OTP');
        }
    });
}

if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', async () => {
        const target = document.getElementById('auth-target').value;
        const otp = document.getElementById('auth-otp').value;
        
        try {
            const isEmail = target.includes('@');
            const res = await fetch(`${API_URL}/api/auth/otp/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [isEmail ? 'email' : 'phone']: target,
                    otp
                })
            });
            const data = await res.json();
            if (data.success) {
                loginUser(data);
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('OTP verification failed');
        }
    });
}

const filterState = {
    sort: 'featured',
    categories: [],
    price: 'all',
    search: ''
};

// DOM Elements
const productList = document.getElementById('product-list');
const cartBadge = document.getElementById('cart-badge');
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const openCartBtn = document.getElementById('open-cart-btn');
const closeCartBtn = document.getElementById('close-cart-btn');
const cartItemsContainer = document.getElementById('cart-items-container');
const emptyCartMsg = document.getElementById('empty-cart-msg');
const cartTotalPrice = document.getElementById('cart-total-price');
const shopNowBtn = document.getElementById('shop-now-btn');

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const closeMenuBtn = document.getElementById('close-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileMenuLinks = document.querySelectorAll('.mobile-nav-links a');

const sortSelect = document.getElementById('sort-select');
const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
const priceRadios = document.querySelectorAll('input[name="price"]');
const mobileFilterBtn = document.getElementById('mobile-filter-btn');
const shopSidebar = document.querySelector('.shop-sidebar');

const pdpModal = document.getElementById('pdp-modal');
const pdpOverlay = document.getElementById('pdp-overlay');
const closePdpBtn = document.getElementById('close-pdp-btn');
const pdpContent = document.getElementById('pdp-content');

const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = themeToggleBtn.querySelector('i');

const checkoutModal = document.getElementById('checkout-modal');
const closeCheckoutBtn = document.getElementById('close-checkout-btn');
const checkoutItemsContainer = document.getElementById('checkout-items');
const checkoutSubtotal = document.getElementById('checkout-subtotal');
const checkoutGrandtotal = document.getElementById('checkout-grandtotal');

const checkoutCity = document.getElementById('checkout-city');
const checkoutState = document.getElementById('checkout-state');
const checkoutPin = document.getElementById('checkout-pin');

const successModal = document.getElementById('success-modal');
const orderIdEl = document.getElementById('order-id');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateAuthUI();
    
    // Check URL parameters and Pathname for category
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('category');
    
    let pathCat = '';
    const path = window.location.pathname;
    if (path.includes('perfumes.html')) pathCat = 'perfumes';
    else if (path.includes('slippers.html')) pathCat = 'slippers';

    const finalCat = catParam || pathCat;
    
    if (finalCat) {
        if (finalCat === 'new') {
            filterState.isNew = true;
        } else {
            filterState.categories = [finalCat];
        }
    }
    
    // Sync checkboxes
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
    if (filterState.categories.length > 0 && categoryCheckboxes.length > 0) {
        categoryCheckboxes.forEach(cb => {
            cb.checked = filterState.categories.includes(cb.value);
        });
    }

    if (document.getElementById('product-list')) {
        fetchProductsFromBackend();
    }
    
    if (document.getElementById('orders-list')) {
        renderOrders();
    }

    updateCartUI();
    setupEventListeners();
});

// Theme Setup
function initTheme() {
    let currentTheme = localStorage.getItem('zubrikaTheme') || 'light';
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }
}

// Render Products
function renderProducts(productsToRender) {
    productList.innerHTML = '';
    
    if (productsToRender.length === 0) {
        const message = filterState.search ? `No products found matching "${filterState.search}".` : 'No products found matching these filters.';
        productList.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; font-weight:800; font-size:1.5rem; border: 4px solid var(--primary-color);">${message}</div>`;
        return;
    }
    
    productsToRender.forEach((product, index) => {
        const productEl = document.createElement('div');
        productEl.classList.add('product-card');
        productEl.style.animation = `fadeIn 0.5s ease backwards ${index * 0.05}s`;
        
        let badgesHtml = '';
        if (product.discount > 0) {
            badgesHtml += `<div class="badge badge-discount">-${product.discount}%</div>`;
        }
        if (product.isNew) {
            badgesHtml += `<div class="badge badge-new">NEW</div>`;
        }

        productEl.innerHTML = `
            <div class="product-badges">
                ${badgesHtml}
            </div>
            <div class="product-card-top">
                <div class="product-rating">
                    <i class="fas fa-star"></i>
                    <span>${product.rating}</span>
                </div>
            </div>
            <div class="product-image" onclick="openPDP(${product.id})" style="cursor: pointer;">
                <img src="${product.image}" loading="lazy" alt="${product.title}">
            </div>
            <div class="product-price product-price-below">
                <span class="current-price">₹${product.price}</span>
                ${product.originalPrice ? `<span class="original-price">₹${product.originalPrice}</span>` : ''}
            </div>
            <button class="btn btn-primary add-to-cart-btn" onclick="addToCart(${product.id}, 'L')">
                ADD TO BAG
            </button>
            <div class="product-card-bottom">
                <div class="product-brand">${product.brand}</div>
                <h3 class="product-title" onclick="openPDP(${product.id})" style="cursor: pointer;">${product.title}</h3>
            </div>
        `;
        
        productList.appendChild(productEl);
    });
}

// Cart Functionality
function addToCart(productId, size = 'L', fromPdp = false) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // We use a combined ID to distinguish sizes in the cart
    const cartItemId = `${productId}-${size}`;
    const existingItem = cart.find(item => item.cartItemId === cartItemId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            cartItemId: cartItemId,
            id: product.id,
            title: `${product.title} - ${size}`,
            price: product.price,
            image: product.image,
            size: size,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartUI();
    
    if (fromPdp) closePDP();
    openCart();
    
    // Animate Add to Cart
    animateCartIcon();
}

function updateQuantity(cartItemId, change) {
    const itemIndex = cart.findIndex(item => item.cartItemId === cartItemId);
    if (itemIndex > -1) {
        cart[itemIndex].quantity += change;
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
        saveCart();
        updateCartUI();
    }
}

function removeFromCart(cartItemId) {
    cart = cart.filter(item => item.cartItemId !== cartItemId);
    saveCart();
    updateCartUI();
}

function updateCartUI() {
    // Update badge
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    cartBadge.textContent = totalItems;
    
    // Update contents
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '';
        cartItemsContainer.appendChild(emptyCartMsg);
        emptyCartMsg.style.display = 'flex';
        cartTotalPrice.textContent = '₹0';
    } else {
        emptyCartMsg.style.display = 'none';
        cartItemsContainer.innerHTML = '';
        
        let total = 0;
        
        cart.forEach(item => {
            total += item.price * item.quantity;
            
            const itemEl = document.createElement('div');
            itemEl.classList.add('cart-item');
            itemEl.innerHTML = `
                <img src="${item.image}" alt="${item.title}" class="cart-item-img">
                <div class="cart-item-details">
                    <div>
                        <div class="cart-item-title">${item.title}</div>
                        <div class="cart-item-price">₹${item.price}</div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="qty-controls">
                            <button class="qty-btn" onclick="updateQuantity('${item.cartItemId}', -1)">-</button>
                            <div class="qty-value">${item.quantity}</div>
                            <button class="qty-btn" onclick="updateQuantity('${item.cartItemId}', 1)">+</button>
                        </div>
                        <button class="remove-btn" onclick="removeFromCart('${item.cartItemId}')" aria-label="Remove item">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            cartItemsContainer.appendChild(itemEl);
        });
        
        cartTotalPrice.textContent = `₹${total}`;
    }
}

function saveCart() {
    localStorage.setItem('zubrikaCart', JSON.stringify(cart));
}

function animateCartIcon() {
    cartBadge.style.transform = 'scale(1.5)';
    setTimeout(() => {
        cartBadge.style.transform = 'scale(1)';
    }, 200);
}

// Drawer Controls
function openCart() {
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function closeCart() {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function openMobileMenu() {
    mobileMenu.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    mobileMenu.classList.remove('active');
    document.body.style.overflow = '';
}

// PDP Controls
function openPDP(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    selectedSize = 'L'; // Reset size on open
    
    pdpContent.innerHTML = `
        <div class="pdp-image-col">
            <img src="${product.image}" loading="lazy" alt="${product.title}">
        </div>
        <div class="pdp-details-col">
            <div class="pdp-brand">${product.brand}</div>
            <h2 class="pdp-title">${product.title}</h2>
            
            <div class="pdp-price-wrap">
                <span class="pdp-current-price">₹${product.price}</span>
                ${product.originalPrice ? `<span class="pdp-original-price">₹${product.originalPrice}</span>` : ''}
            </div>
            
            <div class="pdp-size-title">Select Size</div>
            <div class="size-selector">
                <button class="size-btn" onclick="selectSize(this, 'S')">S</button>
                <button class="size-btn" onclick="selectSize(this, 'M')">M</button>
                <button class="size-btn selected" onclick="selectSize(this, 'L')">L</button>
                <button class="size-btn" onclick="selectSize(this, 'XL')">XL</button>
            </div>
            
            <p class="pdp-desc">
                Uncompromising comfort meets street-ready style. Crafted with premium thick cotton blend. 
                Features a relaxed drop-shoulder fit tailored for urban environments. Authentic Zubrika tag.
            </p>
            
            <button class="btn btn-primary pdp-add-to-cart" onclick="addToCart(${product.id}, selectedSize, true)">
                ADD TO BAG
            </button>
        </div>
    `;

    pdpModal.classList.add('active');
    pdpOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePDP() {
    pdpModal.classList.remove('active');
    pdpOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function selectSize(btn, size) {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedSize = size;
}

// Filter Engine
function applyFilters() {
    let result = [...products];
    
    // Filter by search
    if (filterState.search) {
        const query = filterState.search.toLowerCase();
        result = result.filter(p => 
            p.title.toLowerCase().includes(query) || 
            p.brand.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
        );
    }

    // Filter by New Arrivals if needed
    if (filterState.isNew) {
        result = result.filter(p => p.isNew);
    }
    
    // Filter Category
    if (filterState.categories.length > 0) {
        result = result.filter(p => filterState.categories.includes(p.category));
    }
    
    // Filter Price
    if (filterState.price === 'under-1000') {
        result = result.filter(p => p.price < 1000);
    } else if (filterState.price === '1000-2000') {
        result = result.filter(p => p.price >= 1000 && p.price <= 2000);
    } else if (filterState.price === 'over-2000') {
        result = result.filter(p => p.price > 2000);
    }
    
    // Sort
    if (filterState.sort === 'price-low') {
        result.sort((a, b) => a.price - b.price);
    } else if (filterState.sort === 'price-high') {
        result.sort((a, b) => b.price - a.price);
    } else if (filterState.sort === 'rating') {
        result.sort((a, b) => b.rating - a.rating);
    }
    
    renderProducts(result);
}

// Event Listeners Setup
function setupEventListeners() {
    // Category scroll and filter logic
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = this.getAttribute('href');
            const categories = ['perfumes', 'slippers'];
            const categoryMatch = categories.find(cat => target === `#${cat}`);
            
            if (categoryMatch) {
                e.preventDefault();
                // Update filter state and apply
                filterState.categories = [categoryMatch];
                applyFilters();
                
                // Scroll to products
                const productsSec = document.getElementById('products');
                if (productsSec) {
                    const offset = 80;
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = productsSec.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
                
                // Close mobile menu if open
                closeMobileMenu();
            }
        });
    });

    // Theme Toggle
    themeToggleBtn.addEventListener('click', () => {
        let currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('zubrikaTheme', currentTheme);
        
        if (currentTheme === 'dark') {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
        }
    });

    // Advanced Filters Events
    sortSelect.addEventListener('change', (e) => {
        filterState.sort = e.target.value;
        applyFilters();
    });

    categoryCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const checkedBoxes = Array.from(categoryCheckboxes).filter(i => i.checked);
            filterState.categories = checkedBoxes.map(i => i.value);
            applyFilters();
        });
    });

    priceRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            filterState.price = e.target.value;
            applyFilters();
        });
    });

    if (mobileFilterBtn) {
        mobileFilterBtn.addEventListener('click', () => {
            shopSidebar.classList.toggle('active');
        });
    }

    openCartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openCart();
    });
    
    closeCartBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);
    
    shopNowBtn.addEventListener('click', () => {
        closeCart();
        window.location.href = '#products';
    });

    mobileMenuBtn.addEventListener('click', openMobileMenu);
    closeMenuBtn.addEventListener('click', closeMobileMenu);
    
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });

    // PDP Listeners
    closePdpBtn.addEventListener('click', closePDP);
    pdpOverlay.addEventListener('click', closePDP);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCart();
            closeMobileMenu();
            closePDP();
        }
    });

    // Checkout logic
    document.querySelector('.checkout-btn').addEventListener('click', () => {
        if (cart.length === 0) {
            alert('Your bag is empty!');
        } else {
            closeCart();
            openCheckout();
        }
    });

    closeCheckoutBtn.addEventListener('click', () => {
        checkoutModal.classList.remove('active');
        document.body.style.overflow = '';
    });
    
    // Auto-fill City & State using PIN Code
    if (checkoutPin) {
        checkoutPin.addEventListener('input', async (e) => {
            const pin = e.target.value;
            if (pin.length === 6 && /^\d+$/.test(pin)) {
                try {
                    const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
                    const data = await response.json();
                    
                    if (data && data[0].Status === "Success") {
                        const postOffice = data[0].PostOffice[0];
                        
                        checkoutCity.value = postOffice.District;
                        checkoutState.value = postOffice.State;
                        
                        // Neo-brutalist flash animation to signify auto-fill success
                        const originalBg = checkoutCity.style.backgroundColor;
                        checkoutCity.style.backgroundColor = 'var(--accent-yellow)';
                        checkoutState.style.backgroundColor = 'var(--accent-yellow)';
                        
                        setTimeout(() => {
                            checkoutCity.style.backgroundColor = originalBg;
                            checkoutState.style.backgroundColor = originalBg;
                        }, 500);
                    }
                } catch (error) {
                    console.error("Failed to fetch PIN details", error);
                }
            }
        });
    }

    // GPS Geolocation Address Fetching
    const gpsBtn = document.getElementById('gps-locate-btn');
    const checkoutStreet = document.getElementById('checkout-street');
    
    if (gpsBtn) {
        gpsBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                alert("Geolocation is not supported by your browser");
                return;
            }
            
            const originalText = gpsBtn.innerHTML;
            gpsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
            
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                try {
                    // OpenStreetMap Nominatim API for Free Reverse Geocoding
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                    const data = await res.json();
                    
                    if (data && data.address) {
                        const addr = data.address;
                        
                        // Assemble structured street address
                        const streetArr = [];
                        if (addr.house_number) streetArr.push(addr.house_number);
                        if (addr.road) streetArr.push(addr.road);
                        if (addr.suburb) streetArr.push(addr.suburb);
                        if (addr.neighbourhood) streetArr.push(addr.neighbourhood);
                        
                        if (checkoutStreet) checkoutStreet.value = streetArr.join(', ') || data.display_name.split(',')[0];
                        if (checkoutCity) checkoutCity.value = addr.city || addr.town || addr.county || addr.state_district || '';
                        if (checkoutState) checkoutState.value = addr.state || '';
                        if (checkoutPin) checkoutPin.value = addr.postcode || '';
                        
                        // Flash animation to signify GPS mapping success
                        [checkoutStreet, checkoutCity, checkoutState, checkoutPin].forEach(input => {
                            if (!input) return;
                            const origBg = input.style.backgroundColor;
                            input.style.backgroundColor = 'var(--accent-blue)';
                            setTimeout(() => input.style.backgroundColor = origBg, 500);
                        });
                    }
                } catch (err) {
                    alert("Failed to reverse geocode address. Please enter manually.");
                } finally {
                    gpsBtn.innerHTML = originalText;
                }
                
            }, (error) => {
                alert("Location access denied or failed.");
                gpsBtn.innerHTML = originalText;
            });
        });
    }
    
// Tracking Logic
const trackBtn = document.getElementById('track-btn');
const trackOrderIdInput = document.getElementById('track-order-id');
const trackEmailInput = document.getElementById('track-email');
const trackingResults = document.getElementById('tracking-results');
const trackFormCard = document.getElementById('track-form-card');
const trackAnotherBtn = document.getElementById('track-another-btn');

if (trackBtn) {
    trackBtn.addEventListener('click', async () => {
        const orderId = trackOrderIdInput.value.trim();
        const email = trackEmailInput.value.trim();

        if (!orderId) {
            alert('Please enter an Order ID');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/orders/${orderId}`);
            if (response.ok) {
                const order = await response.json();
                showTrackingResults(order);
                
                // Join Socket.io room for real-time updates
                if (socket) {
                    socket.emit('join-order-tracking', orderId);
                }
            } else {
                alert('Order not found. Please check your ID.');
            }
        } catch (err) {
            console.error('Tracking error:', err);
            alert('Could not connect to tracking server.');
        }
    });
}

if (trackAnotherBtn) {
    trackAnotherBtn.addEventListener('click', () => {
        trackingResults.classList.remove('active');
        trackFormCard.style.display = 'block';
    });
}

function showTrackingResults(order) {
    trackFormCard.style.display = 'none';
    trackingResults.classList.add('active');
    
    document.getElementById('res-order-id').textContent = `ORDER #${order.id}`;
    document.getElementById('res-order-date').textContent = `Placed on ${new Date(order.created_at).toLocaleDateString()}`;
    
    updateTrackingUI(order.status);
}

function updateTrackingUI(status) {
    const statusBadge = document.getElementById('res-status');
    statusBadge.textContent = status.toUpperCase();
    statusBadge.className = 'status-badge ' + status.toLowerCase();

    const steps = ['processing', 'shipped', 'out-for-delivery', 'delivered'];
    const currentStepIndex = steps.indexOf(status.toLowerCase().replace(/ /g, '-'));

    steps.forEach((step, index) => {
        const el = document.getElementById(`step-${step}`);
        if (!el) return;
        
        el.classList.remove('active', 'completed');
        if (index < currentStepIndex) {
            el.classList.add('completed');
        } else if (index === currentStepIndex) {
            el.classList.add('active');
        }
    });
}

// Mobile Menu
    mobileMenuBtn.addEventListener('click', openMobileMenu);
}

// Checkout Methods
function openCheckout() {
    checkoutModal.classList.add('active');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden'; // Ensure it locks scrolling
    renderCheckoutSummary();
}

function renderCheckoutSummary() {
    checkoutItemsContainer.innerHTML = '';
    let subtotal = 0;
    
    cart.forEach(item => {
        subtotal += (item.price * item.quantity);
        const el = document.createElement('div');
        el.className = 'checkout-item-mini';
        el.innerHTML = `
            <img src="${item.image}" alt="">
            <div style="flex-grow:1;">
                <div style="font-weight:800;font-size:0.9rem;">${item.title}</div>
                <div style="font-size:0.8rem; font-weight:600;">Qty: ${item.quantity} | Size: ${item.size}</div>
                <div style="font-weight:800;margin-top:5px;">₹${item.price}</div>
            </div>
        `;
        checkoutItemsContainer.appendChild(el);
    });
    
    checkoutSubtotal.textContent = `₹${subtotal}`;
    checkoutGrandtotal.textContent = `₹${subtotal + 100}`; // Flat 100 shipping
}

async function completeCheckout() {
    if (!currentUser) {
        alert('Please login to place an order.');
        openAuth();
        return;
    }

    const customerName = document.getElementById('checkout-name').value || currentUser.name || 'Guest Customer';
    const customerEmail = document.getElementById('checkout-email').value || currentUser.email || 'guest@example.com';
    
    let subtotal = 0;
    cart.forEach(item => subtotal += (item.price * item.quantity));
    const total = subtotal + 100; // Including shipping

    try {
        // 1. Create Razorpay Order on backend
        const orderRes = await fetch(`${API_URL}/api/payments/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: total, receipt: `receipt_${Date.now()}` })
        });
        const rzpOrder = await orderRes.json();

        // 2. Open Razorpay Checkout
        const options = {
            key: "rzp_test_your_key_here", // This should match RAZORPAY_KEY_ID in backend .env
            amount: rzpOrder.amount,
            currency: rzpOrder.currency,
            name: "LUMINA",
            description: "Luxury Fragrances & Slippers",
            order_id: rzpOrder.id,
            handler: async function (response) {
                // 3. Verify Payment on backend
                const newOrderId = 'LUM-' + Math.floor(100000 + Math.random() * 900000);
                const verifyRes = await fetch(`${API_URL}/api/payments/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        order_details: {
                            id: newOrderId,
                            customer_name: customerName,
                            email: customerEmail,
                            total: total,
                            items: [...cart]
                        }
                    })
                });

                const verifyData = await verifyRes.json();
                if (verifyData.success) {
                    orderIdEl.textContent = newOrderId;
                    
                    // Add to local history too
                    const localOrders = JSON.parse(localStorage.getItem('zubrikaOrders')) || [];
                    localOrders.unshift({
                        id: newOrderId,
                        date: new Date().toISOString(),
                        total: total,
                        items: [...cart],
                        status: 'Processing'
                    });
                    localStorage.setItem('zubrikaOrders', JSON.stringify(localOrders));

                    cart = [];
                    saveCart();
                    updateCartUI();
                    checkoutModal.classList.remove('active');
                    successModal.classList.add('active');
                } else {
                    alert('Payment verification failed!');
                }
            },
            prefill: {
                name: customerName,
                email: customerEmail,
            },
            theme: { color: "#ffde59" }
        };

        const rzp1 = new Razorpay(options);
        rzp1.open();

    } catch (err) {
        console.error('Checkout error:', err);
        alert('Payment initialization failed. Is the server running?');
    }
}

function renderOrders(searchQuery = '') {
    const ordersContainer = document.getElementById('orders-list');
    if (!ordersContainer) return; // Ensure we only run on orders.html

    let orders = JSON.parse(localStorage.getItem('zubrikaOrders')) || [];
    
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        orders = orders.filter(order => 
            order.id.toLowerCase().includes(query) ||
            order.items.some(item => item.title.toLowerCase().includes(query))
        );
    }
    
    if (orders.length === 0) {
        const message = searchQuery ? `No orders found matching "${searchQuery}".` : 'You have no past orders.';
        ordersContainer.innerHTML = `<div style="text-align:center; padding: 40px; font-weight:800; font-size:1.5rem; border: 4px solid var(--primary-color);">${message}</div>`;
        return;
    }
    
    ordersContainer.innerHTML = '';
    orders.forEach(order => {
        const d = new Date(order.date);
        const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        let itemsHtml = '';
        order.items.forEach(item => {
            itemsHtml += `
                <div class="checkout-item-mini" style="margin-bottom: 10px; border-bottom: 2px solid #ccc; padding-bottom: 10px;">
                    <img src="${item.image}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border: 2px solid var(--primary-color);">
                    <div style="flex-grow:1; margin-left: 10px;">
                        <div style="font-weight:800;font-size:0.9rem;">${item.title}</div>
                        <div style="font-size:0.8rem; font-weight:600;">Qty: ${item.quantity} | Size: ${item.size}</div>
                        <div style="font-weight:800;margin-top:5px;">₹${item.price}</div>
                    </div>
                </div>
            `;
        });
        
        const orderEl = document.createElement('div');
        orderEl.className = 'order-card';
        // Neo-brutalist styling inline matching platform design
        orderEl.style = "border: 4px solid var(--primary-color); padding: 20px; margin-bottom: 30px; background: #fff; box-shadow: 4px 4px 0px 0px var(--shadow-color);";
        
        orderEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 4px solid var(--primary-color); padding-bottom: 15px; margin-bottom: 15px;">
                <div>
                    <h3 style="font-size: 1.2rem; font-weight: 800;">Order #${order.id}</h3>
                    <p style="font-size: 0.9rem; font-weight: 600;">Placed: ${dateStr}</p>
                </div>
                <div style="text-align: right;">
                    <div class="badge" style="background: var(--accent-yellow); color:#111; border: 2px solid #111; padding: 5px 10px; font-weight:800; display:inline-block; font-size:0.8rem;">
                        <i class="fas fa-box"></i> ${order.status}
                    </div>
                    <div style="font-size: 1.2rem; font-weight: 900; margin-top: 10px;">Total: ₹${order.total}</div>
                </div>
            </div>
            <div class="order-items-wrap">
                ${itemsHtml}
            </div>
            <div style="margin-top: 20px; display:flex; gap: 10px;">
                <button class="btn btn-primary" onclick="openTracking('${order.id}')" style="padding: 10px 15px; font-size: 0.9rem; width: 100%; border: 3px solid var(--primary-color);">TRACK ORDER</button>
            </div>
        `;
        ordersContainer.appendChild(orderEl);
    });
}

function closeSuccessModal() {
    successModal.classList.remove('active');
    window.location.href = '#';
}


function openTracking(orderId) {
    const orders = JSON.parse(localStorage.getItem('zubrikaOrders')) || [];
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const trackingModal = document.getElementById('tracking-modal');
    const trackingOverlay = document.getElementById('tracking-overlay');
    const trackingOrderId = document.getElementById('tracking-order-id');
    const trackingStatusBadge = document.getElementById('tracking-status-badge');
    const timelineContainer = document.querySelector('.tracking-timeline-container');
    const estDeliveryEl = document.getElementById('est-delivery-date');

    trackingOrderId.textContent = `ORDER #${order.id}`;
    
    // Simulate status advancement based on time
    const orderTime = new Date(order.date).getTime();
    const now = new Date().getTime();
    const minsSinceOrder = (now - orderTime) / (1000 * 60);

    let status = 'Order Placed';
    let progress = 1;

    if (minsSinceOrder > 10) {
        status = 'Processing';
        progress = 2;
    }
    if (minsSinceOrder > 60) {
        status = 'Shipped';
        progress = 3;
    }
    if (minsSinceOrder > 1440) { // 24 hours
        status = 'In Transit';
        progress = 4;
    }
    if (minsSinceOrder > 4320) { // 3 days
        status = 'Out for Delivery';
        progress = 5;
    }
    if (minsSinceOrder > 5760) { // 4 days
        status = 'Delivered';
        progress = 6;
    }

    trackingStatusBadge.innerHTML = `<i class="fas fa-box"></i> ${status}`;

    // Calculate Estimated Delivery (Order Date + 4 days)
    const estDate = new Date(orderTime + (4 * 24 * 60 * 60 * 1000));
    estDeliveryEl.textContent = estDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const timelineSteps = [
        { label: 'Order Placed', time: 'Confirmed' },
        { label: 'Processing', time: 'Quality Check' },
        { label: 'Shipped', time: 'Mumbai Hub' },
        { label: 'In Transit', time: 'Nearest Station' },
        { label: 'Out for Delivery', time: 'Arriving Today' },
        { label: 'Delivered', time: 'Package Handed Over' }
    ];

    let timelineHtml = '<div class="tracking-timeline">';
    timelineSteps.forEach((step, index) => {
        const stepNum = index + 1;
        let stepClass = 'timeline-step';
        if (stepNum < progress) stepClass += ' completed';
        if (stepNum === progress) stepClass += ' active';

        timelineHtml += `
            <div class="${stepClass}">
                <div class="timeline-dot"></div>
                <div class="timeline-label">${step.label}</div>
                <div class="timeline-time">${stepNum <= progress ? step.time : 'Pending'}</div>
            </div>
        `;
    });
    timelineHtml += '</div>';
    
    timelineContainer.innerHTML = timelineHtml;

    trackingModal.classList.add('active');
    trackingOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeTracking() {
    const trackingModal = document.getElementById('tracking-modal');
    const trackingOverlay = document.getElementById('tracking-overlay');
    trackingModal.classList.remove('active');
    trackingOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function closeSuccessModal() {
    successModal.classList.remove('active');
    window.location.href = '#';
}

// In-page Search Logic
document.addEventListener('DOMContentLoaded', () => {
    const desktopSearchInput = document.getElementById('desktop-search-input');
    
    if (desktopSearchInput) {
        desktopSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            if (document.getElementById('product-list')) {
                filterState.search = query;
                applyFilters();
            } else if (document.getElementById('orders-list')) {
                renderOrders(query);
            }
        });
    }

    // Update search buttons to focus the header search bar instead of opening a modal
    document.querySelectorAll('.search-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (desktopSearchInput) {
                desktopSearchInput.focus();
                // Smooth scroll to search if needed on mobile
                if (window.innerWidth < 768) {
                    desktopSearchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    });

    // Tracking Modal Close Listeners
    const closeTrackingBtn = document.getElementById('close-tracking-btn');
    const trackingOverlay = document.getElementById('tracking-overlay');
    if (closeTrackingBtn) closeTrackingBtn.addEventListener('click', closeTracking);
    if (trackingOverlay) trackingOverlay.addEventListener('click', closeTracking);

    // Add styles for search result hover dynamically
    const style = document.createElement('style');
    style.innerHTML = `
        .search-result-item:hover { background: var(--accent-yellow); transition: background 0.2s; }
    `;
    document.head.appendChild(style);
});
