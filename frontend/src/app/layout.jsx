import Providers from './providers.jsx';
import './globals.css';

export const metadata = {
  title: {
    default: 'Aptico',
    template: '%s | Aptico'
  },
  description: 'Aptico helps job seekers analyze resumes, find jobs, build public profiles, and stay accountable with squads.',
  icons: {
    icon: [
      { url: '/aptico-logo.svg', type: 'image/svg+xml' }
    ],
    shortcut: '/aptico-logo.svg'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&family=Material+Symbols+Outlined:FILL,GRAD,opsz,wght@0..1,-50..200,20..48,100..700&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
