import { Text, TextInput, type TextInputProps, View } from 'react-native';

type TextFieldProps = TextInputProps & {
  label: string;
  errorText?: string;
};

export function TextField({ label, errorText, ...props }: TextFieldProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#2B2B25', fontSize: 14, fontWeight: '600' }}>{label}</Text>
      <TextInput
        {...props}
        style={{
          borderWidth: 1,
          borderColor: errorText ? '#B42318' : '#CFC8BA',
          backgroundColor: '#FEFEFC',
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 15,
          color: '#1F1F19',
        }}
      />
      {errorText ? <Text style={{ color: '#B42318', fontSize: 13 }}>{errorText}</Text> : null}
    </View>
  );
}
