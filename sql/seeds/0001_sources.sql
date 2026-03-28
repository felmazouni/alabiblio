INSERT INTO sources (
  id, code, name, base_url, format, license_url, refresh_mode, is_active, created_at, updated_at
) VALUES
  (
    'study_rooms',
    'study_rooms',
    'Salas de estudio de Madrid',
    'https://datos.madrid.es/dataset/217921-0-salas-estudio/resource/217921-1-salas-estudio-csv/download/217921-1-salas-estudio-csv.csv',
    'csv',
    'https://datos.madrid.es/egob/catalogo/aviso-legal',
    'dataset_download',
    1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  (
    'libraries',
    'libraries',
    'Bibliotecas públicas y bibliobuses de Madrid',
    'https://datos.madrid.es/egob/catalogo/201747-0-bibliobuses-bibliotecas.csv',
    'csv',
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
