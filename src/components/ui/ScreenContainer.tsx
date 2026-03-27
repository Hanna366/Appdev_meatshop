import type { ReactNode } from 'react';
import { SafeAreaView, ScrollView, type ViewStyle } from 'react-native';

type ScreenContainerProps = {
  children: ReactNode;
  contentStyle?: ViewStyle;
};

export function ScreenContainer({ children, contentStyle }: ScreenContainerProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFCF8' }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 24,
          ...contentStyle,
        }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
