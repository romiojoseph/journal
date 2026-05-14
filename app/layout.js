import '../styles/globals.css';
import { ModalProvider } from '../context/ModalContext';
import { ToastProvider } from '../context/ToastContext';
import { FontProvider } from '../context/FontContext';
import OnboardingManager from '../components/OnboardingManager';
import SideNav from '../components/SideNav';
import BottomNav from '../components/BottomNav';
import SessionGuard from '../components/SessionGuard';
import VaultTimer from '../components/VaultTimer';
import CompatibilityOverlay from '../components/CompatibilityOverlay';
import db, { isFirstLaunch } from '../lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Journal - Penned Thoughts",
  description:
    "Penned Thoughts is a private, secure digital journal designed to help you capture, organize, and reflect on your life's moments.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:2048/"),
  openGraph: {
    title: "Journal - Penned Thoughts",
    description:
      "Penned Thoughts is a private, secure digital journal designed to help you capture, organize, and reflect on your life's moments.",
    url: "http://127.0.0.1:2048/",
    siteName: "Journal - Penned Thoughts",
    images: [
      {
        url: "/social-image.png",
        width: 1200,
        height: 630,
        alt: "Journal - Penned Thoughts",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Journal - Penned Thoughts",
    description:
      "Penned Thoughts is a private, secure digital journal designed to help you capture, organize, and reflect on your life's moments.",
    images: ["/social-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
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
        <FontProvider>
          <CompatibilityOverlay />
          <ModalProvider>
            <ToastProvider>
              <SessionGuard isPinEnabled={isPinEnabled} />
              <VaultTimer isPinEnabled={isPinEnabled} />
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
            </ToastProvider>
          </ModalProvider>
        </FontProvider>
      </body>
    </html>
  );
}