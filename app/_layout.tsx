import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initFirebase } from '../src/services/firebase/initFirebase';
import { watchAuthState } from '../src/features/auth/services/firebaseAuthService';
import { useAuthStore } from '../src/features/auth/store/useAuthStore';

export default function RootLayout() {
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    initFirebase().then(() => {
      try {
        unsub = watchAuthState(async (fbUser) => {
          if (fbUser) {
            // attempt to load tenant/role mapping from Firestore
            try {
              const { loadUserProfile } = await import('../src/features/auth/services/userProfileService');
              const profile = await loadUserProfile(fbUser.id);
              const merged = {
                ...fbUser,
                tenantId: profile?.tenantId ?? fbUser.tenantId ?? '',
                role: (profile?.role as any) ?? (fbUser.role as any) ?? 'cashier',
                name: profile?.name ?? fbUser.name ?? '',
              } as typeof fbUser;
              setUser(merged);
            } catch (e) {
              setUser(fbUser);
            }
          } else {
            logout();
          }
        });
      } catch (e) {
        // ignore
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, [setUser, logout]);
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#F5F5F0' },
          headerTintColor: '#1B1B18',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#FCFCF8' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="splash" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="products" options={{ title: 'Products' }} />
        <Stack.Screen name="plans" options={{ title: 'Plans & Billing' }} />
      </Stack>
    </>
  );
}
