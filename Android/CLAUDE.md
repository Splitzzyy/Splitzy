# Splitzy Mobile App - Development Guidelines

## Overview
React Native (Expo SDK 55) mobile app for the Splitzy expense sharing platform. Cross-platform (Android + iOS) connecting to the existing .NET 8 backend API.

## Tech Stack
- **Runtime**: Expo SDK 55, React Native 0.83, React 19
- **Routing**: Expo Router (file-based, wraps React Navigation)
- **State**: Zustand (stores in `src/stores/`)
- **Styling**: NativeWind v4 (Tailwind for RN)
- **HTTP**: Axios with JWT interceptors (`src/services/api/client.ts`)
- **Animation**: react-native-reanimated, Lottie, Moti
- **Icons**: @expo/vector-icons (MaterialCommunityIcons)
- **Forms**: react-hook-form + zod
- **Storage**: expo-secure-store (auth tokens)
- **Haptics**: expo-haptics

## Commands
```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npx tsc --noEmit   # Type check
```

## Project Structure
```
src/
  app/           # Expo Router file-based routes
    (auth)/      # Auth stack (login, register, forgot-password, verify-email)
    (tabs)/      # Bottom tab nav (index=dashboard, groups, activity, profile)
    group/       # Group detail [id]
    expense/     # Expense add & detail [id]
  components/    # Reusable UI components
    ui/          # Primitives (GlassCard, Button, Input, Badge, Avatar, etc.)
    layout/      # ScreenWrapper, Header
    dashboard/   # Dashboard-specific components
    groups/      # Group list components
    group-detail/ # Group detail components
    activity/    # Activity feed components
    expense/     # Expense form components
    settle/      # Settle up components
    auth/        # Auth form components
  services/api/  # API client and endpoint services
  stores/        # Zustand state stores
  theme/         # Colors, typography, spacing, platform detection
  hooks/         # Custom React hooks
  utils/         # Formatters, validators
  types/         # TypeScript type definitions
  constants/     # API endpoints, categories
```

## Design System
- **Primary**: `#256af4` | **Background**: `#0a0f18`
- **Positive**: emerald-400 (`#34d399`) | **Negative**: rose-400 (`#fb7185`)
- **Glass panels**: `rgba(255,255,255,0.03)` with blur(20px) on iOS, solid on Android
- **Font**: Inter (Android), SF Pro/System (iOS)
- Design references in `../stitch/` directory

## Code Conventions
- TypeScript strict mode, all files `.ts` or `.tsx`
- Path alias: `@/` maps to `./src/`
- Components: PascalCase files (e.g., `GlassCard.tsx`)
- Services/utils: camelCase files (e.g., `formatCurrency.ts`)
- Use NativeWind `className` for styling, fall back to `StyleSheet` only when needed
- Platform-specific code: `Platform.select()` or `platform.ts` helpers
- Haptic feedback on user interactions (button press, tab switch, success/error)

## Platform Theming
- **Android**: Material Expressive design, predictive back gestures enabled, semi-transparent glass cards
- **iOS**: Apple glass design with expo-blur BlurView, SF Pro font, native swipe-back

## API
- Base URL: `https://splitzy.aarshiv.xyz`
- All endpoints defined in `src/constants/endpoints.ts`
- Auth: JWT Bearer token + refresh token (mobile gets refresh token in response body via `X-Platform: mobile` header)
- Types mirror backend DTOs in `src/types/api.types.ts`

## Important Notes
- Always keep `MEMORY.md` updated when completing milestones
- Run `npx tsc --noEmit` before considering work complete
- Test on both Android and iOS when making platform-specific changes
- Do NOT modify files outside the `Android/` directory unless explicitly needed (e.g., backend auth changes)
