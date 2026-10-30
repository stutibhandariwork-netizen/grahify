import { NextResponse } from "next/server";
import { placeLabel, searchPlaces } from "@/lib/places";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = searchPlaces(q.slice(0, 80)).map((p) => ({
    id: p.id,
    label: placeLabel(p),
    latitude: p.latitude,
    longitude: p.longitude,
    timeZone: p.timeZone,
  }));
  return NextResponse.json(results, { headers: { "Cache-Control": "public, max-age=86400" } });
}
