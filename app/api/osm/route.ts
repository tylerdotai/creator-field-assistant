import { NextRequest, NextResponse } from 'next/server';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bbox = searchParams.get('bbox'); // 'minLng,minLat,maxLng,maxLat'

  const overpassQuery = `[out:json][timeout:30][maxsize:20971520];
(
  node["tourism"="camp_site"]["name"](${bbox});
  way["tourism"="camp_site"]["name"](${bbox});
  node["leisure"="campsite"]["name"](${bbox});
  way["leisure"="campsite"]["name"](${bbox});
  node["tourism"="viewpoint"]["name"](${bbox});
  way["tourism"="viewpoint"]["name"](${bbox});
  node["natural"="peak"]["name"](${bbox});
  way["natural"="peak"]["name"](${bbox});
);
out center;
>;
out skel qt;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: AbortSignal.timeout(35000),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }

      // 429 = rate limited on this endpoint, try next
      if (response.status === 429) {
        console.warn(`[OSM] ${endpoint} rate-limited, trying next endpoint`);
        continue;
      }

      // Other errors — try next endpoint
      console.warn(`[OSM] ${endpoint} returned ${response.status}`);
    } catch (err) {
      console.warn(`[OSM] ${endpoint} failed:`, err);
    }
  }

  // All endpoints failed — return empty so client can fall back to static seed
  return NextResponse.json({ elements: [] }, { status: 200 });
}
