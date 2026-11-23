/**
 * Veriff identity verification.
 *
 * The InContext SDK is bundled from npm (`@veriff/incontext-sdk`) instead of
 * being injected from cdn.veriff.me at runtime, so no third-party script runs
 * on this origin. The SDK only renders an iframe pointing at the Veriff session
 * URL returned by our backend.
 */

export interface VeriffSessionResponse {
  success: boolean;
  sessionId: string;
  sessionUrl: string;
}

export interface VeriffKycStatus {
  success: boolean;
  kycStatus: string;
  sessionId: string | null;
  sessionUrl: string | null;
}

interface VeriffFrame {
  close: () => void;
}

const VERIFF_HOST_PATTERN = /^https:\/\/([a-z0-9-]+\.)*veriff\.(me|com)(\/|$)/i;

/** Only ever open session URLs that point at Veriff over HTTPS. */
export function isVeriffSessionUrl(url: string): boolean {
  return VERIFF_HOST_PATTERN.test(url);
}

class VeriffService {
  private currentFrame: VeriffFrame | null = null;

  async openVerification(
    sessionUrl: string,
    options?: {
      onEvent?: (event: string) => void;
    },
  ): Promise<void> {
    if (!isVeriffSessionUrl(sessionUrl)) {
      throw new Error('Unexpected verification URL');
    }

    try {
      const { createVeriffFrame } = await import('@veriff/incontext-sdk');

      this.currentFrame?.close();
      const open = (): VeriffFrame =>
        createVeriffFrame({
          url: sessionUrl,
          onEvent: (msg) => options?.onEvent?.(msg),
          onReload: () => {
            // Safari iOS asks for a reload; reopen the same session.
            this.currentFrame?.close();
            this.currentFrame = open();
          },
        });
      this.currentFrame = open();
    } catch {
      this.openInNewWindow(sessionUrl, options);
    }
  }

  /** Fallback when the iframe cannot be created: open the session in a popup. */
  private openInNewWindow(
    sessionUrl: string,
    options?: {
      onEvent?: (event: string) => void;
    },
  ): void {
    const popup = window.open(
      sessionUrl,
      'veriff-verification',
      'width=480,height=720,scrollbars=yes,resizable=yes',
    );

    if (!popup || popup.closed) {
      // Popup blocked: navigate this window as a last resort.
      window.location.assign(sessionUrl);
      return;
    }

    const startedAt = Date.now();
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        options?.onEvent?.('FINISHED');
      } else if (Date.now() - startedAt > 30 * 60 * 1000) {
        clearInterval(checkClosed);
      }
    }, 1000);
  }
}

export const veriffService = new VeriffService();
