# Lucid Mock API

Project documentation index: [`../docs/README.md`](../docs/README.md).

Enterprise-grade mock API server for development and staging. Provides products, posts, cart, orders, newsletter, and contact endpoints with security, rate limiting, health checks, and structured logging.

## Quick Start

**From project root** (recommended — [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) includes this package; **`pnpm install`** installs SPA + backend together):

```bash
pnpm install
pnpm run start:api
```

**Or from backend folder** (standalone; rarely needed):

```bash
cd backend
pnpm install
pnpm start
```

Server runs at `http://localhost:3001` by default.

## Endpoints

| Method | Path                | Description                            |
| ------ | ------------------- | -------------------------------------- |
| GET    | `/`                 | API info & status                      |
| GET    | `/health`           | Health check                           |
| GET    | `/health/live`      | Liveness probe                         |
| GET    | `/health/ready`     | Readiness probe (DB check)             |
| GET    | `/api/info`         | API documentation                      |
| GET    | `/api/metrics`      | Request count, uptime                  |
| GET    | `/api/cart`         | Get cart                               |
| POST   | `/api/cart`         | Update cart                            |
| GET    | `/api/orders`       | List orders (paginated)                |
| POST   | `/api/orders`       | Create order                           |
| POST   | `/api/newsletter`   | Subscribe email                        |
| POST   | `/api/contact`      | Submit contact form                    |
| GET    | `/api/products`     | List products (paginate, search, sort) |
| GET    | `/api/products/:id` | Get product                            |
| GET    | `/api/posts`        | List posts (paginate, search, sort)    |
| GET    | `/api/posts/:id`    | Get post                               |

### Query Parameters (products, posts)

- `_page`, `_limit` — Pagination
- `_sort`, `_order` — Sort (e.g. `_sort=price&_order=asc`)
- `q` — Search term

## Configuration

Environment variables (see `.env.example`):

| Variable               | Default     | Description                       |
| ---------------------- | ----------- | --------------------------------- |
| `PORT`                 | 3001        | Server port                       |
| `NODE_ENV`             | development | Environment                       |
| `CORS_ORIGINS`         | \*          | Allowed origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS` | 60000       | Rate limit window (ms)            |
| `RATE_LIMIT_MAX`       | 100         | Max requests per window           |
| `BODY_LIMIT`           | 512kb       | Max request body size             |
| `DB_PATH`              | ./db.json   | Path to JSON database             |
| `REQUEST_TIMEOUT_MS`   | 30000       | Request timeout                   |
| `API_VERSION`          | 1.0.0       | API version string                |

## Data

- **db.json** — Static data (products, posts). Cart, orders, newsletter, and contact submissions are stored in memory and reset on restart.
- Edit `db.json` to change products and posts.

## Running with Frontend

From project root:

```bash
# Terminal 1: Start mock API
pnpm run start:api

# Terminal 2: Start Vite dev server (proxies /api and /health to backend)
pnpm run dev
```

The root [`vite.config.ts`](../vite.config.ts) proxies **`/api`** and **`/health`** to `http://localhost:3001` during **`pnpm run dev`**. The same proxies apply to **`pnpm run preview`** (after **`pnpm run build`**): the mock must still be running on **3001** for any flow that uses those paths.

If you are unsure whether a failure is the mock, Supabase PostgREST, or an Edge Function, see [docs/PLATFORM.md — Diagnosing API and database failures](../docs/PLATFORM.md#diagnosing-api-and-database-failures).

## License

Private — part of lucid-web-craftsman.
