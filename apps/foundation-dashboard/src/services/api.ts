import { API_BASE_URL } from '@/config/env';
import { ApiError, enc, query, request, type RequestOptions } from '@/lib/http';

export interface ContinueFlowResponse {
  message: string;
  isNewUser: boolean;
  requiresOnboarding: boolean;
  hasWalletPIN?: boolean;
  userId?: string;
  walletId?: string;
  walletAddress?: string;
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

export { ApiError } from '@/lib/http';

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
  private makeRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return request<T>(endpoint, options);
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

  /**
   * Save the user's citizenship. Sent with the session token so the backend can
   * identify the user from the token rather than trusting the phone/email in the body.
   */
  async updateCountry(
    data: {
      phoneNumber?: string;
      email?: string;
      country: string;
    },
    token: string
  ): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>('/auth/update-country', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
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
    
    return this.makeRequest('/auth/set-wallet-pin', {
      method: 'POST',
      skipSessionExpiry: true,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin }),
    });
  }

  async verifyWalletPIN(pin: string, token: string): Promise<{ message: string; success: boolean }> {
    
    return this.makeRequest('/auth/verify-wallet-pin', {
      method: 'POST',
      skipSessionExpiry: true,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin }),
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



  async initializeWallet(walletId: string, token: string): Promise<{ success: boolean; message: string; balance: number; signature: string; explorerUrl: string; walletUrl: string }> {
    return this.makeRequest(`/wallet/${enc(walletId)}/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Send SOL or SPL token transaction
  /**
   * Send SOL (no `tokenMint`) or an SPL token. `idempotencyKey` must be the same
   * for retries of one user action so the backend can refuse duplicates.
   */
  async sendTransaction(
    walletId: string,
    token: string,
    data: { toAddress: string; amount: number; memo?: string; tokenMint?: string },
    idempotencyKey: string
  ): Promise<{ signature: string; fee?: number }> {
    const requestBody: { toAddress: string; amount: number; memo?: string; tokenMint?: string } = {
      toAddress: data.toAddress,
      amount: data.amount,
    };
    if (data.memo) requestBody.memo = data.memo;
    if (data.tokenMint) requestBody.tokenMint = data.tokenMint;

    return this.makeRequest(`/wallet/${enc(walletId)}/send-transaction`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(requestBody),
    });
  }

  async getTransactionHistory(walletId: string, token: string): Promise<{ transactions: Array<{ id: string; signature: string; type: 'SEND' | 'RECEIVE'; amount: number; fromAddress: string; toAddress: string; fee: number; status: 'PENDING' | 'CONFIRMED' | 'FAILED'; timestamp: string; errorMessage?: string }>; total: number }> {
    return this.makeRequest(`/wallet/${enc(walletId)}/transactions`, {
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
    return this.makeRequest(`/market-data/solana/historical${query({ period })}`, {
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

    const qs = searchParams.toString();
    const url = `/notifications${qs ? `?${qs}` : ''}`;

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
    return this.makeRequest(`/notifications/${enc(notificationId)}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }



  async getSwapQuote(
    walletId: string, 
    token: string, 
    data: {
      inputToken: string;
      outputToken: string;
      /** Mint addresses of the tokens above; the backend should route by these. */
      inputMint?: string;
      outputMint?: string;
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

    return this.makeRequest(`/wallet/${enc(walletId)}/swap/quote`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  /**
   * Execute a swap. Sends the slippage tolerance and the minimum output from
   * the quote the user accepted, so the backend can reject a worse fill.
   */
  async executeSwap(
    walletId: string,
    token: string,
    data: {
      inputToken: string;
      outputToken: string;
      inputMint?: string;
      outputMint?: string;
      amount: number;
      slippageTolerance: number;
      minimumOutputAmount: number;
      pin: string;
    },
    idempotencyKey: string
  ): Promise<{
    success: boolean;
    swapTransactionId: string;
    blockchainTxHash?: string;
    actualOutputAmount?: number;
    error?: string;
  }> {
    return this.makeRequest(`/wallet/${enc(walletId)}/swap/execute`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
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

    const qs = searchParams.toString();
    const url = `/wallet/${enc(walletId)}/swap/history${qs ? `?${qs}` : ''}`;

    return this.makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
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
    }> } = await this.makeRequest(`/wallet/${enc(walletId)}/swap/tokens/balances`, {
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
    return this.makeRequest(`/wallet/${enc(walletId)}/swap/tokens/balances`, {
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
    skipSessionExpiry: true,
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
    return this.makeRequest(`/rewards/${enc(userId)}/${enc(rewardType)}`, {
      method: 'POST',
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
    return this.makeRequest(`/rewards/${enc(userId)}`, {
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
    return this.makeRequest(`/rewards/${enc(userId)}/milestones`, {
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
    return this.makeRequest(`/rewards/${enc(userId)}/your-rewards`, {
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
    return this.makeRequest(`/rewards/${enc(userId)}/more-rewards`, {
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
  return this.makeRequest<Record<string, unknown>>(`/translations/${enc(locale)}`, {
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

async getTokenPrices(symbols?: string[]): Promise<{
  prices: Record<string, { price: number; priceChange24h?: number }>;
  timestamp: number;
}> {
  const qs = query({ symbols: symbols?.join(',') });
  return this.makeRequest<{
    prices: Record<string, { price: number; priceChange24h?: number }>;
    timestamp: number;
  }>(`/tokens/prices${qs}`, {
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

  const qs = searchParams.toString();
  return this.makeRequest(`/tokens/all${qs ? `?${qs}` : ''}`, {
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

  const qs = searchParams.toString();
  return this.makeRequest(`/tokens/with-volume${qs ? `?${qs}` : ''}`, {
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

  const qs = searchParams.toString();
  return this.makeRequest(`/launchpad/projects/live${qs ? `?${qs}` : ''}`, {
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

  const qs = searchParams.toString();
  return this.makeRequest(`/launchpad/projects${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

async getLaunchpadProject(projectId: string, token?: string | null): Promise<LaunchpadProject> {
  return this.makeRequest(`/launchpad/projects/${enc(projectId)}`, {
    method: 'GET',
    ...(token && { headers: { Authorization: `Bearer ${token}` } }),
  });
}

// Upload project image (multipart/form-data)
async uploadLaunchpadProjectImage(
  file: File,
  token: string
): Promise<{ success: boolean; imageUrl: string; key: string }> {
  const formData = new FormData();
  formData.append('image', file);

  return this.makeRequest('/launchpad/upload-image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
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
  return this.makeRequest(`/launchpad/projects/${enc(projectId)}/quote/buy${query({ amount })}`, {
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
  return this.makeRequest(`/launchpad/projects/${enc(projectId)}/quote/sell${query({ amount })}`, {
    method: 'GET',
  });
}

async getLaunchpadTokenBalance(
  projectId: string,
  token: string
): Promise<{
  balance: number;
  tokenAddress: string;
}> {
  return this.makeRequest(`/launchpad/projects/${enc(projectId)}/balance`, {
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
  const qs = params?.limit ? `?limit=${params.limit}` : '';
  return this.makeRequest(`/launchpad/projects/${enc(projectId)}/trades${qs}`, {
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
  return this.makeRequest(`/launchpad/projects/${enc(projectId)}/watchlist`, {
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
  return this.makeRequest(`/launchpad/alerts/${enc(alertId)}`, {
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
  return this.makeRequest(`/launchpad/alerts/${enc(alertId)}`, {
    method: 'DELETE',
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
  const qs = params?.limit ? `?limit=${params.limit}` : '';
  return this.makeRequest(`/launchpad/projects/${enc(projectId)}/holders${qs}`, {
    method: 'GET',
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
  slippageTolerance: number,
  idempotencyKey: string,
  minimumOutputAmount?: number
): Promise<LaunchpadCustodialTradeResponse> {
  return this.makeRequest(`/launchpad/projects/${enc(projectId)}/custodial/buy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      solAmount,
      slippageTolerance,
      ...(minimumOutputAmount !== undefined ? { minimumOutputAmount } : {}),
    }),
  });
}

// Sell tokens on-chain using Swarp Foundation wallet (server signs automatically)
async sellLaunchpadTokensCustodial(
  projectId: string,
  tokenAmount: number,
  token: string,
  slippageTolerance: number,
  idempotencyKey: string,
  minimumOutputAmount?: number
): Promise<LaunchpadCustodialTradeResponse> {
  return this.makeRequest(`/launchpad/projects/${enc(projectId)}/custodial/sell`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      tokenAmount,
      slippageTolerance,
      ...(minimumOutputAmount !== undefined ? { minimumOutputAmount } : {}),
    }),
  });
}

async generateTransakUrl(walletId: string, token: string, data: { type: 'buy' | 'sell', walletAddress?: string, fiatCurrency?: string, cryptoCurrency?: string, fiatAmount?: number }): Promise<{ url: string; type: string; environment: string }> {
  return this.makeRequest(`/wallet/${enc(walletId)}/generate-transak-url`, {
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

  async stakeTokens(token: string, data: { amount: number; lockDays: number; poolId?: string }, idempotencyKey: string) {
    return this.makeRequest('/staking/stake', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(data),
    });
  }

  async withdrawStake(token: string, positionId: string) {
    return this.makeRequest(`/staking/withdraw/${enc(positionId)}`, {
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