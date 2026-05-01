## Chess Masterclass & Coaching Arena

## 1\. Basic Information

*   **Project Title:** Chess Masterclass & Coaching Arena
*   **Fullname:**
*   **Student ID:**
*   **Term:** T12026\_cs4010

## 2\. Problem Statement

**Problem Being Solved:**  
The chess community lacks a structured, capacity-controlled platform that connects coaches with students seeking systematic improvement. While content-rich resources like YouTube tutorials and chess.com puzzles exist, they are passive, unidirectional, and lack accountability. Simultaneously, qualified chess coaches struggle to monetize and scale their expertise beyond one-to-one coaching or local chess clubs. This creates a gap: students cannot find mentored, cohort-based learning experiences, and coaches have no centralized platform to manage and publish structured masterclasses.

**Target Users:**

1.  Chess Coaches & Instructors - Intermediate to advanced players (rated 1500+ FIDE) seeking to teach cohort-based masterclasses on specific openings, endgames, or tactical themes. They need tools to manage student rosters, set class capacities, and upload reference materials.
2.  Amateur & Intermediate Players - Aspiring chess enthusiasts (rated 800-2000) looking for structured, mentor-led learning to accelerate their improvement beyond self-study. They need discoverability, clarity on what they're enrolling in, and transparent instructor credentials.
3.  Platform Administrators - Oversight of the chess coaching ecosystem to ensure coach quality, prevent abuse, and maintain platform integrity.

**Why This Application Is Needed:**  
Current solutions (YouTube, chess.com, lichess) lack the cohort structure necessary for authentic learning. Coaches cannot enforce feedback loops or manage student groups effectively. This application solves this by creating a capacity-limited, role-aware coaching platform where coaches control class size, students commit to a defined cohort, and the system enforces role-based access to prevent unauthorized cross-role interactions.

**Gap Addressed:**  
The platform bridges the gap between passive self-study and expensive private coaching by enabling scalable, structured group learning with clear coach-student relationships. By enforcing enrollment limits and role-based dashboards, it creates accountability and measurable outcomes unlike generic video platforms.

## 3\. System Overview

**What the System Does:**  
The Chess Masterclass & Coaching Arena is a role-based full-stack web application that enables chess coaches to publish masterclasses (structured sessions on specific chess topics) and allows players to discover, enroll in, and attend these classes. The platform enforces role-based access control at both API and Ul levels, ensuring coaches manage only their own content, players interact only with classes, and admins monitor platform health.

**Major Components:**

1.  Authentication & Authorization Layer - JWT-based stateless authentication with role-encoded tokens. Every protected route validates the user's role before granting access to resources.
2.  User Management System - Three distinct user roles with programmatically separated dashboards:
    *   Admin: Platform oversight and coach approvals
    *   Coach: Class creation and enrollment management
    *   Player: Class discovery and enrollment
3.  Masterclass Registry - Core entity storing all published classes with metadata: title, description, session date, category (opening/middlegame/endgame/tactics), seat capacity, and media uploads (PGN or board images).
4.  Enrollment Management - Tracks which players are enrolled in which masterclasses, supporting active and waitlisted statuses.
5.  Search & Filtering Engine - Enables players to discover classes via keyword search, category filter, availability (seats remaining > 0), date range, and sorting.
6.  Role-Aware Dashboards - Each role sees only data and actions relevant to their permissions.

**Primary Business Entity:**  
Masterclass - represents a single chess coaching session. Fields include:

*   Title (e.g., "Mastering the Sicilian Defense")
*   Description (learning objectives)
*   Session Date (TIMESTAMP)
*   Category (ENUM: opening, middlegame, endgame, tactics)
*   Capacity (integer, seat limit)
*   Media URL (path to PGN file or board image)
*   Coach ID (foreign key linking to User who created it)

**Type of Interactions:**

*   Coach - Masterclass: Creates new classes, edits/deletes own classes, uploads materials
*   Player - Masterclass: Searches, views details, enrolls (creates Enrollment record) | Enrollment: Cancels enrollment, views enrolled classes
*   Admin - Coach: Approves or suspends coach accounts | Masterclass: Views all classes, can override deletes (for moderation)

**Architecture Overview:**

```plaintext
[React Frontend]
      | (HTTP/Axios)
[Express REST API]
     /  \
[JWT Auth] [Route Handlers]
Middleware      /
          [Multer] file uploads (PGN/images)
               |
     Users Classes Enrollments
               /
     [TypeORM ORM Layer]
               |
        [PostgreSQL DB]
[Redis Cache] (optional, for class listings)
```

**Database Schema (High-Level):**

*   User (id, name, email, password\_hash, role, is\_approved, created\_at)
    *   One-to-Many → Masterclass (id, title, description, session\_date, category, capacity, media\_url, coach\_id, created\_at)
    *   One-to-Many → Enrollment (id, player\_id, masterclass\_id, enrolled\_at, status)
*   Player (User)
    *   One-to-Many → Enrollment (player enrollments)

## 4\. User Roles and Responsibilities

### 4.1 Admin (Superuser)

**Responsibilities:**

*   Monitor overall platform health and usage statistics
*   Approve or suspend coach accounts before they can publish classes
*   Oversee all masterclasses (view, override delete if necessary for content violations)
*   Manage site-wide settings and policies

**Approvals & Monitoring:**

*   Coaches must be is\_approved = true in the database before classes are visible to players
*   Admin dashboard displays pending coach registrations requiring approval
*   Admin can view aggregate analytics: total coaches, total classes, total enrollments, active players

**Admin Dashboard Contents:**

*   Pending Coaches table with approve/reject buttons
*   Platform Analytics card showing total users by role, total masterclasses, total enrollments
*   Recent Activity feed of new class creations, enrollments
*   Masterclass Moderation panel to flag or remove inappropriate classes

### 4.2 Coach (Role Type A)

**What They Can Create:**

*   Publish new masterclasses with title, description, session date, category, capacity, and PGN/image uploads
*   Each masterclass is owned by the coach who created it

**What They Can Edit/Delete:**

*   Edit details (title, description, date, capacity) of their own masterclasses only
*   Delete their own masterclasses (with confirmation)
*   Cannot modify or view other coaches' classes

**Coach Dashboard Contents:**

*   My Masterclasses - table showing all their published classes with enrollment counts and status
*   Class Details View - click a class to see enrolled player list, waitlist status, and class analytics (e.g., "10/15 seats filled")
*   Create New Class form with fields: title, description, session date, category dropdown, capacity slider, media uploader
*   Upcoming Sessions - chronological list of classes happening soon

**Business Logic Restrictions:**

*   Cannot see other coaches' classes or enrollments
*   Cannot approve or suspend other coaches (admin only)
*   Cannot enroll themselves in their own classes
*   Cannot delete a masterclass once active enrollments exist without admin override. Minor edits (description, media) are permitted post-enrollment.
*   Cannot upload media larger than 10MB (to prevent storage bloat)

### 4.3 Player (Role Type B)

**What Actions They Can Perform:**

*   Browse masterclasses - search, filter, and sort available classes
*   Enroll in a class - if seats are available, creates an Enrollment record with status = 'active'; if full, status = 'waitlisted'
*   View their dashboard - shows enrolled and waitlisted classes
*   Cancel enrollment - removes themselves from a class

**How They Interact with Core Entity (Masterclass):**

*   Read-only access to masterclass details (title, description, coach name, date, category, remaining seats)
*   Can view media (PGN or board image) but cannot edit
*   Enrollment creates a many-to-many relationship between Player and Masterclass via the Enrollment entity

**Player Dashboard Contents:**

*   Enrolled Classes - active classes with session dates and coach names; includes "Cancel Enrollment" button
*   Waitlisted Classes - classes where seats are full; auto-promoted when a spot opens
*   Available Classes - search/filter results of all public masterclasses (filtered by coach approval status)
*   My Profile - view account details (name, email, member since)

## 5\. Core Entity Design

**Name of Core Entity:** Masterclass  
**Definition:** A masterclass is a structured, capacity-limited chess coaching session published by an approved coach. It is the primary business entity around which all other functionality revolves.

**Core Fields (Mandatory):**

*   Title - Session name (e.g., "Sicilian Defense: 6.Bg5 Variations")
*   Description - Learning objectives and session content outline
*   Session Date - Scheduled date and time (TIMESTAMP)
*   Category - Enum restricting to: opening, middlegame, endgame, tactics
*   Capacity - Integer specifying maximum enrollments allowed
*   Media URL - File path to uploaded PGN (chess game notation) or board diagram image
*   Coach ID - Foreign key linking to User who created it

**Relationships:**

*   One Coach → Many Masterclasses - A coach can publish multiple classes; a class belongs to exactly one coach
*   One Masterclass → Many Enrollments - A class can have multiple enrollments; an enrollment references exactly one masterclass
*   Many Players → Many Masterclasses (via Enrollments) - Many-to-many relationship through the Enrollment join entity

**Why It Exists:**  
The Masterclass entity encapsulates the core business logic: it is the asset that coaches monetize, the resource players purchase (conceptually), and the unit of capacity the platform manages. Without it, the platform has no content.

**How It Interacts with Other Entities:**

*   User (Coach) → Owns the masterclass; API endpoints validate coach\_id authenticated user\_id before allowing edits
*   Enrollment → Tracks attendance/commitment; the system counts active enrollments against capacity to enforce limits
*   Search/Filter → Masterclass fields are indexed for fast keyword and category queries

## 6\. Feature Implementation Status

| No. | Feature | Description | Status |
| --- | --- | --- | --- |
| 1 | Multi-role System | Three roles: Admin, Coach, Player with JWT-based auth and RBAC middleware | Planned |
| 2 | Core Business Entity | Masterclass entity with Title, Description, Date, Category, Capacity, Media, Ownership | Planned |
| 3 | Authentication and Authorization | JWT token login/register with role encoded in payload; API-level guard middleware | Planned |
| 4 | Dashboard Requirements | Role-specific dashboards: Admin (platform stats), Coach (my classes), Player (browse & enrolled) | Planned |
| 5 | Interaction/Transaction | Player enrolls in Masterclass; capacity check enforced before confirming enrollment | Planned |
| 6 | Advanced Search and Filtering | Keyword search, Category filter, Availability filter, Date range filter, Pagination, Sort by date | Planned |
| 7 | Review System | Player can leave a rating and comment after attending a Masterclass | Planned |
| 8 | Waitlist/Completion Logic | Auto-promotes waitlisted player when an enrolled player cancels | Planned |
| 9 | File Upload (Media Support) | Coach uploads PGN files or board images via Multer on Masterclass creation | Planned |
| 10 | Analytics Dashboard | Coach views enrollment trend per Masterclass via chart | Planned |

## 7\. Tech Stack Used and Purpose

| Technology | Purpose in Project | Justification |
| --- | --- | --- |
| Express | REST API server and routing | Lightweight and unopinionated, ideal for building modular route handlers with middleware chains |
| PostgreSQL | Primary relational database | Enforces referential integrity across Users / Masterclasses / Enrollments; ACID compliance ensures safe enrollment transactions |
| TypeORM | ORM for database interaction | Programmatic schema creation via entity decorators; no manual table creation; supports migrations cleanly |
| React | Frontend SPA | Component-based architecture fits role-aware dashboard rendering; manages auth state and API responses efficiently |
| JWT (jsonwebtoken) | Authentication and authorization tokens | Stateless auth; role and userld encoded in payload; verified on every protected API route |
| Redis | Caching for frequent read operations | Caches masterclass listing endpoint to reduce repeated PostgreSQL queries on high-traffic browse page |
| Multer | File upload handling | Parses multipart/form-data on Express to handle PGN and image uploads from Coach dashboard |
| bcrypt | Password hashing | Securely hashes passwords before storing; prevents plain-text credential exposure |
| Axios | HTTP client on frontend | Promise-based API calls from React with interceptor support for attaching JWT headers automatically |
| React Router | Frontend routing and route guards | Protects role-specific pages; redirects unauthorized users to login |
| Bootstrap/Tailwind CSS | Ul styling | Rapid consistent styling without custom CSS; keeps UI intuitive and purpose-driven |

## 8\. Additional Features (If Any)

**Feature 1: Coach Analytics Dashboard**

*   **What It Is:** A dedicated page showing coaches metrics about their masterclasses: enrollment trends, player retention, upcoming session counts, and class ratings.
*   **Why It Is Useful:** Coaches gain insights into which class formats/topics attract the most players, enabling data-driven decisions about future class offerings.
*   **Technology Used:** React Chart.js library for time-series charts; backend aggregation query via TypeORM QueryBuilder.
*   **Status:** Planned (Post-MVP)

**Feature 2: Waitlist Auto-Promotion**

*   **What It Is:** When a player cancels enrollment from a full class, the system automatically promotes the first waitlisted player to active status and sends them a notification.
*   **Why It Is Useful:** Improves player experience; no manual intervention needed. Reduces admin overhead.
*   **Technology Used:** PostgreSQL trigger (optional) or application-level logic in cancellation service handler; optional Nodemailer for email.
*   **Status:** Planned (Core feature, to be implemented by Week 7)

**Feature 3: Class Ratings & Reviews**

*   **What It Is:** After a masterclass concludes, enrolled players can rate the coach and leave written reviews.
*   **Why It Is Useful:** Builds trust in the platform; helps new players choose coaches based on past student feedback.
*   **Technology Used:** New Review entity in PostgreSQL; React modal for submission; aggregated star rating displayed on class details.
*   **Status:** Planned (Post-MVP)

**Feature 4: Email Notifications (Optional)**

*   **What It Is:** Automated emails sent to coaches when a class reaches capacity, and to players on class day with session details.
*   **Why It Is Useful:** Reduces support burden; improves player attendance and coach engagement.
*   **Technology Used:** Nodemailer for SMTP; Bull queue for scheduling delayed emails.
*   **Status:** Optional (Can defer until later)

**Feature 5: Masterclass In-App Communication (Optional)**

*   **What It Is:** A private communication channel dedicated to each masterclass for enrolled players and the coach.
*   **Why It Is Useful:** Facilitates sharing of study materials, answering group questions, and fostering community within the cohort.
*   **Technology Used:** WebSockets for real-time messaging; Message entity in PostgreSQL for persistence.
*   **Status:** Optional (Can defer until later)

**Summary**  
The Chess Masterclass & Coaching Arena is designed as a role-based, capacity-controlled platform addressing the gap between self-study and private coaching. By combining Express, PostgreSQL, TypeORM, and React with strict RBAC and well-defined entity relationships, the system enforces business logic at both API and database layers. The architecture prioritizes scalability, security, and clear separation of concerns, positioning it as a production-ready capstone project that demonstrates full-stack competence.

**Key Differentiators:**

*   Capacity-limited classes enforce scarcity and coaching quality
*   Three distinct dashboards prevent cross-role data leakage
*   JWT authentication + API-level authorization ensure security
*   Masterclass entity ties all operations together, creating domain coherence