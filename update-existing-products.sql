-- Update existing products with sample image URLs
-- First, let's check what products are there:
-- SELECT * FROM products;

-- Now update each product (change the WHERE clause to match your product IDs or names):

UPDATE products 
SET 
  image_url = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80',
  gallery = ARRAY['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80']
WHERE name LIKE '%Maxis%' OR name LIKE '%maxis%';

UPDATE products 
SET 
  image_url = 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80',
  gallery = ARRAY['https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80']
WHERE name LIKE '%Cord%' OR name LIKE '%cord%';

UPDATE products 
SET 
  image_url = 'https://images.unsplash.com/photo-1608748010899-18f300247112?w=800&q=80',
  gallery = ARRAY['https://images.unsplash.com/photo-1608748010899-18f300247112?w=800&q=80']
WHERE name LIKE '%Kurti%' OR name LIKE '%kurti%';

UPDATE products 
SET 
  image_url = 'https://images.unsplash.com/photo-1613376023733-0a7331569763?w=800&q=80',
  gallery = ARRAY['https://images.unsplash.com/photo-1613376023733-0a7331569763?w=800&q=80']
WHERE name LIKE '%Kurti Set%' OR name LIKE '%kurti set%';

-- Also, update any old category slugs to the new ones:
UPDATE products SET category = 'maxis' WHERE category = 'saree';
UPDATE products SET category = 'kurti' WHERE category = 'kurtis';
UPDATE products SET category = 'kurti-sets' WHERE category = 'ethnic';
UPDATE products SET category = 'cord-sets' WHERE category = 'party';
UPDATE products SET category = 'maxis' WHERE category = 'casual';
