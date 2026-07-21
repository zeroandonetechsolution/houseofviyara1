"""
House of Viyara - Supabase Image Recovery + Cloudinary Upload
=============================================================
Pulls original image URLs from git history, tries to download
them via multiple methods, then re-uploads to Cloudinary.

Run: python recover_and_upload.py
"""
import sys, os, json, base64, csv
import urllib.request, urllib.error, urllib.parse

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

# ── CONFIG ────────────────────────────────────────────────────────────────────
SUPABASE_URL   = "https://embvkfuwevutfwpxemfe.supabase.co"
SUPABASE_ANON  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYnZrZnV3ZXZ1dGZ3cHhlbWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MzE4MDcsImV4cCI6MjA5ODIwNzgwN30.7TpRsKACUi0FSGL7yBeSFe5c2Te9uj9WDQLR9a7G2xE"
SUPABASE_PUB   = "sb_publishable_SsKrveUh0KOhucRBIod-uA_ySWG8ENr"
BUCKET         = "HOVB"

# Supabase secret key (new format — has admin/service access)
# DO NOT paste keys here — enter them at runtime when prompted
SERVICE_KEY    = ""   # Paste your sb_secret_... key here temporarily when running locally

CLOUD_NAME     = "b2p0mqvx"
UPLOAD_PRESET  = "houseofviyara"
FOLDER         = "houseofviyara/products"

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "recovered_images")
os.makedirs(OUT_DIR, exist_ok=True)

# ── ORIGINAL SUPABASE URLS (extracted from git history) ──────────────────────
# These are the REAL client product images
ORIGINAL = [
    (21,  "Pure Cotton Cordsets",           "products/1782901567298_IMG-20260629-WA0001.jpg"),
    (41,  "Cotton Mix",                     "products/1782901667612_IMG_2822.PNG"),
    (42,  "Cotton Mix",                     "products/1782901793650_IMG_3854.JPG"),
    (43,  "Pure Cotton Maxi With Floral",   "products/1782902002977_IMG_3880.PNG"),
    (44,  "Cordset Vatican Material",       "products/1782902149310_IMG_3245.jpg"),
    (45,  "Cotton Mix",                     "products/1782902259516_IMG_3860.PNG"),
    (46,  "Cotton Mix",                     "products/1782902386601_IMG_3867.PNG"),
    (47,  "Cotton Mix",                     "products/1782902509003_IMG_3234.jpg"),
    (48,  "Rayon Material",                 "products/1782902718497_IMG_3898.JPG"),
    (49,  "Rayon Material",                 "products/1782902813785_IMG_3896.JPG"),
    (50,  "Pure Cotton",                    "products/1782902953561_IMG_3889.JPG"),
    (51,  "Pure Cotton",                    "products/1782903071791_IMG_3887.JPG"),
    (52,  "Single Top Kurti",               "products/1782903204063_IMG_3831.JPG"),
    (53,  "Single Top Kurti",               "products/1782903347773_IMG_3839.JPG"),
    (54,  "Kurti Set",                      "products/1782903480699_IMG_3803.JPG"),
    (55,  "Kurti Set",                      "products/1782903643285_IMG_3808.JPG"),
    (56,  "BERLIN MAXI",                    "products/1782903787613_IMG_3753.JPG"),
    (57,  "BERLIN MAXI",                    "products/1782903915918_IMG_3758.JPG"),
    (58,  "Floral Print Kurti Set",         "products/1782904050099_IMG_3820.JPG"),
    (59,  "Floral Print Kurti Set",         "products/1782904185817_IMG_3816.JPG"),
    (60,  "Embroidery Kurti Set",           "products/1782904337063_IMG_3777.JPG"),
    (61,  "Embroidery Kurti Set",           "products/1782904477213_IMG_3779.JPG"),
    (62,  "KURTI SETS",                     "products/1782904621705_IMG_3794.JPG"),
    (65,  "KURTI SETS",                     "products/1782904808167_IMG_3788.JPG"),
    (69,  "CORDSET",                        "products/1782905019027_IMG_3245.jpg"),
]

# ── HELPERS ───────────────────────────────────────────────────────────────────
def try_download(url, headers, out_path):
    try:
        req = urllib.request.Request(url, headers=headers)
        res = urllib.request.urlopen(req, timeout=20)
        data = res.read()
        if len(data) > 2000:  # real image > 2KB
            with open(out_path, 'wb') as f:
                f.write(data)
            return True, len(data)
        return False, len(data)
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}"
    except Exception as e:
        return False, str(e)

def upload_to_cloudinary(img_path, public_id):
    url = f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload"
    with open(img_path, 'rb') as f:
        raw = f.read()
    ext = os.path.splitext(img_path)[1].lower()
    mime = "image/png" if ext == ".png" else "image/jpeg"
    b64 = f"data:{mime};base64," + base64.b64encode(raw).decode()
    data = urllib.parse.urlencode({
        'file': b64, 'upload_preset': UPLOAD_PRESET,
        'folder': FOLDER, 'public_id': public_id
    }).encode()
    req = urllib.request.Request(url, data=data)
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    res = urllib.request.urlopen(req, timeout=60)
    return json.loads(res.read())

# ── MAIN LOOP ─────────────────────────────────────────────────────────────────
recovered_map = {}  # product_id -> cloudinary_url

print("=" * 60)
print("House of Viyara - Supabase Image Recovery")
print("=" * 60)

for pid, name, storage_path in ORIGINAL:
    filename = os.path.basename(storage_path)
    out_path = os.path.join(OUT_DIR, f"{pid}_{filename}")
    
    print(f"\n[{pid}] {name}")
    print(f"     File: {filename}")

    downloaded = False
    
    # Skip if already downloaded
    if os.path.exists(out_path) and os.path.getsize(out_path) > 2000:
        print(f"     Already exists, skipping download")
        downloaded = True
    else:
        # --- Method 1: No auth (truly public bucket) ---
        url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
        ok, info = try_download(url, {}, out_path)
        if ok:
            print(f"     [M1] Public URL: OK ({info//1024}KB)")
            downloaded = True
        else:
            print(f"     [M1] Public URL: FAIL ({info})")

        # --- Method 2: Anon key ---
        if not downloaded:
            ok, info = try_download(url, {
                'apikey': SUPABASE_ANON,
                'Authorization': f'Bearer {SUPABASE_ANON}'
            }, out_path)
            if ok:
                print(f"     [M2] Anon key: OK ({info//1024}KB)")
                downloaded = True
            else:
                print(f"     [M2] Anon key: FAIL ({info})")

        # --- Method 3: Service Role / Secret key ---
        if not downloaded and SERVICE_KEY:
            url2 = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
            ok, info = try_download(url2, {
                'apikey': SERVICE_KEY,
                'Authorization': f'Bearer {SERVICE_KEY}'
            }, out_path)
            if ok:
                print(f"     [M3] Service/Secret key (object): OK ({info//1024}KB)")
                downloaded = True
            else:
                print(f"     [M3] Service/Secret key (object): FAIL ({info})")

        # --- Method 4: Render/transform endpoint ---
        if not downloaded:
            url3 = f"{SUPABASE_URL}/storage/v1/render/image/public/{BUCKET}/{storage_path}?width=800"
            ok, info = try_download(url3, {'apikey': SUPABASE_ANON}, out_path)
            if ok:
                print(f"     [M4] Render endpoint: OK ({info//1024}KB)")
                downloaded = True
            else:
                print(f"     [M4] Render endpoint: FAIL ({info})")

        # --- Method 5: New publishable key format ---
        if not downloaded:
            url4 = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
            ok, info = try_download(url4, {
                'apikey': SUPABASE_PUB,
                'Authorization': f'Bearer {SUPABASE_PUB}'
            }, out_path)
            if ok:
                print(f"     [M5] Publishable key: OK ({info//1024}KB)")
                downloaded = True
            else:
                print(f"     [M5] Publishable key: FAIL ({info})")

        # --- Method 6: Secret key on public endpoint ---
        if not downloaded and SERVICE_KEY:
            url5 = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
            ok, info = try_download(url5, {
                'apikey': SERVICE_KEY,
                'Authorization': f'Bearer {SERVICE_KEY}'
            }, out_path)
            if ok:
                print(f"     [M6] Secret key on public: OK ({info//1024}KB)")
                downloaded = True
            else:
                print(f"     [M6] Secret key on public: FAIL ({info})")

    # --- Upload to Cloudinary if downloaded ---
    if downloaded:
        public_id = f"product_{pid}_{os.path.splitext(filename)[0]}"
        print(f"     Uploading to Cloudinary...")
        try:
            result = upload_to_cloudinary(out_path, public_id)
            cloud_url = result.get('secure_url', '')
            print(f"     Cloudinary: {cloud_url}")
            recovered_map[pid] = cloud_url
        except Exception as e:
            print(f"     Cloudinary upload FAILED: {e}")
    else:
        print(f"     COULD NOT RECOVER - needs service_role key or manual upload")

# ── UPDATE products.json ──────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"Recovered {len(recovered_map)} / {len(ORIGINAL)} images")

if recovered_map:
    with open('data/products.json') as f:
        products = json.load(f)
    
    updated = 0
    for p in products:
        pid = p['id']
        if pid in recovered_map:
            p['image_url'] = recovered_map[pid]
            p['gallery'] = [recovered_map[pid]]
            updated += 1
    
    with open('data/products.json', 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=4)
    print(f"Updated {updated} products in data/products.json")
    print("Run: git add data/products.json && git commit -m 'fix: restore original product images' && git push")
else:
    print("\nNO images recovered. Options:")
    print("  1. Get Supabase service_role key from dashboard and paste into SERVICE_KEY above")
    print("  2. Pay Supabase storage bill to unlock egress")
    print("  3. Client re-uploads images via admin.html")
