# Best Deal Store — Store Admin

Staff **React** app (Vite) for managing catalog and orders. **nginx** proxies `/categories` and `/products` to the Category & Product service and `/makeline` to the Makeline service.

## What this service does

This is the **internal admin console** for store staff. It drives catalog maintenance by calling the same category and product REST endpoints the storefront uses (create, update, delete as implemented in the UI). For **orders**, it uses the **Makeline** API instead of the Order service directly: the makeline layer is where queued work is inspected and progressed, which matches a typical split between “order capture” (Order service) and “fulfilment / kitchen line” (Makeline). Like the storefront, all calls go through **nginx** on the same origin so cookies and CORS stay simple in production.

## Endpoints consumed (this app → APIs)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/categories` | List categories. |
| POST | `/categories` | Create category. |
| DELETE | `/categories/{id}` | Remove category. |
| GET | `/products` | List products. |
| POST | `/products` | Create product. |
| PUT | `/products/{id}` | Update product. |
| DELETE | `/products/{id}` | Delete product. |
| GET | `/makeline/orders` | List orders (proxied to Makeline service). |
| PUT | `/makeline/orders/{id}` | Update order `status` (JSON body `{ "status": "..." }`). |

## Stack

- React 18, Vite  
- Docker: multi-stage build → nginx

## Local development

```bash
npm install
npm run dev
```

## Docker

```bash
docker build -t best-deal-store-admin .
```

