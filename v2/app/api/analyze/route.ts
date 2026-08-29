import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline/run";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    const latRaw = form.get("lat");
    const lngRaw = form.get("lng");

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "image file is required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "image too large (max 8MB)" }, { status: 413 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/jpeg";

    const coords =
      latRaw && lngRaw ? ([Number(latRaw), Number(lngRaw)] as [number, number]) : undefined;

    const result = await runPipeline({
      image: { mimeType, data: buf.toString("base64") },
      coords: coords && coords.every(Number.isFinite) ? coords : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[analyze] error", err);
    const message = err instanceof Error ? err.message : "analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
