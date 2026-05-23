import Providers from './providers.jsx';
import './globals.css';

export const metadata = {
  title: {
    default: 'Aptico',
    template: '%s | Aptico'
  },
  description: 'Aptico helps job seekers analyze resumes, find jobs, build public profiles, and stay accountable with squads.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
