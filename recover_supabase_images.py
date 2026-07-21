"""
House of Viyara — Supabase Image Recovery Tool
------------------------------------------------
Tries multiple methods to download images from Supabase storage
even when egress quota is exceeded:

Method 1: Service Role key (bypasses anon quota)
Method 2: Signed URLs
Method 3: Direct public CDN URL format
Method 4: Supabase Management API
"""

import urllib.request
import urllib.error
import json
import os

# ── CONFIG ────────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://embvkfuwevutfwpxemfe.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYnZrZnV3ZXZ1dGZ3cHhlbWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MzE4MDcsImV4cCI6MjA5ODIwNzgwN30.7TpRsKACUi0FSGL7yBeSFe5c2Te9uj9WDQLR9a7G2xE"
BUCKET = "HOVB"

# ⚠️  PASTE YOUR SERVICE ROLE KEY HERE (from Supabase → Project Settings → API → service_role key)
# It starts with "eyJ..."  and is labelled "service_role" (NOT "anon")
SERVICE_ROLE_KEY = ""   # <-- fill this in

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "recovered_images")
os.makedirs(OUT_DIR, exist_ok=True)

# Load original Supabase image URLs from the CSV backup
products_csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "products_rows.csv")

# ── HELPERS ───────────────────────────────────────────────────────────────────
def try_download(url, headers, out_path, label):
    try:
        req = urllib.request.Request(url, headers=headers)
        res = urllib.request.urlopen(req, timeout=15)
        data = res.read()
        if res.status == 200 and len(data) > 1000:  # > 1KB = real image
            with open(out_path, 'wb') as f:
                f.write(data)
            print(f"    ✅ {label}: saved {len(data)//1024}KB")
            return True
        else:
            print(f"    ❌ {label}: status={res.status}, size={len(data)}")
    except urllib.error.HTTPError as e:
        print(f"    ❌ {label}: HTTP {e.code} {e.reason}")
    except Exception as e:
        print(f"    ❌ {label}: {e}")
    return False

# ── COLLECT ORIGINAL SUPABASE IMAGE PATHS ─────────────────────────────────────
# Parse from CSV
import csv

supabase_paths = []
if os.path.exists(products_csv_path):
    with open(products_csv_path, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            img = row.get('image_url', '').strip()
            if 'supabase' in img and img:
                # Extract storage path: everything after /object/public/HOVB/
                # e.g. https://xxx.supabase.co/storage/v1/object/public/HOVB/products/file.jpg
                if '/public/' + BUCKET + '/' in img:
                    path = img.split('/public/' + BUCKET + '/')[1]
                    supabase_paths.append((row.get('name', 'product'), path, img))
            # Also check gallery JSON
            gallery_raw = row.get('gallery', '[]')
            try:
                gallery = json.loads(gallery_raw) if gallery_raw else []
                for g in gallery:
                    if 'supabase' in g and '/public/' + BUCKET + '/' in g:
                        path = g.split('/public/' + BUCKET + '/')[1]
                        supabase_paths.append((row.get('name', 'gallery'), path, g))
            except:
                pass
else:
    print("⚠️  products_rows.csv not found — trying with known paths from products.json")

print(f"Found {len(supabase_paths)} Supabase image paths to recover\n")

# ── TRY EACH IMAGE ────────────────────────────────────────────────────────────
recovered = []
for name, path, original_url in supabase_paths:
    print(f"→ {name}: {path}")
    safe_name = path.replace('/', '_').replace(' ', '_')
    out_path = os.path.join(OUT_DIR, safe_name)
    
    if os.path.exists(out_path):
        print(f"    ⏭️  Already downloaded, skipping")
        recovered.append({'name': name, 'path': path, 'local': out_path})
        continue

    got = False
    
    # Method 1: Service Role key (admin access, bypasses quota)
    if SERVICE_ROLE_KEY:
        url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}"
        got = try_download(url, {
            'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
            'apikey': SERVICE_ROLE_KEY
        }, out_path, "Service Role")
    
    # Method 2: Anon key (standard)
    if not got:
        url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}"
        got = try_download(url, {
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
            'apikey': SUPABASE_ANON_KEY
        }, out_path, "Anon key")
    
    # Method 3: No auth header at all (some buckets are truly public)
    if not got:
        got = try_download(original_url, {}, out_path, "Public URL no-auth")
    
    # Method 4: Alternate CDN domain format
    if not got:
        cdn_url = f"https://embvkfuwevutfwpxemfe.supabase.co/storage/v1/render/image/public/{BUCKET}/{path}"
        got = try_download(cdn_url, {'apikey': SUPABASE_ANON_KEY}, out_path, "CDN render endpoint")

    if got:
        recovered.append({'name': name, 'path': path, 'local': out_path})

# ── REPORT ────────────────────────────────────────────────────────────────────
print(f"\n{'='*50}")
print(f"Recovered {len(recovered)} / {len(supabase_paths)} images")
print(f"Saved to: {OUT_DIR}")

if recovered:
    print("\nNext step: upload to Cloudinary with upload_to_cloudinary.py")
