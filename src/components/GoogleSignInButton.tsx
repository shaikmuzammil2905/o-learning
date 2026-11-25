import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
              shape?: 'rectangular' | 'pill';
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  mode: 'signin' | 'signup';
  onCredential: (credential: string) => void;
  onError?: (msg: string) => void;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export function GoogleSignInButton({ mode, onCredential, onError }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return;

    const renderBtn = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return;
      containerRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            callbackRef.current(response.credential);
          } else {
            onError?.('Google sign-in did not return a credential.');
          }
        },
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        text: mode === 'signup' ? 'signup_with' : 'signin_with',
        shape: 'rectangular',
        width: 360,
      });
    };

    if (window.google?.accounts?.id) {
      renderBtn();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-gsi="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', renderBtn);
      return () => existingScript.removeEventListener('load', renderBtn);
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = 'true';
    script.onload = renderBtn;
    script.onerror = () => onError?.('Failed to load Google Sign-In script.');
    document.head.appendChild(script);
  }, [mode, onError]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className="w-full flex justify-center">
      <div ref={containerRef} className="w-full flex justify-center min-h-[44px]" />
    </div>
  );
}
