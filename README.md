#  Dyno Forms

> **Enterprise Schema-Driven Drag-and-Drop Form Builder, Headless SSR/CSR Runtime, and AI Document Ingestion Engine.**

Dyno Forms is an open-architecture, high-performance form platform built with **Next.js 15 (App Router)**, **React 19**, **TypeScript**, **@dnd-kit**, **Zustand + Immer**, and **TanStack Query**. It is 100% containerized with Docker for development, mock services, and production.

---

## Key Features

- **Nested Drag-and-Drop Canvas:** Construct arbitrary layouts (Sections $\rightarrow$ Grids/Rows $\rightarrow$ Columns $\rightarrow$ Form Controls) powered by `@dnd-kit` with depth-aware collision detection that prevents parent-shadowing.
- **Dynamic REST/GraphQL API Integration:** Wire external endpoints directly into dropdowns, radio groups, and multi-selects with automatic TanStack Query caching, deduplication, and nested dot-path extraction (`dataArrayPath`, `labelPath`, `valuePath`).
- **Cascading Field Dependencies:** Child fields (e.g. State) automatically listen to parent values (e.g. Country) and dynamically re-query with parameter bindings.
- **Hybrid SSR & CSR Performance:** Published forms pre-render on the server for sub-100ms load times and SEO, while the visual builder runs at 60fps on the client.
- **Auto-Save & "Save and Continue Later":** Local debounced IndexedDB persistence prevents lost progress on refresh; server-side draft API issues bookmarkable resume tokens.
- **AI Document Ingestion (PDF / Image $\rightarrow$ Dyno Form):** Converts legacy paper forms, scanned documents, and PDFs into structured Dyno forms using Multimodal Vision AI (with an offline mock fallback).
- **100% Dockerized:** Multi-container development with hot-reloading (`Dockerfile.dev`), standalone production runner (`Dockerfile.prod`), and an offline mock API service.

---

## Access Control & Feature Flagging (Public vs. Internal Features)

Although this repository can be public on Git, **you can selectively gate advanced or internal features** (such as AI Form Conversion, custom enterprise webhooks, or private schemas) using environment-level feature flags or authentication layers:

### Available Feature Flags (`.env`):
```bash
# Enable or disable the AI Document Ingestion engine
NEXT_PUBLIC_FEATURE_AI_CONVERTER=true

# Enable or disable dynamic REST API lookup inspector
NEXT_PUBLIC_FEATURE_DYNAMIC_APIS=true

# Enable or disable draft auto-save and remote resume links
NEXT_PUBLIC_FEATURE_DRAFT_AUTOSAVE=true
```

When a flag is set to `false`, the corresponding UI controls, routes, and API handlers are disabled and hidden from the public interface. In a later phase, this can be connected to role-based access control (RBAC) or session authentication (e.g., NextAuth / Clerk).

---

##  Step-by-Step Quickstart

You can run Dyno Forms in two ways:
1. **Option A: With Docker & Docker Compose (Recommended)** — Runs the Next.js app and the companion Mock API server in isolated containers.
2. **Option B: Locally on Host with Node.js** — Fast local execution if you prefer running without Docker.

---

### Option A: Running with Docker (Recommended)

#### Prerequisites:
- [Docker Engine & Docker Compose](https://docs.docker.com/get-docker/) installed.
- *If using Windows with WSL 2:* Ensure Docker Desktop WSL 2 integration is activated:
  1. Open **Docker Desktop** on Windows.
  2. Go to **Settings (gear icon)** $\rightarrow$ **Resources** $\rightarrow$ **WSL Integration**.
  3. Toggle **Enable integration with my default WSL distro** (and enable for your specific distro).
  4. Click **Apply & Restart**.

#### 1. Clone & Enter Directory
```bash
git clone https://github.com/abenjiro/dyno-forms.git
cd dyno-forms
```

#### 2. Start the Development Stack
```bash
# Start both Next.js app (port 3050) and Mock API (port 4050)
docker compose up --build
```
*(Or use `make dev`)*

#### 3. Access the Applications
-  **Dyno Forms App:** [http://localhost:3050](http://localhost:3050)
  - Visual Builder: [http://localhost:3050/builder](http://localhost:3050/builder)
  - Form Runtime Demo: [http://localhost:3050/f/demo](http://localhost:3050/f/demo)
  - AI Form Converter: [http://localhost:3050/convert](http://localhost:3050/convert)
-  **Mock API Server:** [http://localhost:4050](http://localhost:4050)
  - Mock Health Check: [http://localhost:4050/health](http://localhost:4050/health)
  - Countries API: [http://localhost:4050/api/countries](http://localhost:4050/api/countries)
  - Cascading States API: [http://localhost:4050/api/states?country=US](http://localhost:4050/api/states?country=US)

#### 4. Stop Containers
```bash
docker compose down
# (or make stop)
```

---

### Option B: Running Locally on Host (Node.js 20+)

#### Prerequisites:
- Node.js `v20+` or `v22+`
- npm `v10+`

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Start the Mock API Service (Terminal 1)
```bash
node docker/mock-server/server.js
# (or make local-mock)
```
*Output: `[Dyno Mock API Server] running on http://0.0.0.0:4050`*

#### 3. Start the Next.js Development Server (Terminal 2)
```bash
npm run dev
# (or make local-dev)
```
*Output: `▲ Next.js 15... Ready in http://localhost:3050`*

#### 4. Open Browser
Visit [http://localhost:3050](http://localhost:3050).

---

## Production Deployment

### Test Production Standalone Container Locally
Dyno Forms includes an optimized multi-stage production Dockerfile (`docker/Dockerfile.prod`) using Next.js standalone output and an unprivileged `nextjs` system user:

```bash
# Build and run production image on port 8080
docker compose -f docker-compose.prod.yml up --build
# (or make prod)
```
Then visit [http://localhost:8080](http://localhost:8080).

---

## Project Structure

```
dyno-forms/
├── .env.example              # Environment variables and feature flags template
├── Makefile                  # Developer shortcut commands (make dev, make prod)
├── README.md                 # Project documentation
├── antigravity.md            # Master architectural specification & roadmap
├── dyno.md                   # Initial project requirements
├── docker-compose.yml        # Development multi-container orchestration
├── docker-compose.prod.yml   # Production standalone container orchestration
├── package.json              # Project dependencies & npm scripts
├── tsconfig.json             # Strict TypeScript configuration
├── next.config.ts            # Next.js 15 standalone output configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── postcss.config.mjs        # PostCSS configuration
│
├── docker/
│   ├── Dockerfile.dev        # Development container with hot-reloading
│   ├── Dockerfile.prod       # Multi-stage production container (~120MB)
│   └── mock-server/          # Offline mock API for dynamic form tests
│       ├── Dockerfile
│       ├── server.js         # HTTP server with CORS & health checks
│       └── data/             # Realistic fixtures (countries, states, industries)
│
└── src/
    ├── types/
    │   └── schema.ts         # AST TypeScript interfaces (FormSchema, Nodes)
    ├── data/
    │   └── initialSchema.ts  # Preloaded sample enterprise form schema
    ├── components/
    │   └── providers/
    │       └── QueryProvider.tsx # TanStack Query Provider wrapper
    └── app/
        ├── layout.tsx        # Next.js root layout
        ├── page.tsx          # Interactive home landing page
        └── globals.css       # Tailwind directives & DnD indicators
```

---

## Available Developer Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server locally |
| `npm run build` | Create production Next.js build |
| `npm run typecheck` | Run strict TypeScript validation (`tsc --noEmit`) |
| `make dev` | Start development stack with Docker Compose |
| `make prod` | Build and run production standalone container |
| `make stop` | Stop all Docker containers |
| `make local-mock` | Run mock API server locally |

---

