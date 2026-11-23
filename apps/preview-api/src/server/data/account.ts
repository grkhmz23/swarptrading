import type { ApiResult, RewardResponse } from "../types";
import { derivedAddress } from "../random";

export type Notification = ApiResult<"getNotifications">["notifications"][number];

export function initialNotifications(now = Date.now()): Notification[] {
  const at = (hoursAgo: number) => new Date(Math.floor(now / 3_600_000) * 3_600_000 - hoursAgo * 3_600_000).toISOString();
  return [
    { id: "n1", title: "Received 2.5 SOL", body: "2.5 SOL arrived in your wallet.", type: "TRANSACTION", isRead: false, createdAt: at(2) },
    { id: "n2", title: "Orbit Cats is 78% bonded", body: "A token on your watchlist is close to graduating.", type: "LAUNCHPAD", isRead: false, createdAt: at(6) },
    { id: "n3", title: "New sign-in", body: "Your account was opened on a new browser.", type: "SECURITY", isRead: false, createdAt: at(20) },
    { id: "n4", title: "Swap completed", body: "1.5 SOL was swapped to USDC.", type: "TRANSACTION", isRead: true, createdAt: at(5) },
    { id: "n5", title: "Referral reward", body: "A friend joined with your code.", type: "REWARDS", isRead: true, createdAt: at(72) },
    { id: "n6", title: "Welcome to SwarpPay", body: "This is the preview build. All data is sample data.", type: "SYSTEM", isRead: true, createdAt: at(240) },
  ];
}

export interface NotificationPreferences {
  allowNotifications: boolean;
  transactionAlerts: boolean;
  swapAndTopUp: boolean;
  rewardsAndReferrals: boolean;
  securityActivity: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  allowNotifications: true,
  transactionAlerts: true,
  swapAndTopUp: true,
  rewardsAndReferrals: false,
  securityActivity: true,
};

export const DEFAULT_CONTACTS = [
  { nickname: "Treasury", address: derivedAddress("contact:treasury") },
  { nickname: "Alex", address: derivedAddress("contact:alex") },
];

export const REFERRAL_CODE = "SWARPDEMO";

export function referrals(now = Date.now()): ApiResult<"getMyReferrals"> {
  const day = 86_400_000;
  const list = [
    { id: "r1", firstName: "Maya", lastName: "K.", phoneNumber: "+44 •••• ••0142", profilePicture: null, joinedAt: new Date(now - 3 * day).toISOString() },
    { id: "r2", firstName: "Leo", lastName: "D.", phoneNumber: "+1 ••• •••7731", profilePicture: null, joinedAt: new Date(now - 11 * day).toISOString() },
  ];
  return { count: list.length, referrals: list };
}

function reward(r: Partial<RewardResponse> & Pick<RewardResponse, "rewardName" | "rewardType" | "category" | "section" | "currentValue" | "targetValue" | "requirementLabel" | "subtitle">): RewardResponse {
  const progress = Math.min(100, Math.round((r.currentValue / r.targetValue) * 100));
  return { tier: 1, claimed: false, eligible: progress >= 100, progress, ...r };
}

export function rewards(): RewardResponse[] {
  return [
    reward({ rewardName: "First friend", rewardType: "REFERRAL_1", category: "REFERRAL", section: "MILESTONES", tier: 1, currentValue: 2, targetValue: 1, requirementLabel: "Invite 1 friend", subtitle: "Earn 50 SWARP", claimed: true }),
    reward({ rewardName: "Connector", rewardType: "REFERRAL_5", category: "REFERRAL", section: "MILESTONES", tier: 2, currentValue: 2, targetValue: 5, requirementLabel: "Invite 5 friends", subtitle: "Earn 300 SWARP" }),
    reward({ rewardName: "Ambassador", rewardType: "REFERRAL_20", category: "REFERRAL", section: "MILESTONES", tier: 3, currentValue: 2, targetValue: 20, requirementLabel: "Invite 20 friends", subtitle: "Earn 1,500 SWARP" }),
    reward({ rewardName: "First swap", rewardType: "FIRST_SWAP", category: "TRANSACTION", section: "YOUR_REWARDS", currentValue: 1, targetValue: 1, requirementLabel: "Complete a swap", subtitle: "Earn 25 SWARP" }),
    reward({ rewardName: "Active trader", rewardType: "TEN_TRANSACTIONS", category: "TRANSACTION", section: "YOUR_REWARDS", currentValue: 7, targetValue: 10, requirementLabel: "Make 10 transactions", subtitle: "Earn 100 SWARP" }),
    reward({ rewardName: "Launchpad explorer", rewardType: "LAUNCHPAD_BUY", category: "TRANSACTION", section: "MORE_REWARDS", currentValue: 3, targetValue: 5, requirementLabel: "Buy 5 launchpad tokens", subtitle: "Earn 150 SWARP" }),
    reward({ rewardName: "Staker", rewardType: "FIRST_STAKE", category: "TRANSACTION", section: "MORE_REWARDS", currentValue: 1, targetValue: 1, requirementLabel: "Stake SWARP once", subtitle: "Earn 40 SWARP", claimed: true }),
  ];
}

export const STAKING_POOLS = [
  { id: "swarp-30", name: "Flexible 30", lockDays: 30, apyPercent: 6, minStake: 100, maxStake: 1_000_000, totalStaked: 18_400_000 },
  { id: "swarp-90", name: "Growth 90", lockDays: 90, apyPercent: 10.5, minStake: 500, maxStake: 2_500_000, totalStaked: 42_100_000 },
  { id: "swarp-180", name: "Committed 180", lockDays: 180, apyPercent: 15, minStake: 1_000, maxStake: 5_000_000, totalStaked: 27_800_000 },
];

export function stakingPositions(now = Date.now()) {
  const day = 86_400_000;
  const start = Math.floor(now / day) * day - 41 * day;
  const amount = 20_000;
  const apy = 10.5;
  return [
    {
      id: "stake-1",
      poolId: "swarp-90",
      poolName: "Growth 90",
      amount,
      apyPercent: apy,
      earnedRewards: Math.round(amount * (apy / 100 / 365) * 41 * 100) / 100,
      startDate: new Date(start).toISOString(),
      endDate: new Date(start + 90 * day).toISOString(),
      status: "ACTIVE",
    },
  ];
}
