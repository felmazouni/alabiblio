const WGS84_A = 6378137;
const WGS84_E = 0.08181919084262149;
const UTM_SCALE_FACTOR = 0.9996;
const UTM_ZONE_30_CENTRAL_MERIDIAN = -3;

function toDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

export function utm30ToWgs84(
  easting: number,
  northing: number,
): { lat: number; lon: number } {
  const eSquared = WGS84_E * WGS84_E;
  const ePrimeSquared = eSquared / (1 - eSquared);
  const x = easting - 500000;
  const y = northing;
  const meridionalArc = y / UTM_SCALE_FACTOR;
  const mu =
    meridionalArc /
    (WGS84_A *
      (1 -
        eSquared / 4 -
        (3 * eSquared * eSquared) / 64 -
        (5 * eSquared * eSquared * eSquared) / 256));
  const e1 = (1 - Math.sqrt(1 - eSquared)) / (1 + Math.sqrt(1 - eSquared));
  const j1 = (3 * e1) / 2 - (27 * e1 ** 3) / 32;
  const j2 = (21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32;
  const j3 = (151 * e1 ** 3) / 96;
  const j4 = (1097 * e1 ** 4) / 512;
  const footprintLatitude =
    mu +
    j1 * Math.sin(2 * mu) +
    j2 * Math.sin(4 * mu) +
    j3 * Math.sin(6 * mu) +
    j4 * Math.sin(8 * mu);
  const sinFootprint = Math.sin(footprintLatitude);
  const cosFootprint = Math.cos(footprintLatitude);
  const tanFootprint = Math.tan(footprintLatitude);
  const n =
    WGS84_A / Math.sqrt(1 - eSquared * sinFootprint * sinFootprint);
  const t = tanFootprint * tanFootprint;
  const c = ePrimeSquared * cosFootprint * cosFootprint;
  const r =
    (WGS84_A * (1 - eSquared)) /
    Math.pow(1 - eSquared * sinFootprint * sinFootprint, 1.5);
  const d = x / (n * UTM_SCALE_FACTOR);
  const latitude =
    footprintLatitude -
    ((n * tanFootprint) / r) *
      (d * d / 2 -
        ((5 + 3 * t + 10 * c - 4 * c * c - 9 * ePrimeSquared) *
          d ** 4) /
          24 +
        ((61 +
          90 * t +
          298 * c +
          45 * t * t -
          252 * ePrimeSquared -
          3 * c * c) *
          d ** 6) /
          720);
  const longitude =
    ((UTM_ZONE_30_CENTRAL_MERIDIAN * Math.PI) / 180) +
    (d -
      ((1 + 2 * t + c) * d ** 3) / 6 +
      ((5 -
        2 * c +
        28 * t -
        3 * c * c +
        8 * ePrimeSquared +
        24 * t * t) *
        d ** 5) /
        120) /
      cosFootprint;

  return {
    lat: toDegrees(latitude),
    lon: toDegrees(longitude),
  };
}
