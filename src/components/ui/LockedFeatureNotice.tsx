import { Text, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';

type LockedFeatureNoticeProps = {
  title: string;
  message: string;
  requiredPlan?: string;
  onUpgradePress?: () => void;
};

export function LockedFeatureNotice({
  title,
  message,
  requiredPlan,
  onUpgradePress,
}: LockedFeatureNoticeProps) {
  return (
    <View
      style={{
        backgroundColor: '#FFF6E8',
        borderColor: '#F2D5A8',
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        gap: 10,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#6E3D02' }}>{title}</Text>
      <Text style={{ color: '#7A5221', lineHeight: 20 }}>{message}</Text>
      {requiredPlan ? (
        <Text style={{ color: '#8A5F2A' }}>Upgrade to {requiredPlan} to unlock this feature.</Text>
      ) : null}
      {onUpgradePress ? <PrimaryButton label="Upgrade Plan" onPress={onUpgradePress} /> : null}
    </View>
  );
}
