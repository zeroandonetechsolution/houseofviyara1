<?php require_once '../includes/header.php'; ?>

    <div class="page-header">
        <div class="container">
            <h1>Shopping Cart</h1>
            <div class="breadcrumb">
                <a href="../index.php">Home</a> / Cart
            </div>
        </div>
    </div>

    <div class="page-content">
        <div class="container">
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 40px;">
                <div>
                    <div class="product-card" style="display: flex; align-items: center; gap: 20px; padding: 20px;">
                        <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #f5f1eb, #e0d5c5); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-tshirt" style="font-size: 40px; color: #d4af37;"></i>
                        </div>
                        <div style="flex: 1;">
                            <h3 style="margin-bottom: 5px;">Banarasi Silk Saree</h3>
                            <p style="color: #666; font-size: 0.9rem;">Size: Free | Color: Gold</p>
                            <h3 style="color: #0a0a0a; margin-top: 10px;">₹6,499</h3>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <button style="width: 35px; height: 35px; border: 1px solid #ddd; background: #fff; cursor: pointer;">-</button>
                            <input type="number" value="1" style="width: 50px; text-align: center; padding: 5px; border: 1px solid #ddd;">
                            <button style="width: 35px; height: 35px; border: 1px solid #ddd; background: #fff; cursor: pointer;">+</button>
                        </div>
                        <div>
                            <button style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 1.2rem;"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="product-card" style="padding: 30px;">
                        <h3 style="margin-bottom: 25px; font-family: 'Playfair Display', serif;">Order Summary</h3>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                            <span>Subtotal</span>
                            <span>₹6,499</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                            <span>Shipping</span>
                            <span>Free</span>
                        </div>
                        <div style="border-top: 1px solid #eee; padding-top: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: bold;">
                            <span>Total</span>
                            <span>₹6,499</span>
                        </div>
                        <div style="margin-bottom: 25px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Coupon Code</label>
                            <div style="display: flex; gap: 10px;">
                                <input type="text" placeholder="Enter coupon" style="flex: 1; padding: 10px 15px; border: 1px solid #ddd;">
                                <button class="btn btn-secondary" style="padding: 10px 20px;">Apply</button>
                            </div>
                        </div>
                        <a href="checkout.php" class="btn btn-primary" style="width: 100%; text-align: center; display: block;">Proceed to Checkout</a>
                    </div>
                </div>
            </div>
        </div>
    </div>

<?php require_once '../includes/footer.php'; ?>
