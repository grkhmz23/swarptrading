export const locales = ['en', 'it'] as const;
export type Locale = (typeof locales)[number];

export const languageNames: Record<Locale, string> = {
  en: 'English',
  it: 'Italian',
};

// Map display name to locale code
export const displayNameToLocale: Record<string, Locale> = {
  'English': 'en',
  'Italian': 'it',
};

// Map locale code to display name
export const localeToDisplayName: Record<Locale, string> = {
  'en': 'English',
  'it': 'Italian',
};

export const defaultLocale: Locale = 'en';

// Type definition for translations (matches backend structure)
export interface TranslationKeys {
  navigation?: {
    home?: string;
    wallet?: string;
    trade?: string;
    transactions?: string;
    rewards?: string;
    settings?: string;
    launchpad?: string;
  };
  trade?: {
    title?: string;
    searchTokens?: string;
    name?: string;
    price?: string;
    change?: string;
    volume?: string;
    liquidity?: string;
    marketCap?: string;
    holders?: string;
    noTokensFound?: string;
    tryDifferentSearch?: string;
    tryDifferentFilter?: string;
    filters?: {
      all?: string;
      gainers?: string;
      losers?: string;
      volume?: string;
      new?: string;
    };
  };
  dashboard?: {
    unlockRewards?: string;
    topMovers?: string;
  };
  rewardsPage?: {
    yourRewards?: string;
    moreRewards?: string;
    claim?: string;
    claiming?: string;
    claimed?: string;
    locked?: string;
    friend?: string;
    friends?: string;
    rewards?: {
      referralWelcome?: string;
      referralWelcomeDesc?: string;
      sendCashbackBooster?: string;
      sendCashbackBoosterDesc?: string;
      firstCashback?: string;
      firstCashbackDesc?: string;
      airdropReady?: string;
      airdropReadyDesc?: string;
      stakingSprout?: string;
      stakingSproutDesc?: string;
      swapStreak?: string;
      swapStreakDesc?: string;
    };
    milestones?: {
      welcomeBonus?: string;
      welcomeBonusDesc?: string;
      cashbackBooster?: string;
      cashbackBoosterDesc?: string;
      earlyAirdropAccess?: string;
      earlyAirdropAccessDesc?: string;
    };
  };
  settings?: {
    title?: string;
    general?: {
      title?: string;
      language?: { title?: string; subtitle?: string };
      currency?: { title?: string; subtitle?: string };
      network?: { title?: string; subtitle?: string };
    };
    notifications?: {
      title?: string;
      allowNotifications?: { title?: string };
      transactionAlerts?: { title?: string; subtitle?: string };
      swapAndTopUp?: { title?: string; subtitle?: string };
      rewardsAndReferrals?: { title?: string; subtitle?: string };
      securityActivity?: { title?: string; subtitle?: string };
    };
    security?: {
      title?: string;
      passcode?: { title?: string; subtitle?: string; changeButton?: string };
      deleteAccount?: { title?: string; subtitle?: string; deleteButton?: string };
    };
    addressBook?: {
      title?: string;
      addContact?: string;
      noContacts?: string;
      noContactsFound?: string;
      noContactsSubtitle?: string;
      contacts?: string;
    };
    referAndEarn?: {
      title?: string;
      heading?: string;
      step1?: string;
      step2?: string;
      step3?: string;
      copyCode?: string;
      copied?: string;
      shareTitle?: string;
      shareText?: string;
      rewards?: {
        title?: string;
        nextUnlock?: string;
        proTier?: string;
        youReferred?: string;
        noReferrals?: string;
        joined?: string;
        claim?: string;
        claiming?: string;
        claimed?: string;
        locked?: string;
      };
    };
    sidebar?: {
      general?: string;
      notifications?: string;
      security?: string;
      addressBook?: string;
      referAndEarn?: string;
    };
  };
  common?: {
    save?: string;
    cancel?: string;
    confirm?: string;
    delete?: string;
    close?: string;
    loading?: string;
    error?: string;
    success?: string;
    welcome?: string;
    back?: string;
    next?: string;
    done?: string;
    retry?: string;
    search?: string;
    addressCopied?: string;
    moonPayOpened?: string;
    openingMoonPay?: string;
    topUpYourWallet?: string;
    refreshTransactions?: string;
    today?: string;
    yesterday?: string;
    daysAgo?: string;
    profileNotAvailable?: string;
    authTokenNotFound?: string;
    failedToCreateSession?: string;
  };
  moonPay?: {
    purchaseDetected?: string;
    mainnetBalance?: string;
    syncing?: string;
    syncToDevnet?: string;
    purchasedVia?: string;
    buySellTitle?: string;
    buySellSubtitle?: string;
    buyCrypto?: string;
    buyCryptoDesc?: string;
    instantPurchases?: string;
    directToWallet?: string;
    secureRegulated?: string;
    buySol?: string;
    sellCrypto?: string;
    sellCryptoDesc?: string;
    directBankTransfers?: string;
    competitiveRates?: string;
    fastProcessing?: string;
    noSolToSell?: string;
    sellSol?: string;
    currentBalance?: string;
    walletAddress?: string;
    identityVerification?: string;
    identityVerificationDesc?: string;
    regionalAvailability?: string;
    regionalAvailabilityDesc?: string;
    supportedCountries?: string;
    failedToSyncBalance?: string;
    failedToSync?: string;
    balanceUpToDate?: string;
    walletNotAvailable?: string;
    purchaseFailed?: string;
    noSolAvailable?: string;
    saleFailed?: string;
    identityVerificationCompleted?: string;
    balanceSynced?: string;
    purchaseSuccessful?: string;
    saleSuccessful?: string;
  };
  modals?: {
    changePasscode?: {
      title?: string;
      oldPasscodePlaceholder?: string;
      newPasscodePlaceholder?: string;
      submitButton?: string;
      updating?: string;
      success?: string;
      errors?: {
        oldMustBe6Digits?: string;
        newMustBe6Digits?: string;
        oldCanOnlyBe6Digits?: string;
        newCanOnlyBe6Digits?: string;
        failedToUpdate?: string;
      };
    };
    deleteAccount?: {
      title?: string;
      warning?: string;
      cannotUndo?: string;
      successTitle?: string;
      successMessage?: string;
      redirecting?: string;
      cancelButton?: string;
      confirmButton?: string;
      deleting?: string;
      failedToDelete?: string;
    };
    addContact?: {
      title?: string;
      nickname?: string;
      nicknamePlaceholder?: string;
      address?: string;
      addressPlaceholder?: string;
      submitButton?: string;
      saving?: string;
      errors?: {
        fillBothFields?: string;
        failedToAdd?: string;
        userNotFound?: string;
      };
    };
    send?: {
      title?: string;
      selectToken?: string;
      availableBalance?: string;
      recipientAddress?: string;
      enterSolanaAddress?: string;
      amount?: string;
      memoOptional?: string;
      addNote?: string;
      sending?: string;
      sendTransaction?: string;
      validatingAddress?: string;
      errors?: {
        recipientRequired?: string;
        invalidAddress?: string;
        cannotSendToSelf?: string;
        invalidAmount?: string;
        insufficientBalance?: string;
        authRequired?: string;
        authExpired?: string;
        unableToValidate?: string;
        tokenNotFound?: string;
        failedToSend?: string;
      };
      success?: {
        transactionSent?: string;
      };
    };
    receive?: {
      title?: string;
      generatingQR?: string;
      scanQRCode?: string;
      yourWalletAddress?: string;
      addressCopied?: string;
      step1?: string;
      step2?: string;
      step3?: string;
      note?: string;
    };
    swap?: {
      title?: string;
      youPay?: string;
      youReceive?: string;
      available?: string;
      loading?: string;
      enterAmount?: string;
      selectDifferentTokens?: string;
      swapNow?: string;
      provider?: string;
      rate?: string;
      fee?: string;
      slippage?: string;
      deliveryTime?: string;
      processing?: string;
      conversionSuccessful?: string;
      swappedMessage?: string;
      into?: string;
      via?: string;
      walletUpdated?: string;
      goToWallet?: string;
      approxMinute?: string;
      errors?: {
        authRequired?: string;
        failedToGetQuote?: string;
        swapFailed?: string;
        failedToExecute?: string;
        swapFailedWithReason?: string;
      };
    };
    topUp?: {
      title?: string;
      topUpYourWallet?: string;
      chooseMethod?: string;
      fiatDescription?: string;
      topUpWithFiat?: string;
      topUpWithCrypto?: string;
      supportedTokens?: string;
      swapHint?: string;
      continue?: string;
    };
    username?: {
      title?: string;
      enterLabel?: string;
      placeholder?: string;
      hint?: string;
      chooseLabel?: string;
      noSuggestions?: string;
      loadingSuggestions?: string;
      setting?: string;
      setButton?: string;
      success?: string;
      errors?: {
        authRequired?: string;
        failedToLoadSuggestions?: string;
        tooShort?: string;
        tooLong?: string;
        checkingFailed?: string;
        pleaseEnter?: string;
        pleaseWait?: string;
        chooseAvailable?: string;
        failedToSet?: string;
      };
    };
  };
  wallet?: {
    myWallet?: string;
    uniqueIdentity?: string;
    estimatedBalance?: string;
    balance?: string;
    send?: string;
    receive?: string;
    swap?: string;
    topUp?: string;
    withdraw?: string;
    transactions?: string;
    noTransactions?: string;
    trendingTokens?: string;
    yourTokens?: string;
    name?: string;
    currentPrice?: string;
    volume?: string;
    primaryToken?: string;
    loadingTokenBalances?: string;
    noTokenBalances?: string;
    noTokensYet?: string;
    topUpToStart?: string;
    createUsername?: string;
    createUsernameDesc?: string;
    walletPerformance?: string;
    solanaValue?: string;
    searchTokens?: string;
    noTokensFound?: string;
    tryDifferentSearch?: string;
    tryDifferentFilter?: string;
    filters?: {
      all?: string;
      gainers?: string;
      losers?: string;
      volume?: string;
      new?: string;
    };
    chart?: {
      '1H'?: string;
      '1D'?: string;
      '1W'?: string;
      '1M'?: string;
      '1Y'?: string;
      'ALL'?: string;
    };
    transaction?: {
      sent?: string;
      received?: string;
      pending?: string;
      confirmed?: string;
      failed?: string;
      sentSol?: string;
      receivedSol?: string;
      boughtSol?: string;
      soldSol?: string;
      from?: string;
      to?: string;
      fee?: string;
    };
  };
  notifications?: {
    title?: string;
    noNotifications?: string;
    noNotificationsDesc?: string;
    markAllRead?: string;
    tryAgain?: string;
    authRequired?: string;
    failedToLoad?: string;
    time?: {
      justNow?: string;
      minutesAgo?: string;
      hoursAgo?: string;
      daysAgo?: string;
    };
    types?: {
      transaction?: string;
      security?: string;
      system?: string;
      marketing?: string;
      rewards?: string;
    };
    templates?: {
      transaction?: {
        sentTitle?: string;
        sentBody?: string;
        sentBodyWithRecipient?: string;
        receivedTitle?: string;
        receivedBody?: string;
        receivedBodyWithSender?: string;
        confirmedTitle?: string;
        confirmedBody?: string;
        failedTitle?: string;
        failedBody?: string;
      };
      security?: {
        pinChangedTitle?: string;
        pinChangedBody?: string;
        faceIdEnabledTitle?: string;
        faceIdEnabledBody?: string;
        newDeviceTitle?: string;
        newDeviceBody?: string;
        suspiciousActivityTitle?: string;
        suspiciousActivityBody?: string;
      };
      system?: {
        appUpdateTitle?: string;
        appUpdateBody?: string;
        maintenanceTitle?: string;
        maintenanceBody?: string;
        networkIssueTitle?: string;
        networkIssueBody?: string;
        featureAnnouncementTitle?: string;
        featureAnnouncementBody?: string;
      };
      swap?: {
        completedTitle?: string;
        completedBody?: string;
        failedTitle?: string;
        failedBody?: string;
        failedBodyWithReason?: string;
        pendingTitle?: string;
        pendingBody?: string;
      };
      marketing?: {
        promotionTitle?: string;
        promotionBody?: string;
        referralTitle?: string;
        referralBody?: string;
        educationTitle?: string;
        educationBody?: string;
        marketInsightTitle?: string;
        marketInsightBody?: string;
      };
      topUp?: {
        completedTitle?: string;
        completedBody?: string;
        failedTitle?: string;
        failedBody?: string;
        failedBodyWithReason?: string;
        pendingTitle?: string;
        pendingBody?: string;
      };
      rewards?: {
        referralSignupTitle?: string;
        referralSignupBody?: string;
        referralSignupBodyGeneric?: string;
        milestoneTitles?: string;
        milestoneBody?: string;
        eligibleTitle?: string;
        eligibleBody?: string;
        claimedTitle?: string;
        claimedBody?: string;
        claimedBodyWithAmount?: string;
      };
      launchpad?: {
        projectApprovedTitle?: string;
        projectApprovedBody?: string;
        projectRejectedTitle?: string;
        projectRejectedBody?: string;
        migrationStartedTitle?: string;
        migrationStartedBody?: string;
        migrationCompletedTitle?: string;
        migrationCompletedBody?: string;
        tradeCompletedTitle?: string;
        tradeCompletedBody?: string;
        tradeFailedTitle?: string;
        tradeFailedBody?: string;
        priceAlertTitle?: string;
        priceAlertBody?: string;
        bondingProgressTitle?: string;
        bondingProgressBody?: string;
        alertTriggeredTitle?: string;
        alertTriggeredBody?: string;
        watchlistUpdateTitle?: string;
        watchlistUpdateBody?: string;
      };
    };
    messages?: {
      pinChanged?: string;
      transactionSent?: string;
      transactionReceived?: string;
      newLogin?: string;
      rewardEarned?: string;
    };
  };
  auth?: {
    login?: string;
    logout?: string;
    register?: string;
    forgotPassword?: string;
    verifyPhone?: string;
    verifyEmail?: string;
    enterOtp?: string;
    resendOtp?: string;
  };
  transactionsPage?: {
    activity?: string;
    details?: string;
    amount?: string;
    date?: string;
    filters?: {
      date?: string;
      currency?: string;
      amountRange?: string;
      all?: string;
      allTime?: string;
      today?: string;
      thisWeek?: string;
      thisMonth?: string;
      thisYear?: string;
      allAmounts?: string;
      clearFilters?: string;
      clearAllFilters?: string;
    };
    noTransactions?: string;
    noTransactionsDesc?: string;
    noMatchingTransactions?: string;
    noMatchingTransactionsDesc?: string;
    errorLoading?: string;
    tryAgain?: string;
  };
  errors?: {
    generic?: string;
    network?: string;
    unauthorized?: string;
    notFound?: string;
    invalidInput?: string;
  };
  onboarding?: {
    almostThere?: string;
    verifyIdentity?: string;
    remainingSteps?: string;
    closeToFinishing?: string;
    accountCreated?: string;
    verifyDescription?: string;
    whyImportant?: string;
    verify?: string;
    verifyIdentityFull?: string;
    opening?: string;
    topUpWallet?: string;
    topUpDescription?: string;
    learnMore?: string;
    swapFirst?: string;
    swapDescription?: string;
    alreadyVerified?: string;
    verificationSubmitted?: string;
    verificationCancelled?: string;
    verified?: string;
    identityVerified?: string;
    pending?: string;
    retry?: string;
    retryVerification?: string;
    signUp?: {
      welcome?: string;
      subtitle?: string;
      subtitleLine2?: string;
      phoneNumber?: string;
      continueWithGoogle?: string;
      haveReferralCode?: string;
      termsText?: string;
      termsLink?: string;
      and?: string;
      privacyLink?: string;
      errors?: {
        phoneRequired?: string;
        invalidPhone?: string;
      };
    };
    verifyPhone?: {
      title?: string;
      subtitle?: string;
      newCodeIn?: string;
      sec?: string;
      didntReceiveCode?: string;
      resendCode?: string;
      waitToResend?: string;
      sending?: string;
      verifying?: string;
      sendingSms?: string;
      errors?: {
        completeCode?: string;
        phoneNotFound?: string;
        otpExpired?: string;
        invalidOtp?: string;
        failedToSendSms?: string;
        failedToResend?: string;
      };
    };
    selectCitizenship?: {
      title?: string;
      subtitle?: string;
      selectCountry?: string;
      searchHint?: string;
      noCountriesFound?: string;
      allCountries?: string;
      errors?: {
        userNotFound?: string;
        failedToUpdate?: string;
      };
    };
    emailSetup?: {
      title?: string;
      subtitle?: string;
      placeholder?: string;
      continue?: string;
      checking?: string;
      back?: string;
      errors?: {
        required?: string;
        invalid?: string;
        exists?: string;
        generic?: string;
      };
    };
    profileSetup?: {
      title?: string;
      subtitle?: string;
      firstName?: string;
      lastName?: string;
      continue?: string;
      saving?: string;
      back?: string;
      errors?: {
        allFieldsRequired?: string;
        authRequired?: string;
        emailInUse?: string;
        failedToSave?: string;
      };
    };
    profilePhoto?: {
      title?: string;
      subtitleWithPhoto?: string;
      subtitleNoPhoto?: string;
      change?: string;
      continueWithPhoto?: string;
      skipForNow?: string;
      saving?: string;
      processing?: string;
      errors?: {
        invalidImage?: string;
        imageTooLarge?: string;
        authRequired?: string;
        noPicture?: string;
        fileSizeLimit?: string;
        failedToUpload?: string;
        failedToSave?: string;
      };
    };
    creatingWallet?: {
      titleCreating?: string;
      titleConnecting?: string;
      titleError?: string;
      subtitleCreating?: string;
      subtitleConnecting?: string;
      tryAgain?: string;
      errors?: {
        tokenNotFound?: string;
        sessionExpired?: string;
        serverError?: string;
        failedToProcess?: string;
      };
    };
    setPasscode?: {
      title?: string;
      subtitle?: string;
    };
    confirmPasscode?: {
      title?: string;
      subtitle?: string;
      errors?: {
        tokenNotFound?: string;
        pinFormat?: string;
        mismatch?: string;
        failedToSave?: string;
      };
    };
    enterPasscode?: {
      title?: string;
      subtitle?: string;
      verifying?: string;
      errors?: {
        pinFormat?: string;
        phoneNotFound?: string;
        tokenNotFound?: string;
        invalid?: string;
      };
    };
    referralModal?: {
      title?: string;
      placeholder?: string;
      continue?: string;
      checking?: string;
      valid?: string;
      errors?: {
        generic?: string;
      };
    };
  };
  launchpad?: {
    navigation?: {
      home?: string;
      portfolio?: string;
      tradeHistory?: string;
      watchlist?: string;
      alerts?: string;
      requestToken?: string;
      support?: string;
      comingSoon?: string;
      thisSection?: string;
    };
    home?: {
      featured?: string;
      liveProjects?: string;
      search?: string;
      noFeaturedProjects?: string;
      noProjectsFound?: string;
      noDescription?: string;
      tryAgain?: string;
      migrated?: string;
      bonding?: string;
      mc?: string;
      age?: string;
      filters?: {
        title?: string;
        category?: string;
        status?: string;
        marketCap?: string;
        age?: string;
        min?: string;
        max?: string;
        reset?: string;
        apply?: string;
      };
    };
    watchlist?: {
      title?: string;
      newAsset?: string;
      addAsset?: string;
      token?: string;
      price?: string;
      change24h?: string;
      marketCap?: string;
      volume24h?: string;
      volume?: string;
      age?: string;
      rank?: string;
      noTokens?: string;
      noTokensDescription?: string;
      loginRequired?: string;
      failedToLoad?: string;
      tryAgain?: string;
      searchTokens?: string;
      save?: string;
      loadingProjects?: string;
      noLiveProjects?: string;
      noTokensFound?: string;
      allInWatchlist?: string;
      failedToAdd?: string;
    };
    portfolio?: {
      totalBalance?: string;
      tokensHeld?: string;
      name?: string;
      amount?: string;
      change24h?: string;
      trade?: string;
      noTokensHeld?: string;
      noTokensHeldDescription?: string;
      activeProjects?: string;
      noSubmittedProjects?: string;
      noSubmittedProjectsDescription?: string;
      requestToken?: string;
      timeAgo?: {
        minutesAgo?: string;
        hoursAgo?: string;
        daysAgo?: string;
      };
    };
    tradeHistory?: {
      activity?: string;
      date?: string;
      token?: string;
      type?: string;
      details?: string;
      amount?: string;
      status?: string;
      all?: string;
      today?: string;
      thisWeek?: string;
      thisMonth?: string;
      thisYear?: string;
      buy?: string;
      sell?: string;
      completed?: string;
      pending?: string;
      failed?: string;
      noTradeHistory?: string;
      noTradeHistoryDescription?: string;
    };
    requestToken?: {
      title?: string;
      subtitle?: string;
      name?: string;
      namePlaceholder?: string;
      nameHelper?: string;
      ticker?: string;
      tickerPlaceholder?: string;
      tickerHelper?: string;
      description?: string;
      optional?: string;
      descriptionPlaceholder?: string;
      imageVideo?: string;
      uploadText?: string;
      uploadSpecs?: string;
      socialLinks?: string;
      websitePlaceholder?: string;
      twitterPlaceholder?: string;
      telegramPlaceholder?: string;
      otherPlaceholder?: string;
      previewTitle?: string;
      previewSubtitle?: string;
      noImageUploaded?: string;
      cancel?: string;
      submit?: string;
      submitting?: string;
      successTitle?: string;
      successSubtitle?: string;
      tokenMintAddress?: string;
      transactionSignature?: string;
      viewOnExplorer?: string;
      done?: string;
      errors?: {
        invalidImageFile?: string;
        enterTokenName?: string;
        enterTokenTicker?: string;
        loginRequired?: string;
        uploadImageFailed?: string;
        createTokenFailed?: string;
      };
    };
    alerts?: {
      title?: string;
      newAlert?: string;
      createAlert?: string;
      active?: string;
      alertTriggers?: string;
      goesUnder?: string;
      goesOver?: string;
      created?: string;
      edit?: string;
      delete?: string;
      noAlertsYet?: string;
      noAlertsDescription?: string;
      loginRequired?: string;
      failedToLoad?: string;
      editAlert?: string;
      alertMeWhen?: string;
      selectToken?: string;
      priceInUSD?: string;
      writeNote?: string;
      saveChanges?: string;
      noTokensAvailable?: string;
      errors?: {
        selectTokenAndPrice?: string;
        invalidPrice?: string;
        loginToCreate?: string;
        failedToSave?: string;
      };
      timeAgo?: {
        lessThanMinute?: string;
        minutesAgo?: string;
        hoursAgo?: string;
        daysAgo?: string;
        weeksAgo?: string;
      };
    };
    notifications?: {
      title?: string;
      loadingNotifications?: string;
      noNotificationsYet?: string;
    };
    tokenDetail?: {
      tabs?: {
        chart?: string;
        comments?: string;
        trades?: string;
        holders?: string;
      };
      trading?: {
        buy?: string;
        sell?: string;
        balance?: string;
        youPay?: string;
        youReceive?: string;
        youSell?: string;
        youGet?: string;
        fee?: string;
        payWith?: string;
        youHave?: string;
        enterSolAmount?: string;
        enterTokenAmount?: string;
        solana?: string;
        solanaSol?: string;
      };
      stats?: {
        liquidity?: string;
        mktCap?: string;
        txns?: string;
        volume?: string;
        buys?: string;
        sells?: string;
        buyVol?: string;
        sellVol?: string;
        socials?: string;
      };
      table?: {
        walletAddress?: string;
        type?: string;
        amountSol?: string;
        amountToken?: string;
        valueSol?: string;
        time?: string;
        topHolders?: string;
      };
      status?: {
        loading?: string;
        noTradesYet?: string;
        noHoldersYet?: string;
        noCommentsYet?: string;
        tokenNotFound?: string;
        failedToLoad?: string;
        updating?: string;
      };
      buttons?: {
        goBack?: string;
        watchlist?: string;
        buyToken?: string;
        sellToken?: string;
      };
      toast?: {
        successfullyBought?: string;
        successfullySold?: string;
        tradeFailed?: string;
        enterValidAmount?: string;
        loginToAddWatchlist?: string;
        failedToUpdateWatchlist?: string;
        insufficientSol?: string;
        insufficientTokens?: string;
        slippageError?: string;
        loginRequired?: string;
      };
    };
  };
}
