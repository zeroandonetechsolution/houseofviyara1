-- Add colors and sizes columns to products table in Supabase
-- Run this in your Supabase SQL Editor

-- Add colors column as TEXT[] (array of strings)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';

-- Add sizes column as TEXT[] (array of strings)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sizes TEXT[] DEFAULT '{}';
