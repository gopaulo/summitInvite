# The Summit 25 Invitation System

## Overview

The Summit 25 is an exclusive invitation-only event registration system built with a modern TypeScript stack. The application implements a viral invitation system where attendance is strictly controlled through personal invitation codes, enabling organic network growth through referrals while maintaining exclusivity. The system features a clean, branded interface with comprehensive admin tools for managing attendees, waitlists, and invitation code distribution.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern component-based architecture using functional components and hooks
- **Vite**: Fast development server and build tool optimized for modern frontend development
- **Wouter**: Lightweight client-side routing library for single-page application navigation
- **TanStack Query**: Server state management with caching, background updates, and optimistic updates
- **React Hook Form + Zod**: Type-safe form handling with client-side validation
- **Tailwind CSS + shadcn/ui**: Utility-first styling with pre-built accessible component library
- **Framer Motion**: Animation library for smooth user interactions and transitions

### Backend Architecture
- **Express.js**: Node.js web framework handling API routes and middleware
- **TypeScript**: Type safety across the entire backend codebase
- **Drizzle ORM**: Type-safe database operations with schema-first approach
- **PostgreSQL**: Primary database for storing users, invitation codes, waitlist, and email logs
- **Session-based storage**: User session management using PostgreSQL session store
- **Rate limiting**: API protection with configurable limits for code validation and waitlist submissions

### Database Design
- **Users table**: Core user information with referral tracking through self-referencing foreign keys
- **Invitation codes table**: Single-use codes with expiration and usage tracking
- **Waitlist table**: Priority-based queue system with admin scoring capabilities
- **Email logs table**: Comprehensive audit trail for all email communications
- **Sessions table**: Secure session storage for user authentication

### Authentication & Authorization
- **Session-based authentication**: Server-side session management with secure cookies
- **Role-based access control**: Distinction between regular users and admin privileges
- **Invitation code validation**: Multi-step verification process before registration access

### Email Integration
- **SendGrid API**: Transactional email service for invitation delivery and notifications
- **HTML email templates**: Branded email designs matching The Summit 25 visual identity
- **Email logging**: Complete audit trail of all sent emails with delivery status tracking

### Brand Implementation
- **Custom color palette**: Summit 25 branded colors integrated throughout the application
- **Typography system**: Clean, modern font choices with proper hierarchy
- **Responsive design**: Mobile-first approach ensuring accessibility across all devices
- **Premium visual identity**: Mountain imagery and exclusive event branding

## External Dependencies

### Database Services
- **PostgreSQL**: Primary database hosted on Neon for scalable serverless architecture
- **Drizzle Kit**: Database migration and schema management tooling

### Email Services
- **SendGrid**: Transactional email API for reliable email delivery
- **Email templates**: HTML-based branded email designs for user communications

### UI Components & Styling
- **Radix UI**: Headless component primitives for accessibility and customization
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **shadcn/ui**: Pre-built component library built on Radix UI and Tailwind

### Development Tools
- **Vite**: Development server with hot reload and optimized production builds
- **TypeScript**: Type checking and enhanced developer experience
- **ESBuild**: Fast JavaScript bundler for server-side code compilation

### Third-party Libraries
- **TanStack Query**: Client-side data fetching and caching
- **React Hook Form**: Form state management and validation
- **Zod**: Runtime type validation and schema definition
- **Framer Motion**: Animation and gesture library
- **Express Rate Limit**: API rate limiting middleware
- **Wouter**: Lightweight routing for React applications