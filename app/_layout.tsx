import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
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
