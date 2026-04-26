import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

// Keep the browser warm for faster sign-in
WebBrowser.maybeCompleteAuthSession();

/**
 * Initialize Google Sign-In session.
 * This should be called once when your app starts (e.g., in _layout.tsx).
 */
export async function initializeGoogleSignIn(): Promise<void> {
  try {
    // Configuration is done via expo-auth-session/providers/google
    // Make sure EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID and EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID are set
    console.log('Google Sign-In initialized');
  } catch (error) {
    console.error('Failed to initialize Google Sign-In:', error);
  }
}

/**
 * Sign in with Google and return the ID token for Firebase authentication.
 * This function should be called from within a component that has access to useAuthRequest.
 */
export async function signInWithGoogle(request: any, response: any): Promise<string> {
  try {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (!authentication?.idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }
      return authentication.idToken;
    } else if (response?.type === 'cancel') {
      throw new Error('Google Sign-In was cancelled');
    }
    throw new Error('Unknown error during Google Sign-In');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Google Sign-In failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Build the authentication request hook for use in components.
 * This should be called at the component level.
 */
export function useGoogleAuthRequest() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  if (!clientId || clientId.includes('YOUR_')) {
    console.warn('⚠️ Google OAuth Client ID not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env file.');
  }

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: clientId || '',
    androidClientId: androidClientId || '',
    iosClientId: iosClientId || '',
  });

  return { request, response, promptAsync };
}

/**
 * Sign out the user from Google Sign-In.
 */
export async function signOutGoogle(): Promise<void> {
  try {
    console.log('Google Sign-In sign out');
  } catch (error) {
    console.error('Error signing out from Google:', error);
  }
}
