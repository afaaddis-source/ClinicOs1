# ClinicOS - Arabic-First Clinic Management System

## Overview

ClinicOS is a comprehensive clinic management system designed with Arabic as the primary language and full RTL (right-to-left) support. The application manages patients, appointments, visits, billing, and administrative functions for healthcare clinics. It features a modern tech stack with React frontend, Express backend, and PostgreSQL database with role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### August 2025 - Project Migration Completed
- **Project Migration**: ✅ Successfully migrated ClinicOS from Replit Agent to standard Replit environment
  - **Database Setup**: Created PostgreSQL database with proper connection configuration
  - **ORM Migration**: Migrated from Prisma to Drizzle ORM for better PostgreSQL compatibility
  - **Storage Layer**: Updated all storage methods to use Drizzle PostgreSQL storage
  - **Database Schema**: Applied all schema migrations successfully using `npm run db:push`
  - **User Seeding**: Created default users for all roles with credentials matching login page:
    - admin/123456 (ADMIN)
    - reception/123456 (RECEPTION) 
    - doctor/123456 (DOCTOR)
    - accountant/123456 (ACCOUNTANT)
  - **Authentication Fix**: Fixed password hashing compatibility and verified login works
  - **API Testing**: Verified login functionality works correctly via curl testing
  - **TypeScript**: Fixed all compilation errors and LSP diagnostics
  - **Status**: ✅ COMPLETED - Application running successfully on port 5000 with working authentication

### December 2024
- **Arabic Navigation Fix**: Successfully resolved Arabic sidebar navigation visibility issue
  - **Root causes identified**:
    1. Translation function `t()` was failing to return Arabic text in Arabic mode
    2. Global RTL CSS rule `[dir="rtl"] .flex { flex-direction: row-reverse; }` was breaking flex layouts
  - **Solution implemented**:
    1. Hardcoded Arabic navigation text as fallback when language === 'ar'
    2. Disabled problematic RTL flex CSS rule
  - **Result**: Arabic navigation menu now displays correctly with all menu items visible
  - **Status**: ✅ RESOLVED - Both English and Arabic navigation working properly

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the client-side application
- **Vite** as the build tool and development server
- **Tailwind CSS** with shadcn/ui components for styling
- **Radix UI** primitives for accessible, customizable UI components
- **TanStack Query** for server state management and API interactions
- **Wouter** for client-side routing
- **React Hook Form** with Zod validation for form handling

### Backend Architecture
- **Express.js** server with TypeScript for API endpoints
- **Session-based authentication** using express-session with PostgreSQL storage
- **Role-based access control (RBAC)** with four user roles: ADMIN, RECEPTION, DOCTOR, ACCOUNTANT
- **RESTful API design** with CSRF protection and input validation
- **File upload handling** with Multer for patient documents and medical records
- **Audit logging** for all critical operations

### Database Design
- **PostgreSQL** with Drizzle ORM for type-safe database operations
- **Comprehensive schema** covering:
  - User management with role-based permissions
  - Patient records with medical history
  - Appointment scheduling and status tracking
  - Visit documentation with procedures and diagnoses
  - Billing system with invoices and payment tracking
  - Service catalog with pricing
  - File attachments for patient records
  - Audit trails for compliance

### Internationalization
- **i18next** with filesystem backend for translation management
- **Dual language support** (Arabic and English) with RTL/LTR switching
- **Arabic-first design** with proper RTL layout handling
- **Dynamic language switching** with persistent user preferences

### Security Features
- **Helmet.js** for security headers
- **CSRF protection** on all state-changing operations
- **Bcrypt** for password hashing
- **Input validation** using Zod schemas
- **File upload security** with MIME type validation and size limits
- **Session management** with secure cookie configuration

### State Management
- **Server state** managed through TanStack Query
- **Client state** handled through React hooks and context
- **Form state** managed with React Hook Form
- **Authentication state** persisted in Express sessions

## External Dependencies

### Database
- **PostgreSQL** as the primary database
- **Neon Database** for serverless PostgreSQL hosting
- **Drizzle ORM** for database schema management and queries

### Authentication & Session Management
- **express-session** for server-side session handling
- **connect-pg-simple** for PostgreSQL session store
- **bcrypt** for password hashing and verification

### UI Framework
- **shadcn/ui** component library built on Radix UI
- **Tailwind CSS** for utility-first styling
- **Radix UI** for accessible component primitives
- **Lucide React** for consistent iconography

### Development & Build Tools
- **Vite** for fast development and optimized builds
- **TypeScript** for type safety across the stack
- **ESBuild** for backend bundling
- **PostCSS** with Autoprefixer for CSS processing

### File Handling
- **Multer** for multipart form data and file uploads
- **File system storage** with security validation

### Validation & Security
- **Zod** for schema validation
- **Helmet** for security headers
- **CSURF** for CSRF protection
- **Cookie Parser** for request cookie handling

### Internationalization
- **i18next** core library for translations
- **i18next-fs-backend** for file system translation loading
- **i18next-http-middleware** for Express integration

### Data Fetching
- **TanStack Query** for server state management
- **Native fetch API** for HTTP requests
- **Built-in credential handling** for session-based auth