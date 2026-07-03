-- Migration to add versioning system to existing Supabase database

-- 1. Add system_config table
CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY DEFAULT 'global',
    global_version BIGINT DEFAULT 1,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial system config if not exists
INSERT INTO system_config (id, global_version)
VALUES ('global', 1)
ON CONFLICT (id) DO NOTHING;

-- 2. Add updated_at column to all tables if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE header_links ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE hero_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 3. Create functions if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION increment_global_version()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE system_config
    SET global_version = global_version + 1,
        last_updated = CURRENT_TIMESTAMP
    WHERE id = 'global';
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Create triggers (drop existing first if needed)
-- Products triggers
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS increment_version_products ON products;
CREATE TRIGGER increment_version_products
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH STATEMENT EXECUTE FUNCTION increment_global_version();

-- Categories triggers
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS increment_version_categories ON categories;
CREATE TRIGGER increment_version_categories
AFTER INSERT OR UPDATE OR DELETE ON categories
FOR EACH STATEMENT EXECUTE FUNCTION increment_global_version();

-- Banners triggers
DROP TRIGGER IF EXISTS update_banners_updated_at ON banners;
CREATE TRIGGER update_banners_updated_at
BEFORE UPDATE ON banners
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS increment_version_banners ON banners;
CREATE TRIGGER increment_version_banners
AFTER INSERT OR UPDATE OR DELETE ON banners
FOR EACH STATEMENT EXECUTE FUNCTION increment_global_version();

-- Orders triggers
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS increment_version_orders ON orders;
CREATE TRIGGER increment_version_orders
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH STATEMENT EXECUTE FUNCTION increment_global_version();

-- Header Links triggers
DROP TRIGGER IF EXISTS update_header_links_updated_at ON header_links;
CREATE TRIGGER update_header_links_updated_at
BEFORE UPDATE ON header_links
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS increment_version_header_links ON header_links;
CREATE TRIGGER increment_version_header_links
AFTER INSERT OR UPDATE OR DELETE ON header_links
FOR EACH STATEMENT EXECUTE FUNCTION increment_global_version();

-- Hero Images triggers
DROP TRIGGER IF EXISTS update_hero_images_updated_at ON hero_images;
CREATE TRIGGER update_hero_images_updated_at
BEFORE UPDATE ON hero_images
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS increment_version_hero_images ON hero_images;
CREATE TRIGGER increment_version_hero_images
AFTER INSERT OR UPDATE OR DELETE ON hero_images
FOR EACH STATEMENT EXECUTE FUNCTION increment_global_version();

-- Add system_config to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS system_config;
