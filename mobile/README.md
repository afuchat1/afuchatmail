# AfuMail Android App

React Native / Expo app for AfuMail — connects to the same Supabase backend as the web app.

## Structure

```
mobile/
├── App.tsx                  # Entry point
├── app.json                 # Expo config (name, bundle ID, icons)
├── eas.json                 # EAS Build config (APK / AAB / Play Store)
├── src/
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client (shared backend)
│   │   └── colors.ts        # Design tokens
│   ├── types/index.ts       # TypeScript types
│   ├── hooks/
│   │   ├── useAuth.ts       # Auth session hook
│   │   └── useEmails.ts     # Email/folder data hooks
│   ├── navigation/index.tsx # Stack + Tab navigation
│   └── screens/
│       ├── AuthScreen.tsx        # Sign in / Sign up
│       ├── InboxScreen.tsx       # Folder email list
│       ├── EmailDetailScreen.tsx # View full email
│       ├── ComposeScreen.tsx     # Write & send email
│       ├── StarredScreen.tsx     # Starred emails
│       └── SettingsScreen.tsx    # Profile & preferences
└── assets/                  # App icons & splash (add PNG files here)
```

## Running Locally

```bash
cd mobile
npm install
npx expo start
# Press 'a' to open Android emulator
# Or scan QR with Expo Go app on your phone
```

## Building APK (for testing / Play Store internal track)

1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Build APK: `eas build --platform android --profile preview`
4. Build AAB (Play Store): `eas build --platform android --profile production`

## Play Store Submission

1. Create app in Google Play Console
2. Set `android.package` in `app.json` to your bundle ID (already set to `com.afuchat.mail`)
3. Download service account key from Google Play Console
4. Place as `google-service-account.json` in `mobile/`
5. Run: `eas submit --platform android`

## Backend

All data comes from the same Supabase project as the web app:
- **URL**: `https://vfcukxlzqfeehhkiogpf.supabase.co`
- **Auth**: Supabase email/password (sessions stored in AsyncStorage)
- **Email sending**: Calls `send-email` Edge Function
- **Realtime**: Can be extended with `supabase.channel()` for live inbox updates
