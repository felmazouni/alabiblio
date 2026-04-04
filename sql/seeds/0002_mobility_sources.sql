INSERT INTO sources (
  id, code, name, base_url, format, license_url, refresh_mode, is_active, created_at, updated_at
) VALUES
  (
    'emt_stops',
    'emt_stops',
    'Paradas EMT Madrid',
    'https://datos.emtmadrid.es/dataset/7b4a2c0a-eece-4a5a-9094-bf9444824d86/resource/4f0736a9-865c-428f-8719-128c805baa2e/download/stopsemt.csv',
    'csv',
    'https://datos.emtmadrid.es/avisolegal',
    'dataset_download',
    1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  (
    'bicimad_stations',
    'bicimad_stations',
    'Estaciones Bicimad GBFS',
    'https://madrid.publicbikesystem.net/customer/gbfs/v2/gbfs.json',
    'api',
    'https://datos.emtmadrid.es/avisolegal',
    'api_runtime',
    1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  (
    'metro_crtm_stations',
    'metro_crtm_stations',
    'Estaciones Metro CRTM',
    'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M4_Red/FeatureServer/0',
    'api',
    'https://datos-movilidad.crtm.es/',
    'api_runtime',
    1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  (
    'emt_parkings',
    'emt_parkings',
    'Aparcamientos EMT Madrid',
    'https://datos.emtmadrid.es/dataset/0f3310f5-c4b5-4727-8183-6de7b8e44c91/resource/97bcf990-3bb2-4a58-aa50-fcc2992182c8/download/parkings.csv',
    'csv',
    'https://datos.emtmadrid.es/avisolegal',
    'dataset_download',
    1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  (
    'emt_realtime',
    'emt_realtime',
    'EMT OpenAPI realtime',
    'https://openapi.emtmadrid.es/',
    'api',
    'https://openapi.emtmadrid.es/',
    'api_runtime',
    1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  )
ON CONFLICT(code) DO UPDATE SET
  name = excluded.name,
  base_url = excluded.base_url,
  format = excluded.format,
  license_url = excluded.license_url,
  refresh_mode = excluded.refresh_mode,
  is_active = excluded.is_active,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
