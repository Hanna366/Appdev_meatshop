import { Pressable, Text } from 'react-native';

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: isPrimary ? '#A53C21' : '#E8E3DA',
        borderColor: isPrimary ? '#A53C21' : '#D3CCC0',
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      <Text
        style={{
          textAlign: 'center',
          fontSize: 16,
          fontWeight: '600',
          color: isPrimary ? '#FFFDF8' : '#2F2B24',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
