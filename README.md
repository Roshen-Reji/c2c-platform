# C2C Platform

This is the platform for C2C (Concept to Creation), a comprehensive system featuring registration, and dedicated portals for students, evaluators, organizers, and admins. 

## Features
- **Landing Page**: Information about the C2C event.
- **Registration**: Allows participants to register (data stored via Firebase and Google Sheets).
- **Authentication**: Secure login using Firebase Authentication.
- **Role-based Portals**:
  - Student Portal
  - Evaluator Portal
  - Organizer Portal
  - Admin Portal

## Tech Stack
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: Custom CSS (`globals.css`, `landing.css`, `portal.css`)
- **Animations**: GSAP (`@gsap/react`, `gsap`)
- **Backend & Auth**: Firebase / Firebase Admin
- **Data Integration**: Google Sheets API (for syncing registration data)

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher recommended)
- npm, yarn, pnpm, or bun

You will also need:
1. A **Firebase Project** with Authentication and Firestore/Realtime Database enabled.
2. A **Google Cloud Project** with the Google Sheets API enabled, and a generated Service Account Key.
3. A **Google Sheet** with the appropriate columns for registration data, shared with the Service Account email.

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd c2c-platform
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Variables Configuration

Copy the example environment file to create your local environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the required details:

**Firebase Client Details:**
Find these in your Firebase Project Settings -> General -> Your apps (Web app).
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

**Google Service Account (Server-side):**
For server-side operations (like Firebase Admin and Google Sheets). Go to Google Cloud Console -> IAM & Admin -> Service Accounts -> Create Key (JSON).
Minify the JSON into a single line and set it to:
- `GOOGLE_SERVICE_ACCOUNT_KEY`

**Google Sheets:**
Create a Google Sheet and copy its ID from the URL: `https://docs.google.com/spreadsheets/d/{THIS_IS_THE_ID}/edit`.
Ensure you share the Google Sheet with the `client_email` found in your Service Account JSON with "Editor" access.
- `GOOGLE_SHEET_ID`

### 4. Running the Development Server

Start the Next.js development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `app/`: Next.js App Router pages (admin, evaluator, student, organiser, login, register, etc.)
- `components/`: Reusable React components.
- `lib/`: Utility functions and integrations (`firebase.ts`, `firebase-admin.ts`, `google-sheets.ts`, `auth-context.tsx`).
- `public/`: Static assets.

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new). Ensure you configure all the environment variables in your Vercel project settings before deploying.
