// ============================================
// CATALOG.JS - Product Catalog Page Logic
// ============================================

let catalogProducts = [];
let filteredProducts = [];
let selectedCategories = [];
let maxPrice = 10000;
let currentSort = 'newest';
let isGridView = true;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🛍️ Catalog page loaded');
    
    // Wait for app.js to load and set up Supabase
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Initialize catalog
    await initCatalog();
    setupEventListeners();
});

// ============================================
// SETUP EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Filter toggle - SIMPLIFIED AND GUARANTEED TO WORK
    const filterToggleBtn = document.getElementById('filter-toggle');
    const filterPanel = document.getElementById('filter-panel');
    
    if (filterToggleBtn && filterPanel) {
        console.log('✅ Filter button and panel found');
        filterToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 Filter button clicked');
            filterPanel.classList.toggle('active');
            console.log('📋 Filter panel active:', filterPanel.classList.contains('active'));
        });
    } else {
        console.error('❌ Filter button or panel not found');
    }

    // Category filters
    const categoryFilters = document.querySelectorAll('.category-filter');
    categoryFilters.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                const val = e.target.value;
                let targetPage = '';
                if (val === 'maxis') targetPage = 'maxis.html';
                else if (val === 'cord-sets') targetPage = 'cord-sets.html';
                else if (val === 'kurti') targetPage = 'kurtis.html';
                else if (val === 'kurti-sets') targetPage = 'kurti-sets.html';
                else if (val === 'pure-cotton') targetPage = 'pure-cotton.html';
                
                if (targetPage) {
                    window.location.href = targetPage;
                }
            } else {
                applyFilters();
            }
        });
    });

    // Price filter
    const priceFilter = document.getElementById('price-filter');
    const priceValue = document.getElementById('price-value');
    if (priceFilter && priceValue) {
        priceFilter.addEventListener('input', (e) => {
            maxPrice = parseInt(e.target.value);
            priceValue.textContent = maxPrice.toLocaleString();
            applyFilters();
        });
    }

    // Sort dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            applyFilters();
        });
    }

    // Sort radio buttons in filter panel
    const sortRadios = document.querySelectorAll('input[name="sort"]');
    sortRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentSort = e.target.value;
            if (sortSelect) {
                sortSelect.value = currentSort;
            }
            applyFilters();
        });
    });

    // View toggle
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const catalogGrid = document.getElementById('catalog-grid');
    
    if (gridViewBtn && listViewBtn && catalogGrid) {
        gridViewBtn.addEventListener('click', () => {
            isGridView = true;
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            catalogGrid.classList.remove('list-view');
            renderCatalog(filteredProducts);
        });

        listViewBtn.addEventListener('click', () => {
            isGridView = false;
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
            catalogGrid.classList.add('list-view');
            renderCatalog(filteredProducts);
        });
    }

    // Search
    const catalogSearchInput = document.getElementById('catalog-search-input');
    if (catalogSearchInput) {
        catalogSearchInput.addEventListener('input', debounce(applyFilters, 300));
    }

    // Close filter panel when clicking outside
    document.addEventListener('click', (e) => {
        if (filterPanel && !e.target.closest('.filter-section')) {
            filterPanel.classList.remove('active');
        }
    });
}

// ============================================
// INITIALIZE CATALOG
// ============================================

async function initCatalog() {
    try {
        console.log('📦 Fetching catalog products...');
        
        // Get products from the existing fetchProductsPrefer function
        catalogProducts = await fetchProductsPrefer();
        
        if (!catalogProducts || catalogProducts.length === 0) {
            console.warn('⚠️ No products found');
            const resultsCount = document.getElementById('results-count');
            if (resultsCount) resultsCount.textContent = 'No products found';
            showNoResults();
            return;
        }

        console.log(`✅ Loaded ${catalogProducts.length} products`);
        
        // Set initial filtered products
        filteredProducts = [...catalogProducts];
        
        // Render catalog
        renderCatalog(filteredProducts);
        updateResultsCount();
    } catch (error) {
        console.error('❌ Error loading catalog:', error);
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) resultsCount.textContent = 'Error loading products. Please refresh the page.';
    }
}

// ============================================
// APPLY FILTERS
// ============================================

function applyFilters() {
    const searchTerm = catalogSearchInput.value.toLowerCase();
    
    // Check if we're on a category-specific page
    const isCategoryPage = typeof CATEGORY_FILTER !== 'undefined';
    
    // Get selected categories from checkboxes (only on main catalog page)
    if (!isCategoryPage) {
        selectedCategories = Array.from(categoryFilters)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
    } else {
        // On category page, use the CATEGORY_FILTER
        selectedCategories = [CATEGORY_FILTER];
    }

    // Filter products
    filteredProducts = catalogProducts.filter(product => {
        // Category filter
        const categoryMatch = selectedCategories.length === 0 || 
            selectedCategories.some(cat => {
                const productCategory = (product.category || '').toLowerCase();
                return productCategory.includes(cat) || cat.includes(productCategory);
            });
        
        // Price filter
        const price = product.sale_price || product.price || 0;
        const priceMatch = price <= maxPrice;
        
        // Search filter
        const searchMatch = !searchTerm || 
            product.name?.toLowerCase().includes(searchTerm) ||
            product.description?.toLowerCase().includes(searchTerm);

        return categoryMatch && priceMatch && searchMatch;
    });

    // Apply sorting
    applySorting();
    
    // Render filtered products
    renderCatalog(filteredProducts);
    updateResultsCount();
}

// ============================================
// APPLY SORTING
// ============================================

function applySorting() {
    switch (currentSort) {
        case 'newest':
            filteredProducts.sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB - dateA;
            });
            break;
        case 'popular':
            filteredProducts.sort((a, b) => {
                const ratingA = a.rating || 0;
                const ratingB = b.rating || 0;
                return ratingB - ratingA;
            });
            break;
        case 'price-low':
            filteredProducts.sort((a, b) => {
                const priceA = a.sale_price || a.price || 0;
                const priceB = b.sale_price || b.price || 0;
                return priceA - priceB;
            });
            break;
        case 'price-high':
            filteredProducts.sort((a, b) => {
                const priceA = a.sale_price || a.price || 0;
                const priceB = b.sale_price || b.price || 0;
                return priceB - priceA;
            });
            break;
    }
}

// ============================================
// RENDER CATALOG
// ============================================

function renderCatalog(products) {
    const catalogGrid = document.getElementById('catalog-grid');
    if (!catalogGrid) return;
    
    catalogGrid.innerHTML = '';

    if (products.length === 0) {
        showNoResults();
        return;
    }

    products.forEach(product => {
        const productCard = createProductCard(product);
        catalogGrid.appendChild(productCard);
    });
}

// ============================================
// CREATE PRODUCT CARD
// ============================================

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = `product-card ${isGridView ? '' : 'list-view'}`;

    // Image handling
    const imageUrl = getProductImageUrl(product);
    const imageHtml = imageUrl ? `<img src="${imageUrl}" alt="${product.name}" class="product-image" onerror="this.src='../assets/placeholder.png'">` : '';

    // Price calculation
    const price = product.sale_price || product.price || 0;
    const originalPrice = product.price || 0;
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    // Rating
    const rating = product.rating || 0;
    const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));

    // Badge
    const badge = product.is_new ? '<span class="product-badge new">New</span>' : 
                  discount > 0 ? `<span class="product-badge sale">${discount}% OFF</span>` : '';

    card.innerHTML = `
        <div class="product-image-wrapper">
            ${imageHtml}
            ${badge}
        </div>
        <div class="product-info">
            <div class="product-category">${product.category || 'Uncategorized'}</div>
            <div class="product-name">${product.name || 'Unnamed Product'}</div>
            <div class="product-description">${(product.description || '').substring(0, 60)}...</div>
            <div class="product-rating">
                <span class="product-stars">${stars}</span>
                <span class="product-rating-text">(${product.reviews_count || 0})</span>
            </div>
            <div class="product-price-wrapper">
                <div>
                    <div class="product-price">₹${price.toLocaleString('en-IN')}</div>
                    ${originalPrice > price ? `<div class="product-original-price">₹${originalPrice.toLocaleString('en-IN')}</div>` : ''}
                </div>
                ${discount > 0 ? `<div class="product-discount">-${discount}%</div>` : ''}
            </div>
            <div class="product-actions">
                <button class="add-to-cart-btn" onclick="addToCartFromCatalog(event, '${product.id}')">
                    <i class="fas fa-shopping-bag"></i> Add to Cart
                </button>
                <button class="wishlist-icon-btn ${isInWishlist(product.id) ? 'active' : ''}" 
                        onclick="toggleWishlistFromCatalog(event, '${product.id}')">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        </div>
    `;

    // Add click to view details
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.product-actions')) {
            openProductPage(product.id);
        }
    });

    return card;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getProductImageUrl(product) {
    if (product.image_url) {
        // If it's already a full URL
        if (product.image_url.startsWith('http')) {
            return product.image_url;
        }
        // If it's a Supabase storage path
        if (window.SUPABASE_BUCKET && window.SUPABASE_URL) {
            return `${window.SUPABASE_URL}/storage/v1/object/public/${window.SUPABASE_BUCKET}/${product.image_url}`;
        }
    }
    return null;
}

function isInWishlist(productId) {
    return wishlist && wishlist.some(item => item.id === productId);
}

function addToCartFromCatalog(e, productId) {
    e.stopPropagation();
    const product = catalogProducts.find(p => p.id === productId);
    if (product) {
        // Use the existing addToCart function from app.js
        if (window.openProductPage) {
            // Navigate to product page for variant selection
            openProductPage(productId);
        } else {
            console.warn('Product page function not available');
        }
    }
}

function toggleWishlistFromCatalog(e, productId) {
    e.stopPropagation();
    const product = catalogProducts.find(p => p.id === productId);
    if (product) {
        // Check if already in wishlist
        const index = wishlist.findIndex(item => item.id === productId);
        
        if (index > -1) {
            // Remove from wishlist
            wishlist.splice(index, 1);
        } else {
            // Add to wishlist
            wishlist.push({
                id: product.id,
                name: product.name,
                price: product.sale_price || product.price,
                image: getProductImageUrl(product)
            });
        }
        
        // Update localStorage
        localStorage.setItem('lifestyle_wishlist', JSON.stringify(wishlist));
        
        // Update UI
        const btn = e.target.closest('.wishlist-icon-btn');
        btn.classList.toggle('active');
        
        // Update wishlist badge
        updateWishlistBadge();
    }
}

function updateResultsCount() {
    const resultsCount = document.getElementById('results-count');
    if (!resultsCount) return;
    
    if (filteredProducts.length === 0) {
        resultsCount.textContent = 'No products found';
    } else {
        resultsCount.textContent = `Showing ${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`;
    }
}

function showNoResults() {
    const catalogGrid = document.getElementById('catalog-grid');
    const noResults = document.getElementById('no-results');
    if (catalogGrid) catalogGrid.innerHTML = '';
    if (noResults) noResults.style.display = 'block';
}

// Utility: Debounce function
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

console.log('✅ Catalog.js loaded successfully');
