import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function imageType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.response) return auth.response;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Choose an image smaller than 5 MB." }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const verifiedType = imageType(bytes);
  if (!verifiedType || file.type !== verifiedType) {
    return NextResponse.json({ error: "Upload a valid JPEG, PNG, or WebP image." }, { status: 400 });
  }

  if (!cloudinaryConfigured) {
    const extension = verifiedType === "image/jpeg" ? "jpg" : verifiedType === "image/png" ? "png" : "webp";
    const fileName = `${randomUUID()}.${extension}`;
    const uploadDirectory = join(process.cwd(), "public", "uploads");
    try {
      await mkdir(uploadDirectory, { recursive: true });
      await writeFile(join(uploadDirectory, fileName), bytes, { flag: "wx" });
      return NextResponse.json({ url: `/uploads/${fileName}`, storage: "local" }, { status: 201 });
    } catch (error) {
      console.error("Local nominee image write failed", error);
      return NextResponse.json({ error: "Image upload failed. Try again." }, { status: 500 });
    }
  }

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Production image storage is not configured." }, { status: 503 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "nyeri-creators";
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  const uploadData = new FormData();
  uploadData.set("file", new Blob([bytes], { type: verifiedType }), `${randomUUID()}.${verifiedType === "image/jpeg" ? "jpg" : verifiedType === "image/png" ? "png" : "webp"}`);
  uploadData.set("api_key", apiKey);
  uploadData.set("timestamp", String(timestamp));
  uploadData.set("folder", folder);
  uploadData.set("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, { method: "POST", body: uploadData });
  const result = await response.json().catch(() => null) as { secure_url?: string; error?: { message?: string } } | null;
  if (!response.ok || !result?.secure_url) {
    console.error("Cloudinary upload failed", result?.error?.message);
    return NextResponse.json({ error: "Image upload failed. Try again." }, { status: 502 });
  }
  return NextResponse.json({ url: result.secure_url }, { status: 201 });
}
