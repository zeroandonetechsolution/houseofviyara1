# Convert all PHP files to HTML files for the House Of Viyara26 project

$headerHtml = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="House Of Viyara26 - Premium Luxury Fashion">
    <title>{0} - House Of Viyara26</title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .page-header {
            padding: 150px 0 100px;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
            color: #fff;
            text-align: center;
        }
        .page-content {
            padding: 80px 0;
            background: #fff;
        }
        .breadcrumb {
            color: #d4af37;
            font-family: 'Montserrat', sans-serif;
        }
        .breadcrumb a {
            color: #fff;
            text-decoration: none;
        }
        .breadcrumb a:hover {
            color: #d4af37;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header id="header">
        <div class="container">
            <div class="logo">
                <a href="../index.html"><img src="../assets/HOV.jpg" alt="House Of Viyara26" style="max-height: 50px;"></a>
            </div>
            <nav>
                <ul id="navMenu">
                    <li><a href="../index.html">Home</a></li>
                    <li><a href="categories.html">Shop</a></li>
                    <li><a href="about.html">About</a></li>
                    <li><a href="contact.html">Contact</a></li>
                </ul>
            </nav>
            <div class="header-icons">
                <a href="search.html"><i class="fas fa-search"></i></a>
                <a href="wishlist.html"><i class="fas fa-heart"></i></a>
                <a href="cart.html" style="position: relative;">
                    <i class="fas fa-shopping-bag"></i>
                    <span class="cart-count" id="cartCount">0</span>
                </a>
                <a href="account.html"><i class="fas fa-user"></i></a>
                <div class="mobile-menu-toggle" id="mobileMenuToggle">
                    <i class="fas fa-bars"></i>
                </div>
            </div>
        </div>
    </header>
"@

$footerHtml = @"
    <!-- Footer -->
    <footer>
        <div class="container">
            <div class="footer-grid">
                <div class="footer-col">
                    <img src="../assets/HOV.jpg" alt="House Of Viyara26" class="footer-logo" style="max-width: 120px;">
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
                        <li><a href="../index.html">Home</a></li>
                        <li><a href="categories.html">Shop</a></li>
                        <li><a href="about.html">About Us</a></li>
                        <li><a href="contact.html">Contact Us</a></li>
                        <li><a href="blog.html">Blog</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h3>Customer Service</h3>
                    <ul>
                        <li><a href="faq.html">FAQ</a></li>
                        <li><a href="shipping-policy.html">Shipping Policy</a></li>
                        <li><a href="refund-policy.html">Refund Policy</a></li>
                        <li><a href="privacy-policy.html">Privacy Policy</a></li>
                        <li><a href="terms.html">Terms & Conditions</a></li>
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

    <script src="../assets/js/main.js"></script>
</body>
</html>
"@

# Get all PHP files in pages directory (excluding categories.php which we already did)
$phpFiles = Get-ChildItem -Path "pages" -Filter "*.php" | Where-Object { $_.Name -ne "categories.php" }

foreach ($file in $phpFiles) {
    # Read the PHP file content
    $content = Get-Content -Path $file.FullName -Raw

    # Remove PHP includes
    $content = $content -replace '<\?php require_once.*\?>\s*', ''

    # Replace all .php links with .html
    $content = $content -replace '\.php', '.html'

    # Extract page title from filename
    $pageTitle = $file.BaseName -replace '-', ' ' | ForEach-Object { (Get-Culture).TextInfo.ToTitleCase($_) }

    # Create HTML file
    $htmlFileName = $file.FullName -replace '\.php$', '.html'
    $htmlContent = ($headerHtml -f $pageTitle) + "`n" + $content + "`n" + $footerHtml
    Set-Content -Path $htmlFileName -Value $htmlContent -Encoding UTF8

    Write-Host "Converted: $($file.Name) -> $($file.BaseName).html"
}

Write-Host "`nAll files converted successfully! Now you can open index.html in your browser!"
