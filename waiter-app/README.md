# NexusPOS Waiter

React Native (Expo SDK 58 + Expo Router + NativeWind 4) handheld app for floor staff. It talks to the existing `backend/` GraphQL API and database. There is no separate server.

## What waiters can do

- **Sign in with a PIN** on a shared, paired device (pick your name, then enter your PIN). Auto-locks after idle time.
- **Tables:** live floor plan by zone, "Mine" / "Free" / "Needs you" filters, seat guests, take over or hand off tables (manager PIN), mark tables clean.
- **Menu & ordering:** categories, search, modifiers (required/optional), quick kitchen notes, seats and courses (when enabled in the POS), open-price items, sold-out (86) items, "Send to kitchen" or "Hold".
- **Checks:** item status (Not sent → Sent → Cooking → Ready → Served), send unsent items, add items, request bill, split, move table, discount, void or cancel (manager PIN where the POS requires it).
- **Pickup:** the phone buzzes when food is ready at the pass, and items can be marked served.
- **Payments** (if allowed): split ÷N or custom amount, tip presets, cash with change, card / UPI reference.
- **My shift:** clock in/out, sales, tips, covers, average check, open balance.

## Configured from the POS

**POS → Settings → Waiter app**

- Turn the app on or off.
- Choose what waiters can use: tables, menu, takeaway, payments and payment methods, discounts, split, voids, transfers, reservations.
- Workflow options: send to kitchen on submit, require clock-in, item photos, auto-lock minutes.
- Paired devices list, with **Revoke**, which signs everyone on that phone out immediately.

**Per person:** Staff page → set a **PIN**. Roles → **Waiter App** permissions:

- `handheld.access`: lets the person sign in. Built-in WAITER, STAFF and SHIFT_LEAD roles have it.
- `handheld.payments`: lets the person collect payments. Built-in WAITER and SHIFT_LEAD roles have it.

Custom roles created earlier need these permissions ticked.

The backend enforces every switch for requests coming from a handheld. The app hides what's off, and the server refuses it too.

## Run it

```bash
cd waiter-app
npm install
npx expo start          # scan the QR with Expo Go (SDK 58) on the phone
```

1. Start the backend (`cd backend && npm run dev`). The phone must reach it over Wi-Fi, so use your PC's LAN IP (for example `192.168.1.20:5002`), not `localhost`. A Vercel URL also works: the app finds `/graphql` or `/api/graphql` on its own.
2. On the phone, tap **Set up this device**, enter the server address and a **manager/owner** email and password, and name the device.
3. Staff tap their name and enter their PIN.

Optional: copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to prefill the server address.

## Checks

```bash
npm run typecheck
npx eslint src
npx expo-doctor
```

## Structure

```
src/app/            routes (Expo Router)
  pair.tsx          one-time manager pairing
  lock.tsx          staff picker + PIN
  (main)/           tabs: tables, orders, ready (pickup), me
  menu.tsx          ordering
  check/[id].tsx    check detail & actions
  pay/[id].tsx      payment
src/components/     UI kit (NativeWind), PIN pad, manager approval, product sheet
src/lib/            API client, queries, session/cart stores, live sync, formatting
```

## Building a store app

```bash
npx eas-cli@latest build --platform android   # or ios
```

The bundle IDs are `com.nexuspos.waiter`. Change them in `app.json` before publishing.
