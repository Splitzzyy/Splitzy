// Google OAuth Web Client ID (same as web app — used as the "audience" for id_token validation)
export const GOOGLE_WEB_CLIENT_ID =
  "181191664943-7db5glvs01ifeno7o78kotd9ujv910db.apps.googleusercontent.com";

// Google OAuth Android Client ID — create one at:
// Google Cloud Console > Credentials > Create OAuth Client ID > Android
// Package name: com.splitzy.app
// SHA-1: run `cd android && ./gradlew signingReport`
// Leave empty to use Expo proxy flow (works but opens browser twice)
export const GOOGLE_ANDROID_CLIENT_ID =
  "181191664943-fp33jjr45jj0t4396vl7cc6rrnscio20.apps.googleusercontent.com";
