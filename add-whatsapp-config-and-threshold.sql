-- Add low_stock_threshold column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

-- Add whatsapp settings to system_config table
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT DEFAULT '+919514518197';
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS whatsapp_apikey TEXT DEFAULT '';

-- Seed/update default config values if they exist
UPDATE system_config 
SET whatsapp_phone = COALESCE(whatsapp_phone, '+919514518197') 
WHERE id = 'global';
