interface VeriffFrame {
  close: () => void;
}

interface VeriffSDK {
  createVeriffFrame: (config: {
    url: string;
    lang?: string;
    onEvent?: (msg: string) => void;
    onReload?: () => void;
  }) => VeriffFrame;
}

declare global {
  interface Window {
    veriffSDK?: VeriffSDK;
  }
}

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

class VeriffService {
  private sdkLoaded = false;
  private loadingPromise: Promise<void> | null = null;
  private currentFrame: VeriffFrame | null = null;

  /**
   * Load Veriff InContext SDK v2 dynamically
   */
  private async loadInContextSDK(): Promise<void> {
    if (this.sdkLoaded) return;

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.veriffSDK) {
        this.sdkLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.veriff.me/incontext/js/v2.5.0/veriff.js';
      script.async = true;
      script.onload = () => {
        if (window.veriffSDK) {
          this.sdkLoaded = true;
          resolve();
        } else {
          this.loadingPromise = null;
          reject(new Error('Veriff SDK loaded but not available'));
        }
      };
      script.onerror = () => {
        this.loadingPromise = null;
        reject(new Error('Failed to load Veriff SDK'));
      };
      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }

  /**
   * Open Veriff verification using InContext SDK (iframe modal) with fallbacks
   */
  async openVerification(
    sessionUrl: string,
    options?: {
      onEvent?: (event: string) => void;
    },
  ): Promise<void> {
    try {
      await this.loadInContextSDK();

      const sdk = window.veriffSDK;

      if (sdk && sdk.createVeriffFrame) {
        this.currentFrame = sdk.createVeriffFrame({
          url: sessionUrl,
          onEvent: (msg: string) => {
            options?.onEvent?.(msg);
          },
          onReload: () => {
            // Safari iOS edge case - close and reopen with same session
            if (this.currentFrame) {
              this.currentFrame.close();
            }
            this.currentFrame = sdk.createVeriffFrame({
              url: sessionUrl,
              onEvent: (msg: string) => {
                options?.onEvent?.(msg);
              },
            });
          },
        });
      } else {
        this.openInNewWindow(sessionUrl, options);
      }
    } catch (error) {
      console.error('Error loading Veriff InContext SDK, falling back to new window:', error);
      this.openInNewWindow(sessionUrl, options);
    }
  }

  /**
   * Fallback: open verification in a new window, or redirect if popup blocked
   */
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
      // Popup was blocked - redirect in same window as last resort
      window.location.href = sessionUrl;
      return;
    }

    // Monitor popup for closure
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        options?.onEvent?.('FINISHED');
      }
    }, 1000);

    // Auto-cleanup after 30 minutes
    setTimeout(() => {
      clearInterval(checkClosed);
    }, 30 * 60 * 1000);
  }
}

export const veriffService = new VeriffService();
