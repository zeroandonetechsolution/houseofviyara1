<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="House Of Viyara26 - Premium Luxury Fashion for Women. Discover exclusive sarees, kurtis, ethnic wear, party wear, and designer collections.">
    <meta name="keywords" content="fashion, sarees, kurtis, ethnic wear, designer wear, women's clothing, luxury fashion">
    <title>House Of Viyara26 - Premium Luxury Fashion</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <!-- Header -->
    <header id="header">
        <div class="container">
            <div class="logo">
                <a href="index.php"><img src="assets/HOV.jpg" alt="House Of Viyara26" style="max-height: 50px;"></a>
            </div>
            <nav>
                <ul id="navMenu">
                    <li><a href="index.php">Home</a></li>
                    <li><a href="pages/categories.php">Shop</a></li>
                    <li><a href="pages/about.php">About</a></li>
                    <li><a href="pages/contact.php">Contact</a></li>
                    <li><a href="admin/login.php">Admin</a></li>
                </ul>
            </nav>
            <div class="header-icons">
                <a href="pages/search.php"><i class="fas fa-search"></i></a>
                <a href="pages/wishlist.php"><i class="fas fa-heart"></i></a>
                <a href="pages/cart.php" style="position: relative;">
                    <i class="fas fa-shopping-bag"></i>
                    <span class="cart-count" id="cartCount">0</span>
                </a>
                <a href="pages/account.php"><i class="fas fa-user"></i></a>
                <div class="mobile-menu-toggle" id="mobileMenuToggle">
                    <i class="fas fa-bars"></i>
                </div>
            </div>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-slider">
            <div class="hero-slide active" style="background: linear-gradient(135deg, #0a0a0a 0%, #2a2a2a 100%);">
                <div class="hero-content">
                    <h1>Luxury Redefined</h1>
                    <p>Discover our exclusive collection of premium ethnic wear and designer outfits crafted with elegance and tradition.</p>
                    <div class="hero-buttons">
                        <a href="pages/categories.php" class="btn btn-primary">Shop Now</a>
                        <a href="pages/new-arrivals.php" class="btn btn-secondary">New Arrivals</a>
                    </div>
                </div>
            </div>
            <div class="hero-slide" style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);">
                <div class="hero-content">
                    <h1>Elegance Personified</h1>
                    <p>Experience the perfect blend of contemporary fashion and timeless traditions in every piece.</p>
                    <div class="hero-buttons">
                        <a href="pages/collections.php" class="btn btn-primary">Collections</a>
                        <a href="pages/best-sellers.php" class="btn btn-secondary">Best Sellers</a>
                    </div>
                </div>
            </div>
        </div>
        <div class="slider-nav">
            <div class="slider-dot active" data-slide="0"></div>
            <div class="slider-dot" data-slide="1"></div>
        </div>
    </section>

    <!-- Categories Section -->
    <section class="categories">
        <div class="container">
            <h2>Shop By Category</h2>
            <div class="category-grid">
                <div class="category-card">
                    <div style="width:100%;height:100%;background:linear-gradient(135deg, #d4af37 0%, #b8941f 100%);display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-tshirt" style="font-size:80px;color:#fff;"></i>
                    </div>
                    <div class="category-overlay">
                        <h3>Sarees</h3>
                        <span>25+ Products</span>
                    </div>
                </div>
                <div class="category-card">
                    <div style="width:100%;height:100%;background:linear-gradient(135deg, #f5f1eb 0%, #e0d5c5 100%);display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-shirt" style="font-size:80px;color:#0a0a0a;"></i>
                    </div>
                    <div class="category-overlay">
                        <h3>Kurtis</h3>
                        <span>30+ Products</span>
                    </div>
                </div>
                <div class="category-card">
                    <div style="width:100%;height:100%;background:linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-crown" style="font-size:80px;color:#d4af37;"></i>
                    </div>
                    <div class="category-overlay">
                        <h3>Ethnic Wear</h3>
                        <span>40+ Products</span>
                    </div>
                </div>
                <div class="category-card">
                    <div style="width:100%;height:100%;background:linear-gradient(135deg, #d4af37 0%, #f5f1eb 100%);display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-star" style="font-size:80px;color:#0a0a0a;"></i>
                    </div>
                    <div class="category-overlay">
                        <h3>Party Wear</h3>
                        <span>20+ Products</span>
                    </div>
                </div>
                <div class="category-card">
                    <div style="width:100%;height:100%;background:linear-gradient(135deg, #e0d5c5 0%, #f5f1eb 100%);display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-sun" style="font-size:80px;color:#d4af37;"></i>
                    </div>
                    <div class="category-overlay">
                        <h3>Casual Wear</h3>
                        <span>35+ Products</span>
                    </div>
                </div>
                <div class="category-card">
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
    </section>

    <!-- Featured Products Section -->
    <section class="products">
        <div class="container">
            <h2>Featured Collections</h2>
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
    </section>

    <!-- Why Choose Us Section -->
    <section class="why-choose">
        <div class="container">
            <h2>Why Choose House Of Viyara26</h2>
            <div class="features-grid">
                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-gem"></i>
                    </div>
                    <h3>Premium Quality</h3>
                    <p>Handpicked fabrics and materials with the finest craftsmanship</p>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-hand-paper"></i>
                    </div>
                    <h3>Handpicked Collections</h3>
                    <p>Curated selection of the latest trends and timeless classics</p>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h3>Secure Payments</h3>
                    <p>Multiple secure payment options for hassle-free shopping</p>
                </div>
                <div class="feature-item">
                    <div class="feature-icon">
                        <i class="fas fa-truck"></i>
                    </div>
                    <h3>Fast Delivery</h3>
                    <p>Quick and reliable shipping across India</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Reviews Section -->
    <section class="reviews">
        <div class="container">
            <h2>What Our Customers Say</h2>
            <div class="reviews-slider">
                <div class="review-card">
                    <div class="review-content">
                        "Absolutely stunning collection! The quality exceeded my expectations. Perfect for every occasion. Highly recommended!"
                    </div>
                    <div class="review-rating">
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="review-author">
                        Priya Sharma
                        <span>Mumbai</span>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Instagram Section -->
    <section class="instagram">
        <div class="container">
            <h2>Follow Us on Instagram</h2>
            <div class="instagram-grid">
                <div class="instagram-item">
                    <div style="width:100%;height:100%;background:linear-gradient(135deg, #d4af37, #b8941f);"></div>
                    <div class="instagram-overlay">
                        <span><i class="fab fa-instagram"></i></span>
                    </div>
                </div>
                <div class="instagram-item">
                    <div style="width:100%;height:100%;background:linear-gradient(135deg, #f5f1eb, #e0d5c5);"></div>
                    <div class="instagram-overlay">
                        <span><i class="fab fa-instagram"></i></span>
                    </div>
                </div>
                <div class="instagram-item">
                    <div style="width:100%;height:100%;background:linear-gradient(135deg, #0a0a0a, #2a2a2a);"></div>
                    <div class="instagram-overlay">
                        <span><i class="fab fa-instagram"></i></span>
                    </div>
                </div>
                <div class="instagram-item">
                    <div style="width:100%;height:100%;background:linear-gradient(135deg, #e0d5c5, #d4af37);"></div>
                    <div class="instagram-overlay">
                        <span><i class="fab fa-instagram"></i></span>
                    </div>
                </div>
                <div class="instagram-item">
                    <div style="width:100%;height:100%;background:linear-gradient(135deg, #1a1a1a, #0a0a0a);"></div>
                    <div class="instagram-overlay">
                        <span><i class="fab fa-instagram"></i></span>
                    </div>
                </div>
                <div class="instagram-item">
                    <div style="width:100%;height:100%;background:linear-gradient(135deg, #faf7f4, #f5f1eb);"></div>
                    <div class="instagram-overlay">
                        <span><i class="fab fa-instagram"></i></span>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Newsletter Section -->
    <section class="newsletter">
        <div class="container">
            <h2>Subscribe to our Newsletter</h2>
            <p>Get exclusive offers, latest collections, and fashion tips delivered straight to your inbox. Enjoy 10% off on your first order!</p>
            <form class="newsletter-form" id="newsletterForm">
                <input type="email" placeholder="Enter your email address" required>
                <button type="submit" class="btn btn-primary">Subscribe</button>
            </form>
        </div>
    </section>

    <!-- Footer -->
    <footer>
        <div class="container">
            <div class="footer-grid">
                <div class="footer-col">
                    <img src="assets/HOV.jpg" alt="House Of Viyara26" class="footer-logo" style="max-width: 120px;">
                    <p>Premium luxury fashion brand offering exclusive ethnic wear, designer collections, and customized fashion products.</p>
                    <div class="social-links">
                        <a href="#"><i class="fab fa-facebook-f"></i></a>
                        <a href="#"><i class="fab fa-instagram"></i></a>
                        <a href="#"><i class="fab fa-twitter"></i></a>
                        <a href="#"><i class="fab fa-pinterest-p"></i></a>
                        <a href="#"><i class="fab fa-youtube"></i></a>
                    </div>
                </div>
                <div class="footer-col">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><a href="index.php">Home</a></li>
                        <li><a href="pages/categories.php">Shop</a></li>
                        <li><a href="pages/about.php">About Us</a></li>
                        <li><a href="pages/contact.php">Contact Us</a></li>
                        <li><a href="pages/blog.php">Blog</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h3>Customer Service</h3>
                    <ul>
                        <li><a href="pages/faq.php">FAQ</a></li>
                        <li><a href="pages/shipping-policy.php">Shipping Policy</a></li>
                        <li><a href="pages/refund-policy.php">Refund Policy</a></li>
                        <li><a href="pages/privacy-policy.php">Privacy Policy</a></li>
                        <li><a href="pages/terms.php">Terms & Conditions</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h3>Contact Info</h3>
                    <ul>
                        <li><i class="fas fa-map-marker-alt" style="color:#d4af37;margin-right:10px;"></i> Mumbai, Maharashtra, India</li>
                        <li><i class="fas fa-phone" style="color:#d4af37;margin-right:10px;"></i> +91 98765 43210</li>
                        <li><i class="fas fa-envelope" style="color:#d4af37;margin-right:10px;"></i> info@houseofviyara26.com</li>
                        <li><i class="fab fa-whatsapp" style="color:#d4af37;margin-right:10px;"></i> +91 98765 43210</li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 House Of Viyara26. All rights reserved. Crafted with elegance & tradition.</p>
            </div>
        </div>
    </footer>

    <!-- WhatsApp Floating Button -->
    <a href="https://wa.me/919876543210?text=Hi! I'm interested in your products" class="whatsapp-btn" target="_blank">
        <i class="fab fa-whatsapp"></i>
    </a>

    <script src="assets/js/main.js"></script>
</body>
</html>
