# Meatshop Mobile (Expo + TypeScript)

A production-ready React Native starter using Expo Go with a modular, feature-based architecture.

## Stack

- Expo + React Native
- TypeScript
- Expo Router
- Zustand (persisted via AsyncStorage)
- React Hook Form + Zod

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

## Run

```bash
npm install
npm run start
```

`npm run start` uses LAN mode (fastest) and works when your phone and computer are on the same network.

If your phone is not on the same network, try:

```bash
npm run start:tunnel
```

Recommended recovery launch:

```bash
npm run start:lan:clear
```

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
