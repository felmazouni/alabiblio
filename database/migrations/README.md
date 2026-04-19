# Migrations

- `0001_initial.sql`: esquema base inicial de centros, horarios, ratings y auditoria.
- `0002_runtime_schema_convergence.sql`: convergencia entre el esquema usado por runtime y el esquema versionado, incluyendo transporte persistido y cobertura SER.
- `0003_center_ingestion_rejections.sql`: persistencia de descartes de ingesta con motivo y payload crudo para auditoria.

Regla operativa:

- Cualquier tabla o indice que el runtime necesite debe existir tambien como migracion versionada en esta carpeta.
