export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'TRANSACTION' | 'SECURITY' | 'SYSTEM' | 'MARKETING' | 'REWARDS' | 'LAUNCHPAD';
  subType?: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}
