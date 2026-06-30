// SUPABASE EDGE FUNCTION: Convert HEIC/HEIF to JPEG!
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// We'll use client-side conversion as primary, and just upload original if needed (since sharp is tricky in Deno Edge Functions)
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

    // For now, just upload the file as-is (client-side conversion will handle HEIC!)
    const processedBlob = file;
    const processedFileName = file.name;

    // --- 3. UPLOAD TO SUPABASE STORAGE ---
    const supabaseUrl = Deno.env.get("PUBLIC_SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const bucket = Deno.env.get("STORAGE_BUCKET")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const safeName = processedFileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filename = `${pathPrefix}/${Date.now()}_${safeName}`;

    console.log("📤 Uploading to Supabase bucket:", bucket, "path:", filename);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, processedBlob, { upsert: true, contentType: file.type || "application/octet-stream" });

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
