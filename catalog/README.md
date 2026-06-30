# Catalog Folder

This folder contains the dedicated **Product Catalog** for House Of Viyara.

## Overview
The catalog is a centralized product showcase that displays all products from your collection with advanced filtering and sorting capabilities.

## Files

### `catalog.html`
Main catalog page HTML structure. Features:
- Responsive layout
- Product grid/list view toggle
- Filter and sort controls
- Search functionality
- Product cards with quick actions

### `catalog-styles.css`
Complete styling for the catalog page including:
- Grid layout responsive design
- Filter panel styles
- Product card animations
- Dark mode support
- Mobile-responsive breakpoints

### `catalog.js`
JavaScript logic for catalog functionality:
- Product fetching and rendering
- Filter management (category, price)
- Sort functionality (newest, popular, price)
- Search implementation
- View toggle (grid/list)
- Wishlist integration
- Cart integration

## Features

### 1. **Product Display**
- Grid view (default) - Shows products in responsive columns
- List view - Shows products in a detailed list format
- Product cards with images, prices, ratings, and quick actions

### 2. **Filtering**
- **Category Filter**: Filter by product type (Maxis, Cord Sets, Kurti, etc.)
- **Price Range Filter**: Slider-based price filtering with min-max values
- Multiple filters can be combined

### 3. **Sorting**
- **Newest**: Sort by date added
- **Most Popular**: Sort by rating/reviews
- **Price: Low to High**: Ascending price order
- **Price: High to Low**: Descending price order

### 4. **Search**
- Real-time search across product names and descriptions
- Debounced for performance

### 5. **View Options**
- Toggle between Grid and List views
- Responsive design adapts to screen size

### 6. **Quick Actions**
- **Add to Cart**: Direct from catalog (navigates to product page for variants)
- **Add to Wishlist**: Heart icon to save favorites
- Visual indicator for items in wishlist

## Integration

The catalog integrates with:
- **app.js** - Uses `fetchProductsPrefer()` to get products and existing functions
- **style.css** - Main stylesheet for consistency
- **supabase-config.js** - Database configuration
- **Existing cart and wishlist** - Managed in localStorage

## Usage

### Access the Catalog
```
https://yoursite.com/catalog/catalog.html
```

### Add Catalog Link to Navigation
Update your `product.html` or main navigation to include:
```html
<li><a href="catalog/catalog.html">Catalog</a></li>
```

### Customize Filters
Edit the category filters in `catalog.html` to match your product categories:
```html
<label><input type="checkbox" value="your-category"> Your Category</label>
```

## Styling

### Color Variables
The catalog uses CSS variables from `style.css`:
- `--primary-color`: Main brand color
- `--secondary-color`: Accent color
- `--background-light`: Light background
- `--text-light`: Light text color

### Dark Mode
Dark mode is automatically supported through `data-theme` attribute on HTML element.

## Responsive Design

| Breakpoint | Columns |
|------------|---------|
| Desktop (1400px+) | 4-5 columns |
| Tablet (768px) | 3-4 columns |
| Mobile (480px) | 2-3 columns |

## Browser Support
- Chrome/Edge (Latest)
- Firefox (Latest)
- Safari (Latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements
- [ ] Advanced filters (size, color, material)
- [ ] Product comparison
- [ ] Quick view modal
- [ ] Pagination/infinite scroll
- [ ] Sort within filters
- [ ] Recently viewed products
- [ ] Product recommendations

---

**Created for House Of Viyara**
