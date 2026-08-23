'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { apiService } from '@/services/api';
import { Notification } from '@/types/Notification';
import { useT } from '@/i18n/I18nProvider';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  onNotificationClick,
}) => {
  const t = useT();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'foundation' | 'launchpad'>('foundation');

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('swarp_fd_access_token');
      if (!token) return setError(t.notifications?.authRequired || 'Authentication required');

      const response = await apiService.getNotifications(token, { limit: 50 });
      setNotifications(response.notifications);
    } catch (err: unknown) {
      const apiError = err as { message?: string };
      setError(apiError.message || t.notifications?.failedToLoad || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return t.notifications?.time?.justNow || 'Just now';
    if (mins < 60) return (t.notifications?.time?.minutesAgo || '{minutes}m ago').replace('{minutes}', String(mins));
    if (hours < 24) return (t.notifications?.time?.hoursAgo || '{hours}h ago').replace('{hours}', String(hours));
    return (t.notifications?.time?.daysAgo || '{days}d ago').replace('{days}', String(days));
  };

  // Translate notification title and body based on type/subType
  const getTranslatedNotification = (n: Notification): { title: string; body: string } => {
    const templates = t.notifications?.templates;
    const rawData = n.data || {};

    // Helper to safely convert unknown values to strings
    const str = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'number' || typeof val === 'boolean') return String(val);
      return '';
    };

    const data = {
      amount: str(rawData.amount),
      currency: str(rawData.currency),
      recipient: str(rawData.recipient),
      sender: str(rawData.sender),
      inputAmount: str(rawData.inputAmount),
      inputToken: str(rawData.inputToken),
      outputAmount: str(rawData.outputAmount),
      outputToken: str(rawData.outputToken),
      reason: str(rawData.reason),
      name: str(rawData.name),
      target: str(rawData.target),
      milestone: str(rawData.milestone),
      rewardName: str(rawData.rewardName),
      version: str(rawData.version),
      message: str(rawData.message),
      tip: str(rawData.tip),
      insight: str(rawData.insight),
    };

    // Helper to replace placeholders in templates
    const replaceParams = (template: string, params: Record<string, string>) => {
      let result = template;
      for (const [key, value] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
      return result;
    };

    // Security notifications
    if (n.type === 'SECURITY') {
      const securityTemplates = templates?.security;
      switch (n.subType) {
        case 'PIN_CHANGED':
          return {
            title: securityTemplates?.pinChangedTitle || n.title,
            body: securityTemplates?.pinChangedBody || n.body,
          };
        case 'FACEID_ENABLED':
          return {
            title: securityTemplates?.faceIdEnabledTitle || n.title,
            body: securityTemplates?.faceIdEnabledBody || n.body,
          };
        case 'NEW_DEVICE':
          return {
            title: securityTemplates?.newDeviceTitle || n.title,
            body: securityTemplates?.newDeviceBody || n.body,
          };
        case 'SUSPICIOUS_ACTIVITY':
          return {
            title: securityTemplates?.suspiciousActivityTitle || n.title,
            body: securityTemplates?.suspiciousActivityBody || n.body,
          };
      }
    }

    // Transaction notifications
    if (n.type === 'TRANSACTION') {
      const txTemplates = templates?.transaction;
      switch (n.subType) {
        case 'SENT':
          return {
            title: txTemplates?.sentTitle || n.title,
            body: data.recipient
              ? replaceParams(txTemplates?.sentBodyWithRecipient || n.body, {
                  amount: data.amount,
                  currency: data.currency,
                  recipient: data.recipient,
                })
              : replaceParams(txTemplates?.sentBody || n.body, {
                  amount: data.amount,
                  currency: data.currency,
                }),
          };
        case 'RECEIVED':
          return {
            title: txTemplates?.receivedTitle || n.title,
            body: data.sender
              ? replaceParams(txTemplates?.receivedBodyWithSender || n.body, {
                  amount: data.amount,
                  currency: data.currency,
                  sender: data.sender,
                })
              : replaceParams(txTemplates?.receivedBody || n.body, {
                  amount: data.amount,
                  currency: data.currency,
                }),
          };
        case 'CONFIRMED':
          return {
            title: txTemplates?.confirmedTitle || n.title,
            body: replaceParams(txTemplates?.confirmedBody || n.body, {
              amount: data.amount,
              currency: data.currency,
            }),
          };
        case 'FAILED':
          return {
            title: txTemplates?.failedTitle || n.title,
            body: replaceParams(txTemplates?.failedBody || n.body, {
              amount: data.amount,
              currency: data.currency,
            }),
          };
      }

      // Swap notifications
      const swapTemplates = templates?.swap;
      switch (n.subType) {
        case 'SWAP_COMPLETED':
          return {
            title: swapTemplates?.completedTitle || n.title,
            body: replaceParams(swapTemplates?.completedBody || n.body, {
              inputAmount: data.inputAmount,
              inputToken: data.inputToken,
              outputAmount: data.outputAmount,
              outputToken: data.outputToken,
            }),
          };
        case 'SWAP_FAILED':
          return {
            title: swapTemplates?.failedTitle || n.title,
            body: data.reason
              ? replaceParams(swapTemplates?.failedBodyWithReason || n.body, {
                  inputAmount: data.inputAmount,
                  inputToken: data.inputToken,
                  outputToken: data.outputToken,
                  reason: data.reason,
                })
              : replaceParams(swapTemplates?.failedBody || n.body, {
                  inputAmount: data.inputAmount,
                  inputToken: data.inputToken,
                  outputToken: data.outputToken,
                }),
          };
        case 'SWAP_PENDING':
          return {
            title: swapTemplates?.pendingTitle || n.title,
            body: replaceParams(swapTemplates?.pendingBody || n.body, {
              inputAmount: data.inputAmount,
              inputToken: data.inputToken,
              outputToken: data.outputToken,
            }),
          };
      }

      // TopUp notifications
      const topUpTemplates = templates?.topUp;
      switch (n.subType) {
        case 'TOPUP_COMPLETED':
        case 'MOONPAY_COMPLETED':
          return {
            title: topUpTemplates?.completedTitle || n.title,
            body: replaceParams(topUpTemplates?.completedBody || n.body, {
              amount: data.amount,
              currency: data.currency,
            }),
          };
        case 'TOPUP_FAILED':
        case 'MOONPAY_FAILED':
          return {
            title: topUpTemplates?.failedTitle || n.title,
            body: data.reason
              ? replaceParams(topUpTemplates?.failedBodyWithReason || n.body, { reason: data.reason })
              : topUpTemplates?.failedBody || n.body,
          };
        case 'TOPUP_PENDING':
          return {
            title: topUpTemplates?.pendingTitle || n.title,
            body: replaceParams(topUpTemplates?.pendingBody || n.body, {
              amount: data.amount,
              currency: data.currency,
            }),
          };
      }
    }

    // Rewards notifications
    if (n.type === 'REWARDS') {
      const rewardsTemplates = templates?.rewards;
      switch (n.subType) {
        case 'REFERRAL_SIGNUP':
          return {
            title: rewardsTemplates?.referralSignupTitle || n.title,
            body: data.name
              ? replaceParams(rewardsTemplates?.referralSignupBody || n.body, { name: data.name })
              : rewardsTemplates?.referralSignupBodyGeneric || n.body,
          };
        case 'REFERRAL_MILESTONE':
          return {
            title: rewardsTemplates?.milestoneTitles || n.title,
            body: replaceParams(rewardsTemplates?.milestoneBody || n.body, {
              target: data.target,
              milestone: data.milestone,
            }),
          };
        case 'REWARD_ELIGIBLE':
          return {
            title: rewardsTemplates?.eligibleTitle || n.title,
            body: replaceParams(rewardsTemplates?.eligibleBody || n.body, { rewardName: data.rewardName }),
          };
        case 'REWARD_CLAIMED':
          return {
            title: rewardsTemplates?.claimedTitle || n.title,
            body: data.amount
              ? replaceParams(rewardsTemplates?.claimedBodyWithAmount || n.body, {
                  rewardName: data.rewardName,
                  amount: data.amount,
                })
              : replaceParams(rewardsTemplates?.claimedBody || n.body, { rewardName: data.rewardName }),
          };
      }
    }

    // System notifications
    if (n.type === 'SYSTEM') {
      const systemTemplates = templates?.system;
      switch (n.subType) {
        case 'APP_UPDATE':
          return {
            title: systemTemplates?.appUpdateTitle || n.title,
            body: replaceParams(systemTemplates?.appUpdateBody || n.body, { version: data.version || 'latest' }),
          };
        case 'MAINTENANCE':
          return {
            title: systemTemplates?.maintenanceTitle || n.title,
            body: systemTemplates?.maintenanceBody || n.body,
          };
        case 'NETWORK_ISSUE':
          return {
            title: systemTemplates?.networkIssueTitle || n.title,
            body: systemTemplates?.networkIssueBody || n.body,
          };
        case 'FEATURE_ANNOUNCEMENT':
          return {
            title: systemTemplates?.featureAnnouncementTitle || n.title,
            body: data.message || systemTemplates?.featureAnnouncementBody || n.body,
          };
      }
    }

    // Marketing notifications
    if (n.type === 'MARKETING') {
      const marketingTemplates = templates?.marketing;
      switch (n.subType) {
        case 'PROMOTION':
          return {
            title: marketingTemplates?.promotionTitle || n.title,
            body: data.message || marketingTemplates?.promotionBody || n.body,
          };
        case 'REFERRAL':
          return {
            title: marketingTemplates?.referralTitle || n.title,
            body: marketingTemplates?.referralBody || n.body,
          };
        case 'EDUCATION':
          return {
            title: marketingTemplates?.educationTitle || n.title,
            body: data.tip || marketingTemplates?.educationBody || n.body,
          };
        case 'MARKET_INSIGHT':
          return {
            title: marketingTemplates?.marketInsightTitle || n.title,
            body: data.insight || marketingTemplates?.marketInsightBody || n.body,
          };
      }
    }

    // Launchpad notifications
    if (n.type === 'LAUNCHPAD') {
      const launchpadTemplates = templates?.launchpad;
      const projectName = str(rawData.projectName);
      const tokenAmount = str(rawData.tokenAmount);
      const solAmount = str(rawData.solAmount);
      const priceChange = str(rawData.priceChange);

      switch (n.subType) {
        case 'PROJECT_APPROVED':
          return {
            title: launchpadTemplates?.projectApprovedTitle || n.title,
            body: projectName
              ? replaceParams(launchpadTemplates?.projectApprovedBody || n.body, { projectName })
              : n.body,
          };
        case 'PROJECT_REJECTED':
          return {
            title: launchpadTemplates?.projectRejectedTitle || n.title,
            body: n.body,
          };
        case 'MIGRATION_STARTED':
          return {
            title: launchpadTemplates?.migrationStartedTitle || n.title,
            body: projectName
              ? replaceParams(launchpadTemplates?.migrationStartedBody || n.body, { projectName })
              : n.body,
          };
        case 'MIGRATION_COMPLETED':
          return {
            title: launchpadTemplates?.migrationCompletedTitle || n.title,
            body: projectName
              ? replaceParams(launchpadTemplates?.migrationCompletedBody || n.body, { projectName })
              : n.body,
          };
        case 'TRADE_COMPLETED':
          return {
            title: launchpadTemplates?.tradeCompletedTitle || n.title,
            body: tokenAmount && solAmount && projectName
              ? replaceParams(launchpadTemplates?.tradeCompletedBody || n.body, {
                  tokenAmount,
                  projectName,
                  solAmount,
                })
              : n.body,
          };
        case 'TRADE_FAILED':
          return {
            title: launchpadTemplates?.tradeFailedTitle || n.title,
            body: n.body,
          };
        case 'ALERT_TRIGGERED':
          return {
            title: launchpadTemplates?.alertTriggeredTitle || n.title,
            body: n.body,
          };
        case 'WATCHLIST_UPDATE':
          return {
            title: launchpadTemplates?.watchlistUpdateTitle || n.title,
            body: projectName && priceChange
              ? replaceParams(launchpadTemplates?.watchlistUpdateBody || n.body, {
                  projectName,
                  priceChange,
                })
              : n.body,
          };
      }
    }

    // Default: return original title/body
    return { title: n.title, body: n.body };
  };

  const getNotificationIcon = (type: string, subType?: string) => {
    if (type === 'TRANSACTION') {
      // Send transaction
      if (subType === 'SENT')
        return <Image src="figma-assets/send.svg" alt="Sent" width={16} height={16} />;

      // Receive transaction
      if (subType === 'RECEIVED')
        return <Image src="figma-assets/receive.svg" alt="Receive" width={16} height={16} />;

      // Swap notifications (including legacy swap_update)
      if (subType === 'SWAP_COMPLETED' || subType === 'SWAP_PENDING' || subType === 'swap_update')
        return '💰';

      if (subType === 'SWAP_FAILED')
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );

      // Top-up notifications (including legacy MOONPAY subtypes)
      if (subType === 'TOPUP_COMPLETED' || subType === 'TOPUP_PENDING' || subType === 'MOONPAY_COMPLETED')
        return '💳';

      if (subType === 'TOPUP_FAILED' || subType === 'MOONPAY_FAILED')
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );

      // Generic failed transaction
      if (subType === 'FAILED')
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );

      // Default transaction icon
      return '💰';
    }

    // Rewards notifications
    if (type === 'REWARDS') {
      if (subType === 'REFERRAL_SIGNUP' || subType === 'REFERRAL_MILESTONE')
        return '👥';

      if (subType === 'REWARD_ELIGIBLE' || subType === 'REWARD_CLAIMED')
        return '🎁';

      // Default rewards icon
      return '🏆';
    }

    // Security notifications
    if (type === 'SECURITY') {
      if (subType === 'PIN_CHANGED')
        return '🔐';

      if (subType === 'FACEID_ENABLED')
        return '👤';

      if (subType === 'NEW_DEVICE')
        return '📱';

      if (subType === 'SUSPICIOUS_ACTIVITY')
        return '⚠️';

      // Default security icon
      return '🔒';
    }

    // Launchpad notifications
    if (type === 'LAUNCHPAD') {
      if (subType === 'PROJECT_APPROVED')
        return '✅';

      if (subType === 'PROJECT_REJECTED')
        return '❌';

      if (subType === 'MIGRATION_STARTED' || subType === 'MIGRATION_COMPLETED')
        return '🚀';

      if (subType === 'TRADE_COMPLETED')
        return '💰';

      if (subType === 'TRADE_FAILED')
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );

      if (subType === 'ALERT_TRIGGERED')
        return '🔔';

      if (subType === 'WATCHLIST_UPDATE')
        return '⭐';

      // Default launchpad icon
      return '🪙';
    }

    const icons = {
      SYSTEM: '⚙️',
      MARKETING: '📢',
    };

    return icons[type as keyof typeof icons] || '🔔';
  };

  const handleClick = (n: Notification) => {
    onNotificationClick?.(n);
    onClose();
  };

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'launchpad') {
      return n.type === 'LAUNCHPAD';
    } else {
      return n.type !== 'LAUNCHPAD';
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0" />

      <div
        ref={modalRef}
        className="absolute !top-16 !right-7 w-[407px] h-[590px] bg-[#131519] border border-[#2B2D30] 
        rounded-xl shadow-[0px_0px_32px_rgba(0,0,0,0.2)] flex flex-col"
      >
        <div className="!px-5 !py-4 border-b border-[#2B2D30]">
          <h3 className="text-white text-base font-semibold !mb-4">
            {t.notifications?.title || "Notifications"} ({notifications.length})
          </h3>

          {/* Tabs */}
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('foundation')}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'foundation'
                  ? 'text-[#40E0D0] border-[#40E0D0]'
                  : 'text-[#636466] border-transparent hover:text-white'
              }`}
            >
              Swarp Foundation
            </button>
            <button
              onClick={() => setActiveTab('launchpad')}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'launchpad'
                  ? 'text-[#40E0D0] border-[#40E0D0]'
                  : 'text-[#636466] border-transparent hover:text-white'
              }`}
            >
              {t.navigation?.launchpad || "Launchpad"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto !px-5 !y-4">
          {isLoading && (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#40E0D0]" />
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-red-400 text-sm !mb-4">{error}</p>
              <button
                onClick={loadNotifications}
                className="bg-[#40E0D0] text-black !px-4 !py-2 rounded-full text-sm font-semibold"
              >
                {t.notifications?.tryAgain || "Try Again"}
              </button>
            </div>
          )}

          {!isLoading && !error && filteredNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 bg-[#2B2D30] rounded-full flex items-center justify-center !mb-4">
                <span className="text-[#636466] text-xl">🔔</span>
              </div>
              <h4 className="text-white text-sm font-medium !mb-2">{t.notifications?.noNotifications || "No notifications"}</h4>
              <p className="text-[#636466] text-xs">
                {activeTab === 'launchpad'
                  ? "You'll see launchpad updates here"
                  : (t.notifications?.noNotificationsDesc || "You'll see transaction updates here")}
              </p>
            </div>
          )}

          {!isLoading && !error && filteredNotifications.length > 0 && (
            <div className="space-y-1">
              {filteredNotifications.map((n) => {
                const translated = getTranslatedNotification(n);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className="flex items-start !gap-3 !p-3 !pb-4 hover:bg-[#1A1B23] rounded-lg cursor-pointer"
                  >
                    <div className="w-8 h-8 bg-[#2B2D30] rounded-full flex items-center justify-center !mt-1">
                      {typeof getNotificationIcon(n.type, n.subType) === 'string'
                        ? <span>{getNotificationIcon(n.type, n.subType)}</span>
                        : getNotificationIcon(n.type, n.subType)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between !mb-2">
                        <h4 className="text-white text-sm font-medium break-words">{translated.title}</h4>
                        <span className="text-[#636466] text-xs">{formatTimeAgo(n.createdAt)}</span>
                      </div>

                      <p className="text-[#B3B5B6] text-sm break-words">{translated.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
