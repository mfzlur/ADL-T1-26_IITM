// ─────────────────────────────────────────────────────────────────────────────
// src/types.ts
// Single source of truth for all TypeScript interfaces used across the frontend.
// Every component imports from here — never define entity shapes inline.
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'coach' | 'player';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type ClassCategory = 'opening' | 'middlegame' | 'endgame' | 'tactics';

export type EnrollmentStatus = 'active' | 'waitlisted';

export type KickRequestStatus = 'pending' | 'approved' | 'rejected';

// ── Core Entities ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_approved: boolean;
  created_at: string;
  // Phase 1B — profile fields (nullable until user fills them in)
  bio: string | null;
  chess_rating: string | null;
  experience_level: ExperienceLevel | null;
}

export interface Masterclass {
  id: string;
  title: string;
  description: string;
  session_date: string;
  category: ClassCategory;
  capacity: number;
  media_url: string | null;
  coach_id: string;
  coach: Pick<User, 'id' | 'name' | 'email'>;
  created_at: string;
  // Phase 1A
  updated_at: string;
  // Computed fields returned by service layer
  enrolled_count: number;
  seats_remaining: number;
  waitlist_count?: number;
  // Phase 4D — enrollment context (present only when authenticated user fetches detail)
  enrollment_status: EnrollmentStatus | null;
  waitlist_position: number | null;
}

export interface Enrollment {
  id: number;
  player_id: string;
  masterclass_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  // Relations — populated depending on endpoint
  player?: Pick<User, 'id' | 'name' | 'email'>;
  masterclass?: Masterclass;
  // Phase 4B — position in queue when status is 'waitlisted'
  waitlist_position?: number;
}

export interface Review {
  id: number;
  rating: number;        // 1–5
  comment: string | null;
  created_at: string;
  player_id: string;
  masterclass_id: string;
  player_name?: string;
}

// Phase 1D
export interface KickRequest {
  id: string;
  reason: string;
  status: KickRequestStatus;
  created_at: string;
  resolved_at: string | null;
  coach_id: string;
  player_id: string;
  masterclass_id: string;
  resolved_by: string | null;
  // Populated relations from API
  coach?: Pick<User, 'id' | 'name' | 'email'>;
  player?: Pick<User, 'id' | 'name' | 'email'>;
  masterclass?: Pick<Masterclass, 'id' | 'title'>;
}

// ── Auth Payloads ─────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  // Phase 10 — refresh token added alongside access token
  refresh_token?: string;
  user: User;
}

// ── API Response Wrappers ─────────────────────────────────────────────────────

// Standard paginated list response (used by browse + admin endpoints)
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Standard error shape from the backend
export interface ApiError {
  message: string;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

// Per-class row inside coach analytics
export interface EnrollmentPerClass {
  class_id: string;
  title: string;
  category: ClassCategory;
  capacity: number;
  active: number;
  waitlisted: number;
  fill_rate: number;   // 0–100 percentage
}

// Daily enrollment trend point
export interface DailyTrend {
  date: string;        // YYYY-MM-DD
  count: number;
}

// Category distribution point
export interface CategoryDistribution {
  category: ClassCategory;
  count: number;
}

// Full coach analytics response
export interface CoachAnalytics {
  kpis: {
    total_classes: number;
    total_enrollments: number;
    total_waitlisted: number;
    avg_fill_rate: number;
  };
  enrollment_per_class: EnrollmentPerClass[];
  daily_trend: DailyTrend[];
  category_distribution: CategoryDistribution[];
}

// Top class row in admin analytics
export interface TopClass {
  mc_id: string;
  mc_title: string;
  mc_category: ClassCategory;
  mc_capacity: number;
  coach_name: string;
  enrollment_count: string; // comes back as string from getRawMany()
}

// Full admin platform analytics response
export interface PlatformAnalytics {
  users: {
    total: number;
    coaches: number;
    players: number;
    admins: number;
    pending_coaches: number;
  };
  masterclasses: {
    total: number;
  };
  enrollments: {
    total: number;
    active: number;
    waitlisted: number;
  };
  top_classes: TopClass[];
  recent_activity: Enrollment[];
}

// ── Coach — Student List ──────────────────────────────────────────────────────

// Row returned by GET /masterclasses/:id/enrollments (coach view)
export interface EnrolledStudent {
  id: number;
  player_name: string;
  email: string;
  enrolled_at: string;
  status: EnrollmentStatus;
  player_id: string;
}

// Response from GET /masterclasses/:id/students (full class view)
export interface ClassStudentsResponse {
  masterclass_title: string;
  capacity: number;
  enrolled_count: number;
  waitlist_count: number;
  seats_remaining: number;
  active: Enrollment[];
  waitlisted: Enrollment[];
}

// ── Review Aggregation ────────────────────────────────────────────────────────

// Response from GET /reviews/:masterclassId
export interface ReviewsResponse {
  masterclass_title: string;
  total_reviews: number;
  average_rating: number;
  reviews: Review[];
}

// ── Player Dashboard ──────────────────────────────────────────────────────────

// Response from GET /enrollments/mine
export interface MyEnrollmentsResponse {
  active: Enrollment[];
  waitlisted: Enrollment[];
}

// ── Student Profile ───────────────────────────────────────────────────────────
// Phase 7 — what a coach sees when they open a student's profile

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  chess_rating: string | null;
  experience_level: ExperienceLevel | null;
  created_at: string;
  // How many of this coach's classes the player is/was in
  shared_classes: Pick<Masterclass, 'id' | 'title' | 'session_date' | 'category'>[];
}

// ── Profile Update ────────────────────────────────────────────────────────────
// Phase 7 — PATCH /profile/me request body

export interface ProfileUpdatePayload {
  bio?: string;
  chess_rating?: string;
  experience_level?: ExperienceLevel;
}
