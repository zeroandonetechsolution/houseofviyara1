-- Update orders table to add customer, email, phone, paid_at, street, city, state, pincode columns
-- Run this in your Supabase SQL Editor
-- Note: shipping_address is still present as JSONB column for backwards compatibility

-- Add missing columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT;

-- Verify the columns were added
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('customer', 'email', 'phone', 'paid_at', 'shipping_address', 'street', 'city', 'state', 'pincode');
