# 정리하개 (Pet Grooming Booking System)

## Overview

A full-stack booking management system for pet grooming shops built with React, Express, and PostgreSQL. The application provides customer-facing booking functionality and an admin dashboard for managing appointments, customers, and deposit requests. The interface is in Korean, targeting the Korean pet grooming market.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

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
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod schemas for type-safe request/response validation
- **Authentication**: Passport.js with local strategy, session-based auth using express-session
- **Password Security**: scrypt hashing with random salts

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Session Store**: MemoryStore (development), can be switched to connect-pg-simple for production
- **Schema Location**: `shared/schema.ts` defines all database tables

### Database Schema
- `users`: Shop owners/admins with email, password, shop name, phone, address
- `customers`: Customer records with visit tracking
- `services`: Available grooming services with duration and pricing
- `bookings`: Appointment records linking customers to services with status and deposit tracking

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
    lib/          # Utilities and query client
server/           # Express backend
  routes.ts       # API route definitions
  storage.ts      # Database access layer
  db.ts           # Database connection
shared/           # Shared between client/server
  schema.ts       # Drizzle database schema
  routes.ts       # API contract definitions
```

## External Dependencies

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Drizzle Kit for migrations (`npm run db:push`)

### Third-Party Services
- No external APIs currently integrated
- Session secret via `SESSION_SECRET` environment variable (defaults to "secret" in development)

### Key npm Packages
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-zod`: Database ORM with validation
- `passport` / `passport-local`: Authentication
- `@fullcalendar/react`: Calendar component for booking visualization
- `framer-motion`: Animations
- `zod`: Runtime type validation
- `react-hook-form`: Form state management