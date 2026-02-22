# Lucid Mock API

Enterprise-grade mock API server for development and staging. Provides products, posts, cart, orders, newsletter, and contact endpoints with security, rate limiting, health checks, and structured logging.

## Quick Start

**From project root** (recommended; `npm install` at root runs postinstall for backend):

```bash
npm install
npm run start:api
```

**Or from backend folder**:

```bash
cd backend
npm install
npm start
```

Server runs at `http://localhost:3001` by default.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API info & status |
| GET | `/health` | Health check |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe (DB check) |
| GET | `/api/info` | API documentation |
| GET | `/api/metrics` | Request count, uptime |
| GET | `/api/cart` | Get cart |
| POST | `/api/cart` | Update cart |
| GET | `/api/orders` | List orders (paginated) |
| POST | `/api/orders` | Create order |
| POST | `/api/newsletter` | Subscribe email |
| POST | `/api/contact` | Submit contact form |
| GET | `/api/products` | List products (paginate, search, sort) |
| GET | `/api/products/:id` | Get product |
| GET | `/api/posts` | List posts (paginate, search, sort) |
| GET | `/api/posts/:id` | Get post |

### Query Parameters (products, posts)

- `_page`, `_limit` — Pagination
- `_sort`, `_order` — Sort (e.g. `_sort=price&_order=asc`)
- `q` — Search term

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `NODE_ENV` | development | Environment |
| `CORS_ORIGINS` | * | Allowed origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | 100 | Max requests per window |
| `BODY_LIMIT` | 512kb | Max request body size |
| `DB_PATH` | ./db.json | Path to JSON database |
| `REQUEST_TIMEOUT_MS` | 30000 | Request timeout |
| `API_VERSION` | 1.0.0 | API version string |

## Data

- **db.json** — Static data (products, posts). Cart, orders, newsletter, and contact submissions are stored in memory and reset on restart.
- Edit `db.json` to change products and posts.

## Running with Frontend

From project root:

```bash
# Terminal 1: Start mock API
npm run start:api

# Terminal 2: Start Vite dev server (proxies /api to backend)
npm run dev
```

The root `vite.config.ts` proxies `/api` to `http://localhost:3001` during development.

## License

Private — part of lucid-web-craftsman.
