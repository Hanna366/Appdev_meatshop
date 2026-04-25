import React, { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createWasteLog } from '../../src/features/inventory/services/inventoryService';
import { useTenantStore } from '../../src/features/tenant/store/useTenantStore';
import { useAuthStore } from '../../src/features/auth/store/useAuthStore';

export default function WasteRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ batchId?: string; productId?: string }>();
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const batchId = Array.isArray(params.batchId) ? params.batchId[0] : params.batchId;
  const tenantId = useTenantStore((state) => state.activeTenantId);
  const user = useAuthStore((state) => state.user);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Spoilage');

  async function submit() {
    if (!tenantId || !productId) {
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return Alert.alert('Invalid quantity');
    }

    try {
      await createWasteLog({
        tenantId,
        productId: String(productId),
        batchId: batchId ?? undefined,
        quantity: qty,
        reason,
        userId: user?.id,
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Failed', String(error?.message ?? error));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Log Waste' }} />
      <View style={styles.form}>
        <Text style={styles.label}>Product</Text>
        <Text style={styles.value}>{String(productId)}</Text>

        <Text style={styles.label}>Quantity</Text>
        <TextInput keyboardType="numeric" value={quantity} onChangeText={setQuantity} style={styles.input} />

        <Text style={styles.label}>Reason</Text>
        <TextInput value={reason} onChangeText={setReason} style={styles.input} />

        <Pressable style={styles.button} onPress={submit}>
          <Text style={styles.buttonText}>Log Waste</Text>
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
