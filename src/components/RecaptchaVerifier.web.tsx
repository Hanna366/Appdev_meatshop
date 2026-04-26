import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ?? '';

declare global {
  interface Window {
    grecaptcha: any;
    _recaptchaCallback?: (token: string) => void;
    _recaptchaExpiredCallback?: () => void;
  }
}

export type RecaptchaVerifierRef = {
  open: () => void;
};

type Props = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
};

/**
 * Web-platform reCAPTCHA v2.
 * Loads the Google reCAPTCHA script directly — no WebView, no ESM issues.
 */
const RecaptchaVerifier = forwardRef<RecaptchaVerifierRef, Props>(
  ({ onVerify, onExpire }, ref) => {
    const [visible, setVisible] = useState(false);
    const widgetIdRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const scriptLoaded = useRef(false);

    // Load reCAPTCHA script once
    useEffect(() => {
      if (scriptLoaded.current || typeof document === 'undefined') return;
      scriptLoaded.current = true;

      const existing = document.getElementById('recaptcha-script');
      if (!existing) {
        const script = document.createElement('script');
        script.id = 'recaptcha-script';
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }, []);

    // Render the widget when the modal opens
    useEffect(() => {
      if (!visible) return;

      const renderWidget = () => {
        if (!containerRef.current || !window.grecaptcha?.render) {
          // Retry until script is ready
          setTimeout(renderWidget, 150);
          return;
        }

        // Read the site key at render time (not module load) to pick up env injection
        const siteKey =
          process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ??
          (typeof window !== 'undefined' ? (window as any).__EXPO_PUBLIC_RECAPTCHA_SITE_KEY : '') ??
          '';

        if (!siteKey) {
          console.error(
            '[RecaptchaVerifier] EXPO_PUBLIC_RECAPTCHA_SITE_KEY is not set. ' +
            'Add it to your .env file and restart the dev server.'
          );
          setVisible(false);
          return;
        }

        // Reset previous widget if exists, then re-render with fresh callbacks
        if (widgetIdRef.current !== null) {
          try { window.grecaptcha.reset(widgetIdRef.current); } catch (_) {}
          widgetIdRef.current = null; // allow re-render below
        }

        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            setVisible(false);
            onVerify(token);
          },
          'expired-callback': () => {
            onExpire?.();
          },
          theme: 'light',
        });
      };

      renderWidget();
    }, [visible, onVerify, onExpire]);


    useImperativeHandle(ref, () => ({
      open: () => {
        setVisible(true);
      },
    }));

    const handleClose = () => {
      setVisible(false);
      if (widgetIdRef.current !== null && window.grecaptcha) {
        try { window.grecaptcha.reset(widgetIdRef.current); } catch (_) {}
      }
    };

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Security Check</Text>
            <Text style={styles.subtitle}>
              Please verify you&apos;re not a robot to continue.
            </Text>

            {/* Native ref trick: cast to any so TypeScript is happy */}
            <View
              style={styles.recaptchaWrap}
              ref={(el: any) => {
                if (el) containerRef.current = el as unknown as HTMLDivElement;
              }}
            />

            <Pressable onPress={handleClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  },
);

RecaptchaVerifier.displayName = 'RecaptchaVerifier';
export default RecaptchaVerifier;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: 340,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1B16',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#7F786D',
    marginBottom: 18,
    textAlign: 'center',
  },
  recaptchaWrap: {
    marginBottom: 16,
    minHeight: 78,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: '#6B1F27',
    fontWeight: '600',
    fontSize: 14,
  },
});
