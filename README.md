# Agro Operativo

MVP mobile-first para carga offline de viajes y partes diarios agropecuarios.

## Incluye

- Next.js App Router con TypeScript estricto.
- PWA con `manifest.webmanifest`, service worker y cache de `/`, `/chofer` y `/maquinista`.
- IndexedDB con Dexie para guardar `Trips` y `WorkOrders` con `synced: false`.
- Sincronización automática al volver la conexión y botón manual de sync.
- API routes `POST /api/trips/sync` y `POST /api/work-orders/sync`.
- Prisma schema para PostgreSQL con IDs UUID aptos para generación en cliente.
- Panel administrativo desktop-first en `/dashboard` con KPIs, reportes de combustible, tablas operativas y auditoría de sincronización.

## Desarrollo local

```bash
npm install
npm run dev
```

La app queda disponible en `http://127.0.0.1:3000`.

Rutas principales:

- `http://127.0.0.1:3000/` modo campo.
- `http://127.0.0.1:3000/chofer` carga de viajes.
- `http://127.0.0.1:3000/maquinista` carga de partes diarios.
- `http://127.0.0.1:3000/dashboard` backoffice administrativo.

## Base de datos

1. Copiar `.env.example` a `.env`.
2. Configurar `DATABASE_URL` con una base PostgreSQL.
3. Ejecutar:

```bash
npm run prisma:migrate
```

Sin PostgreSQL configurado, los formularios siguen guardando en IndexedDB y quedarán pendientes de sincronizar.
# AgTech
