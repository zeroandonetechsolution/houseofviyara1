<?php require_once '../includes/header.php'; ?>

    <div class="page-header">
        <div class="container">
            <h1>Shop All Products</h1>
            <div class="breadcrumb">
                <a href="../index.php">Home</a> / Shop
            </div>
        </div>
    </div>

    <div class="page-content">
        <div class="container">
            <div class="categories">
                <h2 style="text-align:left;margin-bottom:30px;">Browse by Category</h2>
                <div class="category-grid" style="margin-bottom:60px;">
                    <div class="category-card" onclick="location.href='#'">
                        <div style="width:100%;height:100%;background:linear-gradient(135deg, #d4af37 0%, #b8941f 100%);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-tshirt" style="font-size:80px;color:#fff;"></i>
                        </div>
                        <div class="category-overlay">
                            <h3>Sarees</h3>
                            <span>25+ Products</span>
                        </div>
                    </div>
                    <div class="category-card" onclick="location.href='#'">
                        <div style="width:100%;height:100%;background:linear-gradient(135deg, #f5f1eb 0%, #e0d5c5 100%);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-shirt" style="font-size:80px;color:#0a0a0a;"></i>
                        </div>
                        <div class="category-overlay">
                            <h3>Kurtis</h3>
                            <span>30+ Products</span>
                        </div>
                    </div>
                    <div class="category-card" onclick="location.href='#'">
                        <div style="width:100%;height:100%;background:linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-crown" style="font-size:80px;color:#d4af37;"></i>
                        </div>
                        <div class="category-overlay">
                            <h3>Ethnic Wear</h3>
                            <span>40+ Products</span>
                        </div>
                    </div>
                    <div class="category-card" onclick="location.href='#'">
                        <div style="width:100%;height:100%;background:linear-gradient(135deg, #d4af37 0%, #f5f1eb 100%);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-star" style="font-size:80px;color:#0a0a0a;"></i>
                        </div>
                        <div class="category-overlay">
                            <h3>Party Wear</h3>
                            <span>20+ Products</span>
                        </div>
                    </div>
                    <div class="category-card" onclick="location.href='#'">
                        <div style="width:100%;height:100%;background:linear-gradient(135deg, #e0d5c5 0%, #f5f1eb 100%);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-sun" style="font-size:80px;color:#d4af37;"></i>
                        </div>
                        <div class="category-overlay">
                            <h3>Casual Wear</h3>
                            <span>35+ Products</span>
                        </div>
                    </div>
                    <div class="category-card" onclick="location.href='#'">
                        <div style="width:100%;height:100%;background:linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-gem" style="font-size:80px;color:#d4af37;"></i>
                        </div>
                        <div class="category-overlay">
                            <h3>Accessories</h3>
                            <span>15+ Products</span>
                        </div>
                    </div>
                </div>
            </div>

            <h2 style="text-align:left;margin-bottom:40px;">All Products</h2>
            <div class="product-grid">
                <div class="product-card">
                    <div class="product-image">
                        <div style="width:100%;height:100%;background:linear-gradient(135deg, #f5f1eb 0%, #e0d5c5 100%);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-tshirt" style="font-size:100px;color:#d4af37;"></i>
                        </div>
                        <span class="product-badge">NEW</span>
                        <div class="product-actions">
                            <button><i class="fas fa-heart"></i></button>
                            <button><i class="fas fa-eye"></i></button>
                            <button><i class="fas fa-shopping-cart"></i></button>
                        </div>
                    </div>
                    <div class="product-info">
                        <h3>Banarasi Silk Saree</h3>
                        <div class="product-rating">
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star-half-alt"></i>
                        </div>
                        <div class="product-price">
                            <span class="old-price">₹8,999</span>
                            ₹6,499
                        </div>
                    </div>
                </div>
                <div class="product-card">
                    <div class="product-image">
                        <div style="width:100%;height:100%;background:linear-gradient(135deg, #d4af37 0%, #f5f1eb 100%);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-shirt" style="font-size:100px;color:#0a0a0a;"></i>
                        </div>
                        <span class="product-badge sale">SALE</span>
                        <div class="product-actions">
                            <button><i class="fas fa-heart"></i></button>
                            <button><i class="fas fa-eye"></i></button>
                            <button><i class="fas fa-shopping-cart"></i></button>
                        </div>
                    </div>
                    <div class="product-info">
                        <h3>Embroidered Kurti Set</h3>
                        <div class="product-rating">
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                        </div>
                        <div class="product-price">
                            <span class="old-price">₹5,499</span>
                            ₹3,999
                        </div>
                    </div>
                </div>
                <div class="product-card">
                    <div class="product-image">
                        <div style="width:100%;height:100%;background:linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-crown" style="font-size:100px;color:#d4af37;"></i>
                        </div>
                        <div class="product-actions">
                            <button><i class="fas fa-heart"></i></button>
                            <button><i class="fas fa-eye"></i></button>
                            <button><i class="fas fa-shopping-cart"></i></button>
                        </div>
                    </div>
                    <div class="product-info">
                        <h3>Designer Lehenga Choli</h3>
                        <div class="product-rating">
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="far fa-star"></i>
                        </div>
                        <div class="product-price">₹12,999</div>
                    </div>
                </div>
                <div class="product-card">
                    <div class="product-image">
                        <div style="width:100%;height:100%;background:linear-gradient(135deg, #e0d5c5 0%, #f5f1eb 100%);display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-gem" style="font-size:100px;color:#d4af37;"></i>
                        </div>
                        <span class="product-badge">NEW</span>
                        <div class="product-actions">
                            <button><i class="fas fa-heart"></i></button>
                            <button><i class="fas fa-eye"></i></button>
                            <button><i class="fas fa-shopping-cart"></i></button>
                        </div>
                    </div>
                    <div class="product-info">
                        <h3>Kundan Jewelry Set</h3>
                        <div class="product-rating">
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                            <i class="fas fa-star"></i>
                        </div>
                        <div class="product-price">₹4,999</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

<?php require_once '../includes/footer.php'; ?>
