import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ?? '';
const BASE_URL = 'https://localhost';

export type RecaptchaVerifierRef = {
  open: () => void;
};

type Props = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
};

type RecaptchaMessage =
  | { type: 'loaded' }
  | { type: 'verify'; token: string }
  | { type: 'expire' }
  | { type: 'error'; message: string };

function buildRecaptchaHtml(siteKey: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: Arial, sans-serif;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
      }
      #app {
        width: 100%;
        display: flex;
        justify-content: center;
      }
      #recaptcha {
        min-height: 78px;
      }
      .error {
        color: #a42836;
        text-align: center;
        font-size: 14px;
        line-height: 1.4;
      }
    </style>
    <script>
      function postMessage(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function renderRecaptcha() {
        if (!window.grecaptcha || !window.grecaptcha.render) {
          window.setTimeout(renderRecaptcha, 150);
          return;
        }

        if (!"${siteKey}") {
          postMessage({ type: "error", message: "Missing reCAPTCHA site key." });
          return;
        }

        try {
          window.grecaptcha.render("recaptcha", {
            sitekey: "${siteKey}",
            callback: function(token) {
              postMessage({ type: "verify", token: token });
            },
            "expired-callback": function() {
              postMessage({ type: "expire" });
            },
            "error-callback": function() {
              postMessage({ type: "error", message: "reCAPTCHA could not be completed." });
            },
            theme: "light"
          });
          postMessage({ type: "loaded" });
        } catch (error) {
          postMessage({ type: "error", message: String(error && error.message ? error.message : error) });
        }
      }
    </script>
    <script
      src="https://www.google.com/recaptcha/api.js?onload=renderRecaptcha&render=explicit"
      async
      defer
    ></script>
  </head>
  <body>
    <div id="app">
      <div id="recaptcha"></div>
    </div>
  </body>
</html>`;
}

const RecaptchaVerifier = forwardRef<RecaptchaVerifierRef, Props>(
  ({ onVerify, onExpire }, ref) => {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const html = useMemo(() => buildRecaptchaHtml(SITE_KEY), []);

    useImperativeHandle(ref, () => ({
      open: () => {
        setErrorMessage(null);
        setLoading(true);
        setVisible(true);
      },
    }));

    function closeVerifier(triggerExpire = true) {
      setVisible(false);
      setLoading(false);
      if (triggerExpire) {
        onExpire?.();
      }
    }

    function handleMessage(rawData: string) {
      try {
        const message = JSON.parse(rawData) as RecaptchaMessage;

        if (message.type === 'loaded') {
          setLoading(false);
          return;
        }

        if (message.type === 'verify') {
          setVisible(false);
          setLoading(false);
          setErrorMessage(null);
          onVerify(message.token);
          return;
        }

        if (message.type === 'expire') {
          setLoading(false);
          onExpire?.();
          return;
        }

        if (message.type === 'error') {
          setLoading(false);
          setErrorMessage(message.message);
        }
      } catch (error) {
        setLoading(false);
        setErrorMessage(String(error instanceof Error ? error.message : error));
      }
    }

    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => closeVerifier()}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Security Check</Text>
            <Text style={styles.subtitle}>Please complete the Google reCAPTCHA challenge to continue.</Text>

            {!SITE_KEY ? (
              <View style={styles.messageWrap}>
                <Text style={styles.errorText}>
                  `EXPO_PUBLIC_RECAPTCHA_SITE_KEY` is missing from your environment.
                </Text>
              </View>
            ) : (
              <View style={styles.webviewWrap}>
                <WebView
                  originWhitelist={['*']}
                  source={{ html, baseUrl: BASE_URL }}
                  onMessage={(event) => handleMessage(event.nativeEvent.data)}
                  javaScriptEnabled
                  domStorageEnabled
                  thirdPartyCookiesEnabled
                  setSupportMultipleWindows={false}
                  mixedContentMode="compatibility"
                  style={styles.webview}
                />

                {loading ? (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#6B1F27" />
                    <Text style={styles.loadingText}>Loading reCAPTCHA...</Text>
                  </View>
                ) : null}
              </View>
            )}

            {errorMessage ? (
              <View style={styles.messageWrap}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Pressable onPress={() => closeVerifier()} style={styles.cancelButton}>
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5DED1',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#241B16',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#51483E',
    marginBottom: 14,
  },
  webviewWrap: {
    height: 220,
    borderWidth: 1,
    borderColor: '#E5DED1',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    fontSize: 13,
    color: '#6A655B',
    fontWeight: '600',
  },
  messageWrap: {
    marginTop: 12,
    marginBottom: 4,
  },
  errorText: {
    color: '#A42836',
    fontSize: 13,
    lineHeight: 18,
  },
  cancelButton: {
    alignSelf: 'flex-end',
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B1F27',
  },
});
