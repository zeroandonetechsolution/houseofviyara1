# LUMINA E-Commerce Platform

A luxury e-commerce platform for perfumes and slippers, featuring a real-time order tracking system and a neobrutalist design.

## Features
- **Local Admin Panel**: Manage products, categories, banners, and orders directly from the browser.
- **No Backend Required**: The site runs as a static storefront with local storage.
- **Neobrutalist UI**: High-contrast, bold design with dark mode support.
- **Interactive Cart**: Seamless shopping experience with local order management.

## Getting Started

### Running the Application
1. For the easiest setup, double-click `start-local.bat`.
   - It starts a local web server on `http://127.0.0.1:5501`
   - It opens both the storefront and the admin panel automatically

2. If you want to launch manually, open both pages through the same origin:
   ```text
   http://127.0.0.1:5501/index.html
   http://127.0.0.1:5501/admin.html
   ```

### Important
The admin panel stores data in browser `localStorage`, which is shared only between pages that use the same origin. If the storefront uses `http://127.0.0.1:5501`, the admin page must also use `http://127.0.0.1:5501`.

### Optional Backend
If you want server-side features later, the optional backend is still available in the `backend` folder.
