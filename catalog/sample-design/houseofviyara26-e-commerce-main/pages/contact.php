<?php require_once '../includes/header.php'; ?>

    <div class="page-header">
        <div class="container">
            <h1>Contact Us</h1>
            <div class="breadcrumb">
                <a href="../index.php">Home</a> / Contact
            </div>
        </div>
    </div>

    <div class="page-content">
        <div class="container">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
                <div>
                    <h2 style="font-family: 'Playfair Display', serif; margin-bottom: 30px;">Get in Touch</h2>
                    <p style="color: #666; line-height: 1.8; font-family: 'Montserrat', sans-serif; margin-bottom: 35px;">
                        Have questions about our products, orders, or anything else? We'd love to hear from you! 
                        Fill out the form or contact us directly using the information below.
                    </p>
                    <div style="margin-bottom: 25px;">
                        <h4 style="margin-bottom: 10px; display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-map-marker-alt" style="color: #d4af37;"></i> Address
                        </h4>
                        <p style="color: #666; font-family: 'Montserrat', sans-serif;">Mumbai, Maharashtra, India</p>
                    </div>
                    <div style="margin-bottom: 25px;">
                        <h4 style="margin-bottom: 10px; display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-phone" style="color: #d4af37;"></i> Phone
                        </h4>
                        <p style="color: #666; font-family: 'Montserrat', sans-serif;">+91 98765 43210</p>
                    </div>
                    <div style="margin-bottom: 25px;">
                        <h4 style="margin-bottom: 10px; display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-envelope" style="color: #d4af37;"></i> Email
                        </h4>
                        <p style="color: #666; font-family: 'Montserrat', sans-serif;">info@houseofviyara26.com</p>
                    </div>
                    <div style="margin-bottom: 30px;">
                        <h4 style="margin-bottom: 15px;">Follow Us</h4>
                        <div class="social-links" style="justify-content: flex-start;">
                            <a href="#"><i class="fab fa-facebook-f"></i></a>
                            <a href="#"><i class="fab fa-instagram"></i></a>
                            <a href="#"><i class="fab fa-twitter"></i></a>
                            <a href="#"><i class="fab fa-pinterest-p"></i></a>
                            <a href="#"><i class="fab fa-youtube"></i></a>
                        </div>
                    </div>
                </div>
                <div>
                    <form style="background: #f5f1eb; padding: 40px; border-radius: 10px;">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Name</label>
                            <input type="text" placeholder="Your Name" style="width: 100%; padding: 14px 18px; border: 1px solid #ddd; border-radius: 5px; font-family: 'Montserrat', sans-serif;">
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Email</label>
                            <input type="email" placeholder="Your Email" style="width: 100%; padding: 14px 18px; border: 1px solid #ddd; border-radius: 5px; font-family: 'Montserrat', sans-serif;">
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Subject</label>
                            <input type="text" placeholder="Subject" style="width: 100%; padding: 14px 18px; border: 1px solid #ddd; border-radius: 5px; font-family: 'Montserrat', sans-serif;">
                        </div>
                        <div style="margin-bottom: 25px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Message</label>
                            <textarea rows="5" placeholder="Your Message" style="width: 100%; padding: 14px 18px; border: 1px solid #ddd; border-radius: 5px; font-family: 'Montserrat', sans-serif; resize: vertical;"></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%;">Send Message</button>
                    </form>
                </div>
            </div>
        </div>
    </div>

<?php require_once '../includes/footer.php'; ?>
