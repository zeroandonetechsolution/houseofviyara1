// SUPABASE EDGE FUNCTION: Convert HEIC/HEIF to JPEG!
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import heic2any from "https://esm.sh/heic2any@0.0.10?dts";

serve(async (req: Request) => {
  // --- 1. HANDLE CORS ---
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    console.log("🔄 New request received!");

    // --- 2. GET FILE FROM REQUEST ---
    const formData = await req.formData();
    const file = formData.get("image") as File;
    const pathPrefix = formData.get("pathPrefix") as string || "products";
    if (!file) return new Response("Missing image file", { status: 400 });
    console.log("📦 File received:", file.name, "size:", file.size);

    let processedBlob: Blob = file;
    let processedFileName = file.name;
    
    // --- 3. CHECK IF HEIC/HEIF AND CONVERT ---
    const isHeic = /\.(heic|heif)$/i.test(file.name) || 
                   file.type === "image/heic" || 
                   file.type === "image/heif";
    
    if (isHeic) {
      console.log("🔄 Converting HEIC/HEIF file...");
      try {
        const arrayBuffer = await file.arrayBuffer();
        const jpegBlob = await heic2any({
          blob: new Blob([arrayBuffer]),
          toType: "image/jpeg",
          quality: 0.9
        });
        
        processedBlob = Array.isArray(jpegBlob) ? jpegBlob[0] : jpegBlob;
        processedFileName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
        console.log("✅ HEIC conversion successful!");
      } catch (conversionError) {
        console.warn("⚠️ HEIC conversion failed, using original:", conversionError);
        // Fall back to original file
      }
    }

    // --- 4. UPLOAD TO SUPABASE STORAGE ---
    const supabase = createClient(
      Deno.env.get("https://embvkfuwevutfwpxemfe.supabase.co")!,
      Deno.env.get("sb_publishable_SsKrveUh0KOhucRBIod-uA_ySWG8ENr")!
    );
    const bucket = Deno.env.get("HOVB") || "HOVB";
    const safeName = processedFileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filename = `${pathPrefix}/${Date.now()}_${safeName}`;

    console.log("📤 Uploading to Supabase bucket:", bucket, "path:", filename);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, processedBlob, { upsert: true, contentType: isHeic ? "image/jpeg" : (file.type || "application/octet-stream") });

    if (uploadError) {
      console.error("❌ Supabase upload error:", uploadError);
      return new Response(JSON.stringify(uploadError), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    console.log("✅ Uploaded successfully!");
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(uploadData.path);
    console.log("🌐 Public URL:", publicUrl);

    return new Response(
      JSON.stringify({ url: publicUrl, path: uploadData.path }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    console.error("❌ Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
});
