# Meatshop Mobile (Expo + TypeScript)

Meatshop Mobile is a React Native and Expo-based inventory and operations management app for a meat shop. It helps manage products, inventory stock-in and stock-out, POS checkout, suppliers, customers, purchase orders, reports, and role-based access using Firebase Firestore as the database.

## Features

- Product management with create, read, update, and delete support
- Inventory tracking for stock-in, stock-out, adjustments, waste, and batch records
- POS checkout with sale recording and inventory deduction
- Supplier and customer management
- Purchase order creation, receiving, and inventory update
- Reporting views for sales, inventory, and purchases
- Firebase Authentication and Firestore database integration
- Offline queue support for POS transactions
- Role-based access controls and subscription feature gates

## Stack

- Expo + React Native
- TypeScript
- Expo Router
- Zustand (persisted via AsyncStorage)
- React Hook Form + Zod
- Firebase Authentication
- Firebase Firestore

## Team

- Ares - Main Programmer
- Carson - Programmer
- Bauyan - UI
- Arbutante - UI
- Gaviola - UI

## Installation / Setup

Install dependencies:

```bash
npm install
```

Configure Firebase using `.env` or `dev.firebase.json`. The project expects Firebase web app values such as API key, auth domain, project ID, storage bucket, messaging sender ID, and app ID.

Start the app:

```bash
npm run start
```

`npm run start` uses LAN mode and works best when your phone and computer are connected to the same network.

If your phone is not on the same network, try:

```bash
npm run start:tunnel
```

Recommended recovery launch:

```bash
npm run start:lan:clear
```

Deploy Firestore rules and indexes:

```bash
npm run deploy:firestore
```

## Project Structure

```text
app/
  _layout.tsx
  index.tsx
  login.tsx
  dashboard.tsx
src/
  components/
    ui/
      PrimaryButton.tsx
      ScreenContainer.tsx
      TextField.tsx
  features/
    auth/
      schema/
        loginSchema.ts
      services/
        authService.ts
      store/
        useAuthStore.ts
      types/
        authTypes.ts
  services/
    api/
      apiClient.ts
```

## Usage Instructions

If you still see "Failed to download remote update" in Expo Go:
- Keep `npm run start` running.
- Re-open the QR from the active terminal session.
- In Expo Go, clear old project sessions and retry.
- Ensure your phone and computer are on the same Wi-Fi/hotspot for LAN mode.
- If tunnel mode fails, your network may block ngrok. Use LAN mode on the same network instead.
- Update Expo Go from Play Store/App Store before retrying.

In Expo Go:
- Open the project from the QR code.
- Demo login credentials: `demo@meatshop.app` / `password123`.

Main app areas:
- Products: add, view, edit, and delete meat products
- Inventory: receive stock, adjust stock, record stock-out, and view inventory summaries
- POS: complete sales and record checkout transactions
- Operations: manage suppliers, customers, and purchase orders
- Reports: view sales, inventory, and purchase summaries
