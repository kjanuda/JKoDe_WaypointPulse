# Waypoint Pulse

**Plan. Explain. Deliver. Recover.**

Waypoint Pulse is an explainable and resilient delivery planning and execution platform developed by **Team JKoDe** for the **Tech-Triathlon 2026 Hackathon**.

The system connects the delivery workflow across four operational roles:

- Dispatcher
- Loader
- Driver
- Store Manager

The current implementation starts from the provided / seeded order dataset and supports the operational flow from **delivery planning through receipt confirmation**.

---

## 1. Project Overview

Waypoint Pulse helps Waypoint Group plan and execute daily deliveries while considering operational constraints such as:

- Vehicle capacity
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

The platform also explains why certain orders cannot be served and records them as explicit deferrals for dispatcher review.

---

## 2. Core Workflow

```text
Seeded Orders
      |
      v
Dispatcher
Generate delivery plan
      |
      v
Loader
Verify reverse-sequence loading
      |
      v
Vehicle Ready
      |
      v
Driver
Deliver route + Proof of Delivery
      |
      v
Store Manager
Confirm receipt
      |
      v
Delivery Loop Closed
```

---

## 3. Main Features

### Dispatcher Control Tower

The Dispatcher can:

- Generate a new delivery plan
- Review total orders
- Review served and deferred orders
- View assigned vehicles and trips
- Review route distance
- Review estimated fuel consumption
- Inspect individual trip stops
- Review explainable deferral reasons
- Re-plan when necessary

Example demo result for the provided scenario:

```text
Orders:      93
Served:      77
Deferred:    16
Trips:       22
Vehicles:    14
Distance:    2,570 km
Fuel:        432.8 L
```

### Loader Console

The Loader receives dispatcher-generated trips.

Features include:

- Assigned trip selection
- Vehicle and route information
- Weight and volume information
- Temperature requirement display
- Reverse-sequence loading
- Per-order load verification
- Shortfall recording
- Vehicle Ready confirmation

Reverse-sequence loading means that the final delivery stop is loaded first so that the first delivery is positioned closest to the vehicle door.

### Driver Route

The Driver interface is designed as a mobile-first experience.

Features include:

- Ready trip loading
- Ordered route stops
- Stop details
- Mark Arrived
- Proof of Delivery
- Receiver name
- Delivery notes
- Mark Delivered
- Trip progress
- Trip completion

---

## 4. Offline and Recovery Support

The Driver workflow includes offline recovery support.

The application stores the active route and pending driver actions in browser local storage.

When connectivity is unavailable:

```text
Driver Action
     |
     v
Stored Locally
     |
     v
Pending Sync Queue
     |
     v
Connection Restored
     |
     v
Actions Synced to API
```

This allows a driver who already loaded the route to continue recording delivery actions during temporary connectivity loss.

> **Note:** The current implementation provides application-level cached route and sync-queue recovery. It is not intended to be a full offline-installable PWA.

---

## 5. Store Manager

The Store Manager interface closes the delivery loop.

Features include:

- Search by outlet ID
- Outlet information
- Delivered order history
- Pending receipt count
- Delivery details
- Confirmed receiver information
- Receipt notes
- Receipt confirmation
- Receipt confirmation timestamp

Example:

```text
Driver marks delivery complete
        |
        v
Store Manager loads outlet
        |
        v
Pending Receipt
        |
        v
Confirm Receipt
        |
        v
Receipt Confirmed
```

---

## 6. Planning Engine

Waypoint Pulse uses a deterministic and explainable planning approach.

The planner follows a constrained greedy / best-fit allocation strategy.

Important planning rules include:

### Brand and District

A trip contains orders belonging to the same:

```text
Brand + District
```

### Temperature Rules

```text
Chilled order
    -> Reefer vehicle required

Ambient order
    -> Reefer or suitable non-reefer vehicle
```

### Van-only Orders

Orders marked as `van_only` must be allocated to an appropriate van.

### Capacity

For every trip:

```text
Total Trip Weight <= Vehicle Weight Capacity
```

and:

```text
Total Trip Volume <= Vehicle Volume Capacity
```

Orders are not split between vehicles.

### Maximum Trips

A vehicle can perform a maximum of:

```text
2 trips per day
```

subject to the available operating time.

### Fresh Operating Budget

Fresh operations use an operational time budget based on the morning delivery period. Planning feasibility uses the challenge trip-time calculation.

### Style and Tech Operating Budget

Style and Tech deliveries operate using the longer trading-day delivery budget.

---

## 7. Trip Time Calculation

The planner calculates operational trip time from:

```text
Outbound Travel
+
Inter-stop Travel
+
Handling / Service Time
```

Conceptually:

```text
Trip Minutes
=
Depot-to-District Travel
+
Inter-stop Time x (Number of Orders - 1)
+
Total Stop Handling Time
```

Waiting time and return-to-depot travel are not used as part of the official feasibility calculation.

Additional schedule timestamps are shown in the user interface to make trips easier for operations teams to understand.

---

## 8. Service Allowances

Handling time depends on:

```text
Brand
+
Dock Type
```

Seeded service allowance combinations include:

- **Fresh:** Rear, Street, Mall
- **Style:** Rear, Street, Mall
- **Tech:** Rear, Street, Mall

---

## 9. Explainable Deferrals

Orders that cannot be feasibly assigned are not silently removed. They are stored as explicit deferrals.

Examples of possible reasons include:

- `DISTRICT MISMATCH`
- `TEMPERATURE REQUIREMENT`
- `VAN REQUIRED`
- `CAPACITY LIMIT`
- `VEHICLE AVAILABILITY`
- `TIME BUDGET`
- `NO FEASIBLE VEHICLE`

The Dispatcher can review these reasons directly in the Control Tower.

---

## 10. Distance and Fuel

Waypoint Pulse displays estimated route distance and fuel usage.

The current implementation estimates trip distance using:

```text
Outbound Distance
+
Inter-stop Distance
+
Return Distance
```

Fuel usage is estimated using the vehicle's fuel efficiency:

```text
Fuel Used
=
Estimated Distance / Vehicle km-per-litre
```

This fuel calculation is an implementation assumption used to make the operational plan easier to evaluate.

---

## 11. Technology Stack

**Frontend**

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

**Backend**

- FastAPI
- Python 3.12
- SQLAlchemy
- Uvicorn

**Database**

- PostgreSQL 18

**Deployment / Local Environment**

- Docker
- Docker Compose

---

## 12. Project Structure

```text
JKoDe_WaypointPulse/
│
├── apps/
│   │
│   ├── web/
│   │   ├── app/
│   │   │   ├── dispatcher/
│   │   │   ├── loader/
│   │   │   ├── driver/
│   │   │   └── store/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── api/
│       ├── app/
│       │   ├── main.py
│       │   ├── database.py
│       │   ├── models/
│       │   ├── schemas/
│       │   ├── routers/
│       │   ├── services/
│       │   └── planner/
│       │
│       ├── scripts/
│       │   └── seed.py
│       │
│       ├── Dockerfile
│       ├── requirements.txt
│       └── .env.example
│
├── data/
│   └── seed/
│
├── docs/
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 13. Quick Start with Docker

Docker is the recommended way to run the full system.

### Prerequisites

Install:

- Docker Desktop
- Git

Docker Desktop must be running before starting the project.

### Step 1 — Clone the Repository

```bash
git clone <REPOSITORY_URL>
cd JKoDe_WaypointPulse
```

### Step 2 — Build and Start Containers

```bash
docker compose up --build -d
```

Check the containers:

```bash
docker compose ps
```

Expected services:

```text
waypoint_postgres
waypoint_api
waypoint_web
```

### Step 3 — Add the Competition Dataset

The competition-provided datasets are intentionally **not included in this repository**.

Before seeding the database, place the supplied dataset files inside:

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

Do not redistribute these competition-provided datasets publicly.

After the files are available, seed the database:

```bash
docker compose exec api python -m scripts.seed
```

Expected dataset summary:

```text
Outlets seeded: 120
Vehicles seeded: 60
Calendar rows seeded: 910
Orders seeded total: 92307
Service allowances seeded: 9
District travel rows seeded: 12
Vehicle availability rows seeded: 38
```

### Step 4 — Open the Application

| Page | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Dispatcher | http://localhost:3000/dispatcher |
| Loader | http://localhost:3000/loader |
| Driver | http://localhost:3000/driver |
| Store Manager | http://localhost:3000/store |
| FastAPI docs | http://localhost:8000/docs |
| Health endpoint | http://localhost:8000/health |

---

## 14. Demo Scenario

The primary demonstration date is:

```text
2025-10-02
```

Depot:

```text
Peliyagoda
```

The seeded demo day contains **93 orders**.

---

## 15. Judge Walkthrough

The following walkthrough demonstrates the main end-to-end system.

### Step 1 — Dispatcher

Open http://localhost:3000/dispatcher and generate a plan for `2025-10-02`.

Review:

- Orders
- Served
- Deferred
- Trips
- Distance
- Fuel

Expand trips to inspect individual stops. Review the **Explainable Deferrals** panel to see why unallocated orders were deferred.

### Step 2 — Loader

Open http://localhost:3000/loader and select an assigned trip.

Review:

- Vehicle
- Trip
- Brand
- District
- Weight
- Volume
- Stops
- Temperature requirement

Verify every load item. The list is shown in reverse loading order. When every item is verified, **Vehicle Ready** becomes available. Mark the vehicle ready for dispatch.

### Step 3 — Driver

Open http://localhost:3000/driver. The Driver receives a ready trip.

1. Select a route stop.
2. Click **Mark Arrived**.
3. Enter Proof of Delivery information (Receiver Name, Delivery Note).
4. Click **Mark Delivered**.
5. Repeat until all stops are complete.
6. Click **Complete Trip**.

### Step 4 — Offline Recovery Test

While the Driver route is already loaded:

1. Open browser developer tools.
2. Change the network to **Offline**.
3. Perform a supported driver action.
4. Observe the pending sync queue.
5. Restore the network.
6. The queued action is synchronized with the backend.

This demonstrates recovery from temporary network connectivity failure.

### Step 5 — Store Manager

Open http://localhost:3000/store.

1. Enter the outlet ID for a delivered order (example: `OUT004`).
2. Click **Load Outlet**.
3. Review the delivered order.
4. If the receipt is pending, enter **Confirmed By** and **Receipt Note**.
5. Click **Confirm Receipt**.

The delivery lifecycle is now closed.

---

## 16. API Overview

The FastAPI backend exposes endpoints for the main operational areas:

- `/api/planner`
- `/api/loader`
- `/api/driver`
- `/api/store`

Interactive API documentation is available at http://localhost:8000/docs.

---

## 17. Environment Variables

Example backend environment configuration:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/waypoint_pulse
```

Docker Compose automatically provides the internal database connection:

```text
postgresql://postgres:postgres@db:5432/waypoint_pulse
```

Example frontend environment configuration:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Inside the provided Docker setup the browser accesses the exposed API through `http://localhost:8000`.

> Real credentials and local `.env` files must not be committed to source control.

---

## 18. Database

Main tables include:

- `calendar_days`
- `deferrals`
- `district_travel`
- `orders`
- `outlets`
- `plans`
- `service_allowances`
- `trip_stops`
- `trips`
- `users`
- `vehicle_availability`
- `vehicles`

---

## 19. Seeded Reference Data

The system seeds:

- 120 outlets
- 60 vehicles
- 910 calendar rows
- 92,307 historical orders
- 9 service allowance records
- 12 district travel records
- 38 peak-day vehicle availability records

These records are used by the planning engine to construct and validate delivery plans.

---

## 20. Data Persistence

PostgreSQL data is stored using a Docker named volume: `waypoint_postgres_data`.

Normal container shutdown does not remove the database.

To stop the application:

```bash
docker compose down
```

To remove the containers and database volume:

```bash
docker compose down -v
```

> **Warning:** `docker compose down -v` removes the Docker PostgreSQL database and requires the seed command to be run again.

---

## 21. Restarting the Application

If the database has already been seeded:

```bash
docker compose up -d
```

No reseeding is required unless the database volume was removed.

---

## 22. Troubleshooting

### Docker Engine Not Running

If Docker reports `failed to connect to the docker API`, start Docker Desktop and verify:

```bash
docker info
```

### Port Already in Use

Check:

```bash
netstat -ano | findstr :3000
netstat -ano | findstr :8000
```

Stop any locally running Next.js or FastAPI development servers before starting Docker.

### Empty Loader or Store Page

If the Loader reports `No load plan available`, or an outlet cannot be found, verify that the database has been seeded:

```bash
docker compose exec api python -m scripts.seed
```

After seeding, generate a delivery plan from the Dispatcher interface.

### View Logs

```bash
# All services
docker compose logs

# API only
docker compose logs api

# Web only
docker compose logs web

# Database only
docker compose logs db

# Follow logs continuously
docker compose logs -f
```

---

## 23. Design Principles

Waypoint Pulse is built around four principles:

- **Plan** — Build feasible delivery plans using operational constraints.
- **Explain** — Clearly communicate why an order was served or deferred.
- **Deliver** — Connect dispatcher, loader and driver operations.
- **Recover** — Allow delivery activity to continue through temporary connectivity problems.

---

## 24. Current Scope

The current prototype includes:

- Dispatcher delivery planning
- Constraint validation
- Explainable deferrals
- Loader verification
- Vehicle-ready workflow
- Driver route execution
- Proof of Delivery
- Offline driver action queue
- Synchronization recovery
- Store receipt confirmation
- Docker-based reproducible setup

Orders used in the demonstration are currently loaded from the supplied seeded dataset. Interactive creation of brand-new store orders is outside the current implemented prototype flow.

---

## 25. Future Improvements

Potential future improvements include:

- Store-side new order creation
- Authentication and role-based access control
- Full installable PWA support
- Advanced route optimization
- Real road routing API integration
- Live GPS tracking
- Push notifications
- Automatic dispatch alerts
- Operational analytics
- Real-time vehicle telemetry
- Advanced demand forecasting

---

## 26. Team

- **Team:** JKoDe
- **Project:** Waypoint Pulse
- **Competition:** Tech-Triathlon 2026
- **Concept:** Plan. Explain. Deliver. Recover.

### Final Demo Flow

```text
Dispatcher
    ↓
Generate Plan
    ↓
Loader
    ↓
Verify Load
    ↓
Vehicle Ready
    ↓
Driver
    ↓
Arrive + Deliver + POD
    ↓
Store Manager
    ↓
Confirm Receipt
    ↓
Delivery Complete
```

---

**Waypoint Pulse — Explainable logistics from planning to proof of delivery.**