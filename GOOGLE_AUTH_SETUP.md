# Google Authentication Setup Guide

This guide walks you through setting up Google OAuth authentication for the Meatshop app using Expo Auth Session.

## Prerequisites

- Google Cloud Project
- Firebase Project (already configured)
- Expo development setup

## Step 1: Create Google OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **Credentials** (left sidebar → APIs & Services → Credentials)
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. If prompted, configure the OAuth consent screen first:
   - Choose User Type: **External**
   - Fill in the required information (App name, User support email, etc.)
   - Add yourself as a test user
6. You'll need to create THREE client IDs (Web, Android, and iOS):

### Web Client ID
1. Client ID type: **Web application**
2. Add authorized JavaScript origins and redirect URIs
3. Copy your **Client ID** and note it as `EXPO_PUBLIC_GOOGLE_CLIENT_ID`

### Android Client ID
1. Client ID type: **Android**
2. Get your SHA-1 fingerprint:
   ```bash
   # If using Expo managed build
   eas build --platform android --local
   
   # Or for development:
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
3. Add your app's Package Name (usually `com.yourcompany.meatshop`)
4. Add the SHA-1 fingerprint
5. Copy your **Client ID** and note it as `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

### iOS Client ID
1. Client ID type: **iOS**
2. Add your app's Bundle ID (usually `com.yourcompany.meatshop`)
3. You can add your Team ID as well
4. Copy your **Client ID** and note it as `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

## Step 2: Configure Environment Variables

Update your `.env` file (or create it from `.env.example`):

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID_HERE.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID_HERE.apps.googleusercontent.com
```

Replace with your actual Client IDs from Google Cloud Console.

## Step 3: Install Dependencies

Dependencies are already added to `package.json`. Just install:

```bash
npm install
```

This includes:
- `expo-auth-session` - For OAuth authentication
- `expo-web-browser` - For web browser integration

## Step 4: Configure Firebase

Ensure your Firebase project can accept Google-authenticated users:

1. In Firebase Console → Authentication → Sign-in method
2. Enable **Google** as a sign-in provider
3. Add your Web Client ID to the list of authorized domains

## Step 5: Test Google Sign-In

1. Run the app:
   ```bash
   npm start
   ```

2. For web:
   ```bash
   npm run web
   ```

3. For Android:
   ```bash
   npm run android
   ```

4. For iOS:
   ```bash
   npm run ios
   ```

5. Navigate to the login page and click the "Google" button
6. You should see the Google Sign-In dialog
7. After signing in, you'll be authenticated and redirected to the dashboard

## Troubleshooting

### "Not configured" error
- Ensure all three environment variables are set in `.env`
- The variables must start with `EXPO_PUBLIC_` to be available at runtime
- Restart the dev server after updating `.env`

### "Cannot find module expo-web-browser" or similar
- Run `npm install` again to ensure all dependencies are installed
- Clear node_modules and reinstall if needed: `rm -rf node_modules && npm install`

### No Google Sign-In dialog appears
- Check browser console for error messages
- For Android/iOS, verify the sha-1 fingerprint matches in Google Cloud Console
- Ensure the app's Package Name/Bundle ID matches in Google Cloud Console

### "Invalid Client ID" error
- Verify the Client ID is copied correctly without extra spaces
- Check that you're using the right Client ID for the platform:
  - Web: `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
  - Android: `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
  - iOS: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

### User profile not found after sign-in
- Firebase user is created, but Firestore profile doesn't exist
- You may need to create user profiles in Firestore after first Google sign-in
- Check firestore rules and security settings

## Platform-Specific Configuration

### Android
The Google Sign-In flow will open in the device's browser or Chrome Custom Tab.

### iOS
The Google Sign-In flow will open in Safari View Controller.

### Web
The Google Sign-In flow will open in a new browser tab.

## Security Considerations

- Never commit `.env` files with real credentials to version control
- Use different OAuth credentials for development and production
- Rotate credentials periodically
- Restrict authorized domains and app package names in Google Cloud Console
- Consider requiring email verification for first-time OAuth sign-ups
- Implement rate limiting for auth endpoints

## Additional Resources

- [Expo Auth Session Documentation](https://docs.expo.dev/guides/authentication/#google)
- [Google Sign-In Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Firebase Google Authentication](https://firebase.google.com/docs/auth/web/google-signin)
- [Google Cloud Console](https://console.cloud.google.com/)
