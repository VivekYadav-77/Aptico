import { Link, useLocation } from 'react-router-dom';
import ApticoLogo from '../components/ApticoLogo.jsx';
import Footer from '../components/Footer.jsx';
import { NAVBAR_HEIGHT } from '../constants/index.js';

export default function LegalPage() {
  const location = useLocation();
  const isPrivacy = location.pathname.includes('privacy');
  
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';
  const lastUpdated = 'May 2026';

  return (
    <div className="app-page bg-[var(--bg)]">
      <header className="glass fixed left-0 right-0 top-0 z-50 border-b border-[var(--border)]">
        <div className="app-container flex items-center justify-between" style={{ height: `${NAVBAR_HEIGHT}px` }}>
          <Link to="/" className="flex items-center gap-3">
            <ApticoLogo className="h-8 w-8" />
            <span className="text-lg font-black tracking-tighter text-[var(--text)]">Aptico</span>
          </Link>
          <Link to="/" className="app-button-secondary px-4 py-1.5 text-xs">Back to Home</Link>
        </div>
      </header>

      <main className="app-container pb-24" style={{ paddingTop: `calc(${NAVBAR_HEIGHT}px + 4rem)` }}>
        <div className="mx-auto max-w-3xl">
          <p className="app-kicker mb-4">Legal Documentation</p>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text)] sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-[var(--muted-strong)]">Last updated: {lastUpdated}</p>
          
          <div className="mt-12 space-y-10 border-t border-[var(--border)] pt-12">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-[var(--text)]">1. Introduction</h2>
              <p className="leading-relaxed text-[var(--muted-strong)]">
                Welcome to Aptico. We are committed to protecting your personal information and your right to privacy. 
                If you have any questions or concerns about our policy, or our practices with regards to your personal information, 
                please contact us at support@aptico.ai.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-[var(--text)]">2. Information We Collect</h2>
              <p className="leading-relaxed text-[var(--muted-strong)]">
                We collect personal information that you voluntarily provide to us when registering at the Aptico platform, 
                expressing an interest in obtaining information about us or our products and services, or otherwise contacting us.
              </p>
            </section>

            <section className="space-y-4">
               <h2 className="text-xl font-bold text-[var(--text)]">3. How We Use Your Information</h2>
               <p className="leading-relaxed text-[var(--muted-strong)]">
                 We use personal information collected via our Services for a variety of business purposes described below. 
                 We process your personal information for these purposes in reliance on our legitimate business interests, 
                 in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
               </p>
            </section>

            <section className="space-y-4">
               <h2 className="text-xl font-bold text-[var(--text)]">4. Data Security</h2>
               <p className="leading-relaxed text-[var(--muted-strong)]">
                 We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. 
                 However, please also remember that we cannot guarantee that the internet itself is 100% secure.
               </p>
            </section>

            <section className="space-y-4">
               <h2 className="text-xl font-bold text-[var(--text)]">5. Your Rights</h2>
               <p className="leading-relaxed text-[var(--muted-strong)]">
                 In some regions, such as the European Economic Area (EEA) and United Kingdom (UK), you have rights that allow you 
                 greater access to and control over your personal information. You may review, change, or terminate your account at any time.
               </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
