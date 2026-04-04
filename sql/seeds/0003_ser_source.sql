INSERT INTO sources (
  id, code, name, base_url, format, license_url, refresh_mode, is_active, created_at, updated_at
) VALUES (
  'ser_bands',
  'ser_bands',
  'Servicio de Estacionamiento Regulado (SER)',
  'https://geoportal.madrid.es/fsdescargas/IDEAM_WBGEOPORTAL/MOVILIDAD/ZONA_SER/SHP_ZIP.zip',
  'shp_zip',
  'https://datos.madrid.es/egob/catalogo/aviso-legal',
  'dataset_download',
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
