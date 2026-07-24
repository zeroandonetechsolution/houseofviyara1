// Header scroll effect
window.addEventListener('scroll', function() {
    const header = document.getElementById('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Mobile menu toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        const icon = this.querySelector('i');
        if (navMenu.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
}

// Hero slider
let currentSlide = 0;
const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('.slider-dot');

function showSlide(n) {
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    slides[n].classList.add('active');
    dots[n].classList.add('active');
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
}

if (slides.length > 1) {
    setInterval(nextSlide, 5000);

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentSlide = index;
            showSlide(currentSlide);
        });
    });
}

// Newsletter form
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = this.querySelector('input').value;
        alert('Thank you for subscribing! Your 10% discount code will be sent to ' + email);
        this.reset();
    });
}

// Cart counter (simulated)
let cartItems = JSON.parse(localStorage.getItem('cart')) || [];
const cartCount = document.getElementById('cartCount');

if (cartCount) {
    cartCount.textContent = cartItems.length;
}

// Add to cart functionality
document.querySelectorAll('.product-actions button').forEach((btn, index) => {
    if (btn.querySelector('.fa-shopping-cart')) {
        btn.addEventListener('click', function() {
            const product = {
                id: Date.now(),
                name: 'Product ' + (index + 1),
                price: 4999
            };
            cartItems.push(product);
            localStorage.setItem('cart', JSON.stringify(cartItems));
            if (cartCount) {
                cartCount.textContent = cartItems.length;
            }
            alert('Product added to cart!');
        });
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

console.log('House Of Viyara26 - Premium Luxury Fashion');
