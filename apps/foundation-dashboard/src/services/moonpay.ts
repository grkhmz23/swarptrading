/**
 * MoonPay Widget Integration Service
 * Provides utilities for integrating MoonPay buy/sell widgets directly in the frontend
 */

export interface MoonPayWidgetConfig {
  apiKey: string;
  variant: 'overlay' | 'embedded';
  environment: 'sandbox' | 'production';
  theme: 'light' | 'dark';
  flow?: 'buy' | 'sell';
  userAgent?: string;
  colorCode?: string;
  showWalletAddressForm?: boolean;
  walletAddress?: string;
  currencyCode?: string;
  baseCurrencyCode?: string;
  baseCurrencyAmount?: number;
  lockAmount?: boolean;
  redirectURL?: string;
  externalCustomerId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  showAllCurrencies?: boolean;
  showOnlyCurrencies?: string;
}

export interface MoonPayWidgetInstance {
  show: () => void;
  hide: () => void;
  updateConfig: (config: Partial<MoonPayWidgetConfig>) => void;
  destroy: () => void;
}

declare global {
  interface Window {
    MoonPayWebSdk: {
      init: (config: MoonPayWidgetConfig) => MoonPayWidgetInstance;
    };
  }
}

class MoonPayService {
  private sdkLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  /**
   * Load MoonPay SDK dynamically
   */
  private async loadSDK(): Promise<void> {
    if (this.sdkLoaded) return;
    
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://static.moonpay.com/web-sdk/v1/moonpay-web-sdk.min.js';
      script.async = true;
      script.onload = () => {
        this.sdkLoaded = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load MoonPay SDK'));
      };
      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }

  /**
   * Get MoonPay publishable key from environment
   */
  private getApiKey(): string {
    const apiKey = process.env.NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY;
    if (!apiKey) {
      throw new Error('MoonPay publishable key not found in environment variables');
    }
    return apiKey;
  }

  /**
   * Determine environment based on API key
   */
  private getEnvironment(): 'sandbox' | 'production' {
    const apiKey = this.getApiKey();
    return apiKey.startsWith('pk_test_') ? 'sandbox' : 'production';
  }

  /**
   * Create MoonPay buy widget configuration
   */
  private createBuyConfig(options: {
    walletAddress?: string;
    currencyCode?: string;
    baseCurrencyCode?: string;
    amount?: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    externalCustomerId?: string;
  }): MoonPayWidgetConfig {
    return {
      apiKey: this.getApiKey(),
      variant: 'overlay',
      environment: this.getEnvironment(),
      theme: 'dark',
      colorCode: '#40E0D0', // Swarp Foundation brand color
      showWalletAddressForm: !options.walletAddress,
      walletAddress: options.walletAddress,
      currencyCode: options.currencyCode || 'sol', // Default to Solana
      baseCurrencyCode: options.baseCurrencyCode, // Let MoonPay auto-detect if not specified
      baseCurrencyAmount: options.amount,
      lockAmount: false,
      redirectURL: window.location.origin,
      externalCustomerId: options.externalCustomerId,
      email: options.email,
      firstName: options.firstName,
      lastName: options.lastName,
      showAllCurrencies: false,
      showOnlyCurrencies: 'sol,btc,eth,usdc,usdt', // Popular cryptos
    };
  }

  /**
   * Create MoonPay sell widget configuration
   */
  private createSellConfig(options: {
    walletAddress?: string;
    refundWalletAddress?: string;
    baseCurrencyAmount?: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    externalCustomerId?: string;
  }): MoonPayWidgetConfig {
    return {
      apiKey: this.getApiKey(),
      variant: 'overlay',
      environment: this.getEnvironment(),
      theme: 'dark',
      colorCode: '#40E0D0',
      walletAddress: options.walletAddress,
      baseCurrencyAmount: options.baseCurrencyAmount,
      redirectURL: window.location.origin,
      externalCustomerId: options.externalCustomerId,
      email: options.email,
      firstName: options.firstName,
      lastName: options.lastName,
      showAllCurrencies: false,
      showOnlyCurrencies: 'sol,btc,eth,usdc,usdt',
    };
  }

  /**
   * Get wallet address for MoonPay - use devnet directly for development/testing
   */
  private async getWalletAddressForMoonPay(devnetWalletAddress: string): Promise<string> {
    // For development and testing with MoonPay sandbox, use devnet address directly
    // MoonPay sandbox can work with devnet addresses
    
    const environment = this.getEnvironment();
    
    if (environment === 'sandbox') {
      // Use devnet address directly with MoonPay sandbox
      console.log(`Using devnet wallet directly with MoonPay sandbox: ${devnetWalletAddress}`);
      return devnetWalletAddress;
    }
    
    // For production, you would typically use mainnet addresses
    // But for now, we'll still use devnet for consistency
    console.log(`Using devnet wallet address: ${devnetWalletAddress}`);
    return devnetWalletAddress;
  }

  /**
   * Open MoonPay buy widget
   */
  async openBuyWidget(options: {
    walletAddress?: string;
    currencyCode?: string;
    baseCurrencyCode?: string;
    amount?: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    externalCustomerId?: string;
    onEventCallback?: (event: unknown) => void;
  }): Promise<MoonPayWidgetInstance> {
    try {
      // Get wallet address for MoonPay (devnet for sandbox, direct address)
      let moonpayWalletAddress = options.walletAddress;
      if (options.walletAddress) {
        moonpayWalletAddress = await this.getWalletAddressForMoonPay(options.walletAddress);
      }
      
      // Use the appropriate address for MoonPay
      const moonpayOptions = {
        ...options,
        walletAddress: moonpayWalletAddress
      };
      
      const buyUrl = this.generateBuyUrl(moonpayOptions);
      
      // Open in new window/tab
      const popup = window.open(buyUrl, 'moonpay-buy', 'width=450,height=700,scrollbars=yes,resizable=yes');
      
      // Monitor popup for closure and handle events
      const checkClosed = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(checkClosed);
          options.onEventCallback?.({ type: 'widget_closed' });
        }
      }, 1000);

      // Add postMessage listener for MoonPay events
      if (options.onEventCallback) {
        const messageHandler = (event: MessageEvent) => {
          if (event.origin === 'https://buy.moonpay.com' || event.origin === 'https://buy-sandbox.moonpay.com') {
            options.onEventCallback?.(event.data);
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Clean up listener when popup closes
        const cleanup = () => {
          window.removeEventListener('message', messageHandler);
          clearInterval(checkClosed);
        };
        
        setTimeout(cleanup, 30 * 60 * 1000); // Clean up after 30 minutes
      }

      // Return mock widget interface
      return {
        show: () => {
          if (popup) {
            popup.focus();
          }
        },
        hide: () => {
          if (popup) {
            popup.close();
          }
        },
        updateConfig: () => {
          console.log('updateConfig not supported with URL-based approach');
        },
        destroy: () => {
          if (popup) {
            popup.close();
          }
        }
      };
    } catch (error) {
      console.error('Error opening MoonPay buy widget:', error);
      throw error;
    }
  }

  /**
   * Open MoonPay sell widget
   */
  async openSellWidget(options: {
    walletAddress?: string;
    refundWalletAddress?: string;
    amount?: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    externalCustomerId?: string;
    onEventCallback?: (event: unknown) => void;
  }): Promise<MoonPayWidgetInstance> {
    try {
      // Use direct URL navigation approach for better compatibility
      const sellUrl = this.generateSellUrl(options);
      
      // Open in new window/tab
      const popup = window.open(sellUrl, 'moonpay-sell', 'width=450,height=700,scrollbars=yes,resizable=yes');
      
      // Monitor popup for closure and handle events
      const checkClosed = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(checkClosed);
          options.onEventCallback?.({ type: 'widget_closed' });
        }
      }, 1000);

      // Add postMessage listener for MoonPay events
      if (options.onEventCallback) {
        const messageHandler = (event: MessageEvent) => {
          if (event.origin === 'https://sell.moonpay.com' || event.origin === 'https://sell-sandbox.moonpay.com') {
            options.onEventCallback?.(event.data);
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Clean up listener when popup closes
        const cleanup = () => {
          window.removeEventListener('message', messageHandler);
          clearInterval(checkClosed);
        };
        
        setTimeout(cleanup, 30 * 60 * 1000); // Clean up after 30 minutes
      }

      // Return mock widget interface
      return {
        show: () => {
          if (popup) {
            popup.focus();
          }
        },
        hide: () => {
          if (popup) {
            popup.close();
          }
        },
        updateConfig: () => {
          console.log('updateConfig not supported with URL-based approach');
        },
        destroy: () => {
          if (popup) {
            popup.close();
          }
        }
      };
    } catch (error) {
      console.error('Error opening MoonPay sell widget:', error);
      throw error;
    }
  }

  /**
   * Generate MoonPay buy URL for direct navigation
   */
  generateBuyUrl(options: {
    walletAddress?: string;
    currencyCode?: string;
    baseCurrencyCode?: string;
    amount?: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    externalCustomerId?: string;
  }): string {
    const config = this.createBuyConfig(options);
    const environment = this.getEnvironment();
    const baseUrl = environment === 'sandbox' 
      ? 'https://buy-sandbox.moonpay.com'
      : 'https://buy.moonpay.com';

    const params = new URLSearchParams();
    params.append('apiKey', config.apiKey);
    params.append('theme', config.theme || 'dark');
    params.append('colorCode', config.colorCode || '#40E0D0');
    
    // Add defaultCurrencyCode to help with regional issues
    params.append('defaultCurrencyCode', options.currencyCode || 'sol');
    
    if (config.walletAddress) {
      params.append('walletAddress', config.walletAddress);
    }
    if (config.currencyCode) {
      params.append('currencyCode', config.currencyCode);
    }
    if (config.baseCurrencyCode) {
      params.append('baseCurrencyCode', config.baseCurrencyCode);
    }
    if (config.baseCurrencyAmount) {
      params.append('baseCurrencyAmount', config.baseCurrencyAmount.toString());
    }
    if (config.redirectURL) {
      params.append('redirectURL', config.redirectURL);
    }
    if (config.externalCustomerId) {
      params.append('externalCustomerId', config.externalCustomerId);
    }
    if (config.email) {
      params.append('email', config.email);
    }
    
    // Simplify currency selection for better regional support
    if (config.showOnlyCurrencies) {
      params.append('showOnlyCurrencies', 'sol'); // Focus on SOL only for better compatibility
    }
    
    // Add additional parameters for better regional support
    params.append('enabledPaymentMethods', 'credit_debit_card,sepa_bank_transfer,gbp_bank_transfer');
    params.append('skipUnsupportedRegion', 'false'); // Show all options even if region not fully supported

    const finalUrl = `${baseUrl}?${params.toString()}`;
    console.log('Generated MoonPay Buy URL:', finalUrl);
    return finalUrl;
  }

  /**
   * Generate MoonPay sell URL for direct navigation
   */
  generateSellUrl(options: {
    walletAddress?: string;
    refundWalletAddress?: string;
    amount?: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    externalCustomerId?: string;
  }): string {
    const config = this.createSellConfig(options);
    const environment = this.getEnvironment();
    const baseUrl = environment === 'sandbox'
      ? 'https://sell-sandbox.moonpay.com'
      : 'https://sell.moonpay.com';

    const params = new URLSearchParams();
    params.append('apiKey', config.apiKey);
    params.append('theme', config.theme || 'dark');
    params.append('colorCode', config.colorCode || '#40E0D0');
    
    if (config.walletAddress) {
      params.append('walletAddress', config.walletAddress);
    }
    if (config.baseCurrencyAmount) {
      params.append('baseCurrencyAmount', config.baseCurrencyAmount.toString());
    }
    if (config.redirectURL) {
      params.append('redirectURL', config.redirectURL);
    }
    if (config.externalCustomerId) {
      params.append('externalCustomerId', config.externalCustomerId);
    }
    if (config.email) {
      params.append('email', config.email);
    }
    if (config.showOnlyCurrencies) {
      params.append('showOnlyCurrencies', config.showOnlyCurrencies);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Handle MoonPay widget events
   */
  handleWidgetEvent(event: unknown): void {
    const eventData = event as { type?: string; data?: unknown };
    switch (eventData.type) {
      case 'transaction_created':
        console.log('MoonPay transaction created:', eventData.data);
        break;
      case 'transaction_completed':
        console.log('MoonPay transaction completed:', eventData.data);
        break;
      case 'transaction_failed':
        console.error('MoonPay transaction failed:', eventData.data);
        break;
      case 'widget_closed':
        console.log('MoonPay widget closed');
        break;
      case 'kyc_completed':
        console.log('MoonPay KYC completed:', eventData.data);
        break;
      default:
        console.log('MoonPay widget event:', event);
    }
  }
}

export const moonPayService = new MoonPayService();