# Enrollment System & Waitlisting

## Overview
The Enrollment System manages the complex relationship between players and coaching sessions. It is designed to handle high-concurrency enrollment attempts while maintaining strict capacity limits and fair waitlist ordering.

## Enrollment Process Flow

The following flowchart details the logic used when a player attempts to join a class:

```mermaid
flowchart TD
    A[Start: Player clicks Enroll] --> B{Class in future?}
    B -- No --> C[Error: Session passed]
    B -- Yes --> D{Already enrolled?}
    D -- Yes --> E[Error: Duplicate]
    D -- No --> F{Check Active Count}
    F -- Count < Capacity --> G[Status: ACTIVE]
    F -- Count >= Capacity --> H[Status: WAITLISTED]
    G --> I[Create Enrollment Record]
    H --> I
    I --> J[Notify Coach]
    J --> K[End: Return Status]
```

## Implementation Details

### 1. Database Transactions
To prevent "race conditions" where two players might claim the last remaining seat simultaneously, the enrollment logic is wrapped in a database transaction:
```typescript
await AppDataSource.transaction(async (transactionalEntityManager) => {
    // 1. Lock class row / Check current count
    // 2. Insert enrollment
    // 3. Update cached counts if necessary
});
```

### 2. Waitlist Management (FIFO)
- **Ordering**: The waitlist strictly follows a **First-In-First-Out (FIFO)** strategy based on the `enrolled_at` timestamp.
- **Queue Position**: Calculated dynamically using a SQL subquery:
  ```sql
  SELECT COUNT(*) + 1 FROM enrollments 
  WHERE masterclass_id = :id AND status = 'waitlisted' AND enrolled_at < :my_timestamp
  ```

### 3. Auto-Promotion Logic
When a confirmed student cancels their enrollment, the system automatically processes the waitlist:
1.  **Deletion**: Remove the cancelling student's record.
2.  **Selection**: Fetch the earliest waitlisted record for that class.
3.  **Promotion**: Update status from `WAITLISTED` to `ACTIVE`.
4.  **Notification**: Trigger a `NotificationType.WAITLIST_PROMOTED` to the newly active player.

## Kick Request & Moderation
Coaches can initiate a student removal process to ensure a healthy learning environment.

```mermaid
sequenceDiagram
    participant Coach
    participant Admin
    participant DB as System
    participant Player

    Coach->>DB: POST /api/enrollments/kick-request {playerId, reason}
    DB-->>Player: Notification: Kick Request Pending
    Admin->>DB: GET /api/admin/kick-requests
    Admin->>DB: POST /api/admin/kick-requests/:id/approve
    DB->>DB: Delete Enrollment
    DB->>DB: Trigger Auto-Promotion (if seats open)
    DB-->>Player: Notification: You have been removed
```

## Business Rules Summary

- **Self-Enrollment Guard**: Coaches cannot enroll in their own sessions.
- **Status Persistence**: Once a player is waitlisted, their position is fixed relative to others who joined later.
- **Admin Override**: Only Admins can process Kick Requests, preventing potential abuse of power by coaches.
- **Email Notifications**: (Planned) Integration with Nodemailer to provide off-platform alerts for waitlist promotions.
