## Comprehensive Technical Requirements: App Dev Lab Project (Jan 2026)

This document consolidates the strict technical, structural, and architectural requirements for the Open-Ended Full Stack Application project.

## 1\. Mandatory Technology Stack

The application must strictly adhere to the following technology stack:

*   **Backend:** Node.js with Express (for building REST APIs).
*   **Database:** PostgreSQL (Relational Database).
*   **ORM:** TypeORM (for database interaction).
    *   **Constraint:** The database schema must be created _programmatically_ using TypeORM entities. Manual table creation using external tools is strictly prohibited.
*   **Frontend:** ReactJS.
*   **Styling (Optional):** Bootstrap or Tailwind CSS.
*   **Caching (Optional but Recommended):** Redis.

## 2\. Project Structure & Codebase Rules

*   **Application Category:** Open-Ended Full Stack Application.
*   **Separation of Concerns:** There must be a clear separation between the backend (API) and the frontend (React app) within the project organization.
*   **File Types:** The project must be primarily built using `.js` or `.ts` files.
*   **Local Execution:** The project must be fully capable of running on a local machine. All dependencies must be pre-installed and functional; the application cannot rely on dynamic installations during runtime.
*   **Originality:** The core business logic must be entirely custom-written. External code snippets or third-party templates for core functionality are not allowed (official documentation can be used for configuration).
*   **Root Directory Integrity:** The root directory of the final submission must contain _only_ the main project folder. There must be no loose files, additional folders, or loose text/PDF files in the root.
*   **AI Usage Tracker:** A dedicated `.md` file must be included alongside the project codebase clearly and quantitatively documenting any AI assistance utilized throughout development.

## 3\. Authentication & Role-Based Access Control (RBAC)

*   **Authentication Standard:** Must be implemented using JWT (JSON Web Tokens) or Token-based authentication.
*   **User Roles:** The system must support a minimum of **3 distinct user roles** (e.g., Admin, Role Type A, Role Type B).
*   **Authorization Scope:** \* Roles must have clearly defined responsibilities and permissions.
    *   Users must be strictly restricted from accessing unauthorized resources.
    *   Authorization must be enforced at the **API backend level**, not just hidden on the frontend.
*   **Security & Integrity:** \* Passwords must be securely stored using hashing.
    *   Sensitive operations must be protected at the API level.

## 4\. Database & Entity Design

*   **Minimum Entities:** The database must contain at least **3 core domain entities**, excluding pure join tables or many-to-many mapping tables.
*   **Core Business Entity:** At least one of these entities must be the primary business entity of your domain. This specific core entity **must** include the following fields:
    *   Title / Name
    *   Description
    *   Date or Timestamp field (if applicable)
    *   Category or Type
    *   Capacity or Limit (if applicable)
    *   Media Support (image or file upload)
    *   Ownership relationship (linked to at least one specific User Role, e.g., Role Type A)
*   **Relationships & Integrity:** \* Entities must have well-defined relationships (One-to-One, One-to-Many, Many-to-One).
    *   The database must properly utilize Primary Keys, Foreign Keys, constraints, and indexing where appropriate.
    *   Backend validation and database constraints must be used to prevent invalid or inconsistent system states.

## 5\. API Design & Advanced Features

*   **REST API:** The backend must expose cleanly designed RESTful APIs that the frontend consumes.
*   **Search and Filtering:** The API/Application must include **one or more** of the following advanced querying features:
    *   Keyword search
    *   Category filter
    *   Date range filter (if applicable)
    *   Pagination
    *   Sorting
    *   Availability filter (if applicable)
*   **Error Handling:** The backend must gracefully handle unauthorized access, invalid input (400 errors), and resource not found (404 errors) scenarios.

## 6\. Frontend & User Experience

*   **Role-Aware Views:** Each of the 3+ roles must have its own landing page or dashboard tailored to the actions that role can perform. Shared dashboards are allowed only if data visibility and access are dynamically restricted based on the role.
*   **State Management:** The frontend must properly handle loading, error, and empty states.
*   **UI/UX Standard:** The interface does not need to be visually complex, but it must be intuitive, consistent, and purpose-driven.

## 7\. Optional Enhancements

While not strictly required, the following features are encouraged for a higher-quality system design:

*   Redis caching for frequently accessed data
*   Analytics dashboard
*   Waitlist system
*   Payment gateway simulation
*   Notifications / Email integration
*   Performance optimizations and advanced UI/UX enhancements