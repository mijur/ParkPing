# ParkPing Copilot Instructions
## Runtime & Setup
- Install dependencies with `npm install`; project uses Vite 6 + React 19 + TypeScript 5.
- Start dev server via `npm run dev`; Vite serves on http://localhost:3000 with host 0.0.0.0.
- Build and preview using `npm run build` / `npm run preview` to mirror deployment.

## Architecture
- Entry flow: `index.tsx` mounts `App.tsx`, the single page that owns all state and renders role-specific views.
- Core state covers users, parkingSpaces, availabilities, auth, week/view toggles; everything persists to localStorage key `parkping-data`.
- Persistence round-trips via `loadPersistedData`, using sanitize helpers to rebuild `UserRecord`, `ParkingSpace`, `Availability` objects.
- Domain contracts live in `types.ts`; `Availability.startDate/endDate` are real `Date` objects, not ISO strings.

## Domain Model & Persistence
- Always normalize dates with `normalizeDate` / `addDays` before storing to keep comparisons day-based.
- After mutations call `sortAvailabilities` to maintain start-date ordering and stable rendering.
- Claiming a day (`handleClaimDay`) splits ranges into claimed + remaining segments; deletions and overwrites go through `ConfirmationModal`.
- First signed-up user becomes `Role.Admin`; admin privileges drive assignment/add/delete logic in `App.tsx`.

## UI Patterns
- Styling is inline via `React.CSSProperties`; reuse font stack "'Poppins', 'Source Serif Pro', sans-serif" for consistency.
- `ParkingSpaceCard` renders a 7-day grid derived from `weekOffset`; only unclaimed days with availability respond to clicks.
- `OwnerView` uses date inputs backed by `toYYYYMMDD`/`parseYYYYMMDD` to avoid timezone drift.
- Modal components share overlay/click-to-close behavior; call `e.stopPropagation()` inside to prevent accidental dismissal.

## Workflows
- Admins can assign/unassign spots (`AssignOwnerModal`), add new ones (`AddSpotCard`), and delete spots after confirmation.
- Owners expose availability windows; overlapping requests trigger overwrite confirmation unless an overlap is already claimed (hard fail).
- Regular users authenticate via `LoginView`; the handlers return structured `{success,message}` responses for form feedback.
- Users may hold only one spot: `canClaimSpot` + `Undo Claim` enforce the single active booking rule.

## Conventions
- Extending persisted state requires updating `PersistedData`, the initial clone, and the save effect dependencies.
- Mutate availability/parker arrays by copying previous state and re-sorting rather than editing in place.
- Prefer utilities in `utils/dateUtils.ts` when formatting/parsing dates instead of raw `Date` APIs.
- Keep error messaging consistent with existing patterns (plain strings, styled in the hex color FFB8B8).

## Misc
- `constants.ts` and `components/UserSwitcher.tsx` are placeholders; repurpose them or remove unused imports if activating.
- `metadata.json` feeds AI Studio descriptors; update alongside product renames.
- Run `npm run build` before release to catch TypeScript issues early (no dedicated tests yet).
- Manual verification remains essential: cover admin assignment, owner availability, user claim/unclaim flows after changes.
