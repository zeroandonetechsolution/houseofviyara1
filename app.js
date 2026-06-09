// Global State
let cart = JSON.parse(localStorage.getItem('lifestyle_cart')) || [];
let user = JSON.parse(localStorage.getItem('lifestyle_user')) || null;
const API_URL = window.location.origin;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initAuth();
    updateCartBadge();
    renderProducts();
    setupEventListeners();
});

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
        document.getElementById('open-auth-btn').innerHTML = `<i class="fas fa-user"></i>`;
    }

    // Google Sign-In
    if (window.google) {
        google.accounts.id.initialize({
            client_id: "572682440348-vfaaljc997ee9q3175i3rj3155lvs13t.apps.googleusercontent.com",
            callback: handleGoogleResponse
        });
        google.accounts.id.renderButton(
            document.getElementById("google-login-btn"),
            { theme: "outline", size: "large", width: "100%" }
        );
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

// OTP Auth
const sendOtpBtn = document.getElementById('send-otp-btn');
if (sendOtpBtn) {
    sendOtpBtn.onclick = async () => {
        const email = document.getElementById('auth-target').value;
        if (!email) return alert('Please enter email');
        
        const res = await fetch(`${API_URL}/api/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (res.ok) {
            document.getElementById('otp-request-step').style.display = 'none';
            document.getElementById('otp-verify-step').style.display = 'block';
        }
    };
}

const verifyOtpBtn = document.getElementById('verify-otp-btn');
if (verifyOtpBtn) {
    verifyOtpBtn.onclick = async () => {
        const email = document.getElementById('auth-target').value;
        const otp = document.getElementById('auth-otp').value;
        
        const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem('lifestyle_token', data.token);
            localStorage.setItem('lifestyle_user', JSON.stringify(data.user));
            user = data.user;
            location.reload();
        } else {
            alert(data.error);
        }
    };
}

// --- Product Management ---
async function renderProducts() {
    const productList = document.getElementById('product-list');
    if (!productList) return;

    // Determine category from page URL or window variable or query param
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

    const res = await fetch(`${API_URL}/api/products${category ? `?category=${category}` : ''}`);
    let products = await res.json();

    // Limit to 4 products for trending section on home page
    if (productList.id === 'trending') {
        products = products.slice(0, 4);
    }

    if (products.length === 0) {
        productList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px; font-size: 1.5rem; font-weight: 800;">NO PRODUCTS FOUND IN THIS CATEGORY.</div>`;
        return;
    }

    productList.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="product-img">
                <img src="${p.image_url}" alt="${p.name}">
                <button class="add-to-cart-overlay" onclick="addToCart(${p.id}, '${p.name}', ${p.price}, '${p.image_url}')">
                    <i class="fas fa-plus"></i> ADD TO BAG
                </button>
            </div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <p>${p.description}</p>
                <div class="product-price">₹${p.price}</div>
            </div>
        </div>
    `).join('');
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
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.innerText = cart.reduce((acc, item) => acc + item.quantity, 0);
    }
}

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const totalPrice = document.getElementById('cart-total-price');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `<div class="empty-cart"><i class="fas fa-box-open"></i><p>Your bag is empty.</p></div>`;
        totalPrice.innerText = '₹0';
        return;
    }

    container.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>₹${item.price} x ${item.quantity}</p>
                <div class="cart-item-qty">
                    <button onclick="changeQty(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQty(${index}, 1)">+</button>
                </div>
            </div>
            <button class="remove-item" onclick="removeItem(${index})">&times;</button>
        </div>
    `).join('');

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    totalPrice.innerText = `₹${total}`;
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

// --- Checkout & PayU ---
async function completeCheckout() {
    if (!user) {
        document.getElementById('auth-modal').classList.add('active');
        document.getElementById('auth-overlay').classList.add('active');
        return;
    }

    const name = document.getElementById('checkout-name').value;
    const email = document.getElementById('checkout-email').value;
    const phone = document.getElementById('checkout-phone').value;
    const street = document.getElementById('checkout-street').value;
    const city = document.getElementById('checkout-city').value;
    const state = document.getElementById('checkout-state').value;
    const pin = document.getElementById('checkout-pin').value;

    if (!name || !email || !phone || !street) return alert('Please fill all details');

    const amount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0) + 100; // +100 shipping
    const txnid = 'TXN' + Date.now();
    const productinfo = cart.map(i => i.name).join(', ');

    // 1. Get PayU Hash
    const hashRes = await fetch(`${API_URL}/api/payments/payu-hash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txnid, amount, productinfo, firstname: name, email })
    });
    const { hash } = await hashRes.json();

    // 2. Save Order as Pending
    const orderRes = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: user.id,
            items: cart,
            total_amount: amount,
            shipping_address: { street, city, state, pin },
            txnid
        })
    });
    const { orderId } = await orderRes.json();

    // 3. Launch PayU Bolt
    if (window.bolt) {
        bolt.launch({
            key: 'vz4Z7h',
            txnid: txnid,
            hash: hash,
            amount: amount,
            firstname: name,
            email: email,
            phone: phone,
            productinfo: productinfo,
            surl: `${API_URL}/api/payments/verify`,
            furl: `${API_URL}/api/payments/verify`
        }, {
            responseHandler: async function(boltResponse) {
                const verifyRes = await fetch(`${API_URL}/api/payments/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(boltResponse.response)
                });
                const verifyData = await verifyRes.json();
                if (verifyData.success) {
                    showSuccessModal(orderId);
                    cart = [];
                    saveCart();
                } else {
                    alert('Payment Failed');
                }
            },
            catchException: function(err) {
                alert('Payment error occurred');
            }
        });
    }
}

function showSuccessModal(orderId) {
    document.getElementById('checkout-modal').classList.remove('active');
    document.getElementById('success-modal').classList.add('active');
    document.getElementById('order-id').innerText = orderId;
}

// --- UI Helpers ---
function openCart() {
    document.getElementById('cart-drawer').classList.add('active');
    document.getElementById('cart-overlay').classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scroll
    renderCartItems();
}

function closeCart() {
    document.getElementById('cart-drawer').classList.remove('active');
    document.getElementById('cart-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

function setupEventListeners() {
    // Mobile Menu
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeMenuBtn = document.getElementById('close-menu-btn');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.onclick = () => mobileMenu.classList.add('active');
        if (closeMenuBtn) closeMenuBtn.onclick = () => mobileMenu.classList.remove('active');
    }

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.onclick = toggleTheme;

    // Cart toggle
    const openCartBtn = document.getElementById('open-cart-btn');
    if (openCartBtn) openCartBtn.onclick = openCart;

    const closeCartBtn = document.getElementById('close-cart-btn');
    if (closeCartBtn) closeCartBtn.onclick = closeCart;

    const cartOverlay = document.getElementById('cart-overlay');
    if (cartOverlay) cartOverlay.onclick = closeCart;

    // Auth modal
    const openAuthBtn = document.getElementById('open-auth-btn');
    if (openAuthBtn) {
        openAuthBtn.onclick = () => {
            document.getElementById('auth-modal').classList.add('active');
            document.getElementById('auth-overlay').classList.add('active');
        };
    }

    const closeAuthBtn = document.getElementById('close-auth-btn');
    if (closeAuthBtn) {
        closeAuthBtn.onclick = () => {
            document.getElementById('auth-modal').classList.remove('active');
            document.getElementById('auth-overlay').classList.remove('active');
        };
    }

    // Checkout modal
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.onclick = () => {
            if (cart.length === 0) return alert('Your bag is empty!');
            closeCart();
            document.getElementById('checkout-modal').classList.add('active');
            document.getElementById('auth-overlay').classList.add('active');
            
            // Prep checkout items
            const container = document.getElementById('checkout-items');
            container.innerHTML = cart.map(item => `
                <div class="checkout-item" style="display: flex; gap: 15px; margin-bottom: 15px; padding: 15px; border: 3px solid #000; background: #fff;">
                    <img src="${item.image}" style="width: 60px; height: 60px; object-fit: cover; border: 2px solid #000;">
                    <div style="flex: 1;">
                        <div style="font-weight: 900; font-size: 1.1rem; text-transform: uppercase;">${item.name}</div>
                        <div style="font-weight: 700; color: #666;">₹${item.price} x ${item.quantity}</div>
                    </div>
                    <div style="font-weight: 900; font-size: 1.1rem;">₹${item.price * item.quantity}</div>
                </div>
            `).join('');
            
            const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            document.getElementById('checkout-subtotal').innerText = `₹${subtotal}`;
            document.getElementById('checkout-grandtotal').innerText = `₹${subtotal + 100}`;
        };
    }

    const closeCheckoutBtn = document.getElementById('close-checkout-btn');
    const authOverlay = document.getElementById('auth-overlay');
    
    if (closeCheckoutBtn) {
        closeCheckoutBtn.onclick = () => {
            document.getElementById('checkout-modal').classList.remove('active');
            document.getElementById('auth-overlay').classList.remove('active');
        };
    }

    if (authOverlay) {
        authOverlay.onclick = () => {
            document.getElementById('auth-modal').classList.remove('active');
            document.getElementById('checkout-modal').classList.remove('active');
            authOverlay.classList.remove('active');
        };
    }
}
