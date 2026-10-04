# Waypoint Pulse

**Plan. Explain. Deliver. Recover.**

Waypoint Pulse is an explainable and resilient delivery planning and execution platform developed by **Team JKoDe** for the **Tech-Triathlon 2026 Hackathon**.

It connects the delivery workflow across four operational roles: **Dispatcher**, **Loader**, **Driver** and **Store Manager**, from delivery planning through to receipt confirmation.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Workflow](#2-core-workflow)
3. [Judge Quick Start](#3-judge-quick-start)
4. [Judge Walkthrough](#4-judge-walkthrough)
5. [Main Features](#5-main-features)
6. [Offline and Recovery Support](#6-offline-and-recovery-support)
7. [Planning Engine](#7-planning-engine)
8. [Explainable Deferrals](#8-explainable-deferrals)
9. [Distance and Fuel](#9-distance-and-fuel)
10. [Authentication and Security](#10-authentication-and-security)
11. [Architecture](#11-architecture)
12. [Technology Stack](#12-technology-stack)
13. [Project Structure](#13-project-structure)
14. [Database and Seeded Data](#14-database-and-seeded-data)
15. [Environment Variables](#15-environment-variables)
16. [Operating the Stack](#16-operating-the-stack)
17. [Troubleshooting](#17-troubleshooting)
18. [Significant Changes Since Day 5 Design](#18-significant-changes-since-day-5-design)
19. [Current Scope and Future Improvements](#19-current-scope-and-future-improvements)
20. [Documentation](#20-documentation)
21. [Team](#21-team)

---

## 1. Project Overview

Waypoint Pulse helps Waypoint Group plan and execute daily deliveries while respecting operational constraints:

- Vehicle capacity (weight and volume)
- Vehicle temperature capability
- Chilled and ambient products
- Van-only outlet restrictions
- Depot assignment
- Brand separation
- District routing
- Delivery windows
- Vehicle availability
- Maximum trips per vehicle
- Trip time limits
- Fuel and distance estimates

Orders that cannot be served are never silently dropped. They are recorded as **explicit deferrals with reasons** for dispatcher review.

**Demo result for the provided scenario (2025-10-02, Peliyagoda depot):**

```text
Orders:      93
Served:      77
Deferred:    16
Trips:       22
Vehicles:    14
Distance:    2,570 km
Fuel:        432.8 L
```

---

## 2. Core Workflow

```mermaid
flowchart TD
    A[Seeded Orders] --> B[Dispatcher<br/>Generate delivery plan]
    B --> C[Loader<br/>Verify reverse-sequence loading]
    C --> D[Vehicle Ready]
    D --> E[Driver<br/>Deliver route + Proof of Delivery]
    E --> F[Store Manager<br/>Confirm receipt]
    F --> G[Delivery Loop Closed]
```

---

## 3. Judge Quick Start

The full stack runs locally with Docker Compose.

### Prerequisites

- Docker Desktop (must be running)
- Git

### Step 1: Clone the repository

```bash
git clone <REPOSITORY_URL>
cd JKoDe_WaypointPulse
```

### Step 2: Configure environment

Create a `.env` file in the repository root from `.env.example`:

```bash
cp .env.example .env        # macOS / Linux / Git Bash
copy .env.example .env      # Windows CMD
```

Generate a strong secret and set it in `.env`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

```env
JWT_SECRET_KEY=your_secure_random_secret
```

### Step 3: Provide the challenge datasets

The competition-provided datasets are intentionally **not included** in this repository. Place the supplied files in:

```text
data/seed/
```

Expected files:

```text
calendar.csv
deliveries_train.csv
district_travel.csv
outlets.csv
service_allowance.csv
task2b_peak_day_fleet.csv
vehicles.csv
```

> Do not redistribute the competition-provided datasets publicly.

### Step 4: Start the full stack

From the repository root:

```bash
docker compose up --build
```

(Add `-d` to run in the background.) Docker Compose will:

1. Start PostgreSQL.
2. Wait until PostgreSQL is healthy.
3. Create the required database tables.
4. Seed the challenge data on a fresh database.
5. Seed the four demo role accounts.
6. Start the FastAPI backend.
7. Start the Next.js frontend.

Verify the containers:

```bash
docker compose ps
```

Expected services: `waypoint_postgres`, `waypoint_api`, `waypoint_web`.

### Step 5: Open the application

| Page | URL |
|---|---|
| Frontend | http://localhost:3000 |
| **Login** | http://localhost:3000/login |
| Dispatcher | http://localhost:3000/dispatcher |
| Loader | http://localhost:3000/loader |
| Driver | http://localhost:3000/driver |
| Store Manager | http://localhost:3000/store |
| API documentation | http://localhost:8000/docs |
| Health endpoint | http://localhost:8000/health |

### Seeded Judge Accounts

| Role | Email | Password |
|---|---|---|
| Dispatcher | `dispatcher@waypoint.demo` | `Dispatcher@2026!` |
| Loader | `loader@waypoint.demo` | `Loader@2026!` |
| Driver | `driver@waypoint.demo` | `Driver@2026!` |
| Store Manager | `store@waypoint.demo` | `Store@2026!` |

Each account is restricted to its assigned operational role. These are demonstration credentials for judging only.

---

## 4. Judge Walkthrough

**Demo date:** `2025-10-02` · **Depot:** `Peliyagoda` · **Seeded demo orders:** 93

### Step 1: Dispatcher

1. Sign in with the Dispatcher account and open the **Control Tower**.
2. Select the planning date (`2025-10-02`) and depot.
3. **Generate** a delivery plan.
4. Review: orders, served, deferred, trips, vehicles, distance, fuel, vehicle allocation, trip schedules and capacity usage.
5. Expand trips to inspect individual stops.
6. Review the **Explainable Deferrals** panel to see why unallocated orders were deferred.

### Step 2: Loader

1. Sign out, then sign in with the Loader account.
2. Select a planned trip and review vehicle, brand, district, weight, volume, stops and temperature requirement.
3. Review the **reverse-sequence loading plan** (last stop is loaded first).
4. Verify each load item. Record a shortfall if necessary.
5. When every item is verified, **Vehicle Ready** becomes available. Mark the trip Ready.

### Step 3: Driver

1. Sign in with the Driver account and open a Ready trip.
2. Select a route stop and click **Mark Arrived**.
3. Enter Proof of Delivery (Receiver Name, Delivery Note).
4. Click **Mark Delivered**.
5. Repeat for all stops, then click **Complete Trip**.

### Step 4: Offline recovery test

While the Driver route is already loaded:

1. Open browser developer tools.
2. Set the network to **Offline**.
3. Perform a supported driver action.
4. Observe the **pending sync queue**.
5. Restore the network.
6. The queued action is synchronized with the backend.

### Step 5: Store Manager

1. Sign in with the Store Manager account and open the store page.
2. Enter the outlet ID of a delivered order (example: `OUT004`) and click **Load Outlet**.
3. Review delivered and pending deliveries.
4. If a receipt is pending, enter **Confirmed By** and **Receipt Note**, then click **Confirm Receipt**.

The delivery lifecycle is now closed.

---

## 5. Main Features

### Dispatcher Control Tower

- Generate a new delivery plan
- Review total, served and deferred orders
- View assigned vehicles and trips
- Review route distance and estimated fuel consumption
- Inspect individual trip stops
- Review explainable deferral reasons
- Re-plan when necessary

### Loader Console

- Assigned trip selection
- Vehicle and route information
- Weight, volume and temperature requirement display
- Reverse-sequence loading
- Per-order load verification
- Shortfall recording
- Vehicle Ready confirmation

> **Reverse-sequence loading:** the final delivery stop is loaded first, so the first delivery sits closest to the vehicle door.

### Driver Route (mobile-first)

- Ready trip loading
- Ordered route stops and stop details
- Mark Arrived
- Proof of Delivery (receiver name, delivery notes)
- Mark Delivered
- Trip progress and trip completion

### Store Manager

- Search by outlet ID and view outlet information
- Delivered order history and pending receipt count
- Delivery details and confirmed receiver information
- Receipt notes, receipt confirmation and confirmation timestamp

---

## 6. Offline and Recovery Support

The Driver workflow stores the active route and pending driver actions in browser local storage.

```mermaid
flowchart TD
    A[Driver Action] --> B[Stored Locally]
    B --> C[Pending Sync Queue]
    C --> D[Connection Restored]
    D --> E[Actions Synced to API]
```

This lets a driver who has already loaded the route keep recording delivery actions during temporary connectivity loss.

> **Note:** The current implementation provides application-level cached route and sync-queue recovery. It is not a full offline-installable PWA.

---

## 7. Planning Engine

Waypoint Pulse uses a **deterministic and explainable** planning approach: a constrained greedy / best-fit allocation strategy. Generated plans are persisted to PostgreSQL and then consumed by the Loader and Driver workflows.

### Planning rules

| Rule | Description |
|---|---|
| Brand + District | A trip contains orders of the same **Brand + District** only |
| Chilled orders | Require a **reefer** vehicle |
| Ambient orders | May use a reefer or a suitable non-reefer vehicle |
| Van-only orders | Orders marked `van_only` must be allocated to an appropriate van |
| Weight capacity | Total trip weight ≤ vehicle weight capacity |
| Volume capacity | Total trip volume ≤ vehicle volume capacity |
| No order splitting | An order is never split between vehicles |
| Max trips | Maximum **2 trips per vehicle per day**, subject to available operating time |
| Depot | Orders are planned for the selected depot |
| Availability | Only vehicles available on the planning date are used |

### Operating budgets

- **Fresh:** an operational time budget based on the morning delivery period. Feasibility uses the challenge trip-time calculation.
- **Style and Tech:** the longer trading-day delivery budget.

### Trip time calculation

```text
Trip Minutes
  = Depot-to-District Travel
  + Inter-stop Time x (Number of Orders - 1)
  + Total Stop Handling Time
```

Waiting time and return-to-depot travel are **not** part of the official feasibility calculation. Additional schedule timestamps are shown in the UI to make trips easier for operations teams to follow.

### Service allowances

Handling time depends on **Brand + Dock Type**. Seeded combinations (9 total):

- **Fresh:** Rear, Street, Mall
- **Style:** Rear, Street, Mall
- **Tech:** Rear, Street, Mall

---

## 8. Explainable Deferrals

Orders that cannot be feasibly assigned are stored as explicit deferrals and shown in the Control Tower. Possible reasons include:

- `DISTRICT MISMATCH`
- `TEMPERATURE REQUIREMENT`
- `VAN REQUIRED`
- `CAPACITY LIMIT`
- `VEHICLE AVAILABILITY`
- `TIME BUDGET`
- `NO FEASIBLE VEHICLE`

---

## 9. Distance and Fuel

Estimated trip distance:

```text
Outbound Distance + Inter-stop Distance + Return Distance
```

Estimated fuel usage:

```text
Fuel Used = Estimated Distance / Vehicle km-per-litre
```

> The distance (including return leg) and fuel calculation are implementation assumptions used to make plans easier to evaluate. They are separate from the official feasibility calculation in section 7.

---

## 10. Authentication and Security

Waypoint Pulse implements secure role-based authentication:

- Argon2 password hashing
- Short-lived JWT access tokens
- Opaque refresh tokens stored only as hashes in the database
- HttpOnly refresh-token cookies
- Refresh-token rotation
- Refresh-session revocation
- Logout and logout-all support
- Backend role-based access control (RBAC)
- Frontend role guards
- Automatic session restoration after browser refresh

Access tokens are kept in frontend memory rather than persistent browser storage.

**Role isolation (enforced on the backend):**

| Role | Permitted operations |
|---|---|
| Dispatcher | Planning and dashboard operations |
| Loader | Loading verification and Ready-state operations |
| Driver | Arrival, delivery and trip-completion operations |
| Store Manager | Store-delivery and receipt-confirmation operations |

Frontend guards improve user experience; backend RBAC is the actual authorization boundary.

**Authentication flow:**

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web App
    participant API as FastAPI
    participant DB as PostgreSQL

    U->>W: Email + Password
    W->>API: POST /api/auth/login
    API->>DB: Verify user + Argon2 password
    API-->>W: JWT access token
    API-->>W: HttpOnly refresh cookie

    W->>API: Authenticated API request
    API->>API: Validate JWT + role
    API-->>W: Protected response

    W->>API: POST /api/auth/refresh
    API->>DB: Rotate refresh session
    API-->>W: New access token
```

---

## 11. Architecture

```mermaid
flowchart LR
    U[Users] --> W[Next.js Web App]
    W --> A[FastAPI Backend]
    A --> P[Planning Engine]
    A --> AU[Authentication & RBAC]
    A --> DB[(PostgreSQL)]
    P --> DB
    D[Challenge Seed Data] --> S[Seed Process]
    S --> DB
```

The planning engine consumes orders, outlets, vehicles, service allowances, district travel, calendar data and fleet availability. The API exposes these groups of endpoints:

- `/api/auth`
- `/api/planner`
- `/api/loader`
- `/api/driver`
- `/api/store`

Interactive documentation: http://localhost:8000/docs. See [`docs/architecture.md`](docs/architecture.md) for more detail.

---

## 12. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.12, SQLAlchemy, Uvicorn |
| Database | PostgreSQL 18 |
| Authentication | Argon2, JWT access tokens, opaque refresh tokens, HttpOnly cookies |
| Infrastructure | Docker, Docker Compose |

---

## 13. Project Structure

```text
JKoDe_WaypointPulse/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── login/
│   │   │   ├── dispatcher/
│   │   │   ├── loader/
│   │   │   ├── driver/
│   │   │   └── store/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── .env.example
│   └── api/
│       ├── app/
│       │   ├── main.py
│       │   ├── database.py
│       │   ├── models/
│       │   ├── schemas/
│       │   ├── routers/
│       │   ├── services/
│       │   └── planner/
│       ├── scripts/
│       │   └── seed.py
│       ├── Dockerfile
│       ├── requirements.txt
│       └── .env.example
├── data/
│   └── seed/                 # place challenge datasets here (not committed)
├── docs/
│   ├── architecture.md
│   ├── data-model.md
│   └── ai-disclosure.md
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 14. Database and Seeded Data

**Main tables:**

`users`, `auth_sessions`, `outlets`, `vehicles`, `orders`, `calendar_days`, `service_allowances`, `district_travel`, `vehicle_availability`, `plans`, `trips`, `trip_stops`, `deferrals`.

**Fresh installation seeds:**

```text
Users:                 4
Outlets:               120
Vehicles:              60
Calendar rows:         910
Orders:                92,307
Service allowances:    9
District travel rows:  12
Vehicle availability:  38
```

On a clean PostgreSQL volume, the tables are created automatically and then seeded. On subsequent startups, existing orders are detected and the large order dataset is skipped to reduce startup time.

See [`docs/data-model.md`](docs/data-model.md) for the entity relationships.

---

## 15. Environment Variables

**Repository root `.env`:**

```env
JWT_SECRET_KEY=replace_with_a_long_random_secret
```

**Backend (local, non-Docker run):**

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/waypoint_pulse
```

Docker Compose provides the internal database connection automatically:

```text
postgresql://postgres:postgres@db:5432/waypoint_pulse
```

**Frontend:**

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Inside the provided Docker setup, the browser reaches the API through `http://localhost:8000`.

> Real credentials and local `.env` files must never be committed to source control.

---

## 16. Operating the Stack

| Task | Command |
|---|---|
| First start / rebuild | `docker compose up --build` |
| Restart (already seeded) | `docker compose up -d` |
| Stop (data preserved) | `docker compose down` |
| Stop and **delete database** | `docker compose down -v` |

PostgreSQL data lives in the Docker named volume `waypoint_postgres_data`. Normal shutdown does not remove it.

> **Warning:** `docker compose down -v` deletes the database volume. The next `docker compose up --build` will recreate and reseed everything, so the dataset files must still be present in `data/seed/`.

---

## 17. Troubleshooting

**Docker engine not running** (`failed to connect to the docker API`): start Docker Desktop, then verify with `docker info`.

**Port already in use:** stop any local Next.js or FastAPI dev servers, then check the ports.

```bash
netstat -ano | findstr :3000     # Windows
netstat -ano | findstr :8000
```

**Login fails or the app refuses to start:** confirm `.env` exists in the repository root and `JWT_SECRET_KEY` is set.

**Empty Loader/Store page** (`No load plan available`, or outlet not found): the database may not be seeded, or no plan has been generated yet.

1. Confirm the dataset files are in `data/seed/`.
2. As a fallback, run the seed manually:
   ```bash
   docker compose exec api python -m scripts.seed
   ```
3. Sign in as Dispatcher and generate a delivery plan.

**View logs:**

```bash
docker compose logs            # all services
docker compose logs api        # API only
docker compose logs web        # web only
docker compose logs db         # database only
docker compose logs -f         # follow continuously
```

---

## 18. Significant Changes Since Day 5 Design

The implementation evolved beyond the initial design prototype:

- Replaced static prototype data with a PostgreSQL-backed operational system
- Added deterministic delivery-plan generation and persistence
- Added capacity, temperature, vehicle-access and time-budget constraints
- Added explicit order deferral reasons
- Added fuel and distance estimation
- Added Loader verification and Ready-state workflow
- Added Driver proof of delivery
- Added offline-first Driver queueing and synchronization
- Added Store Manager receipt confirmation
- Added secure multi-role authentication
- Added backend role-based access control
- Added Dockerized database, API and frontend services
- Added automatic clean-database table creation and dataset seeding

---

## 19. Current Scope and Future Improvements

**Current prototype includes:** dispatcher planning, constraint validation, explainable deferrals, loader verification, vehicle-ready workflow, driver route execution, proof of delivery, offline action queue and sync recovery, store receipt confirmation, role-based authentication, and a Docker-based reproducible setup.

Orders in the demonstration come from the supplied seeded dataset. Interactive creation of new store orders is outside the current prototype flow.

**Potential future improvements:**

- Store-side new order creation
- Full installable PWA support
- Advanced route optimization
- Real road-routing API integration
- Live GPS tracking
- Push notifications and automatic dispatch alerts
- Operational analytics
- Real-time vehicle telemetry
- Advanced demand forecasting

---

## 20. Documentation

Additional technical documentation:

- [`docs/architecture.md`](docs/architecture.md): system architecture and flows
- [`docs/data-model.md`](docs/data-model.md): database entities and relationships
- [`docs/ai-disclosure.md`](docs/ai-disclosure.md): AI tool usage disclosure

---

## 21. Team

- **Team:** JKoDe
- **Solution:** Waypoint Pulse
- **Competition:** Tech-Triathlon 2026
- **Tagline:** Plan. Explain. Deliver. Recover.

---

**Waypoint Pulse: Explainable logistics from planning to proof of delivery.**