import { API_BASE_URL } from '@/config/env';

export interface ContinueFlowResponse {
  message: string;
  isNewUser: boolean;
  requiresOnboarding: boolean;
  hasWalletPIN?: boolean;
  userId?: string;
  walletId?: string;
  walletAddress?: string;
  otp?: string; // Development mode OTP
}

export interface VerifyOtpResponse {
  token: string;
  user: {
    id: string;
    phoneNumber?: string;
    email?: string;
    firstName: string;
    lastName: string;
    isVerified: boolean;
    walletId?: string;
    walletAddress?: string;
  };
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface CreateWalletResponse {
  wallet: {
    id: string;
    publicKey: string;
    name: string;
    description: string;
    status: 'ACTIVE' | 'DISABLED' | 'LOCKED';
    balance: number;
    isInitialized: boolean;
    createdAt: string;
    lastActivityAt: string;
  };
  message?: string;
}

// Reward Response Type
export type RewardCategory = 'REFERRAL' | 'TRANSACTION';
export type RewardSection = 'MILESTONES' | 'YOUR_REWARDS' | 'MORE_REWARDS';

export interface RewardResponse {
  rewardName: string;
  rewardType: string;
  category: RewardCategory;
  section: RewardSection;
  tier: number;
  claimed: boolean;
  eligible: boolean;
  progress: number;
  currentValue: number;
  targetValue: number;
  requirementLabel: string;
  subtitle: string;
}

class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'any',
          'User-Agent': 'Mozilla/5.0 (compatible; SwarpFoundationDashboard/1.0)',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site',
          ...options.headers,
        },
        ...options,
      });

      // Check if response is HTML (ngrok warning page)
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && !contentType.includes('application/json')) {
        // Try to get the response text to see what we actually received
        const responseText = await response.text();
        console.error('Non-JSON response received:', {
          url,
          status: response.status,
          contentType,
          responseText: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
        });
        
        console.error('Full response details:', {
          headers: Array.from(response.headers.entries()),
          ok: response.ok,
          redirected: response.redirected,
          type: response.type,
          url: response.url
        });
        
        // If it's an ngrok warning page, give specific instructions
        if (responseText.includes('ngrok') && responseText.includes('Visit Site')) {
          throw {
            message: 'ngrok browser warning detected. Please visit the ngrok URL directly in a new tab first, then refresh this page.',
            statusCode: response.status,
            error: 'ngrok Warning Page',
          } as ApiError;
        }
        
        throw {
          message: 'Server returned non-JSON response. This may be due to ngrok browser warning or server error.',
          statusCode: response.status,
          error: 'Invalid Response Format',
        } as ApiError;
      }

      // Clone response before reading so we can retry if JSON parsing fails
      const responseClone = response.clone();

      try {
        data = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, get the raw text from the clone to debug
        const responseText = await responseClone.text();
        console.error('JSON parsing failed:', {
          url,
          status: response.status,
          contentType,
          jsonError,
          responseText: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
        });

        throw {
          message: 'Failed to parse server response as JSON.',
          statusCode: response.status,
          error: 'JSON Parse Error',
        } as ApiError;
      }

      if (!response.ok) {
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          url: url
        });
        
        throw {
          message: data.message || 'An error occurred',
          statusCode: response.status,
          error: data.error || 'API Error',
        } as ApiError;
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw {
          message: 'Unable to connect to server. Please check your connection.',
          statusCode: 0,
          error: 'Network Error',
        } as ApiError;
      }
      throw error;
    }
  }

  // Continue flow: Use the new backend endpoint that handles both login and register
  async continueWithPhone(phoneNumber: string): Promise<ContinueFlowResponse> {
    return this.makeRequest<ContinueFlowResponse>('/auth/continue-with-phone', {
      method: 'POST',
      body: JSON.stringify({ 
        phoneNumber
      }),
    });
  }

  async verifyOtp(data: {
    phoneNumber?: string;
    email?: string;
    otp: string;
  }): Promise<VerifyOtpResponse> {
    // Send either phoneNumber or email based on what's provided
    const verifyData: { otp: string; phoneNumber?: string; email?: string } = { otp: data.otp };
    
    if (data.phoneNumber) {
      verifyData.phoneNumber = data.phoneNumber;
    } else if (data.email) {
      verifyData.email = data.email;
    }
    
    return this.makeRequest<VerifyOtpResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(verifyData),
    });
  }

  async updateCountry(data: {
    phoneNumber?: string;
    email?: string;
    country: string;
  }): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>('/auth/update-country', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createWallet(data: {
    name?: string;
    description?: string;
  }, token: string): Promise<CreateWalletResponse> {
    return this.makeRequest<CreateWalletResponse>('/wallet', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async getUserWallets(token: string): Promise<{ id: string; publicKey: string; name: string; status: string; balance: number; isInitialized: boolean; createdAt: string; lastActivityAt: string; }[]> {
    return this.makeRequest('/wallet', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Wallet PIN functionality
  async setWalletPIN(pin: string, token: string): Promise<{ message: string; success: boolean }> {
    
    const requestBody = { pin };
    const requestBodyString = JSON.stringify(requestBody);
    
    return this.makeRequest('/auth/set-wallet-pin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: requestBodyString,
    });
  }

  async verifyWalletPIN(pin: string, token: string): Promise<{ message: string; success: boolean }> {
    
    const requestBody = { pin };
    const requestBodyString = JSON.stringify(requestBody);
    
    return this.makeRequest('/auth/verify-wallet-pin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: requestBodyString,
    });
  }

  async hasWalletPIN(token: string): Promise<{ hasPIN: boolean }> {
    return this.makeRequest('/auth/has-wallet-pin', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Airdrop devnet SOL for testing
  async airdropSOL(walletId: string, token: string, amount: number = 2): Promise<{ message: string; txSignature: string; balance: number }> {
    return this.makeRequest(`/wallet/${walletId}/airdrop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ amount }),
    });
  }

  async initializeWallet(walletId: string, token: string): Promise<{ success: boolean; message: string; balance: number; signature: string; explorerUrl: string; walletUrl: string }> {
    return this.makeRequest(`/wallet/${walletId}/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Send SOL or SPL token transaction
  async sendTransaction(walletId: string, token: string, data: { toAddress: string; amount: number; memo?: string; tokenMint?: string }): Promise<{ signature: string; fee?: number }> {

    const requestBody: { toAddress: string; amount: number; memo?: string; tokenMint?: string } = {
      toAddress: data.toAddress,
      amount: Number(data.amount),
      memo: data.memo
    };

    // Add tokenMint for SPL token transfers
    if (data.tokenMint) {
      requestBody.tokenMint = data.tokenMint;
    }

    return this.makeRequest(`/wallet/${walletId}/send-transaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  }

  async getTransactionHistory(walletId: string, token: string): Promise<{ transactions: Array<{ id: string; signature: string; type: 'SEND' | 'RECEIVE'; amount: number; fromAddress: string; toAddress: string; fee: number; status: 'PENDING' | 'CONFIRMED' | 'FAILED'; timestamp: string; errorMessage?: string }>; total: number }> {
    return this.makeRequest(`/wallet/${walletId}/transactions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Login with passcode for existing users
  async loginWithPasscode(phoneNumber: string, passcode: string): Promise<VerifyOtpResponse> {
    return this.makeRequest<VerifyOtpResponse>('/auth/login-with-passcode', {
      method: 'POST',
      body: JSON.stringify({ 
        phoneNumber,
        passcode
      }),
    });
  }

  // Market Data APIs
  async getSolanaPrice(): Promise<{
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    volume: number;
    timestamp: number;
  }> {
    return this.makeRequest('/market-data/solana', {
      method: 'GET',
    });
  }

  async getSolanaHistoricalData(period: string = '1D'): Promise<{ timestamp: number; price: number }[]> {
    return this.makeRequest(`/market-data/solana/historical?period=${period}`, {
      method: 'GET',
    });
  }

  async validateSolanaAddress(address: string, token: string): Promise<{
    valid: boolean;
    address: string;
    message: string;
  }> {
    const requestBody = { address };
    
    return this.makeRequest('/wallet/validate-address', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  }

  // Username functionality
  async suggestUsernames(token: string, customName?: string): Promise<{
    suggestions: string[];
  }> {
    const queryParam = customName ? `?name=${encodeURIComponent(customName)}` : '';
    return this.makeRequest(`/auth/suggest-username${queryParam}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async updateUsername(username: string, token: string): Promise<{
    message: string;
    username: string;
  }> {
    return this.makeRequest('/auth/username', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });
  }

  async checkUsernameAvailability(username: string, token: string): Promise<{
    available: boolean;
    username: string;
    message: string;
  }> {
    const searchParams = new URLSearchParams();
    searchParams.append('username', username);

    return this.makeRequest(`/auth/check-username?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async getNotifications(token: string, params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    type?: string;
  }): Promise<{
    notifications: Array<{
      id: string;
      title: string;
      body: string;
      type: 'TRANSACTION' | 'SECURITY' | 'SYSTEM' | 'MARKETING' | 'REWARDS' | 'LAUNCHPAD';
      subType?: string;
      isRead: boolean;
      createdAt: string;
      data?: Record<string, unknown>;
    }>;
    total: number;
    unread: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.unreadOnly) searchParams.append('unreadOnly', params.unreadOnly.toString());
    if (params?.type) searchParams.append('type', params.type);

    const query = searchParams.toString();
    const url = `/notifications${query ? `?${query}` : ''}`;

    return this.makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async markNotificationAsRead(notificationId: string, token: string): Promise<{
    id: string;
    isRead: boolean;
    readAt: string;
  }> {
    return this.makeRequest(`/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async markAllNotificationsAsRead(token: string): Promise<{ affected: number }> {
    return this.makeRequest('/notifications/mark-all-read', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // MoonPay Balance Sync
  async syncMoonPayBalance(walletId: string, token: string, amount: number, mainnetTxSignature?: string): Promise<{
    success: boolean;
    newBalance: number;
    transaction?: {
      id: string;
      signature: string;
      amount: number;
      timestamp: string;
    };
  }> {
    const requestBody = {
      amount,
      ...(mainnetTxSignature && { mainnetTxSignature })
    };

    return this.makeRequest(`/wallet/${walletId}/sync-moonpay-balance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  }

  async getSwapQuote(
    walletId: string, 
    token: string, 
    data: {
      inputToken: string;
      outputToken: string;
      amount: number;
      slippageTolerance?: number; // Percentage (e.g., 0.5 for 0.5%)
    }
  ): Promise<{
    inputToken: string;
    outputToken: string;
    inputAmount: number;
    outputAmount: number;
    minimumOutputAmount: number;
    priceImpact: number;
    fees: {
      jupiterFee: number;
      networkFee: number;
      total: number;
    };
    validUntil: number;
    route: unknown;
  }> {

    return this.makeRequest(`/wallet/${walletId}/swap/quote`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async executeSwap(
    walletId: string,
    token: string,
    data: {
      inputToken: string;
      outputToken: string;
      amount: number;
      pin?: string;
    }
  ): Promise<{
    success: boolean;
    swapTransactionId: string;
    blockchainTxHash?: string;
    actualOutputAmount?: number;
    error?: string;
  }> {

    return this.makeRequest(`/wallet/${walletId}/swap/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async getSwapHistory(
    walletId: string,
    token: string,
    params?: {
      page?: number;
      limit?: number;
      status?: 'PENDING' | 'COMPLETED' | 'FAILED';
      inputToken?: string;
      outputToken?: string;
    }
  ): Promise<{
    swaps: Array<{
      id: string;
      inputToken: string;
      outputToken: string;
      inputAmount: number;
      outputAmount: number;
      actualOutputAmount?: number;
      status: 'PENDING' | 'COMPLETED' | 'FAILED';
      priceImpact?: number;
      swapFee?: number;
      networkFee?: number;
      dexUsed?: string;
      createdAt: string;
      confirmedAt?: string;
      blockchainTxHash?: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.inputToken) searchParams.append('inputToken', params.inputToken);
    if (params?.outputToken) searchParams.append('outputToken', params.outputToken);

    const query = searchParams.toString();
    const url = `/wallet/${walletId}/swap/history${query ? `?${query}` : ''}`;

    return this.makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async getSupportedSwapPairs(walletId: string, token: string): Promise<Array<{
    input: string;
    output: string;
    dex?: string;
  }>> {
    return this.makeRequest(`/wallet/${walletId}/swap/supported-pairs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Estimate swap fees
  async estimateSwapFees(
    walletId: string,
    token: string,
    data: {
      inputToken: string;
      outputToken: string;
      amount: number;
    }
  ): Promise<{
    networkFee: number;
    dexFee: number;
    priceImpact: number;
    minimumReceived: number;
    exchangeRate: number;
  }> {

    return this.makeRequest(`/wallet/${walletId}/swap/estimate-fees`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async getSwapTokenBalances(walletId: string, token: string): Promise<Array<{
    token: string;
    symbol: string;
    name: string;
    balance: number;
    usdValue: number;
    mint: string;
    decimals: number;
    logoURI?: string;
  }>> {
    const response: { balances: Array<{
      symbol: string;
      mint: string;
      balance: number;
      formattedBalance: string;
      usdValue: number;
      tokenAccount?: string;
    }> } = await this.makeRequest(`/wallet/${walletId}/swap/tokens/balances`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    // Map backend response to frontend expected structure
    if (!response.balances) {
      return [];
    }
    
    return response.balances.map(backendBalance => ({
      token: backendBalance.symbol, // Use symbol as token
      symbol: backendBalance.symbol,
      name: this.getTokenName(backendBalance.symbol), // Helper function for name
      balance: backendBalance.balance,
      usdValue: backendBalance.usdValue,
      mint: backendBalance.mint,
      decimals: this.getTokenDecimals(backendBalance.symbol), // Helper function for decimals
    }));
  }

  async getTokenBalances(walletId: string, token: string): Promise<{
    balances: Array<{ symbol: string; mint: string; balance: number; formattedBalance: string; usdValue: number }>;
    portfolioValue: number;
  }> {
    return this.makeRequest(`/wallet/${walletId}/swap/tokens/balances`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  // Helper function to get token name
  private getTokenName(symbol: string): string {
    const tokenNames: Record<string, string> = {
      'SOL': 'Solana',
      'SWARP': 'Swarp Token',
      'USDC': 'USD Coin',
    };
    return tokenNames[symbol] || symbol;
  }

  // Helper function to get token decimals
  private getTokenDecimals(symbol: string): number {
    const tokenDecimals: Record<string, number> = {
      'SOL': 9,
      'SWARP': 9,
      'USDC': 6,
    };
    return tokenDecimals[symbol] || 9;
  }

  // Sync token balances
  async syncSwapTokenBalances(walletId: string, token: string): Promise<{
    success: boolean;
    balances: Array<{
      token: string;
      balance: number;
    }>;
  }> {
    return this.makeRequest(`/wallet/${walletId}/swap/tokens/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
  }

//   // === Generate Referral Code ===
// static async generateReferralCode(token: string) {
//   return await this.makeRequest<{ referralCode: string }>(
//     '/auth/generate-referral',
//     {
//       method: 'POST',
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     }
//   );
// }

async generateReferral(token: string): Promise<{ referralCode: string }> {
  return this.makeRequest<{ referralCode: string }>('/auth/generate-referral', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    
  });
}

//  APPLY REFERRAL CODE 
async applyReferral(token: string, referralCode: string): Promise<{ message: string; referredBy: { id: string; referralCode: string } }> {
  return this.makeRequest('/auth/apply-referral', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ referralCode }),
  });
}

// Check Referral Code Validity

async checkReferralCode(referralCode: string): Promise<{ valid: boolean; message: string }> {
  return this.makeRequest(`/auth/check-referral`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ referralCode }),
  });
}

async getMyReferrals(token: string): Promise<{
  count: number;
  referrals: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    profilePicture: string | null;
    joinedAt: string;
  }[];
}> {
  return this.makeRequest('/auth/my-referrals', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}
async updatePasscode(
  token: string,
  oldPasscode: string,
  newPasscode: string
): Promise<{ message: string }> {
  return this.makeRequest('/auth/change-passcode', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ oldPasscode, newPasscode }),
  });
}

  //  Claim a Reward
  async claimReward(
    userId: string,
    rewardType: string,
    token: string
  ): Promise<{ rewardName: string; rewardType: string; claimed: boolean }> {
    return this.makeRequest(`/rewards/${userId}/${rewardType}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getRewardStatus(
    userId: string,
    rewardType: string,
    token: string
  ): Promise<RewardResponse> {
    return this.makeRequest(`/rewards/${userId}/reward/${rewardType}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getAllRewards(
    userId: string,
    token: string
  ): Promise<RewardResponse[]> {
    return this.makeRequest(`/rewards/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  //  Get Referral Milestones (for Refer & Earn screen)
  async getReferralMilestones(
    userId: string,
    token: string
  ): Promise<RewardResponse[]> {
    return this.makeRequest(`/rewards/${userId}/milestones`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  //  Get Your Rewards (for Home screen)
  async getYourRewards(
    userId: string,
    token: string
  ): Promise<RewardResponse[]> {
    return this.makeRequest(`/rewards/${userId}/your-rewards`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  //  Get More Rewards (for Home screen)
  async getMoreRewards(
    userId: string,
    token: string
  ): Promise<RewardResponse[]> {
    return this.makeRequest(`/rewards/${userId}/more-rewards`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }
async deleteUserAccount(token: string): Promise<{ message: string; success: boolean }> {
  return this.makeRequest(`/auth/delete-account`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}
async getUserContacts(userId: string, token: string): Promise<{ success: boolean; contacts: { nickname: string; address: string }[] }> {
  return this.makeRequest(`/auth/contacts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

//  Add Contact 
async addUserContact(userId: string, nickname: string, address: string, token: string): Promise<{ success: boolean; message: string; contacts: { nickname: string; address: string }[] }> {
  return this.makeRequest(`/auth/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nickname, address }),
  });
}

  async getUserProfile(token: string): Promise<{
    id: string;
    email?: string;
    phoneNumber?: string;
    firstName: string;
    lastName: string;
    username?: string;
    isVerified: boolean;
    kycStatus?: 'not_started' | 'pending' | 'approved' | 'declined' | 'resubmission_requested';
    walletId?: string;
    walletAddress?: string;
  }> {
    return this.makeRequest('/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Upload profile picture (multipart/form-data)
  // async uploadProfilePicture(file: File, token: string): Promise<{ url: string }> {
  //   const url = `${API_BASE_URL}/auth/upload/profile-picture`;

  //   const form = new FormData();
  //   form.append('file', file);

  //   try {
  //     const response = await fetch(url, {
  //       method: 'POST',
  //       headers: {
  //         'Authorization': `Bearer ${token}`,
  //         // DO NOT set Content-Type; browser will set the boundary for multipart
  //         'ngrok-skip-browser-warning': 'any',
  //         'User-Agent': 'Mozilla/5.0 (compatible; SwarpFoundationDashboard/1.0)'
  //       },
  //       body: form,
  //     });

  //     const contentType = response.headers.get('content-type') || '';
  //     if (!contentType.includes('application/json')) {
  //       const text = await response.text();
  //       throw { message: 'Invalid response from upload endpoint', statusCode: response.status, error: text } as ApiError;
  //     }

  //     const data = await response.json();

  //     if (!response.ok) {
  //       throw { message: data.message || 'Upload failed', statusCode: response.status, error: data.error } as ApiError;
  //     }

  //     return data;
  //   } catch (err) {
  //     throw err;
  //   }
  // }

  async updateUserProfile(
    data: { firstName: string; lastName: string; email: string },
    token: string
  ): Promise<{ firstName: string; lastName: string; email: string }> {
    return this.makeRequest('/auth/me/profile', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async uploadProfilePicture(file: File, token: string): Promise<{ key: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.makeRequest<{ key: string }>('/auth/upload-profile-picture', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Do NOT set 'Content-Type' here — browser will handle it automatically
      },
      body: formData,
    });
  }

  // Get Profile Picture (signed URL)
  async getProfilePicture(token: string): Promise<{ url: string | null }> {
    return this.makeRequest<{ url: string | null }>(`/auth/profile-picture`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Call backend Google callback endpoint
  async googleLoginCallback(code: string): Promise<{
    access_token: string;
    user: { id: string; email: string; firstName: string; lastName: string };
  }> {
    return this.makeRequest(`/auth/google/callback?code=${code}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async checkEmail(email: string): Promise<{ exists: boolean; message: string }> {
    return this.makeRequest('/auth/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
  }

async getExchangeRates(): Promise<{
  success: boolean;
  message: string;
  data: {
    base: string;
    rates: { EUR: number; GBP: number };
    fetchedAt: string;
  } | null;
}> {
  return this.makeRequest<{
    success: boolean;
    message: string;
    data: {
      base: string;
      rates: { EUR: number; GBP: number };
      fetchedAt: string;
    } | null;
  }>(`/exchange-rate/from-db`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',

    },
  });
}

async getTranslations(locale: string): Promise<Record<string, unknown>> {
  return this.makeRequest<Record<string, unknown>>(`/translations/${locale}`, {
    method: 'GET',
  });
}

async getAllTranslations(): Promise<Record<string, Record<string, unknown>>> {
  return this.makeRequest<Record<string, Record<string, unknown>>>('/translations/all', {
    method: 'GET',
  });
}

async getSupportedLocales(): Promise<{ locales: string[]; default: string }> {
  return this.makeRequest<{ locales: string[]; default: string }>('/translations/locales', {
    method: 'GET',
  });
}

async getNotificationPreferences(token: string): Promise<{
  allowNotifications: boolean;
  transactionAlerts: boolean;
  swapAndTopUp: boolean;
  rewardsAndReferrals: boolean;
  securityActivity: boolean;
}> {
  return this.makeRequest<{
    allowNotifications: boolean;
    transactionAlerts: boolean;
    swapAndTopUp: boolean;
    rewardsAndReferrals: boolean;
    securityActivity: boolean;
  }>('/auth/notification-preferences', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async updateNotificationPreferences(
  token: string,
  preferences: Partial<{
    allowNotifications: boolean;
    transactionAlerts: boolean;
    swapAndTopUp: boolean;
    rewardsAndReferrals: boolean;
    securityActivity: boolean;
  }>
): Promise<{
  success: boolean;
  message: string;
  preferences: {
    allowNotifications: boolean;
    transactionAlerts: boolean;
    swapAndTopUp: boolean;
    rewardsAndReferrals: boolean;
    securityActivity: boolean;
  };
}> {
  return this.makeRequest<{
    success: boolean;
    message: string;
    preferences: {
      allowNotifications: boolean;
      transactionAlerts: boolean;
      swapAndTopUp: boolean;
      rewardsAndReferrals: boolean;
      securityActivity: boolean;
    };
  }>('/auth/notification-preferences', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferences),
  });
}

// Language preference
async updateLanguage(
  token: string,
  language: string
): Promise<{
  success: boolean;
  message: string;
  language: string;
}> {
  return this.makeRequest<{
    success: boolean;
    message: string;
    language: string;
  }>('/auth/language', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ language }),
  });
}

async getLanguage(token: string): Promise<{ language: string }> {
  return this.makeRequest<{ language: string }>('/auth/language', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

async getTokenPrices(symbols?: string[]): Promise<{
  prices: Record<string, { price: number; priceChange24h?: number }>;
  timestamp: number;
}> {
  const query = symbols ? `?symbols=${symbols.join(',')}` : '';
  return this.makeRequest<{
    prices: Record<string, { price: number; priceChange24h?: number }>;
    timestamp: number;
  }>(`/tokens/prices${query}`, {
    method: 'GET',
  });
}

async getSupportedTokens(): Promise<{
  tokens: Array<{
    symbol: string;
    name: string;
    decimals: number;
    icon: string;
  }>;
}> {
  return this.makeRequest<{
    tokens: Array<{
      symbol: string;
      name: string;
      decimals: number;
      icon: string;
    }>;
  }>('/tokens/supported', {
    method: 'GET',
  });
}

async getAllJupiterTokens(params?: { search?: string; limit?: number }): Promise<{
  tokens: Array<{
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    isVerified?: boolean;
    usdPrice?: number;
    mcap?: number;
    liquidity?: number;
  }>;
  total: number;
  cacheInfo: {
    tokenCount: number;
    lastUpdated: number;
    cacheAge: number;
  };
}> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append('search', params.search);
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const query = searchParams.toString();
  return this.makeRequest(`/tokens/all${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

async getPopularTokens(): Promise<{
  tokens: Array<{
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    isVerified?: boolean;
  }>;
}> {
  return this.makeRequest('/tokens/popular', {
    method: 'GET',
  });
}

async getTokensWithVolume(params?: { search?: string; limit?: number }): Promise<{
  tokens: Array<{
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    isVerified?: boolean;
    usdPrice?: number;
    mcap?: number;
    fdv?: number;
    liquidity?: number;
    holderCount?: number;
    volume24h?: number;
    volume6h?: number;
    volume1h?: number;
    priceChange24h?: number;
    txns24h?: number;
  }>;
  total: number;
  volumeDataSource: string;
  cacheStats: {
    size: number;
    lastUpdated: number;
    age: number;
  };
}> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append('search', params.search);
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const query = searchParams.toString();
  return this.makeRequest(`/tokens/with-volume${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

async searchTokens(query: string, limit?: number): Promise<{
  tokens: Array<{
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    isVerified?: boolean;
  }>;
  count: number;
  query: string;
}> {
  const searchParams = new URLSearchParams();
  searchParams.append('q', query);
  if (limit) searchParams.append('limit', limit.toString());

  return this.makeRequest(`/tokens/search?${searchParams.toString()}`, {
    method: 'GET',
  });
}

// Launchpad Project Types
// Get featured projects for homepage carousel
async getLaunchpadFeaturedProjects(): Promise<{
  projects: LaunchpadProject[];
}> {
  return this.makeRequest('/launchpad/projects/featured', {
    method: 'GET',
  });
}

// Get live (bonding) projects for homepage grid
async getLaunchpadLiveProjects(params?: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'marketCap' | 'createdAt' | 'priceChange';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  projects: LaunchpadProject[];
  total: number;
  page: number;
  limit: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.search) searchParams.append('search', params.search);
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

  const query = searchParams.toString();
  return this.makeRequest(`/launchpad/projects/live${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

async getLaunchpadProjects(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'bonding' | 'migrated' | 'all';
  sortBy?: 'marketCap' | 'createdAt' | 'priceChange';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  projects: LaunchpadProject[];
  total: number;
  page: number;
  limit: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.search) searchParams.append('search', params.search);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

  const query = searchParams.toString();
  return this.makeRequest(`/launchpad/projects${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

async getLaunchpadProject(projectId: string, token?: string | null): Promise<LaunchpadProject> {
  return this.makeRequest(`/launchpad/projects/${projectId}`, {
    method: 'GET',
    ...(token && { headers: { Authorization: `Bearer ${token}` } }),
  });
}

// Create new project (Request Token)
async createLaunchpadProject(
  data: LaunchpadCreateProjectRequest,
  token: string
): Promise<{
  project: LaunchpadProject;
  message: string;
}> {
  return this.makeRequest('/launchpad/projects', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

// Upload project image (multipart/form-data)
async uploadLaunchpadProjectImage(
  file: File,
  token: string
): Promise<{ success: boolean; imageUrl: string; key: string }> {
  const formData = new FormData();
  formData.append('image', file);

  const url = `${API_BASE_URL}/launchpad/upload-image`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'any',
      'User-Agent': 'Mozilla/5.0 (compatible; SwarpFoundationDashboard/1.0)',
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw {
      message: errorData.message || 'Failed to upload image',
      statusCode: response.status,
      error: errorData.error || 'Upload Error',
    } as ApiError;
  }

  return response.json();
}

async getLaunchpadBuyQuote(
  projectId: string,
  amount: number
): Promise<{
  inputAmount: number;
  outputAmount: number;
  price: number;
  priceImpact: number;
  fee: number;
}> {
  return this.makeRequest(`/launchpad/projects/${projectId}/quote/buy?amount=${amount}`, {
    method: 'GET',
  });
}

async getLaunchpadSellQuote(
  projectId: string,
  amount: number
): Promise<{
  inputAmount: number;
  outputAmount: number;
  price: number;
  priceImpact: number;
  fee: number;
}> {
  return this.makeRequest(`/launchpad/projects/${projectId}/quote/sell?amount=${amount}`, {
    method: 'GET',
  });
}

async buyLaunchpadToken(
  projectId: string,
  amount: number,
  token: string
): Promise<{
  success: boolean;
  transaction: {
    id: string;
    signature?: string;
    inputAmount: number;
    outputAmount: number;
  };
  message: string;
}> {
  return this.makeRequest(`/launchpad/projects/${projectId}/buy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  });
}

async sellLaunchpadToken(
  projectId: string,
  amount: number,
  token: string
): Promise<{
  success: boolean;
  transaction: {
    id: string;
    signature?: string;
    inputAmount: number;
    outputAmount: number;
  };
  message: string;
}> {
  return this.makeRequest(`/launchpad/projects/${projectId}/sell`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  });
}

async getLaunchpadTokenBalance(
  projectId: string,
  token: string
): Promise<{
  balance: number;
  tokenAddress: string;
}> {
  return this.makeRequest(`/launchpad/projects/${projectId}/balance`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

async getLaunchpadProjectTrades(
  projectId: string,
  params?: { limit?: number }
): Promise<{
  trades: Array<{
    id: string;
    type: 'buy' | 'sell';
    amount: number;
    tokenAmount: number;
    price: number;
    trader: string;
    traderAvatar?: string;
    timestamp: string;
    signature?: string;
  }>;
}> {
  const query = params?.limit ? `?limit=${params.limit}` : '';
  return this.makeRequest(`/launchpad/projects/${projectId}/trades${query}`, {
    method: 'GET',
  });
}

async getLaunchpadPortfolio(token: string): Promise<{
  investments: Array<{
    id: string;
    tokenBalance: string;
    totalSolInvested: string;
    totalSolReceived: string;
    averageBuyPrice: string;
    realizedPnlSol: string;
    unrealizedPnlSol: string;
    unrealizedPnlPercent: string;
    currentValueSol: string;
    tradeCount: number;
    firstInvestmentAt?: string;
    lastTradeAt?: string;
    isWatching: boolean;
    hasAlerts: boolean;
    project?: {
      id: string;
      name: string;
      ticker: string;
      imageUrl?: string;
      tokenAddress?: string;
      status: string;
      currentPrice?: string;
      priceChange24h?: number;
      marketCap?: string;
    };
  }>;
  summary: {
    totalInvestmentsSol: string;
    totalCurrentValueSol: string;
    totalRealizedPnlSol: string;
    totalUnrealizedPnlSol: string;
    totalPnlPercent: string;
    activeProjectsCount: number;
    totalProjectsCount: number;
  };
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  return this.makeRequest('/launchpad/portfolio', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

async getLaunchpadUserTradeHistory(
  token: string,
  params?: { page?: number; limit?: number; type?: 'buy' | 'sell' }
): Promise<{
  trades: Array<{
    id: string;
    type: 'buy' | 'sell';
    walletAddress: string;
    solAmount: string;
    tokenAmount: string;
    pricePerToken?: string;
    usdValue?: string;
    transactionHash?: string;
    createdAt: string;
    project?: {
      id: string;
      name: string;
      ticker: string;
      imageUrl?: string;
      tokenAddress?: string;
    };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.type) queryParams.set('type', params.type);

  const queryString = queryParams.toString();
  const url = `/launchpad/trades/history${queryString ? `?${queryString}` : ''}`;

  return this.makeRequest(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

// Toggle watchlist status for a project
async toggleLaunchpadWatchlist(
  projectId: string,
  token: string
): Promise<{
  isWatching: boolean;
  message: string;
}> {
  return this.makeRequest(`/launchpad/projects/${projectId}/watchlist`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

async getLaunchpadWatchlist(token: string): Promise<{
  projects: LaunchpadProject[];
}> {
  return this.makeRequest('/launchpad/watchlist', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

async createLaunchpadAlert(
  data: {
    projectId: string;
    condition: 'goes_over' | 'goes_under';
    targetPrice: number;
    currency?: 'USD' | 'SOL';
    note?: string;
  },
  token: string
): Promise<{
  success: boolean;
  alert: LaunchpadAlert;
}> {
  return this.makeRequest('/launchpad/alerts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

async getLaunchpadAlerts(token: string): Promise<{
  success: boolean;
  alerts: LaunchpadAlert[];
  total: number;
}> {
  return this.makeRequest('/launchpad/alerts', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

async getLaunchpadAlert(alertId: string, token: string): Promise<{
  success: boolean;
  alert: LaunchpadAlert;
}> {
  return this.makeRequest(`/launchpad/alerts/${alertId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

async updateLaunchpadAlert(
  alertId: string,
  data: {
    condition?: 'goes_over' | 'goes_under';
    targetPrice?: number;
    currency?: 'USD' | 'SOL';
    note?: string;
    status?: 'active' | 'triggered' | 'expired' | 'cancelled';
  },
  token: string
): Promise<{
  success: boolean;
  alert: LaunchpadAlert;
}> {
  return this.makeRequest(`/launchpad/alerts/${alertId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

async deleteLaunchpadAlert(alertId: string, token: string): Promise<{
  success: boolean;
  message: string;
}> {
  return this.makeRequest(`/launchpad/alerts/${alertId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

async getLaunchpadComments(
  projectId: string,
  params?: { page?: number; limit?: number }
): Promise<{
  comments: Array<{
    id: string;
    content: string;
    author: string;
    authorAvatar?: string;
    likes: number;
    isLiked?: boolean;
    createdAt: string;
  }>;
  total: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const query = searchParams.toString();
  return this.makeRequest(`/launchpad/projects/${projectId}/comments${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

// Post comment on project
async postLaunchpadComment(
  projectId: string,
  content: string,
  token: string
): Promise<{
  comment: {
    id: string;
    content: string;
    author: string;
    createdAt: string;
  };
  message: string;
}> {
  return this.makeRequest(`/launchpad/projects/${projectId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
}

// Like/unlike comment
async toggleLaunchpadCommentLike(
  commentId: string,
  token: string
): Promise<{
  isLiked: boolean;
  likes: number;
}> {
  return this.makeRequest(`/launchpad/comments/${commentId}/like`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

async getLaunchpadHolders(
  projectId: string,
  params?: { limit?: number }
): Promise<{
  holders: Array<{
    address: string;
    username?: string;
    avatar?: string;
    balance: number;
    percentage: number;
  }>;
}> {
  const query = params?.limit ? `?limit=${params.limit}` : '';
  return this.makeRequest(`/launchpad/projects/${projectId}/holders${query}`, {
    method: 'GET',
  });
}

// Create unsigned token creation transaction (for wallet signing)
async createLaunchpadTokenOnChain(
  data: LaunchpadOnChainCreateRequest,
  token: string
): Promise<LaunchpadOnChainTransactionResponse> {
  return this.makeRequest('/launchpad/onchain/create-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

// Confirm token creation after transaction is signed and submitted
async confirmLaunchpadTokenCreation(
  data: LaunchpadConfirmTokenCreationRequest,
  token: string
): Promise<{
  success: boolean;
  project: LaunchpadProject;
  message: string;
}> {
  return this.makeRequest('/launchpad/onchain/confirm-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

// Submit signed transaction to Solana network
async submitLaunchpadTransaction(
  signedTransaction: string,
  token: string
): Promise<{
  signature: string;
  status: string;
}> {
  return this.makeRequest('/launchpad/onchain/submit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ signedTransaction }),
  });
}

async getLaunchpadTransactionStatus(
  signature: string
): Promise<{
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations?: number;
  error?: string;
}> {
  return this.makeRequest(`/launchpad/onchain/tx/${signature}`, {
    method: 'GET',
  });
}

// Create unsigned buy transaction (for wallet signing)
async createLaunchpadBuyTransactionOnChain(
  projectId: string,
  amount: number,
  token: string
): Promise<LaunchpadOnChainTransactionResponse> {
  return this.makeRequest(`/launchpad/projects/${projectId}/onchain/buy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  });
}

// Confirm buy transaction after signing
async confirmLaunchpadBuyTransaction(
  projectId: string,
  signature: string,
  token: string
): Promise<{
  success: boolean;
  trade: {
    id: string;
    type: 'buy';
    amount: number;
    tokenAmount: number;
    signature: string;
  };
  message: string;
}> {
  return this.makeRequest(`/launchpad/projects/${projectId}/onchain/confirm-buy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ signature }),
  });
}

// Create unsigned sell transaction (for wallet signing)
async createLaunchpadSellTransactionOnChain(
  projectId: string,
  amount: number,
  token: string
): Promise<LaunchpadOnChainTransactionResponse> {
  return this.makeRequest(`/launchpad/projects/${projectId}/onchain/sell`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  });
}

// Confirm sell transaction after signing
async confirmLaunchpadSellTransaction(
  projectId: string,
  signature: string,
  token: string
): Promise<{
  success: boolean;
  trade: {
    id: string;
    type: 'sell';
    amount: number;
    tokenAmount: number;
    signature: string;
  };
  message: string;
}> {
  return this.makeRequest(`/launchpad/projects/${projectId}/onchain/confirm-sell`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ signature }),
  });
}

// Create migration transaction (graduate to DEX)
async createLaunchpadMigrateTransaction(
  projectId: string,
  token: string
): Promise<LaunchpadOnChainTransactionResponse> {
  return this.makeRequest(`/launchpad/projects/${projectId}/onchain/migrate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

async getLaunchpadBondingCurveState(
  projectId: string
): Promise<{
  tokensSold: number;
  solCollected: number;
  currentPrice: number;
  targetSol: number;
  progress: number;
  isCompleted: boolean;
}> {
  return this.makeRequest(`/launchpad/projects/${projectId}/onchain/state`, {
    method: 'GET',
  });
}

async getLaunchpadUserPosition(
  projectId: string,
  token: string
): Promise<{
  tokenBalance: number;
  solInvested: number;
  averagePrice: number;
  unrealizedPnl: number;
}> {
  return this.makeRequest(`/launchpad/projects/${projectId}/onchain/position`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

async getLaunchpadCustodialWallet(
  token: string
): Promise<LaunchpadCustodialWalletResponse> {
  return this.makeRequest('/launchpad/custodial/wallet', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

// Create token on-chain using Swarp Foundation wallet (server signs automatically)
async createLaunchpadTokenCustodial(
  data: LaunchpadCustodialCreateRequest,
  token: string
): Promise<LaunchpadCustodialCreateResponse> {
  return this.makeRequest('/launchpad/custodial/create-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

// Buy tokens on-chain using Swarp Foundation wallet (server signs automatically)
async buyLaunchpadTokensCustodial(
  projectId: string,
  solAmount: number,
  token: string,
  slippageTolerance: number = 5
): Promise<LaunchpadCustodialTradeResponse> {
  return this.makeRequest(`/launchpad/projects/${projectId}/custodial/buy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ solAmount, slippageTolerance }),
  });
}

// Sell tokens on-chain using Swarp Foundation wallet (server signs automatically)
async sellLaunchpadTokensCustodial(
  projectId: string,
  tokenAmount: number,
  token: string,
  slippageTolerance: number = 5
): Promise<LaunchpadCustodialTradeResponse> {
  return this.makeRequest(`/launchpad/projects/${projectId}/custodial/sell`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tokenAmount, slippageTolerance }),
  });
}

async generateTransakUrl(walletId: string, token: string, data: { type: 'buy' | 'sell', walletAddress?: string, fiatCurrency?: string, cryptoCurrency?: string, fiatAmount?: number }): Promise<{ url: string; type: string; environment: string }> {
  return this.makeRequest(`/wallet/${walletId}/generate-transak-url`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

async createVeriffSession(
  token: string,
  data?: { firstName?: string; lastName?: string }
): Promise<{
  success: boolean;
  sessionId: string;
  sessionUrl: string;
}> {
  return this.makeRequest('/veriff/session', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data || {}),
  });
}

async getVeriffKycStatus(token: string): Promise<{
  success: boolean;
  kycStatus: string;
  sessionId: string | null;
  sessionUrl: string | null;
}> {
  return this.makeRequest('/veriff/status', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}

  async getStakingPools(token: string) {
    return this.makeRequest('/staking/pools', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getStakingPositions(token: string) {
    return this.makeRequest('/staking/positions', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getStakingSummary(token: string) {
    return this.makeRequest('/staking/summary', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async stakeTokens(token: string, data: { amount: number; lockDays: number }) {
    return this.makeRequest('/staking/stake', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async withdrawStake(token: string, positionId: string) {
    return this.makeRequest(`/staking/withdraw/${positionId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

}

// Launchpad Types
export interface LaunchpadAlert {
  id: string;
  projectId: string;
  projectName: string;
  projectTicker: string;
  projectImageUrl?: string;
  condition: 'goes_over' | 'goes_under';
  targetPrice: string;
  currency: 'USD' | 'SOL';
  note?: string;
  status: 'active' | 'triggered' | 'expired' | 'cancelled';
  triggeredAtPrice?: string;
  triggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LaunchpadProject {
  id: string;
  name: string;
  ticker: string;
  description?: string;
  imageUrl?: string;
  status: 'bonding' | 'migrated';
  creator: string | { id: string; username: string; profilePicture?: string };
  creatorAvatar?: string;
  createdAt: string;
  marketCap: number;
  marketCapFormatted: string;
  price: number;
  currentPrice?: string | number;
  priceChange24h: number | string;
  priceChange5m?: number | string;
  priceChange1h?: number | string;
  priceChange6h?: number | string;
  bondingProgress?: number;
  tokenAddress?: string;
  totalSupply?: number;
  circulatingSupply?: number;
  holders?: number;
  holderCount?: number;
  volume24h?: number;
  liquidity?: number;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  discordUrl?: string;
  isFeatured?: boolean;
  isWatching?: boolean;
}

export interface LaunchpadCreateProjectRequest {
  name: string;
  ticker: string;
  description?: string;
  imageUrl?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  discordUrl?: string;
}

// On-chain token creation request (matches CreateTokenOnChainDto)
export interface LaunchpadOnChainCreateRequest {
  name: string;
  ticker: string;
  description?: string;
  imageUrl?: string;
  creatorWalletAddress: string;
  metadataUri?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  discordUrl?: string;
}

// On-chain transaction response (unsigned transaction for wallet signing)
export interface LaunchpadOnChainTransactionResponse {
  transaction: string; // Base64 encoded unsigned transaction
  tokenMint: string; // Derived token mint address
  accounts: {
    tokenMint: string;
    bondingCurve: string;
    tokenVault: string;
    solVault: string;
  };
}

// Confirm token creation request (matches ConfirmTokenCreationDto)
export interface LaunchpadConfirmTokenCreationRequest {
  tokenMint: string;
  transactionSignature: string;
  name: string;
  ticker: string;
  description?: string;
  imageUrl?: string;
  creatorWalletAddress: string;
  metadataUri?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  discordUrl?: string;
}

// On-chain balance response
export interface LaunchpadOnChainBalanceResponse {
  tokenBalance: number;
  solBalance: number;
  userPosition?: {
    tokenBalance: number;
    totalSolSpent: number;
    totalSolReceived: number;
  };
}

// Custodial wallet info response
export interface LaunchpadCustodialWalletResponse {
  success: boolean;
  wallet: {
    publicKey: string;
    solBalance: number;
    hasSigningCapability: boolean;
  };
}

// Custodial token creation request (no wallet address needed - uses Swarp Foundation wallet)
export interface LaunchpadCustodialCreateRequest {
  name: string;
  ticker: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  metadataUri?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  discordUrl?: string;
}

// Custodial token creation response
export interface LaunchpadCustodialCreateResponse {
  success: boolean;
  project: {
    id: string;
    name: string;
    ticker: string;
    tokenAddress: string;
    status: string;
    createdAt: string;
  };
  transactionSignature: string;
  tokenMint: string;
  accounts: {
    tokenMint: string;
    bondingCurve: string;
    tokenVault: string;
    solVault: string;
  };
  message: string;
}

// Custodial trade response (buy/sell)
export interface LaunchpadCustodialTradeResponse {
  success: boolean;
  trade: {
    id: string;
    type: 'BUY' | 'SELL';
    solAmount: string;
    tokenAmount: string;
    pricePerToken: string;
    transactionHash: string;
    status: string;
    createdAt: string;
  };
  transactionSignature: string;
  newBalance: string;
  projectStatus: string;
  message: string;
}

export const apiService = new ApiService();