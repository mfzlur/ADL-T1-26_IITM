## ♟ Chess Masterclass & Coaching Arena

A role-based, full-stack web platform that connects chess coaches with students through structured, capacity-limited masterclasses. Coaches publish sessions, players enroll, and admins oversee the ecosystem — all enforced through JWT-based RBAC at both API and UI levels.

## Table of Contents

*   [Overview](#overview)
*   [Features](#features)
*   [Tech Stack](#tech-stack)
*   [Architecture](#architecture)
*   [Database Schema](#database-schema)
*   [Project Structure](#project-structure)
*   [Getting Started](#getting-started)
*   [Environment Variables](#environment-variables)
*   [API Reference](#api-reference)
*   [Role-Based Access](#role-based-access)
*   [Feature Status](#feature-status)

## Overview

**Problem:** The chess community lacks structured, cohort-based learning. Existing platforms (YouTube, chess.com, lichess) are passive and offer no accountability between coaches and students.

**Solution:** Chess Arena creates a capacity-controlled, mentor-led environment where:

*   Coaches publish structured masterclasses with seat limits
*   Players discover, enroll in, and review classes
*   Admins approve coaches and moderate content
*   The system enforces business rules at both API and database layers

## Features

| # | Feature | Description |
| --- | --- | --- |
| 1 | **Multi-role System** | Admin / Coach / Player with JWT-encoded roles and RBAC middleware |
| 2 | **Masterclass CRUD** | Coaches create, edit, and delete their own classes with ownership enforcement |
| 3 | **JWT Authentication** | Stateless auth with role in payload; every protected route validates token + role |
| 4 | **Role Dashboards** | Three completely separate dashboards — no cross-role data leakage |
| 5 | **Enrollment + Capacity** | Transaction-safe enrollment; active if seats available, waitlisted if full |
| 6 | **Advanced Search** | Keyword, category, availability, date range, sort, and pagination |
| 7 | **Review System** | Players rate and review coaches after attending a masterclass |
| 8 | **Waitlist Auto-Promotion** | When a player cancels, the first waitlisted player is promoted automatically |
| 9 | **File Upload** | Coaches upload PGN files or board images (max 10MB) via Multer |
| 10 | **Analytics Dashboard** | Coaches view enrollment trends, fill rates, and category breakdowns via Chart.js |

## Tech Stack

| Technology | Role | Reason |
| --- | --- | --- |
| **React 18** | Frontend SPA | Component-based, role-aware dashboard rendering |
| **TypeScript** | Full-stack language | Type safety across entities, services, and API contracts |
| **Vite** | Frontend build tool | Fast HMR, optimised production build |
| **Tailwind CSS** | UI styling | Utility-first, consistent dark theme across all dashboards |
| **React Router v6** | Frontend routing | Protected routes with role-based redirects |
| **Axios** | HTTP client | Interceptors auto-attach JWT headers on every request |
| **Chart.js + react-chartjs-2** | Analytics charts | Bar, line, and doughnut charts for coach analytics |
| **Express** | REST API server | Lightweight, middleware-based routing |
| **PostgreSQL** | Primary database | ACID-compliant; enforces referential integrity across all entities |
| **TypeORM** | ORM | Entity decorators, migrations, QueryBuilder for complex aggregations |
| **JWT (jsonwebtoken)** | Auth tokens | Stateless; role + userId encoded in payload |
| **bcrypt** | Password hashing | Prevents plain-text credential exposure |
| **Multer** | File upload middleware | Handles multipart/form-data for PGN and image uploads |
| **Redis** | Optional caching | Caches masterclass listing endpoint to reduce DB load |

## Architecture

```plaintext
[React Frontend — Vite + Tailwind]
         |  HTTP / Axios (JWT in Authorization header)
[Express REST API — Port 5000]
    |              |
[JWT Middleware]  [Role Guard Middleware]
         |
    [Route Handlers]
    /      |       \
[Auth]  [Masterclass]  [Enrollment]  [Review]  [Admin]  [Analytics]
                |
           [Multer — /uploads]
                |
         [TypeORM ORM Layer]
                |
         [PostgreSQL — Port 5432]

[Redis — Port 6379]  (optional, class listing cache)
```

## Database Schema

```plaintext
users
├── id            UUID PK
├── name          VARCHAR(255)
├── email         VARCHAR(255) UNIQUE
├── password_hash TEXT
├── role          ENUM(admin, coach, player)
├── is_approved   BOOLEAN DEFAULT false
└── created_at    TIMESTAMP

masterclasses
├── id            UUID PK
├── title         VARCHAR(255)
├── description   TEXT
├── session_date  TIMESTAMP
├── category      ENUM(opening, middlegame, endgame, tactics)
├── capacity      INT
├── media_url     TEXT NULL
├── coach_id      UUID FK → users.id
└── created_at    TIMESTAMP

enrollments
├── id              UUID PK
├── player_id       UUID FK → users.id
├── masterclass_id  UUID FK → masterclasses.id
├── status          ENUM(active, waitlisted)
└── enrolled_at     TIMESTAMP

reviews
├── id              UUID PK
├── player_id       UUID FK → users.id
├── masterclass_id  UUID FK → masterclasses.id
├── rating          INT (1–5)
├── comment         TEXT NULL
└── created_at      TIMESTAMP
```

**Relationships:**

*   `User (coach)` → one-to-many → `Masterclass`
*   `Masterclass` → one-to-many → `Enrollment`
*   `User (player)` → one-to-many → `Enrollment`
*   `User (player)` ↔ `Masterclass` — many-to-many via `Enrollment`
*   `User (player)` → one-to-many → `Review`
*   `Masterclass` → one-to-many → `Review`

## Project Structure

```plaintext
chess-arena/
├── client/                        # React frontend
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx                # Routes + ProtectedRoute wiring
│       ├── main.tsx
│       ├── context/
│       │   └── AuthContext.tsx    # Global auth state (JWT decode + user)
│       ├── hooks/
│       │   └── useAuth.ts
│       ├── components/
│       │   ├── ProtectedRoute.tsx # Role-based route guard
│       │   ├── ReviewModal.tsx    # Star rating + comment submission
│       │   ├── ReviewsList.tsx    # Inline reviews display
│       │   └── StarRating.tsx
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   ├── AdminDashboard.tsx  # Overview / Coaches / Masterclasses / Users tabs
│       │   ├── CoachDashboard.tsx  # My classes / Create / Edit / Students
│       │   ├── PlayerDashboard.tsx # Browse / Enrolled / Waitlisted / Profile
│       │   ├── BrowsePage.tsx      # Full search page with all filters + pagination
│       │   └── AnalyticsPage.tsx   # Bar / Line / Doughnut charts for coach
│       └── utils/
│           ├── api.ts             # Axios instance with JWT interceptor
│           ├── auth.ts            # Token decode helpers
│           └── chartSetup.ts      # Chart.js global registration
│
├── server/                        # Express backend
│   ├── .env
│   ├── uploads/                   # Multer file storage (gitignored)
│   └── src/
│       ├── index.ts               # Express app entry point
│       ├── config/
│       │   └── database.ts        # TypeORM DataSource config
│       ├── entities/
│       │   ├── User.ts
│       │   ├── Masterclass.ts
│       │   ├── Enrollment.ts
│       │   └── Review.ts
│       ├── middlewares/
│       │   ├── auth.ts            # JWT verify → attaches req.user
│       │   ├── roleGuard.ts       # requireRole('coach') etc.
│       │   └── upload.ts          # Multer config (PGN + images, 10MB limit)
│       ├── controllers/           # Thin HTTP layer — delegates to services
│       │   ├── auth.controller.ts
│       │   ├── masterclass.controller.ts
│       │   ├── enrollment.controller.ts
│       │   ├── review.controller.ts
│       │   ├── admin.controller.ts
│       │   └── analytics.controller.ts
│       ├── services/              # Business logic layer
│       │   ├── auth.service.ts
│       │   ├── masterclass.service.ts
│       │   ├── enrollment.service.ts  # Transactions + auto-promotion
│       │   ├── review.service.ts
│       │   ├── admin.service.ts
│       │   └── analytics.service.ts
│       └── routes/
│           ├── auth.routes.ts
│           ├── masterclass.routes.ts
│           ├── enrollment.routes.ts
│           ├── review.routes.ts
│           ├── admin.routes.ts
│           └── analytics.routes.ts
│
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

```plaintext
# Node.js 20+
node --version

# PostgreSQL 15+
psql --version

# Redis (optional)
redis-server --version
```

### 1\. Clone and install

```plaintext
git clone https://github.com/your-username/chess-arena.git
cd chess-arena

# Install backend dependencies
cd server &amp;&amp; npm install

# Install frontend dependencies
cd ../client &amp;&amp; npm install
```

### 2\. Create PostgreSQL database

```plaintext
psql -U postgres
CREATE DATABASE chess_arena;
\q
```

### 3\. Configure environment variables

```plaintext
cd server
cp .env.example .env
# Edit .env with your values (see Environment Variables section)
```

### 4\. Create uploads directory

```plaintext
mkdir -p server/uploads
```

### 5\. Run the application

Open two terminals:

```plaintext
# Terminal 1 — Backend (http://localhost:5000)
cd server
npm run dev

# Terminal 2 — Frontend (http://localhost:3000)
cd client
npm run dev
```

TypeORM will auto-sync the schema on first run (`synchronize: true` in development).

## Environment Variables

Create `server/.env` from this template:

```plaintext
# Server
PORT=5000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=chess_arena

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=7d

# Redis (optional)
REDIS_URL=redis://localhost:6379

# CORS
CLIENT_URL=http://localhost:3000
```

Create `client/.env`:

```plaintext
VITE_API_URL=http://localhost:5000/api
```

## API Reference

### Authentication

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Register as coach or player |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | Any auth | Get current user profile |

### Masterclasses

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/masterclasses` | Public | List all classes (filters + pagination) |
| GET | `/api/masterclasses/:id` | Public | Get single class detail |
| GET | `/api/masterclasses/mine` | Coach | Get own classes |
| POST | `/api/masterclasses` | Coach | Create class (multipart/form-data) |
| PUT | `/api/masterclasses/:id` | Coach | Update own class |
| DELETE | `/api/masterclasses/:id` | Coach | Delete own class (blocked if active enrollments) |
| GET | `/api/masterclasses/:id/enrollments` | Coach | View students for own class |

### Enrollments

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/enrollments/my` | Player | Get own active + waitlisted enrollments |
| POST | `/api/enrollments/:masterclassId` | Player | Enroll (active or waitlisted) |
| DELETE | `/api/enrollments/:masterclassId` | Player | Cancel + auto-promote waitlist |
| GET | `/api/enrollments/:masterclassId/students` | Coach | View students roster |

### Reviews

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/reviews/:masterclassId` | Player | Submit rating + comment |
| GET | `/api/reviews/:masterclassId` | Public | Get all reviews for a class |
| DELETE | `/api/reviews/:masterclassId` | Player | Delete own review |

### Admin

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/admin/analytics` | Admin | Platform-wide stats |
| GET | `/api/admin/users` | Admin | All users (filterable by role) |
| GET | `/api/admin/coaches/pending` | Admin | Coaches awaiting approval |
| PUT | `/api/admin/coaches/:id/approve` | Admin | Approve a coach |
| PUT | `/api/admin/coaches/:id/suspend` | Admin | Suspend a coach |
| GET | `/api/admin/masterclasses` | Admin | All masterclasses |
| DELETE | `/api/admin/masterclasses/:id` | Admin | Force delete (bypasses enrollment check) |

### Analytics

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/analytics/coach` | Coach | KPIs + per-class stats + daily trend + category distribution |

## Role-Based Access

### Admin

*   Full platform visibility
*   Approve or suspend coaches before they can publish
*   Force-delete any masterclass for content moderation
*   View all users and aggregate analytics

### Coach

*   Create / edit / delete **own** masterclasses only
*   Cannot enroll in own classes
*   Cannot delete a class with active enrollments (requires admin override)
*   View enrolled student roster for own classes
*   Access personal analytics dashboard

### Player

*   Browse and search all masterclasses from approved coaches
*   Enroll (active seat) or join waitlist (full class)
*   Cancel enrollment — triggers auto-promotion of first waitlisted player
*   Submit ratings and reviews for attended classes

### Key Enforcement Points

*   `verifyToken` middleware — validates JWT signature on every protected route
*   `requireRole('coach')` — blocks non-coaches from coach endpoints at API level
*   `coach_id === req.user.userId` ownership check — prevents coaches editing others' classes
*   `AppDataSource.transaction()` — prevents race conditions on last available seat

## Feature Status

| # | Feature | Backend | Frontend | Status |
| --- | --- | --- | --- | --- |
| 1 | Multi-role System | ✅ | ✅ | Complete |
| 2 | Core Entity (Masterclass CRUD) | ✅ | ✅ | Complete |
| 3 | JWT Auth + RBAC | ✅ | ✅ | Complete |
| 4 | Role Dashboards | ✅ | ✅ | Complete |
| 5 | Enrollment + Capacity Transaction | ✅ | ✅ | Complete |
| 6 | Advanced Search + Pagination | ✅ | ✅ | Complete |
| 7 | Review System | ✅ | ✅ | Complete |
| 8 | Waitlist Auto-Promotion | ✅ | ✅ | Complete |
| 9 | File Upload (Multer) | ✅ | ✅ | Complete |
| 10 | Analytics Dashboard | ✅ | ✅ | Complete |
| — | Email Notifications | ⬜ | ⬜ | Optional (deferred) |
| — | In-App Messaging | ⬜ | ⬜ | Optional (deferred) |

## Scripts

### Backend (`server/`)

```plaintext
npm run dev      # Start with ts-node-dev (hot reload)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled dist/index.js
```

### Frontend (`client/`)

```plaintext
npm run dev      # Vite dev server (http://localhost:3000)
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
```

## License

MIT