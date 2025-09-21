# Warranty Frontend

## Setup
1. Copy files into `frontend/` (Vite React).
2. `cp env.example .env` and set `VITE_API_URL` (default `http://localhost:4000`).
3. `npm i` then `npm run dev`.
4. Ensure backend uses `APP_URL=http://localhost:5173/verify-email` so emails link to SPA.

## Pages
- `/` Homepage
- `/signin` Sign in
- `/signup` Sign up (tabs: Customer/Store)
- `/verify-email?token=...` Reads token, calls `GET /auth/verify` and shows result.

## Features
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Authentication**: Complete login/signup flow with JWT
- **Role-based Registration**: Separate forms for customers and store owners
- **Email Verification**: Integrated with backend verification system
- **Modern UI**: Clean, professional design with brand colors
- **Thai Language**: Localized interface for Thai users

## Components
- **Button**: Reusable button with brand styling
- **TextInput**: Form input with label and error handling
- **Card**: Consistent card layout component
- **Navbar**: Navigation header with branding
- **Footer**: Company information and links

## Styling
- **Tailwind CSS v4**: Modern utility-first CSS framework
- **Brand Colors**: Custom CSS variables for consistent theming
- **Responsive**: Mobile, tablet, and desktop layouts
- **Accessibility**: Proper contrast and focus states

## API Integration
- **Axios**: HTTP client with interceptors
- **Authentication**: JWT token management
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during API calls

## Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables
```bash
VITE_API_URL=http://localhost:4000
```

## Backend Configuration
Make sure your backend `.env` has:
```bash
APP_URL=http://localhost:5173/verify-email
```

This ensures verification emails link to the frontend SPA instead of the backend API directly.
