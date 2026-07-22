import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, ...props }: TextFieldProps) {
  return (
    <View className="gap-2">
      <Text className="font-sans text-sm font-semibold text-ink-light dark:text-ink-dark">{label}</Text>
      <TextInput
        className="min-h-12 rounded-button border border-line-light bg-surface-light px-4 py-3 font-sans text-[15px] text-ink-light dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark"
        placeholderTextColor="#A8A29E"
        accessibilityLabel={label}
        {...props}
      />
      {error ? <Text className="font-sans text-xs text-danger">{error}</Text> : null}
      {!error && hint ? <Text className="font-sans text-xs text-muted-light dark:text-muted-dark">{hint}</Text> : null}
    </View>
  );
}

