# Waypoint Pulse — System Architecture

Waypoint Pulse is a role-based logistics planning and execution platform connecting Dispatcher, Loader, Driver and Store Manager workflows.

## High-Level Architecture

```mermaid
flowchart LR
    U["Users"] --> W["Next.js Web App"]

    W --> A["FastAPI Backend"]

    A --> P["Planning Engine"]
    A --> AU["Authentication & RBAC"]
    A --> DB[("PostgreSQL")]

    P --> DB

    D["Challenge Seed Data"] --> S["Seed Process"]
    S --> DB

    subgraph Roles["Roles"]
        R1["Dispatcher"]
        R2["Loader"]
        R3["Driver"]
        R4["Store Manager"]
    end

    R1 --> W
    R2 --> W
    R3 --> W
    R4 --> W
```

## Technology Stack

**Frontend**
- Next.js
- React
- TypeScript
- Tailwind CSS

**Backend**
- FastAPI
- SQLAlchemy
- Python

**Database**
- PostgreSQL

**Authentication**
- Argon2 password hashing
- JWT access tokens
- Opaque refresh tokens
- HttpOnly refresh-token cookies
- Refresh-token rotation
- Role-based access control

**Infrastructure**
- Docker
- Docker Compose

## Operational Flow

```mermaid
flowchart LR
    O["Orders"] --> DP["Dispatcher Planning"]
    DP --> GP["Generated Delivery Plan"]
    GP --> L["Loader"]
    L --> TR["Trip Ready"]
    TR --> DR["Driver"]
    DR --> POD["Proof of Delivery"]
    POD --> SM["Store Manager"]
    SM --> RC["Receipt Confirmation"]
```

## Planning Flow

The planning engine receives orders, outlets, vehicles, service allowances, district travel information, calendar data and fleet availability.

It applies constraints including:

- vehicle capacity
- volume capacity
- chilled requirements
- van-only access
- depot
- district
- vehicle trip limits
- operational time budgets
- order prioritization
- explicit deferral logic

The generated plan is persisted to PostgreSQL and then consumed by Loader and Driver workflows.

## Offline Driver Workflow

The Driver interface keeps required trip state locally.

If connectivity is unavailable:

1. delivery actions are queued locally
2. the Driver can continue the workflow
3. queued changes remain available
4. the application synchronizes queued actions when connectivity is restored

## Authentication Flow

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

## Role Isolation

Role-specific API operations are protected on the backend.

Examples:

- Dispatcher → planning and dashboard operations
- Loader → loading verification and Ready-state operations
- Driver → arrival, delivery and trip-completion operations
- Store Manager → store-delivery and receipt-confirmation operations

Frontend guards improve user experience, while backend RBAC provides the actual authorization boundary.