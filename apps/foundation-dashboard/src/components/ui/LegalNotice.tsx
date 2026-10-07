'use client';

import { useT } from '@/i18n/I18nProvider';
import { PRIVACY_URL, TERMS_URL } from '@/config/env';

const linkClass = 'text-white underline hover:text-[#40E0D0] transition-colors cursor-pointer';

/** "You agree to the Terms and Privacy Policy" line shown under onboarding screens. */
export function LegalNotice({ className = 'text-[#636466] text-xs text-center max-w-sm mx-auto px-6' }: { className?: string }) {
  const t = useT();
  return (
    <p className={className}>
      {t.onboarding?.signUp?.termsText || 'You acknowledge that you have read and agree to'}{' '}
      <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {t.onboarding?.signUp?.termsLink || "Swarp Foundation's Terms"}
      </a>{' '}
      {t.onboarding?.signUp?.and || 'and'}{' '}
      <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {t.onboarding?.signUp?.privacyLink || 'Privacy Policy'}
      </a>
      .
    </p>
  );
}
