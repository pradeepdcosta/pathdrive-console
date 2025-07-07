import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app";
import { Geist } from "next/font/google";
import { useEffect } from "react";

import { api } from "~/utils/api";
import { ThemeProvider } from "~/contexts/ThemeContext";

import "~/styles/globals.css";

const geist = Geist({
  subsets: ["latin"],
});

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  useEffect(() => {
    // Global Google Maps error suppression
    if (typeof window !== 'undefined') {
      // Suppress the "Do you own this website?" alert
      (window as any).gm_authFailure = function() {
        console.warn('Google Maps API authentication failed - suppressed popup');
      };

      // Override window.alert to suppress Google Maps alerts
      const originalAlert = window.alert;
      window.alert = function(message: any) {
        if (typeof message === 'string' && (
          message.includes('Google Maps') ||
          message.includes('own this website') ||
          message.includes('API key') ||
          message.includes('InvalidKeyMapError') ||
          message.includes('APIKeyInvalidMapError')
        )) {
          console.warn('Suppressed Google Maps alert:', message);
          return;
        }
        return originalAlert.call(window, message);
      };
    }
  }, []);

  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        <div className={geist.className}>
          <Component {...pageProps} />
        </div>
      </ThemeProvider>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
