import React, { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { adjustStock, createWasteLog } from '../../src/features/inventory/services/inventoryService';
import { useTenantStore } from '../../src/features/tenant/store/useTenantStore';
import { useAuthStore } from '../../src/features/auth/store/useAuthStore';

export default function AdjustRoute() {
  const router = useRouter();
  const productId = (router as any).params?.productId;
  const batchId = (router as any).params?.batchId;
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const user = useAuthStore((s) => s.user);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  async function submit() {
    if (!tenantId || !productId) return;
    const qty = Number(quantity);
    if (!qty || qty === 0) return Alert.alert('Invalid quantity');
    if (!reason) return Alert.alert('Provide a reason');
    try {
      // If negative adjustment against a specific batch, record as waste on that batch.
      if (qty < 0 && batchId) {
        await createWasteLog({ tenantId, productId: String(productId), batchId: String(batchId), quantity: Math.abs(qty), reason, userId: user?.id });
      } else {
        await adjustStock({ tenantId, productId: String(productId), quantity: qty, reason, userId: user?.id });
      }
      router.back();
    } catch (err: any) {
      Alert.alert('Failed', String(err?.message ?? err));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Stock Adjustment' }} />
      <View style={styles.form}>
        <Text style={styles.label}>Product</Text>
        <Text style={styles.value}>{String(productId)}</Text>

        <Text style={styles.label}>Quantity (+ or -)</Text>
        <TextInput keyboardType="numeric" value={quantity} onChangeText={setQuantity} style={styles.input} />

        <Text style={styles.label}>Reason</Text>
        <TextInput value={reason} onChangeText={setReason} style={styles.input} />

        <Pressable style={styles.button} onPress={submit}>
          <Text style={styles.buttonText}>Adjust</Text>
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
