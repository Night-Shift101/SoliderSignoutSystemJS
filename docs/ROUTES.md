# Route Structure Documentation

## Overview
The application routes have been refactored into separate, organized files for better maintainability and separation of concerns.

## Route Files

### 1. `/src/routes/main.js`
**Purpose**: Handles main page routes and navigation
- `GET /` - Main dashboard (requires authentication)
- `GET /login` - Login page (guest only)
- `GET /health` - Health check endpoint
- `GET /api` - API information endpoint

### 2. `/src/routes/auth.js`
**Purpose**: Authentication and session management
- `POST /api/auth/system` - System password authentication
- `POST /api/auth/user` - User PIN authentication
- `POST /api/auth/logout` - Logout and session destruction
- `GET /api/auth/status` - Check authentication status

### 3. `/src/routes/users.js`
**Purpose**: User management operations
- `GET /api/users/` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id/activate` - Activate user account
- `PATCH /api/users/:id/deactivate` - Deactivate user account

### 4. `/src/routes/signouts.js`
**Purpose**: Sign-out management operations
- `GET /api/signouts/` - Get all signouts (with optional filters)
- `GET /api/signouts/:id` - Get signout by ID
- `POST /api/signouts/` - Create new signout
- `PATCH /api/signouts/:id/signin` - Sign in soldiers
- `PATCH /api/signouts/:id` - Update signout details
- `DELETE /api/signouts/:id` - Delete signout
- `GET /api/signouts/reports/overdue` - Get overdue signouts
- `GET /api/signouts/reports/current` - Get current signouts
- `GET /api/signouts/export/csv` - Export signouts to CSV

### 5. `/src/routes/settings.js`
**Purpose**: System settings and administration
- `GET /api/settings/` - Get system settings
- `PUT /api/settings/max-duration` - Update max sign-out duration
- `PUT /api/settings/warning-threshold` - Update warning threshold
- `GET /api/settings/export` - Export all data
- `POST /api/settings/backup` - Create system backup
- `DELETE /api/settings/clear-records` - Clear old records
- `POST /api/settings/reset` - Reset entire system

## Middleware

### `/src/middleware/auth.js`
**Purpose**: Centralized authentication middleware
- `requireAuth` - Requires user authentication
- `requireSystemAuth` - Requires system authentication
- `requireBothAuth` - Requires both user and system authentication
- `verifyPin` - Verifies user PIN for sensitive operations
- `requirePageAuth` - Page redirect authentication for HTML routes
- `requireGuest` - Ensures user is not authenticated (for login page)
- `handleValidationErrors` - Standardized validation error handling

## Benefits of Refactoring

1. **Separation of Concerns**: Each route file handles a specific domain
2. **Maintainability**: Easier to find and modify specific functionality
3. **Reusable Middleware**: Centralized authentication logic
4. **Consistent Error Handling**: Standardized validation and error responses
5. **Scalability**: Easy to add new routes and features
6. **Security**: Proper middleware enforcement across all routes

## Route Naming Convention

- **Main routes**: Direct paths (`/`, `/login`)
- **API routes**: Prefixed with `/api/` followed by resource name
- **Authentication**: `/api/auth/*`
- **Resources**: `/api/{resource}/` for collections, `/api/{resource}/:id` for specific items
- **Actions**: `/api/{resource}/:id/{action}` for specific operations
- **Reports**: `/api/{resource}/reports/{type}` for data reports
- **Export**: `/api/{resource}/export/{format}` for data export

## Security Features

- All API routes require appropriate authentication
- PIN verification for sensitive operations (create, update, delete)
- Input validation on all endpoints
- Rate limiting applied globally
- Session-based authentication
- CORS and security headers configured
