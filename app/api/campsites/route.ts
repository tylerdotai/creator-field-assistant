import { NextRequest, NextResponse } from 'next/server';

// USFS ArcGIS fields
const USFS_FIELDS = [
  'site_name', 'site_subtype', 'latitude', 'longitude', 'recarea_name',
  'recarea_description', 'activity_types', 'fee_charged', 'fee_description',
  'open_season', 'water_availability', 'restroom_availability',
  'closest_towns', 'site_directions', 'usda_portal_url',
  'address_city', 'address_state', 'operational_hours',
  'restrictions', 'maximum_elevation', 'minimum_elevation'
];

const ARCGIS_URL = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_InfraRecreationSites_01/MapServer/0/query';

const CAMP_TYPES = new Set([
  'CAMPING AREA', 'CAMPGROUND', 'GROUP CAMPGROUND', 'CAMP UNIT',
  'CAMP UNIT - TENT', 'CAMP UNIT - TRAILER/RV', 'HORSE CAMP', 'ORGANIZATION SITE'
]);

function appType(subtype: string): 'campsite' | 'photo_spot' | 'accommodation' | 'other' {
  const s = subtype.toUpperCase();
  if (CAMP_TYPES.has(s)) return 'campsite';
  if (['LOOKOUT/CABIN', 'OBSERVATION SITE', 'INTERPRETIVE SITE', 'DOCUMENTARY SITE'].includes(s)) return 'photo_spot';
  if (['HOTEL, LODGE, RESORT', 'RECREATION RESIDENCE'].includes(s)) return 'accommodation';
  return 'other';
}

function buildDescription(attrs: Record<string, string>): string {
  const parts: string[] = [];
  const sub = attrs.site_subtype || '';
  if (sub) parts.push(`Type: ${sub.replace(/,/g, ' /').trim()}`);
  if (attrs.open_season) parts.push(`Season: ${attrs.open_season}`);
  if (attrs.operational_hours) parts.push(`Hours: ${attrs.operational_hours}`);
  if (attrs.fee_charged === 'Y' && attrs.fee_description) {
    const firstLine = attrs.fee_description.split('\n')[0].trim();
    if (firstLine) parts.push(`Fee: ${firstLine}`);
  } else if (attrs.fee_charged === 'N') {
    parts.push('Fee: No fee required');
  }
  if (attrs.water_availability) parts.push(`Water: ${attrs.water_availability}`);
  if (attrs.restroom_availability) parts.push(`Restrooms: ${attrs.restroom_availability}`);
  const maxElev = attrs.maximum_elevation;
  const minElev = attrs.minimum_elevation;
  if (maxElev || minElev) {
    const elev = minElev && maxElev && minElev !== maxElev ? `${minElev} – ${maxElev}` : (maxElev || minElev);
    parts.push(`Elevation: ${elev}`);
  }
  if (attrs.restrictions) parts.push(`Restrictions: ${attrs.restrictions.slice(0, 200)}`);
  if (attrs.activity_types) parts.push(`Activities: ${attrs.activity_types.slice(0, 200)}`);
  return parts.join(' | ');
}

function shortLocation(attrs: Record<string, string>): string {
  const city = attrs.address_city || '';
  const state = attrs.address_state || '';
  const forest = attrs.recarea_name || '';
  const towns = attrs.closest_towns || '';
  if (city && state) return `${city}, ${state}`;
  if (state) return state;
  if (forest) return forest;
  if (towns) return towns;
  return state || forest || '';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get('bbox');
  
  let minLng: number, minLat: number, maxLng: number, maxLat: number;
  
  if (bbox) {
    const parts = bbox.split(',').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) {
      return NextResponse.json({ error: 'Invalid bbox format. Use minLng,minLat,maxLng,maxLat' }, { status: 400 });
    }
    [minLng, minLat, maxLng, maxLat] = parts;
  } else {
    minLng = -125.0; minLat = 24.5; maxLng = -66.9; maxLat = 49.5;
  }

  try {
    const params = new URLSearchParams({
      where: `latitude >= ${minLat} AND latitude <= ${maxLat} AND longitude >= ${minLng} AND longitude <= ${maxLng}`,
      outFields: USFS_FIELDS.join(','),
      resultRecordCount: '500',
      returnGeometry: 'true',
      f: 'json',
      outSR: '4326',
    });

    const res = await fetch(`${ARCGIS_URL}?${params.toString()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 CreatorFieldAssistant/1.0' },
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      console.error(`[CFA] USFS ArcGIS error: ${res.status}`);
      return NextResponse.json({ error: 'USFS API unavailable', fallback: true }, { status: 200 });
    }

    const data = await res.json();
    
    if (data.error) {
      console.error(`[CFA] USFS ArcGIS error:`, data.error);
      return NextResponse.json({ error: 'USFS query failed', fallback: true }, { status: 200 });
    }

    const features = data.features || [];
    
    const locations = features
      .filter((f: { attributes: Record<string, string>; geometry?: { x: number; y: number } }) => {
        const lat = f.geometry?.y || f.attributes?.latitude;
        const lng = f.geometry?.x || f.attributes?.longitude;
        return lat && lng;
      })
      .map((f: { attributes: Record<string, string>; geometry: { x: number; y: number } }) => {
        const a = f.attributes;
        const geom = f.geometry || {};
        const lat = geom.y || a.latitude;
        const lng = geom.x || a.longitude;
        
        const description = [
          a.recarea_description || '',
          buildDescription(a),
        ].filter(Boolean).join('\n\n');

        return {
          name: (a.site_name || a.recarea_name || 'Unknown').trim(),
          lat: parseFloat(String(lat)),
          lng: parseFloat(String(lng)),
          type: appType(a.site_subtype || ''),
          description: description.trim(),
          location: shortLocation(a),
          url: a.usda_portal_url || '',
          directions: a.site_directions || '',
          subtype: a.site_subtype || '',
          activities: a.activity_types || '',
          fee: a.fee_charged === 'Y' ? 'Yes' : 'No',
          fee_detail: a.fee_description || '',
          water: a.water_availability || '',
          restroom: a.restroom_availability || '',
          elevation: [a.minimum_elevation, a.maximum_elevation].filter(Boolean).join(' – ') || '',
          season: a.open_season || '',
          hours: a.operational_hours || '',
          restrictions: a.restrictions || '',
          towns: a.closest_towns || '',
        };
      });

    return NextResponse.json({
      locations,
      count: locations.length,
      source: 'usfs',
      bbox: { minLng, minLat, maxLng, maxLat },
    });

  } catch (err) {
    console.error('[CFA] USFS route error:', err);
    return NextResponse.json({ error: 'Request failed', fallback: true }, { status: 200 });
  }
}
