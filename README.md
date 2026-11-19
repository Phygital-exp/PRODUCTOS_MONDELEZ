# PRODUCTOS_MONDELEZ — Proxy

Proxy en Express que expone el endpoint `productos_mondelez` a la landing (rama `Web`, GitHub Pages) sin exponer el token.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Health check (`{ "status": "ok" }`) |
| GET | `/api/productos` | Productos Mondelez. Los query params se reenvían al backend. |

## Variables de entorno (Railway)

- `API_TOKEN` (obligatoria): token del backend `botai.smartdataautomation.com`.
- `ALLOWED_ORIGINS` (opcional): orígenes permitidos por CORS separados por coma, p. ej. `https://phygital-exp.github.io`. Si no se define, se permite cualquier origen.
- `PORT`: la asigna Railway automáticamente.

## Local

```bash
npm install
API_TOKEN=xxxx npm start
```
