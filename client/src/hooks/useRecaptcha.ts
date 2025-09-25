import { useEffect, useState } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

interface UseRecaptchaOptions {
  action: string;
}

export function useRecaptcha({ action }: UseRecaptchaOptions) {
  const [isReady, setIsReady] = useState(false);
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LdBOdQrAAAAAHdGAB6ubfFjpDmQ1F_Ox5XOfGut'; // Fallback to public site key

  useEffect(() => {
    if (!siteKey) {
      console.warn('reCAPTCHA site key not found in environment variables');
      return;
    }

    // Load reCAPTCHA script if not already loaded
    if (!document.querySelector('script[src*="recaptcha"]')) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Wait for reCAPTCHA to be ready
    const checkReady = () => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          setIsReady(true);
        });
      } else {
        setTimeout(checkReady, 100);
      }
    };

    checkReady();
  }, [siteKey]);

  const executeRecaptcha = async (): Promise<string | null> => {
    if (!isReady || !window.grecaptcha || !siteKey) {
      console.warn('reCAPTCHA not ready or site key missing');
      return null;
    }

    try {
      const token = await window.grecaptcha.execute(siteKey, { action });
      return token;
    } catch (error) {
      console.error('reCAPTCHA execution failed:', error);
      return null;
    }
  };

  return {
    isReady,
    executeRecaptcha,
  };
}