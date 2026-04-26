import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import Recaptcha, { RecaptchaRef } from 'react-native-recaptcha-that-works';

const SITE_KEY =
  process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ?? '';

// Origin must match the domains whitelisted in your reCAPTCHA console.
// 'https://localhost' is accepted for local Expo development.
const ORIGIN = 'https://localhost';

export type RecaptchaVerifierRef = {
  /** Open the reCAPTCHA challenge modal */
  open: () => void;
};

type Props = {
  /** Called with a valid token once the user passes the challenge. */
  onVerify: (token: string) => void;
  /** Called when the token expires (user took too long). */
  onExpire?: () => void;
};

/**
 * Drop-in reCAPTCHA v2 "I'm not a robot" verifier.
 * Render once in your screen, then call `ref.current.open()` to trigger.
 *
 * @example
 * const recaptchaRef = useRef<RecaptchaVerifierRef>(null);
 * // …
 * <RecaptchaVerifier ref={recaptchaRef} onVerify={token => { … }} />
 * // trigger:
 * recaptchaRef.current?.open();
 */
const RecaptchaVerifier = forwardRef<RecaptchaVerifierRef, Props>(
  ({ onVerify, onExpire }, ref) => {
    const recaptchaRef = useRef<RecaptchaRef>(null);

    useImperativeHandle(ref, () => ({
      open: () => recaptchaRef.current?.open(),
    }));

    return (
      <Recaptcha
        ref={recaptchaRef}
        siteKey={SITE_KEY}
        baseUrl={ORIGIN}
        onVerify={onVerify}
        onExpire={onExpire}
        size="normal"
        theme="light"
      />
    );
  },
);

RecaptchaVerifier.displayName = 'RecaptchaVerifier';
export default RecaptchaVerifier;
