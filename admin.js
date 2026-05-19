const API_URL = 'http://localhost:3000/api';

// Tab Switching
function switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tabId}')"]`).classList.add('active');

    if (tabId === 'products') {
        document.getElementById('products-tab').style.display = 'block';
        document.getElementById('add-product-tab').style.display = 'none';
        fetchProducts();
    } else {
        document.getElementById('products-tab').style.display = 'none';
        document.getElementById('add-product-tab').style.display = 'block';
    }
}

// Toggle Image Input Type
function toggleImageInput() {
    const type = document.querySelector('input[name="imageSource"]:checked').value;
    const urlInput = document.getElementById('p-image-url');
    const fileInput = document.getElementById('p-image-file');

    if (type === 'url') {
        urlInput.style.display = 'block';
        fileInput.style.display = 'none';
        urlInput.required = true;
        fileInput.required = false;
    } else {
        urlInput.style.display = 'none';
        fileInput.style.display = 'block';
        urlInput.required = false;
        fileInput.required = true;
    }
}

// Show Toast
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-msg');
    
    msg.textContent = message;
    if (isError) {
        toast.classList.add('error');
        toast.querySelector('i').className = 'fas fa-exclamation-circle';
    } else {
        toast.classList.remove('error');
        toast.querySelector('i').className = 'fas fa-check-circle';
    }

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Fetch Products
async function fetchProducts() {
    const tbody = document.getElementById('products-tbody');
    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error('Failed to fetch products');
        
        const products = await response.json();
        renderProductsTable(products);
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="7" style="color: var(--danger); text-align: center;">Error loading products: ${error.message}</td></tr>`;
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('products-tbody');
    window.currentProducts = products; // Cache for editing
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No products found in the database.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td><img src="${p.image_url || 'https://via.placeholder.com/50'}" class="product-img-cell" alt="${p.name}"></td>
            <td>
                <div style="font-weight: 600;">${p.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${p.brand || 'Life Style'}</div>
            </td>
            <td><span style="text-transform: capitalize;">${p.category}</span></td>
            <td style="font-weight: 600;">₹${p.price}</td>
            <td style="color: var(--text-muted); text-decoration: line-through;">${p.original_price ? '₹'+p.original_price : '-'}</td>
            <td>
                ${p.is_new ? '<span class="status-badge" style="margin-right:5px;">NEW</span>' : ''}
                <span class="status-badge" style="background: rgba(59,130,246,0.1); color: var(--primary);">Active</span>
            </td>
            <td>
                <div class="action-btns">
                    <button class="action-btn" onclick="openEditModal('${p.id}')" title="Edit Pricing & Details">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Add Product Form Submit
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('name', document.getElementById('p-title').value);
        formData.append('brand', document.getElementById('p-brand').value);
        formData.append('price', document.getElementById('p-price').value);
        formData.append('category', document.getElementById('p-category').value);
        formData.append('isNew', document.getElementById('p-is-new').checked);
        
        const originalPrice = document.getElementById('p-original-price').value;
        if (originalPrice) formData.append('originalPrice', originalPrice);
        
        const desc = document.getElementById('p-desc').value;
        if (desc) formData.append('description', desc);

        const imageSource = document.querySelector('input[name="imageSource"]:checked').value;
        
        // Explicitly set headers depending on whether we use FormData (file) or JSON (URL)
        let fetchOptions = {};

        if (imageSource === 'file') {
            const fileInput = document.getElementById('p-image-file');
            if (fileInput.files.length > 0) {
                formData.append('image', fileInput.files[0]);
            } else {
                throw new Error("Please select an image file.");
            }
            fetchOptions = {
                method: 'POST',
                body: formData
            };
        } else {
            // URL upload
            const payload = {
                name: document.getElementById('p-title').value,
                brand: document.getElementById('p-brand').value,
                price: document.getElementById('p-price').value,
                originalPrice: originalPrice || null,
                category: document.getElementById('p-category').value,
                description: desc || '',
                isNew: document.getElementById('p-is-new').checked,
                imageUrl: document.getElementById('p-image-url').value
            };
            fetchOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            };
        }

        const response = await fetch(`${API_URL}/products`, fetchOptions);
        const data = await response.json();

        if (response.ok) {
            showToast('Product added successfully!');
            document.getElementById('add-product-form').reset();
            switchTab('products');
        } else {
            throw new Error(data.error || 'Failed to add product');
        }

    } catch (error) {
        showToast(error.message, true);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Edit Modal Logic
const editModal = document.getElementById('edit-modal');

function openEditModal(id) {
    const product = window.currentProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById('e-id').value = product.id;
    document.getElementById('e-title').value = product.name;
    document.getElementById('e-price').value = product.price;
    document.getElementById('e-original').value = product.original_price || '';
    document.getElementById('e-desc').value = product.description || '';

    editModal.classList.add('active');
}

function closeEditModal() {
    editModal.classList.remove('active');
}

document.getElementById('edit-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('edit-submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    btn.disabled = true;

    const id = document.getElementById('e-id').value;
    const payload = {
        name: document.getElementById('e-title').value,
        price: document.getElementById('e-price').value,
        originalPrice: document.getElementById('e-original').value || null,
        description: document.getElementById('e-desc').value
    };

    try {
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast('Product updated successfully!');
            closeEditModal();
            fetchProducts();
        } else {
            const data = await response.json();
            throw new Error(data.error || 'Failed to update product');
        }
    } catch (error) {
        showToast(error.message, true);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Search
document.getElementById('search-product').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#products-tbody tr');
    
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
});

// Auth Check
function checkAuth() {
    const token = sessionStorage.getItem('adminToken');
    const overlay = document.getElementById('login-overlay');
    
    if (token) {
        overlay.style.display = 'none';
        fetchProducts();
    } else {
        overlay.style.display = 'flex';
    }
}

// Login Handler
document.getElementById('admin-login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
    btn.disabled = true;
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    setTimeout(() => {
        try {
            // Local direct simple credential gate check
            if (username === 'admin' && password === 'life style') {
                sessionStorage.setItem('adminToken', 'authenticated');
                showToast('Authenticated successfully!');
                checkAuth();
            } else {
                throw new Error('Invalid username or password');
            }
        } catch (error) {
            showToast(error.message, true);
            // Brutalist Shake Animation Feedback
            const formDiv = document.getElementById('admin-login-form').parentElement;
            formDiv.style.transform = 'translateX(10px)';
            setTimeout(() => formDiv.style.transform = 'translateX(-10px)', 100);
            setTimeout(() => formDiv.style.transform = 'translateX(5px)', 200);
            setTimeout(() => formDiv.style.transform = 'translateX(-5px)', 300);
            setTimeout(() => formDiv.style.transform = '', 400);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }, 400);
});

// Logout Handler function
function logoutAdmin(e) {
    if (e) e.preventDefault();
    sessionStorage.removeItem('adminToken');
    showToast('Logged out successfully!');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 800);
}

// Toggle Password Visibility
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('login-password');
    const eyeIcon = document.getElementById('password-eye-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        eyeIcon.className = 'fas fa-eye';
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Sync theme
    const currentTheme = localStorage.getItem('lifestyleTheme') || 'light';
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    checkAuth();
});
