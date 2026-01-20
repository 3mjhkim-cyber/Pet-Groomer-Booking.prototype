# 정리하개 (Pet Grooming Booking System)

## Overview

A multi-tenant SaaS platform for pet grooming shop management built with React, Express, and PostgreSQL. The platform allows multiple grooming shops to register as franchises, each with their own booking page, service management, and customer tracking. Features include super admin platform management, shop registration with approval workflow, per-shop service/deposit configuration, and customer visit tracking. All UI is in Korean, targeting the Korean pet grooming market.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Multi-Tenant Architecture
- **Super Admin**: Platform-wide management of franchise shops
- **Shop Owners**: Individual shop management with isolated data
- **Public Booking**: Each shop has unique URL (e.g., /book/gangnam)
- **Data Isolation**: Services, bookings, customers scoped to shop

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Calendar**: FullCalendar for the admin calendar view
- **Animations**: Framer Motion for page transitions and hover effects
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ES modules)
- **API Design**: RESTful endpoints with role-based access control
- **Authentication**: Passport.js with local strategy, session-based auth
- **Password Security**: scrypt hashing with random salts
- **Middleware**: requireAuth, requireSuperAdmin, requireShopOwner for RBAC

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Session Store**: MemoryStore (development), can be switched to connect-pg-simple for production
- **Schema Location**: `shared/schema.ts` defines all database tables

### Database Schema
- `shops`: Franchise shops with settings (name, slug, phone, address, business hours, deposit settings, approval status)
- `users`: Shop owners/admins with email, password, role (super_admin/shop_owner), shopId
- `customers`: Customer records with visit tracking, scoped to shop
- `services`: Available grooming services with duration and pricing, scoped to shop
- `bookings`: Appointment records with status and deposit tracking, scoped to shop

### Build System
- **Development**: Vite with HMR for frontend, tsx for backend
- **Production**: Custom build script using esbuild for server bundling, Vite for client
- **Output**: Bundled to `dist/` directory with static files in `dist/public/`

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components including shadcn/ui
    hooks/        # Custom React hooks (auth, shop data)
    pages/        # Route components
      - PlatformAdmin.tsx  # Super admin dashboard
      - ShopSettings.tsx   # Shop owner settings
      - Register.tsx       # Shop registration
      - Booking.tsx        # Public booking page
      - Dashboard.tsx      # Shop admin dashboard
    lib/          # Utilities and query client
server/           # Express backend
  routes.ts       # API route definitions with RBAC middleware
  storage.ts      # Database access layer
  db.ts           # Database connection
shared/           # Shared between client/server
  schema.ts       # Drizzle database schema
  routes.ts       # API contract definitions
```

## Security Features

### Approval Workflow
- New shop registrations require super admin approval
- Unapproved shops cannot log in (returns 403 with Korean message: "가맹점 승인 대기중입니다. 승인 후 로그인이 가능합니다.")
- Super admin approves shops via Platform Admin dashboard

### Data Isolation
- Bookings filtered by shopId in dashboard
- Services scoped to individual shops
- Customer records isolated per shop

## Test Accounts

- **Super Admin**: admin@admin.com / admin1234
- **Shop Owner**: test@shop.com / test1234
- **Demo Shop**: 정리하개 강남점 (slug: gangnam)
- **Unapproved Shop**: unapproved@test.com / Test1234!@ (for testing login blocking)

## Booking Management Features

### Time Slot Conflict Prevention
- Server-side validation using `getBookedTimeSlots` API
- Considers service duration when checking for overlaps
- Both booking creation and updates are validated

### Dashboard Features
- **Tabs UI**: 승인 대기 (pending) / 확정된 예약 (confirmed)
- **Real-time Updates**: 2-second polling for immediate reflection of changes
- **Booking Actions (Pending)**: 예약금 링크, 바로 확정, 거절
- **Booking Actions (Confirmed)**: 변경, 고객수정, 취소
- **Manual Booking**: Shop owners can add bookings directly

### Calendar Color Coding
- **Orange**: Pending bookings
- **Green**: Confirmed bookings
- **Hidden**: Cancelled and rejected bookings

### Public Booking Page
- Dynamic time slot availability based on selected date and service duration
- Unavailable times shown as disabled with strikethrough

## Key Pages & Routes

### Public Routes
- `/book/:slug` - Public booking page for each shop
- `/register` - New shop registration
- `/login` - User login

### Super Admin Routes
- `/admin/platform` - Platform management dashboard

### Shop Owner Routes
- `/admin/dashboard` - Shop dashboard with bookings
- `/admin/settings` - Shop settings (services, deposit config)

## External Dependencies

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Drizzle Kit for migrations (`npm run db:push`)

### Third-Party Services
- No external APIs currently integrated
- Session secret via `SESSION_SECRET` environment variable

### Key npm Packages
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-zod`: Database ORM with validation
- `passport` / `passport-local`: Authentication
- `@fullcalendar/react`: Calendar component for booking visualization
- `framer-motion`: Animations
- `zod`: Runtime type validation
- `react-hook-form`: Form state management
