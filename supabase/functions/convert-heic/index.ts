// SUPABASE EDGE FUNCTION: Convert HEIC/HEIF to JPEG!
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode } from "https://esm.sh/@jsquash/heic@1.2.0";
import init, { initThreadPool, JpegEncoder } from "https://esm.sh/@jsquash/jpeg@1.4.0";

// Initialize WASM modules
let modulesInitialized = false;

async function initializeModules() {
  if (modulesInitialized) return;
  try {
    await Promise.all([
      init(),
      initThreadPool(navigator.hardwareConcurrency || 4),
    ]);
    modulesInitialized = true;
    console.log("✅ WASM modules initialized!");
  } catch (e) {
    console.error("❌ Failed to init modules:", e);
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    await initializeModules();
    console.log('🔄 Received HEIC conversion request!');

    const formData = await req.formData();
    const file = formData.get("image") as File;
    const pathPrefix = formData.get("pathPrefix") as string || "products";

    if (!file) {
      return new Response("Missing file", { status: 400 });
    }

    console.log('📦 File:', file.name, file.type, file.size);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                   file.name.toLowerCase().endsWith('.heif');

    let jpegData: Uint8Array;
    if (isHeic) {
      // Decode HEIC
      console.log('🔍 Decoding HEIC...');
      const heicImage = await decode(arrayBuffer);
      console.log('✅ HEIC decoded, size:', heicImage.width, 'x', heicImage.height);

      // Encode to JPEG
      console.log('📝 Encoding to JPEG...');
      const jpegEncoder = new JpegEncoder(heicImage.width, heicImage.height, 0.9);
      jpegEncoder.encode(heicImage.data);
      jpegData = jpegEncoder.getBuffer();
    } else {
      // Not HEIC, just use original
      jpegData = new Uint8Array(arrayBuffer);
    }

    // Upload to Supabase Storage
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const filename = `${pathPrefix}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}${isHeic ? ".jpg" : ""}`;
    const bucketName = Deno.env.get("SUPABASE_BUCKET") || "public";

    console.log('📤 Uploading to Supabase:', filename);
    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .upload(filename, jpegData, {
        contentType: isHeic ? "image/jpeg" : file.type,
        upsert: true
      });

    if (error) {
      console.error("❌ Upload error:", error);
      return new Response(JSON.stringify(error), { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    console.log("✅ Conversion/upload successful! Public URL:", publicUrl);
    return new Response(
      JSON.stringify({ url: publicUrl, path: data.path }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );

  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
