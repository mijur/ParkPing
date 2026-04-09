# ParkPing

ParkPing is a React + Vite parking spot sharing app backed by Supabase authentication, database storage, and realtime updates. It helps admins assign parking spaces, owners publish availability windows, and users claim open days.

## Screenshots

### Guest login

![Guest login screen](https://github.com/user-attachments/assets/9c667e43-6b94-462d-908f-a2c626c497c0)

### Admin dashboard

![Admin dashboard screen](https://github.com/user-attachments/assets/82f97644-3227-4b87-83ea-708fc781dc50)

### Owner availability view

![Owner availability screen](https://github.com/user-attachments/assets/92453e94-318e-4a02-a176-eacd5b4deabe)

### User claiming view

![User claiming screen](https://github.com/user-attachments/assets/77dd0c69-b669-4612-ab92-4b1ecbdb2565)

## Tech stack

- React 19
- TypeScript 5
- Vite 6
- Supabase Auth + Postgres + Realtime

## Run locally

### Prerequisites

- Node.js
- A configured Supabase project for auth and data

### Commands

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
4. Preview the production build:
   ```bash
   npm run preview
   ```

## Core concepts

- Parking spaces can be assigned to an owner.
- Owners publish date ranges when their spot is available.
- Users can claim only one day/spot at a time.
- Claiming a single day splits the original availability into claimed and remaining ranges.
- Availability and parking space changes update in realtime through Supabase subscriptions.

## User types and functionality

### 1. Guest (not signed in)

- Sign up with name, email, and password
- Log in with email and password
- See authentication errors inline when login or signup fails

### 2. Admin

- View all spots in the system
- View assigned/owned spots
- View available spots for the current or next week when in claiming mode
- Switch between filtered and full spot lists
- Navigate between this week and next week when browsing availability
- Add a new parking spot
- Assign an unassigned spot to a user
- Unassign a user from a spot
- Delete an unassigned spot
- Claim an available day if the admin does not already own or claim a spot
- Undo a claimed day

### 3. Owner

- See the parking spot assigned to them
- Review upcoming availability windows for that spot
- Add a new availability range with start and end dates
- Overwrite an existing unclaimed overlapping availability after confirmation
- See who claimed a published day
- Remove an unclaimed availability entry
- Block changes when a requested range overlaps with a claimed availability

### 4. Regular user

- View available spots for the current or next week
- Switch between available-only and all-spots views
- Claim a single available day from a parking spot
- Keep the claimed spot visible at the top of the list
- Undo their claim
- See a notice when they already hold a claimed spot
- Be limited to one active claimed spot at a time

## Typical workflow

1. An admin creates parking spots.
2. The admin assigns a spot to an owner.
3. The owner marks date ranges as available.
4. A regular user claims one available day.
5. The owner and other users immediately see the updated state through realtime sync.

## Project structure

- `App.tsx` - main app flow and role-based rendering
- `components/` - cards, views, and modals
- `hooks/` - app state and modal state hooks
- `services/` - auth, database, availability, spot, and view logic
- `utils/` - date helpers and Supabase client setup
- `supabase/migrations/` - database schema migration

## Notes

- The UI currently displays the product name `SpyroPark` in the app header.
- The repository itself is named `ParkPing`.
