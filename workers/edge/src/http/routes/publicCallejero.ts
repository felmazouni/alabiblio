const MADRID_BBOX = "-3.95,40.28,-3.52,40.65"; // minlon,minlat,maxlon,maxlat (viewbox format)
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Alabiblio/1.0 (alabiblio.org)";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
  };
  type?: string;
  class?: string;
}

interface CallejeroSuggestion {
  lat: number;
  lon: number;
  label: string;
}

function buildLabel(result: NominatimResult): string {
  const addr = result.address;
  if (!addr) {
    // Truncate display_name to first two comma-parts
    return result.display_name.split(",").slice(0, 2).join(",").trim();
  }

  const parts: string[] = [];
  if (addr.road) {
    parts.push(addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road);
  }
  const locality = addr.neighbourhood ?? addr.suburb ?? addr.city ?? addr.town ?? addr.village;
  if (locality && locality !== "Madrid") {
    parts.push(locality);
  }
  parts.push("Madrid");

  return parts.join(", ");
}

export async function buildCallejeroAutocompleteResponse(query: string): Promise<Response> {
  const q = query.trim();
  if (q.length < 3) {
    return Response.json([], {
      headers: { "cache-control": "no-store" },
    });
  }

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "8",
    countrycodes: "es",
    viewbox: MADRID_BBOX,
    bounded: "1",
    addressdetails: "1",
    "accept-language": "es",
  });

  const nominatimUrl = `${NOMINATIM_BASE}?${params.toString()}`;

  try {
    const upstream = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": "https://alabiblio.org",
      },
      // 5-second timeout via AbortSignal
      signal: AbortSignal.timeout(5000),
    });

    if (!upstream.ok) {
      return Response.json([], {
        headers: { "cache-control": "no-store" },
      });
    }

    const raw = (await upstream.json()) as NominatimResult[];

    const suggestions: CallejeroSuggestion[] = raw.map((result) => ({
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      label: buildLabel(result),
    }));

    return Response.json(suggestions, {
      headers: {
        "cache-control": "public, max-age=3600",
        "content-type": "application/json",
      },
    });
  } catch {
    return Response.json([], {
      headers: { "cache-control": "no-store" },
    });
  }
}
