import React, { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createStockOut } from '../../src/features/inventory/services/inventoryService';
import { useTenantStore } from '../../src/features/tenant/store/useTenantStore';
import { useAuthStore } from '../../src/features/auth/store/useAuthStore';

export default function StockOutRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId?: string }>();
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const tenantId = useTenantStore((state) => state.activeTenantId);
  const user = useAuthStore((state) => state.user);
  const [quantity, setQuantity] = useState('');

  async function submit() {
    if (!tenantId || !productId) {
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return Alert.alert('Invalid quantity');
    }

    try {
      await createStockOut(tenantId, String(productId), qty, user?.id);
      router.back();
    } catch (error: any) {
      Alert.alert('Failed', String(error?.message ?? error));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Stock Out' }} />
      <View style={styles.form}>
        <Text style={styles.label}>Product</Text>
        <Text style={styles.value}>{String(productId)}</Text>

        <Text style={styles.label}>Quantity</Text>
        <TextInput keyboardType="numeric" value={quantity} onChangeText={setQuantity} style={styles.input} />

        <Pressable style={styles.button} onPress={submit}>
          <Text style={styles.buttonText}>Consume</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F6F3' },
  form: { padding: 16 },
  label: { fontWeight: '700', marginTop: 12 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5DED1', padding: 10, borderRadius: 8, marginTop: 6 },
  value: { marginTop: 6, color: '#1F1C17' },
  button: { marginTop: 18, backgroundColor: '#B23A1D', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: '700' },
});
