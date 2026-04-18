import React from 'react';
import { Stack } from 'expo-router';
import InventoryListScreen from '../../src/features/inventory/screens/InventoryList';

export default function InventoryRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Inventory' }} />
      <InventoryListScreen />
    </>
  );
}
