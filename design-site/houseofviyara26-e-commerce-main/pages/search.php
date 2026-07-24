<?php require_once '../includes/header.php'; ?>
    <div class="page-header">
        <div class="container">
            <h1>Search Results</h1>
            <div class="breadcrumb"><a href="../index.php">Home</a> / Search</div>
        </div>
    </div>
    <div class="page-content">
        <div class="container">
            <div style="max-width: 600px; margin: 0 auto 50px;">
                <form style="display: flex; gap: 10px;">
                    <input type="text" placeholder="Search products..." style="flex: 1; padding: 14px 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <button class="btn btn-primary">Search</button>
                </form>
            </div>
            <div class="product-grid">
                <div class="product-card">
                    <div class="product-image">
                        <div style="width:100%;height:100%;background:linear-gradient(135deg,#f5f1eb,#e0d5c5);display:flex;align-items:center;justify-content:center;"><i class="fas fa-tshirt" style="font-size:100px;color:#d4af37;"></i></div>
                    </div>
                    <div class="product-info">
                        <h3>Banarasi Silk Saree</h3>
                        <div class="product-price">₹6,499</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
<?php require_once '../includes/footer.php'; ?>
