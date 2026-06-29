-- Add variants column to products table (JSONB or array of JSON)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

-- If you used similar_products before, you can drop it (optional)
-- ALTER TABLE products DROP COLUMN IF EXISTS similar_products;
