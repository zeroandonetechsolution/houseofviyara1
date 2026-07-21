import os
import json
import base64
import urllib.request
import urllib.parse

# Cloudinary configuration from config/settings
CLOUD_NAME = "b2p0mqvx"
API_KEY = "348292556668473"
API_SECRET = "HoqDzI-MSMZT2Snyb4uJs7R55Yo"

# Directories
SOURCE_DIR = r"d:\Jega\houseofviyara1-main\assets\migrated_images"
DATA_DIR = r"d:\Jega\houseofviyara1-main\data"

def upload_to_cloudinary(file_path):
    print(f"Uploading {os.path.basename(file_path)} to Cloudinary...")
    url = f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload"
    
    # Read file and encode to base64
    with open(file_path, "rb") as f:
        file_data = f.read()
        base64_data = base64.b64encode(file_data).decode("utf-8")
        
    mime_type = "image/jpeg"
    if file_path.lower().endswith(".png"):
        mime_type = "image/png"
    elif file_path.lower().endswith(".gif"):
        mime_type = "image/gif"
        
    data_uri = f"data:{mime_type};base64,{base64_data}"
    
    # Prepare payload
    payload = {
        "file": data_uri,
        "upload_preset": "houseofviyara",
        "folder": "houseofviyara/products"
    }
    
    # Encode payload
    data = urllib.parse.urlencode(payload).encode("utf-8")
    
    # Request
    req = urllib.request.Request(url, data=data, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            secure_url = res_data.get("secure_url")
            print(f"✅ Uploaded successfully: {secure_url}")
            return secure_url
    except Exception as e:
        print(f"❌ Failed to upload {file_path}: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))
        return None

def migrate_json_files():
    if not os.path.exists(SOURCE_DIR):
        print(f"Directory not found: {SOURCE_DIR}")
        print("Please create this directory and put your downloaded product images there.")
        return
        
    files = [f for f in os.listdir(SOURCE_DIR) if os.path.isfile(os.path.join(SOURCE_DIR, f))]
    if not files:
        print(f"No image files found in {SOURCE_DIR}")
        return
        
    print(f"Found {len(files)} local images to migrate.")
    
    # Upload all local images to Cloudinary and map them
    url_mapping = {}
    for filename in files:
        file_path = os.path.join(SOURCE_DIR, filename)
        cloudinary_url = upload_to_cloudinary(file_path)
        if cloudinary_url:
            # We map the filename (which matches the end of the Supabase URL) to the new Cloudinary URL
            url_mapping[filename] = cloudinary_url

    # Update data files
    for json_file in ["products.json", "categories.json", "hero_images.json"]:
        file_path = os.path.join(DATA_DIR, json_file)
        if not os.path.exists(file_path):
            continue
            
        print(f"Updating {json_file}...")
        with open(file_path, "r", encoding="utf-8") as f:
            content_str = f.read()
            
        replacements = 0
        for filename, new_url in url_mapping.items():
            # Find URLs in the JSON that end with the filename
            # Supabase URLs end with /products/filename or similar
            # Example: https://.../products/1782901567298_IMG-20260629-WA0001.jpg
            
            # Simple substring replacement: find occurrences of the filename inside Supabase URL domain
            supabase_prefix = "embvkfuwevutfwpxemfe.supabase.co"
            
            # Let's parse JSON to replace precisely or do a safe string replacement
            # For robustness, we search for any Supabase URL that contains the filename
            # Since the filename is unique, we can replace the entire Supabase URL containing it
            
        # Let's load JSON to do precise replacement
        data = json.loads(content_str)
        
        def replace_in_obj(obj):
            nonlocal replacements
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if isinstance(v, str) and supabase_prefix in v:
                        # Extract filename from URL
                        url_filename = v.split("/")[-1]
                        # Clean query parameters if any
                        url_filename = url_filename.split("?")[0]
                        if url_filename in url_mapping:
                            obj[k] = url_mapping[url_filename]
                            replacements += 1
                    else:
                        replace_in_obj(v)
            elif isinstance(obj, list):
                for i, v in enumerate(obj):
                    if isinstance(v, str) and supabase_prefix in v:
                        url_filename = v.split("/")[-1]
                        url_filename = url_filename.split("?")[0]
                        if url_filename in url_mapping:
                            obj[i] = url_mapping[url_filename]
                            replacements += 1
                    else:
                        replace_in_obj(v)

        replace_in_obj(data)
        
        if replacements > 0:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            print(f"✅ Replaced {replacements} URLs in {json_file}")
        else:
            print(f"No replacements made in {json_file}")

if __name__ == "__main__":
    migrate_json_files()
