import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuditLogStore } from '../src/features/audit/store/useAuditLogStore';
import { loginSchema, type LoginFormValues } from '../src/features/auth/schema/loginSchema';
import { authService } from '../src/features/auth/services/authService';
import { useAuthStore } from '../src/features/auth/store/useAuthStore';
import { useTenantStore } from '../src/features/tenant/store/useTenantStore';
import RecaptchaVerifier, { type RecaptchaVerifierRef } from '../src/components/RecaptchaVerifier';

// ─── Sub-components ──────────────────────────────────────────────────────────

type FormInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  errorText?: string;
};

function FormInput({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  errorText,
}: FormInputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, errorText ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor="#A29E97"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
    </View>
  );
}

type SocialButtonProps = {
  label: string;
};

function SocialButton({ label }: SocialButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => Alert.alert('Info', `${label} sign-in is coming soon.`)}
      style={({ pressed }) => [styles.socialButton, pressed ? styles.socialButtonPressed : null]}
    >
      <Text style={styles.socialButtonText}>{label}</Text>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setActiveTenant = useTenantStore((state) => state.setActiveTenant);
  const appendAuditEvent = useAuditLogStore((state) => state.appendEvent);

  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifierRef>(null);

  const {
    control,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onSubmit',
  });

  /** Called by RecaptchaVerifier when the user passes the challenge. */
  const handleRecaptchaVerify = async (token: string) => {
    setRecaptchaToken(token);
    const values = getValues();
    setIsLoginLoading(true);
    try {
      const user = await authService.login(values);
      setUser(user);
      setActiveTenant(user.tenantId);
      appendAuditEvent({
        id: `audit_${Date.now()}`,
        tenantId: user.tenantId,
        userId: user.id,
        action: 'auth.login',
        createdAt: new Date().toISOString(),
      });
      router.replace('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Login failed', message);
    } finally {
      setIsLoginLoading(false);
    }
  };

  /** Token expires after 2 minutes — clear it so the user must re-verify. */
  const handleRecaptchaExpire = () => {
    setRecaptchaToken(null);
  };

  /** Validate the form first; only open reCAPTCHA if inputs are valid. */
  const onSubmit = async () => {
    const valid = await trigger();
    if (!valid) return;
    recaptchaRef.current?.open();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="cover"
              accessibilityLabel="Meatshop logo"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Sign In to Your Account</Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Email or Username"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@company.com"
                errorText={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormInput
                label="Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                placeholder="Enter your password"
                errorText={errors.password?.message}
              />
            )}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => Alert.alert('Info', 'Password reset flow is coming soon.')}
            style={styles.forgotWrap}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onSubmit}
            disabled={isLoginLoading}
            style={({ pressed }) => [
              styles.loginButton,
              isLoginLoading ? styles.loginButtonDisabled : null,
              pressed && !isLoginLoading ? styles.loginButtonPressed : null,
            ]}
          >
            <View style={styles.loginButtonInner}>
              {isLoginLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>LOGIN</Text>
              )}
              {recaptchaToken && !isLoginLoading ? (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>✓</Text>
                </View>
              ) : null}
            </View>
          </Pressable>

          {/* reCAPTCHA — opens as a modal when LOGIN is pressed */}
          <RecaptchaVerifier
            ref={recaptchaRef}
            onVerify={handleRecaptchaVerify}
            onExpire={handleRecaptchaExpire}
          />

          <Text style={styles.dividerText}>Or sign in with</Text>

          <View style={styles.socialRow}>
            <SocialButton label="Google" />
            <SocialButton label="Facebook" />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => Alert.alert('Info', 'Account registration flow is coming soon.')}
            style={styles.footerWrap}
          >
            <Text style={styles.footerText}>New here? Create an Account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F0',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  logoSection: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    marginBottom: 0,
  },
  logoWrap: {
    width: '100%',
    maxWidth: 390,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '125%',
    height: '125%',
    transform: [{ scale: 1.12 }],
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#E7E1D8',
    shadowColor: '#16120B',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6B1F27',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: '#2A2620',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D8D2C8',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    color: '#1F1B16',
    fontSize: 15,
  },
  inputError: {
    borderColor: '#A42836',
  },
  errorText: {
    marginTop: 4,
    color: '#A42836',
    fontSize: 12,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  forgotText: {
    color: '#6B1F27',
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#6B1F27',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  loginButtonPressed: {
    opacity: 0.9,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    backgroundColor: '#2E7D32',
    borderRadius: 99,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  dividerText: {
    textAlign: 'center',
    color: '#7F786D',
    fontSize: 13,
    marginBottom: 10,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  socialButton: {
    minWidth: 110,
    borderWidth: 1,
    borderColor: '#DCCFC7',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  socialButtonPressed: {
    backgroundColor: '#F7F4EF',
  },
  socialButtonText: {
    color: '#3A342B',
    fontSize: 13,
    fontWeight: '600',
  },
  footerWrap: {
    alignItems: 'center',
  },
  footerText: {
    color: '#6B1F27',
    fontSize: 13,
    fontWeight: '600',
  },
});
