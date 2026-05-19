-- 1. Create the Orders Table
CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    customer_name TEXT,
    email TEXT,
    total NUMERIC,
    status TEXT DEFAULT 'Processing',
    items JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create the Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    price NUMERIC,
    original_price NUMERIC,
    image_url TEXT,
    description TEXT,
    category TEXT,
    brand TEXT DEFAULT 'Life Style',
    is_new BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Realtime for the Orders table 
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
