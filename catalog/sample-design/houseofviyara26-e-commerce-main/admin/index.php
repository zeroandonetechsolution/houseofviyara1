<?php
session_start();
if (!isset($_SESSION['admin_id'])) {
    header("Location: login.php");
    exit();
}
require_once '../includes/config.php';

// Get statistics
$total_orders = $conn->query("SELECT COUNT(*) FROM orders")->fetch_row()[0];
$total_revenue = $conn->query("SELECT COALESCE(SUM(total), 0) FROM orders WHERE order_status NOT IN ('cancelled')")->fetch_row()[0];
$total_customers = $conn->query("SELECT COUNT(*) FROM users")->fetch_row()[0];
$total_products = $conn->query("SELECT COUNT(*) FROM products")->fetch_row()[0];
$pending_orders = $conn->query("SELECT COUNT(*) FROM orders WHERE order_status = 'pending'")->fetch_row()[0];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - House Of Viyara26</title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Montserrat', sans-serif;
            background: #f5f1eb;
        }
        .admin-wrapper {
            display: flex;
            min-height: 100vh;
        }
        .sidebar {
            width: 250px;
            background: linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%);
            color: #fff;
            padding: 30px 0;
        }
        .sidebar-logo {
            text-align: center;
            padding: 0 20px 30px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .sidebar-logo img {
            max-width: 100px;
            margin-bottom: 15px;
        }
        .sidebar-menu {
            padding: 20px 0;
        }
        .sidebar-menu a {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px 25px;
            color: #beige;
            text-decoration: none;
            transition: all 0.3s ease;
        }
        .sidebar-menu a:hover, .sidebar-menu a.active {
            background: rgba(212, 175, 55, 0.2);
            color: #d4af37;
            border-left: 3px solid #d4af37;
        }
        .main-content {
            flex: 1;
            padding: 30px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #fff;
            padding: 20px 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.05);
        }
        .header h1 {
            font-family: 'Playfair Display', serif;
            color: #0a0a0a;
            font-size: 1.8rem;
        }
        .header-right {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #fff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.05);
        }
        .stat-card h3 {
            color: #666;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        .stat-card .value {
            font-size: 2.5rem;
            font-weight: 700;
            color: #0a0a0a;
        }
        .stat-card .icon {
            float: right;
            width: 60px;
            height: 60px;
            background: #d4af37;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 28px;
        }
        .dashboard-section {
            background: #fff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.05);
            margin-bottom: 30px;
        }
        .dashboard-section h2 {
            font-family: 'Playfair Display', serif;
            margin-bottom: 25px;
            color: #0a0a0a;
            font-size: 1.4rem;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
        }
        .table th, .table td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        .table th {
            color: #666;
            font-weight: 600;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .status {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        .status.pending {
            background: #fff3cd;
            color: #856404;
        }
        .status.processing {
            background: #cce5ff;
            color: #004085;
        }
        .status.completed {
            background: #d4edda;
            color: #155724;
        }
        .status.cancelled {
            background: #f8d7da;
            color: #721c24;
        }
        .btn {
            padding: 8px 16px;
            border-radius: 5px;
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 500;
            cursor: pointer;
            border: none;
        }
        .btn-primary {
            background: #d4af37;
            color: #0a0a0a;
        }
        .btn-primary:hover {
            background: #b8941f;
        }
        .btn-secondary {
            background: #0a0a0a;
            color: #fff;
        }
        .btn-sm {
            padding: 5px 10px;
            font-size: 0.8rem;
        }
        .logout-btn {
            color: #d4af37;
            text-decoration: none;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
        }
    </style>
</head>
<body>
    <div class="admin-wrapper">
        <div class="sidebar">
            <div class="sidebar-logo">
                <img src="../assets/HOV.jpg" alt="HOV">
                <h3>Admin Panel</h3>
            </div>
            <div class="sidebar-menu">
                <a href="index.php" class="active"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
                <a href="products.php"><i class="fas fa-box"></i> Products</a>
                <a href="orders.php"><i class="fas fa-shopping-cart"></i> Orders <span style="background: #d4af37; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; margin-left: auto;"><?php echo $pending_orders; ?></span></a>
                <a href="customers.php"><i class="fas fa-users"></i> Customers</a>
                <a href="categories.php"><i class="fas fa-list"></i> Categories</a>
                <a href="coupons.php"><i class="fas fa-tags"></i> Coupons</a>
                <a href="banners.php"><i class="fas fa-image"></i> Banners</a>
                <a href="testimonials.php"><i class="fas fa-star"></i> Testimonials</a>
                <a href="blogs.php"><i class="fas fa-blog"></i> Blogs</a>
            </div>
        </div>
        <div class="main-content">
            <div class="header">
                <h1><i class="fas fa-tachometer-alt"></i> Dashboard</h1>
                <div class="header-right">
                    <span>Welcome, <?php echo $_SESSION['admin_name']; ?></span>
                    <a href="logout.php" class="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="icon"><i class="fas fa-shopping-bag"></i></div>
                    <h3>Total Orders</h3>
                    <div class="value"><?php echo $total_orders; ?></div>
                </div>
                <div class="stat-card">
                    <div class="icon"><i class="fas fa-rupee-sign"></i></div>
                    <h3>Total Revenue</h3>
                    <div class="value">₹<?php echo number_format($total_revenue, 2); ?></div>
                </div>
                <div class="stat-card">
                    <div class="icon"><i class="fas fa-users"></i></div>
                    <h3>Customers</h3>
                    <div class="value"><?php echo $total_customers; ?></div>
                </div>
                <div class="stat-card">
                    <div class="icon"><i class="fas fa-box"></i></div>
                    <h3>Products</h3>
                    <div class="value"><?php echo $total_products; ?></div>
                </div>
            </div>

            <div class="dashboard-section">
                <h2>Recent Orders</h2>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>#HOV001</td>
                            <td>Priya Sharma</td>
                            <td>₹6,499</td>
                            <td>24-06-2026</td>
                            <td><span class="status pending">Pending</span></td>
                            <td><a href="#" class="btn btn-primary btn-sm">View</a></td>
                        </tr>
                        <tr>
                            <td>#HOV002</td>
                            <td>Riya Patel</td>
                            <td>₹3,999</td>
                            <td>23-06-2026</td>
                            <td><span class="status processing">Processing</span></td>
                            <td><a href="#" class="btn btn-primary btn-sm">View</a></td>
                        </tr>
                        <tr>
                            <td>#HOV003</td>
                            <td>Anita Desai</td>
                            <td>₹12,999</td>
                            <td>22-06-2026</td>
                            <td><span class="status completed">Completed</span></td>
                            <td><a href="#" class="btn btn-primary btn-sm">View</a></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="dashboard-section">
                <h2>Quick Actions</h2>
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <a href="products.php?add=1" class="btn btn-primary"><i class="fas fa-plus"></i> Add Product</a>
                    <a href="orders.php" class="btn btn-secondary"><i class="fas fa-list"></i> View Orders</a>
                    <a href="categories.php" class="btn btn-primary"><i class="fas fa-list"></i> Manage Categories</a>
                    <a href="coupons.php?add=1" class="btn btn-secondary"><i class="fas fa-tag"></i> Create Coupon</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
