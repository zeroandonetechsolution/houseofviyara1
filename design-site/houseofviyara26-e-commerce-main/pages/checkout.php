<?php require_once '../includes/header.php'; ?>
    <div class="page-header">
        <div class="container">
            <h1>Checkout</h1>
            <div class="breadcrumb"><a href="../index.php">Home</a> / Checkout</div>
        </div>
    </div>
    <div class="page-content">
        <div class="container">
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 40px;">
                <div>
                    <h3 style="font-family: 'Playfair Display', serif; margin-bottom: 25px;">Billing Details</h3>
                    <form style="background: #f5f1eb; padding: 30px; border-radius: 10px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 8px;">First Name</label>
                                <input type="text" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:5px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px;">Last Name</label>
                                <input type="text" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:5px;">
                            </div>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px;">Email</label>
                            <input type="email" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:5px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px;">Phone</label>
                            <input type="tel" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:5px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px;">Address</label>
                            <textarea rows="3" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:5px;"></textarea>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                            <div>
                                <label style="display: block; margin-bottom: 8px;">City</label>
                                <input type="text" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:5px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 8px;">Pincode</label>
                                <input type="text" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:5px;">
                            </div>
                        </div>
                    </form>
                </div>
                <div>
                    <div class="product-card" style="padding: 30px;">
                        <h3 style="font-family: 'Playfair Display', serif; margin-bottom: 25px;">Order Summary</h3>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                            <span>Banarasi Silk Saree x1</span>
                            <span>₹6,499</span>
                        </div>
                        <div style="border-top: 1px solid #eee; padding-top: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: bold;">
                            <span>Total</span>
                            <span>₹6,499</span>
                        </div>
                        <button class="btn btn-primary" style="width:100%;">Place Order</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
<?php require_once '../includes/footer.php'; ?>
