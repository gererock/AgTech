# Agro Operativo

MVP AgTech para carga offline en campo y backoffice administrativo.

## Que incluye

- Next.js App Router con TypeScript estricto.
- PWA para las rutas de campo `/`, `/chofer` y `/maquinista`.
- IndexedDB con Dexie para guardar viajes y partes diarios sin conexion.
- Sincronizacion automatica cuando vuelve internet.
- API routes `POST /api/trips/sync` y `POST /api/work-orders/sync`.
- Prisma + PostgreSQL con UUIDs aptos para generacion en cliente.
- Dashboard desktop-first en `/dashboard`.

## Flujo recomendado para dos desarrolladores

Cada dev debe usar su propia base PostgreSQL local. Lo que se comparte por git es:

- `prisma/schema.prisma`
- `prisma/migrations/**`
- `prisma/seed.mjs`
- `.env.example`
- `docker-compose.yml`

No compartan `.env` ni el volumen local de Docker.

## Setup local

Recomendado: usar Docker Desktop para que cada dev tenga la misma version local de PostgreSQL.

1. Instalar dependencias:

```bash
npm install
```

2. Copiar variables locales:

```bash
copy .env.example .env
```

3. Levantar PostgreSQL local:

```bash
npm run db:up
```

4. Aplicar migraciones:

```bash
npm run db:migrate
```

5. Cargar datos demo:

```bash
npm run db:seed
```

Tambien pueden hacer todo junto con:

```bash
npm run db:setup
```

Si no tienen Docker, pueden usar PostgreSQL instalado localmente o una base remota de desarrollo, ajustar `DATABASE_URL` en `.env` y correr:

```bash
npm run db:create-local
```

Ese comando pide la password local del superusuario `postgres`, crea el rol `agro`, crea la base `agro_operativo` y aplica migraciones sin cargar datos.

Para leer datos reales desde PostgreSQL, usar en `.env`:

```bash
DASHBOARD_DATA_SOURCE="database"
```

6. Levantar la app:

```bash
npm run dev
```

La app queda disponible en `http://127.0.0.1:3000`.

En Windows, si PowerShell bloquea `npm`, usar:

```bash
npm.cmd run dev
```

El servidor de desarrollo usa `.next-dev` y el build usa `.next`; esto evita que las recargas en desarrollo se rompan cuando se corre un build o se actualizan archivos.

## Rutas principales

- `http://127.0.0.1:3000/` modo campo.
- `http://127.0.0.1:3000/chofer` carga de viajes.
- `http://127.0.0.1:3000/maquinista` carga de partes diarios.
- `http://127.0.0.1:3000/dashboard` backoffice administrativo.

## Reglas de trabajo con la base

- Si cambia el modelo, editar `prisma/schema.prisma`.
- Crear una migracion con `npm run db:migrate`.
- Subir la carpeta nueva dentro de `prisma/migrations`.
- El otro dev hace `git pull` y luego `npm run db:migrate`.
- Para reiniciar datos locales: `npm run db:reset`.
- Para inspeccionar datos: `npm run db:studio`.

Si PostgreSQL no esta configurado, los formularios siguen guardando en IndexedDB y quedan pendientes de sincronizar.
