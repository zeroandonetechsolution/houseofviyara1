<?php require_once '../includes/header.php'; ?>
    <div class="page-header">
        <div class="container">
            <h1>My Account</h1>
            <div class="breadcrumb"><a href="../index.php">Home</a> / Account</div>
        </div>
    </div>
    <div class="page-content">
        <div class="container">
            <div style="display: grid; grid-template-columns: 250px 1fr; gap: 40px;">
                <div class="product-card" style="padding:20px;">
                    <ul style="list-style:none;">
                        <li style="padding:12px 0;border-bottom:1px solid #eee;"><a href="#" style="color:#d4af37;text-decoration:none;font-weight:500;"><i class="fas fa-user"></i> Profile</a></li>
                        <li style="padding:12px 0;border-bottom:1px solid #eee;"><a href="#" style="color:#0a0a0a;text-decoration:none;"><i class="fas fa-shopping-bag"></i> Orders</a></li>
                        <li style="padding:12px 0;border-bottom:1px solid #eee;"><a href="wishlist.php" style="color:#0a0a0a;text-decoration:none;"><i class="fas fa-heart"></i> Wishlist</a></li>
                        <li style="padding:12px 0;"><a href="#" style="color:#0a0a0a;text-decoration:none;"><i class="fas fa-map-marker-alt"></i> Addresses</a></li>
                    </ul>
                </div>
                <div class="product-card" style="padding:30px;">
                    <h3 style="font-family: 'Playfair Display', serif; margin-bottom:25px;">Account Details</h3>
                    <p style="color:#666;font-family:'Montserrat',sans-serif;">Manage your profile and account settings here.</p>
                </div>
            </div>
        </div>
    </div>
<?php require_once '../includes/footer.php'; ?>
