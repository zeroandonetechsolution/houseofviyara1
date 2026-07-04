-- Add shipping_price column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_price NUMERIC;
