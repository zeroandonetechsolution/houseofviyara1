// ============================================
// CATALOG.JS - Advanced Product Catalog Page Logic
// ============================================

// Global State
const state = {
    catalogProducts: [],
    filteredProducts: [],
    filters: {
        categories: [],
        priceMin: 0,
        priceMax: 10000,
        rating: 0,
        availability: [],
        searchTerm: ''
    },
    sort: 'newest',
    isGridView: true,
    isCategoryPage: false,
    categoryPageFilter: null
};

// ============================================
// SETUP EVENT LISTENERS - FIRST THING!
// ============================================

// Initialize filter toggle immediately when script loads (no waiting)
(function initFilterToggleFirst() {
    const filterToggleBtn = document.getElementById('filter-toggle');
    const filterPanel = document.getElementById('filter-panel');
    
    if (filterToggleBtn && filterPanel) {
        console.log('✅ Filter toggle button ready');
        filterToggleBtn.addEventListener('click', (e) => {
            console.log('🔘 Filter button clicked!');
            e.preventDefault();
            e.stopPropagation();
            filterPanel.classList.toggle('active');
            console.log('📋 Filter panel active:', filterPanel.classList.contains('active'));
        });
    } else {
        console.warn('⚠️ Filter button or panel not found yet, retrying...');
        setTimeout(initFilterToggleFirst, 100);
    }
})();

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🛍️ Catalog page loaded - Advanced filters activated');
    
    // Wait for app.js to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if we're on a category-specific page
    state.isCategoryPage = typeof CATEGORY_FILTER !== 'undefined';
    if (state.isCategoryPage) {
        state.categoryPageFilter = CATEGORY_FILTER.toLowerCase();
    }
    
    await initCatalog();
    setupRemainingEventListeners();
});

// ============================================
// SETUP REMAINING EVENT LISTENERS
// ============================================

function setupRemainingEventListeners() {
    // Filter Inputs
    setupFilterInputs();
    
    // Price Range
    setupPriceRange();
    
    // Sort
    setupSort();
    
    // View Toggle
    setupViewToggle();
    
    // Search
    setupSearch();
    
    // Clear All Filters
    setupClearAll();
    
    // Close panel on outside click
    setupOutsideClick();
}

function setupFilterToggle() {
    // Already handled by initFilterToggleFirst
}

function setupFilterInputs() {
    // Checkbox filters
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleFilterChange);
    });
    
    // Radio filters
    document.querySelectorAll('.filter-radio').forEach(radio => {
        radio.addEventListener('change', handleFilterChange);
    });
}

function setupPriceRange() {
    const priceMinInput = document.getElementById('price-min');
    const priceMaxInput = document.getElementById('price-max');
    const priceSlider = document.getElementById('price-slider');
    const priceMinDisplay = document.getElementById('price-min-display');
    const priceMaxDisplay = document.getElementById('price-max-display');
    
    if (priceMinInput && priceMaxInput && priceSlider && priceMinDisplay && priceMaxDisplay) {
        // Sync inputs with slider
        priceSlider.addEventListener('input', () => {
            state.filters.priceMax = parseInt(priceSlider.value);
            priceMaxDisplay.textContent = state.filters.priceMax.toLocaleString('en-IN');
            priceMaxInput.value = state.filters.priceMax;
            applyFiltersAndRender();
        });
        
        priceMinInput.addEventListener('input', () => {
            state.filters.priceMin = parseInt(priceMinInput.value) || 0;
            priceMinDisplay.textContent = state.filters.priceMin.toLocaleString('en-IN');
            applyFiltersAndRender();
        });
        
        priceMaxInput.addEventListener('input', () => {
            state.filters.priceMax = parseInt(priceMaxInput.value) || 10000;
            priceMaxDisplay.textContent = state.filters.priceMax.toLocaleString('en-IN');
            priceSlider.value = state.filters.priceMax;
            applyFiltersAndRender();
        });
    }
}

function setupSort() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            state.sort = e.target.value;
            // Sync with radio buttons
            const radio = document.querySelector(`input[name="sort"][value="${state.sort}"]`);
            if (radio) radio.checked = true;
            applyFiltersAndRender();
        });
    }
}

function setupViewToggle() {
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const catalogGrid = document.getElementById('catalog-grid');
    
    if (gridViewBtn && listViewBtn && catalogGrid) {
        gridViewBtn.addEventListener('click', () => {
            state.isGridView = true;
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            catalogGrid.classList.remove('list-view');
            renderCatalog(state.filteredProducts);
        });

        listViewBtn.addEventListener('click', () => {
            state.isGridView = false;
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
            catalogGrid.classList.add('list-view');
            renderCatalog(state.filteredProducts);
        });
    }
}

function setupSearch() {
    const catalogSearchInput = document.getElementById('catalog-search-input');
    if (catalogSearchInput) {
        catalogSearchInput.addEventListener('input', debounce(() => {
            state.filters.searchTerm = catalogSearchInput.value.toLowerCase();
            applyFiltersAndRender();
        }, 300));
    }
}

function setupClearAll() {
    const clearAllBtn = document.getElementById('clear-all-filters');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllFilters);
    }
}

function setupOutsideClick() {
    document.addEventListener('click', (e) => {
        const filterPanel = document.getElementById('filter-panel');
        if (filterPanel && !e.target.closest('.filter-section')) {
            filterPanel.classList.remove('active');
        }
    });
}

function handleFilterChange() {
    // Update state from UI
    updateFiltersFromUI();
    applyFiltersAndRender();
    updateActiveFiltersDisplay();
}

function updateFiltersFromUI() {
    // Categories
    state.filters.categories = Array.from(document.querySelectorAll('.filter-checkbox[data-filter="category"]:checked'))
        .map(cb => cb.value.toLowerCase());
    
    // Rating
    const ratingRadio = document.querySelector('.filter-radio[data-filter="rating"]:checked');
    state.filters.rating = ratingRadio ? parseInt(ratingRadio.value) : 0;
    
    // Availability
    state.filters.availability = Array.from(document.querySelectorAll('.filter-checkbox[data-filter="availability"]:checked'))
        .map(cb => cb.value);
    
    // Sort
    const sortRadio = document.querySelector('.filter-radio[data-filter="sort"]:checked');
    if (sortRadio) {
        state.sort = sortRadio.value;
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) sortSelect.value = state.sort;
    }
}

// ============================================
// INITIALIZE CATALOG
// ============================================

async function initCatalog() {
    try {
        console.log('📦 Fetching catalog products...');
        
        state.catalogProducts = await fetchProductsPrefer();
        
        if (!state.catalogProducts || state.catalogProducts.length === 0) {
            console.warn('⚠️ No products found');
            updateResultsCount();
            showNoResults();
            return;
        }

        console.log(`✅ Loaded ${state.catalogProducts.length} products`);
        console.log('📋 Products with categories:', state.catalogProducts.map(p => ({ id: p.id, name: p.name, category: p.category })));
        if (state.isCategoryPage) {
            console.log(`🎯 Filtering for category: ${state.categoryPageFilter}`);
        }
        
        // Set price range based on actual products
        setPriceRangeFromProducts();
        
        // Apply initial filters
        applyFiltersAndRender();
        
    } catch (error) {
        console.error('❌ Error loading catalog:', error);
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) resultsCount.textContent = 'Error loading products. Please refresh the page.';
    }
}

function setPriceRangeFromProducts() {
    if (state.catalogProducts.length === 0) return;
    
    const prices = state.catalogProducts.map(p => p.sale_price || p.price || 0);
    const minPrice = Math.floor(Math.min(...prices) / 100) * 100;
    const maxPrice = Math.ceil(Math.max(...prices) / 100) * 100;
    
    state.filters.priceMin = minPrice;
    state.filters.priceMax = maxPrice;
    
    // Update UI
    const priceMinInput = document.getElementById('price-min');
    const priceMaxInput = document.getElementById('price-max');
    const priceSlider = document.getElementById('price-slider');
    const priceMinDisplay = document.getElementById('price-min-display');
    const priceMaxDisplay = document.getElementById('price-max-display');
    
    if (priceMinInput) priceMinInput.value = minPrice;
    if (priceMaxInput) priceMaxInput.value = maxPrice;
    if (priceSlider) {
        priceSlider.min = minPrice;
        priceSlider.max = maxPrice;
        priceSlider.value = maxPrice;
    }
    if (priceMinDisplay) priceMinDisplay.textContent = minPrice.toLocaleString('en-IN');
    if (priceMaxDisplay) priceMaxDisplay.textContent = maxPrice.toLocaleString('en-IN');
}

// ============================================
// FILTERING & SORTING
// ============================================

function applyFiltersAndRender() {
    filterProducts();
    sortProducts();
    renderCatalog(state.filteredProducts);
    updateResultsCount();
    updateActiveFiltersDisplay();
}

function filterProducts() {
    state.filteredProducts = state.catalogProducts.filter(product => {
        console.log(`🔍 Checking product: ${product.name}, category: ${product.category}`);
        
        // Category page filter (if applicable) - EXACT MATCH
        if (state.isCategoryPage) {
            const productCategory = (product.category || '').toLowerCase();
            const pageCategory = state.categoryPageFilter.toLowerCase();
            console.log(`   Category page check: productCategory="${productCategory}" vs pageCategory="${pageCategory}" → ${productCategory === pageCategory ? '✅ MATCH' : '❌ NO MATCH'}`);
            if (productCategory !== pageCategory) {
                return false;
            }
        }
        
        // Category filter (main catalog page) - EXACT MATCH
        if (!state.isCategoryPage && state.filters.categories.length > 0) {
            const productCategory = (product.category || '').toLowerCase();
            const categoryMatch = state.filters.categories.some(cat => 
                productCategory === cat.toLowerCase()
            );
            console.log(`   Main catalog filter check: productCategory="${productCategory}" vs filters=[${state.filters.categories.join(', ')}] → ${categoryMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
            if (!categoryMatch) return false;
        }
        
        // Price filter
        const price = product.sale_price || product.price || 0;
        if (price < state.filters.priceMin || price > state.filters.priceMax) return false;
        
        // Rating filter
        const rating = product.rating || 0;
        if (rating < state.filters.rating) return false;
        
        // Availability filters
        if (state.filters.availability.length > 0) {
            const hasInStock = state.filters.availability.includes('in-stock');
            const hasNew = state.filters.availability.includes('new');
            const hasSale = state.filters.availability.includes('sale');
            
            if (hasInStock && (product.stock === 0)) return false;
            if (hasNew && !product.is_new) return false;
            if (hasSale && !(product.sale_price && product.sale_price < product.price)) return false;
        }
        
        // Search filter
        if (state.filters.searchTerm) {
            const nameMatch = (product.name || '').toLowerCase().includes(state.filters.searchTerm);
            const descMatch = (product.description || '').toLowerCase().includes(state.filters.searchTerm);
            if (!nameMatch && !descMatch) return false;
        }
        
        return true;
    });
    console.log(`📊 Filtered products: ${state.filteredProducts.length} out of ${state.catalogProducts.length}`);
}

function sortProducts() {
    switch (state.sort) {
        case 'newest':
            state.filteredProducts.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            break;
        case 'popular':
            state.filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
        case 'price-low':
            state.filteredProducts.sort((a, b) => (a.sale_price || a.price || 0) - (b.sale_price || b.price || 0));
            break;
        case 'price-high':
            state.filteredProducts.sort((a, b) => (b.sale_price || b.price || 0) - (a.sale_price || a.price || 0));
            break;
    }
}

// ============================================
// RENDERING
// ============================================

function renderCatalog(products) {
    const catalogGrid = document.getElementById('catalog-grid');
    const noResults = document.getElementById('no-results');
    
    if (!catalogGrid) return;
    
    catalogGrid.innerHTML = '';
    
    if (products.length === 0) {
        if (noResults) noResults.style.display = 'block';
        return;
    }
    
    if (noResults) noResults.style.display = 'none';
    
    products.forEach(product => {
        const card = createProductCard(product);
        catalogGrid.appendChild(card);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = `product-card ${state.isGridView ? '' : 'list-view'}`;
    card.style.cursor = 'pointer';
    
    const imageUrl = getProductImageUrl(product);
    const imageHtml = imageUrl ? `<img src="${imageUrl}" alt="${product.name}" class="product-image" onerror="this.src='../assets/placeholder.png'">` : '';
    
    const price = product.sale_price || product.price || 0;
    const originalPrice = product.price || 0;
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
    const rating = product.rating || 0;
    const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
    
    let badge = '';
    if (product.is_new) badge += '<span class="product-badge new">New</span>';
    if (discount > 0) badge += `<span class="product-badge sale">${discount}% OFF</span>`;
    
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
        </div>
    `;
    
    card.addEventListener('click', () => {
        window.location.href = `../product.html?id=${product.id}`;
    });
    
    return card;
}

// ============================================
// ACTIVE FILTERS DISPLAY
// ============================================

function updateActiveFiltersDisplay() {
    const container = document.getElementById('active-filters-container');
    const activeFiltersDiv = document.getElementById('active-filters');
    
    if (!container || !activeFiltersDiv) return;
    
    const activeFilters = [];
    
    if (!state.isCategoryPage && state.filters.categories.length > 0) {
        state.filters.categories.forEach(cat => {
            activeFilters.push({ type: 'category', value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) });
        });
    }
    
    const minPrice = state.filters.priceMin;
    const maxPrice = state.filters.priceMax;
    const prices = state.catalogProducts.map(p => p.sale_price || p.price || 0);
    const defaultMin = Math.floor(Math.min(...prices) / 100) * 100;
    const defaultMax = Math.ceil(Math.max(...prices) / 100) * 100;
    
    if (minPrice > defaultMin || maxPrice < defaultMax) {
        activeFilters.push({ 
            type: 'price', 
            value: `${minPrice}-${maxPrice}`, 
            label: `₹${minPrice.toLocaleString('en-IN')} - ₹${maxPrice.toLocaleString('en-IN')}` 
        });
    }
    
    if (state.filters.rating > 0) {
        activeFilters.push({ type: 'rating', value: state.filters.rating, label: `${state.filters.rating}★ & above` });
    }
    
    state.filters.availability.forEach(avail => {
        let label;
        switch (avail) {
            case 'in-stock': label = 'In Stock'; break;
            case 'new': label = 'New Arrivals'; break;
            case 'sale': label = 'On Sale'; break;
            default: label = avail;
        }
        activeFilters.push({ type: 'availability', value: avail, label });
    });
    
    if (state.filters.searchTerm) {
        activeFilters.push({ type: 'search', value: state.filters.searchTerm, label: `"${state.filters.searchTerm}"` });
    }
    
    activeFiltersDiv.innerHTML = '';
    
    if (activeFilters.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    
    activeFilters.forEach(filter => {
        const tag = document.createElement('div');
        tag.className = 'filter-tag';
        tag.innerHTML = `
            ${filter.label}
            <button class="filter-tag-remove" data-filter-type="${filter.type}" data-filter-value="${filter.value}">×</button>
        `;
        
        tag.querySelector('.filter-tag-remove').addEventListener('click', () => removeFilter(filter));
        activeFiltersDiv.appendChild(tag);
    });
}

function removeFilter(filter) {
    switch (filter.type) {
        case 'category':
            const categoryCheckbox = document.querySelector(`.filter-checkbox[data-filter="category"][value="${filter.value}"]`);
            if (categoryCheckbox) categoryCheckbox.checked = false;
            break;
        case 'price':
            setPriceRangeFromProducts();
            break;
        case 'rating':
            const ratingRadio = document.querySelector('.filter-radio[data-filter="rating"][value="0"]');
            if (ratingRadio) ratingRadio.checked = true;
            state.filters.rating = 0;
            break;
        case 'availability':
            const availCheckbox = document.querySelector(`.filter-checkbox[data-filter="availability"][value="${filter.value}"]`);
            if (availCheckbox) availCheckbox.checked = false;
            break;
        case 'search':
            const searchInput = document.getElementById('catalog-search-input');
            if (searchInput) searchInput.value = '';
            state.filters.searchTerm = '';
            break;
    }
    
    updateFiltersFromUI();
    applyFiltersAndRender();
}

function clearAllFilters() {
    // Reset checkboxes
    document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
    
    // Reset rating to All
    const ratingAll = document.querySelector('.filter-radio[data-filter="rating"][value="0"]');
    if (ratingAll) ratingAll.checked = true;
    
    // Reset price
    setPriceRangeFromProducts();
    
    // Reset search
    const searchInput = document.getElementById('catalog-search-input');
    if (searchInput) searchInput.value = '';
    
    state.filters.searchTerm = '';
    state.filters.categories = [];
    state.filters.availability = [];
    state.filters.rating = 0;
    
    applyFiltersAndRender();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getProductImageUrl(product) {
    if (product.image_url) {
        if (product.image_url.startsWith('http')) return product.image_url;
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
    const product = state.catalogProducts.find(p => p.id === productId);
    if (product && window.openProductPage) {
        openProductPage(productId);
    }
}

function toggleWishlistFromCatalog(e, productId) {
    e.stopPropagation();
    const product = state.catalogProducts.find(p => p.id === productId);
    if (product) {
        const index = wishlist.findIndex(item => item.id === productId);
        if (index > -1) wishlist.splice(index, 1);
        else wishlist.push({ id: product.id, name: product.name, price: product.sale_price || product.price, image: getProductImageUrl(product) });
        
        localStorage.setItem('lifestyle_wishlist', JSON.stringify(wishlist));
        
        const btn = e.target.closest('.wishlist-icon-btn');
        btn.classList.toggle('active');
        updateWishlistBadge();
    }
}

function updateResultsCount() {
    const resultsCount = document.getElementById('results-count');
    if (!resultsCount) return;
    if (state.filteredProducts.length === 0) resultsCount.textContent = 'No products found';
    else resultsCount.textContent = `Showing ${state.filteredProducts.length} product${state.filteredProducts.length !== 1 ? 's' : ''}`;
}

function showNoResults() {
    const catalogGrid = document.getElementById('catalog-grid');
    const noResults = document.getElementById('no-results');
    if (catalogGrid) catalogGrid.innerHTML = '';
    if (noResults) noResults.style.display = 'block';
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

console.log('✅ Advanced Catalog.js loaded successfully');
