# Despliegue — WCGTF 2026

Guía para poner la app en producción con **Vercel** (app) + **Neon** (base de datos).
El stack: Next.js 16 + Prisma 7 + NextAuth (Google) + MercadoPago Checkout Pro.

---

## Arquitectura

| Pieza | Servicio | Qué aporta |
|-------|----------|------------|
| App Next.js | **Vercel** | La URL pública `https://tu-app.vercel.app` |
| Base de datos | **Neon** | La `DATABASE_URL` (Postgres) |
| Login | Google OAuth | Autenticación |
| Pagos | MercadoPago Checkout Pro | Cobro de apuestas |

> El cliente Prisma se regenera en cada build (`prisma generate && next build`), así
> que `src/generated/` **no** se versiona — no hay que commitearlo.

---

## Paso 1 — Base de datos en Neon

1. Crea un proyecto en https://neon.tech
2. Copia la **connection string POOLED** (la que incluye `-pooler` en el host).
3. Guárdala; será tu `DATABASE_URL`. Debe terminar en `?sslmode=require`.

```
postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

> Nota: `pg` muestra un warning sobre `sslmode=require`; es inofensivo hoy. Si en el
> futuro molesta, usa `?sslmode=require&uselibpqcompat=true`.

---

## Paso 2 — Subir el código a GitHub

```bash
git remote add origin https://github.com/TU_USUARIO/wcgtf.git
git push -u origin master
```

---

## Paso 3 — Crear el proyecto en Vercel

1. https://vercel.com → **Add New → Project** → importa el repo de GitHub.
2. Framework: Next.js (autodetectado). No cambies el build command.
3. Agrega las **variables de entorno** (Paso 4) **antes** del primer deploy.

---

## Paso 4 — Variables de entorno (en Vercel → Settings → Environment Variables)

```ini
DATABASE_URL      = "postgresql://...-pooler...neon.tech/neondb?sslmode=require"
AUTH_SECRET       = "<el mismo de tu .env, o genera uno con: openssl rand -base64 32>"
AUTH_URL          = "https://tu-app.vercel.app"   # ← ver Paso 6 (huevo-gallina)
AUTH_GOOGLE_ID    = "<client id de Google>"
AUTH_GOOGLE_SECRET= "<client secret de Google>"
MP_ACCESS_TOKEN   = "APP_USR-..."                 # Access Token de MercadoPago
# MP_WEBHOOK_SECRET = "..."                        # opcional (valida firma del webhook)

# Resultados automáticos (API-Football + cron)
FOOTBALL_API_KEY  = "..."                          # key de api-sports.io / API-Football
CRON_SECRET       = "<openssl rand -hex 16>"        # protege /api/cron/sync-results
# FOOTBALL_LEAGUE_ID = "1"                          # opcional (1 = World Cup)
# FOOTBALL_SEASON    = "2026"                       # opcional
```

### Resultados automáticos

1. Saca una **API key** en https://www.api-football.com (o dashboard.api-sports.io) y ponla en `FOOTBALL_API_KEY`.
2. Define `CRON_SECRET` (cualquier string aleatorio). Vercel lo manda como `Authorization: Bearer <CRON_SECRET>` al cron.
3. En `/admin/partidos` usa **"Importar / mapear fixtures"** una vez (liga cada partido con el de la API). Los que no mapee automáticamente, pon su `ID` de fixture a mano en la fila (campo "API").
4. **Vercel Cron** (`vercel.json`) llama `/api/cron/sync-results` cada 15 min. ⚠️ El plan **Hobby de Vercel solo permite cron 1×/día**; para cada 15 min necesitas plan **Pro**, o usa un cron externo gratis (ej. cron-job.org) apuntando a `https://tu-app.vercel.app/api/cron/sync-results?secret=<CRON_SECRET>`.
5. El botón **"Sincronizar ahora"** funciona siempre, sin importar el cron.

---

## Paso 5 — Migrar la base de datos a Neon

Con la `DATABASE_URL` de Neon, desde tu máquina:

```bash
# PowerShell (temporal para este comando):
$env:DATABASE_URL="postgresql://...-pooler...neon.tech/neondb?sslmode=require"
npx prisma migrate deploy
```

Esto crea todas las tablas en Neon. Luego carga datos base (equipos, grupos, etc.):

```bash
npx prisma db seed        # si los seeds (prisma/seed.ts) están listos
# o cárgalos manualmente desde el panel /admin una vez desplegado.
```

---

## Paso 6 — Resolver el "huevo-gallina" de AUTH_URL

No conoces la URL hasta el primer deploy:

1. Haz el primer deploy (aunque `AUTH_URL` esté provisional).
2. Vercel te da la URL final, ej. `https://wcgtf.vercel.app`.
3. Actualiza `AUTH_URL` con esa URL exacta → **Redeploy**.
4. (Ideal) Conecta un dominio propio y usa ese valor desde el inicio.

---

## Paso 7 — Configurar Google OAuth

En https://console.cloud.google.com → APIs y servicios → Credenciales → tu OAuth Client:

- **Authorized redirect URIs**: `https://tu-app.vercel.app/api/auth/callback/google`
- **Authorized JavaScript origins**: `https://tu-app.vercel.app`

---

## Paso 8 — MercadoPago

**No requiere configuración extra de URL.** El código arma automáticamente desde `AUTH_URL`:
- `notification_url` → `${AUTH_URL}/api/mp/webhook`
- `back_urls` (success/failure/pending) → `${AUTH_URL}/...`

Solo necesitas:
1. Elegir **Checkout Pro** en el panel de MercadoPago.
2. Copiar el **Access Token** a `MP_ACCESS_TOKEN`.
3. (Opcional) En *Webhooks* del panel, copiar la clave secreta a `MP_WEBHOOK_SECRET`.

> Sin `MP_ACCESS_TOKEN`, la app funciona en **modo manual**: las apuestas quedan
> `PENDIENTE` y se aprueban en `/admin/pagos`.

---

## Checklist final

- [ ] Neon creado, `DATABASE_URL` pooled copiada
- [ ] Código en GitHub
- [ ] Proyecto en Vercel con todas las variables de entorno
- [ ] `prisma migrate deploy` corrido contra Neon
- [ ] Datos base cargados (equipos / grupos / partidos)
- [ ] Primer deploy → `AUTH_URL` actualizada → redeploy
- [ ] Redirect URI de Google configurado con el dominio final
- [ ] `MP_ACCESS_TOKEN` configurado y un pago de prueba aprobado
