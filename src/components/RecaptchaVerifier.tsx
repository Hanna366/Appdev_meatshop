/**
 * Platform-agnostic type stub for RecaptchaVerifier.
 *
 * Metro IGNORES this file at runtime and picks the correct platform file:
 *   - RecaptchaVerifier.web.tsx    → web
 *   - RecaptchaVerifier.native.tsx → iOS / Android
 *
 * This file exists only so TypeScript can resolve the extensionless import
 * without chaining through react-native-recaptcha-that-works.
 */
import { forwardRef } from 'react';

export type RecaptchaVerifierRef = {
  /** Open the reCAPTCHA challenge modal */
  open: () => void;
};

type Props = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
};

// Stub component — replaced by Metro at bundle time with the real platform file.
const RecaptchaVerifier = forwardRef<RecaptchaVerifierRef, Props>(
  (_props, _ref) => null,
);

RecaptchaVerifier.displayName = 'RecaptchaVerifier';
export default RecaptchaVerifier;

