import { NextRequest, NextResponse } from 'next/server';

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

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://creator-field-assistant.vercel.app',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: AbortSignal.timeout(35000),
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited — wait and retry once
        await new Promise(r => setTimeout(r, 60000));
        const retry = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(overpassQuery)}`,
          signal: AbortSignal.timeout(35000),
        });
        if (!retry.ok) return NextResponse.json([], { status: 200 });
        const data = await retry.json();
        return NextResponse.json(data);
      }
      return NextResponse.json([], { status: 200 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
