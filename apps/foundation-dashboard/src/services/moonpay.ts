/**
 * MoonPay buy widget (sandbox only).
 *
 * MoonPay requires production widget URLs that carry `walletAddress` to be
 * signed server-side with the secret key. This repository has no signing
 * endpoint, so MoonPay is only offered with a sandbox key (`pk_test_…`), where
 * unsigned URLs are accepted. With a live key the dashboard uses the
 * backend-signed Transak flow (FiatFlowModal) instead.
 *
 * Purchases are never recorded client-side: the wallet balance and history
 * come from the backend once the funds arrive on-chain.
 */

import { MOONPAY_PUBLISHABLE_KEY } from '@/config/env';

const MOONPAY_SANDBOX_BUY_URL = 'https://buy-sandbox.moonpay.com';

/** True when MoonPay can be opened from the browser (sandbox key configured). */
export function isMoonPaySandboxAvailable(): boolean {
  return MOONPAY_PUBLISHABLE_KEY.startsWith('pk_test_');
}

export function buildMoonPaySandboxBuyUrl(walletAddress: string, origin: string): string {
  const params = new URLSearchParams({
    apiKey: MOONPAY_PUBLISHABLE_KEY,
    currencyCode: 'sol',
    defaultCurrencyCode: 'sol',
    walletAddress,
    theme: 'dark',
    colorCode: '#40E0D0',
    redirectURL: origin,
  });
  return `${MOONPAY_SANDBOX_BUY_URL}?${params.toString()}`;
}

/**
 * Open the MoonPay sandbox in a popup. Must be called directly from a click
 * handler. Resolves when the popup is closed; rejects if the browser blocked it.
 */
export function openMoonPaySandboxBuy(walletAddress: string): Promise<void> {
  if (!isMoonPaySandboxAvailable()) {
    return Promise.reject(new Error('Card purchases are not available.'));
  }
  const popup = window.open(
    buildMoonPaySandboxBuyUrl(walletAddress, window.location.origin),
    'moonpay-buy',
    'width=450,height=700,scrollbars=yes,resizable=yes'
  );
  if (!popup) {
    return Promise.reject(new Error('Your browser blocked the MoonPay window. Allow pop-ups for this site and try again.'));
  }
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (popup.closed || Date.now() - startedAt > 30 * 60 * 1000) {
        clearInterval(timer);
        resolve();
      }
    }, 1000);
  });
}
