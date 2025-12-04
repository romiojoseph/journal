import '../styles/globals.css';
import { ModalProvider } from '../context/ModalContext';
import { FontProvider } from '../context/FontContext'; // NEW
import OnboardingManager from '../components/OnboardingManager';
import SideNav from '../components/SideNav';
import BottomNav from '../components/BottomNav';
import SessionGuard from '../components/SessionGuard';
import db, { isFirstLaunch } from '../lib/db';

export const metadata = {
  title: 'What’s on Your Mind?',
  description: 'Your data, on your terms, in your hands.',
  icons: {
    icon: '/favicon.svg',
  },
};

function getPinStatus() {
  try {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('securityPinEnabled');
    return setting?.value === 'true';
  } catch (e) { return false; }
}

export default function RootLayout({ children }) {
  const isPinEnabled = getPinStatus();

  return (
    <html lang="en">
      <body>
        <FontProvider> {/* NEW WRAPPER */}
          <ModalProvider>
            <SessionGuard isPinEnabled={isPinEnabled} />
            <OnboardingManager isFirstLaunch={isFirstLaunch}>
              <div className="app-container">
                <SideNav isPinEnabled={isPinEnabled} />
                <div className="main-content-wrapper">
                  <main>
                    {children}
                  </main>
                </div>
                <BottomNav isPinEnabled={isPinEnabled} />
              </div>
            </OnboardingManager>
          </ModalProvider>
        </FontProvider>
      </body>
    </html>
  );
}