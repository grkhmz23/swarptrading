"use client";

import { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import { useT } from "@/i18n/I18nProvider";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  subType?: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export default function Notifications() {
  const t = useT();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [_unread, setUnread] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const token = localStorage.getItem("swarp_fd_access_token");
    if (!token) return;

    try {
      setLoading(true);
      const response = await apiService.getNotifications(token, {
        type: 'LAUNCHPAD',
        limit: 50,
        offset: 0,
      });

      setNotifications(response.notifications);
      setTotal(response.total);
      setUnread(response.unread);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    const token = localStorage.getItem("swarp_fd_access_token");
    if (!token || notification.isRead) return;

    try {
      await apiService.markNotificationAsRead(notification.id, token);

      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );
      setUnread(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[#636466]">{t.launchpad?.notifications?.loadingNotifications || "Loading notifications..."}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0A0B0F]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#2B2D30]">
        <h1 className="text-base font-semibold text-white">
          {(t.launchpad?.notifications?.title || "Notifications ({{total}})").replace("{{total}}", String(total))}
        </h1>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto px-5">
        {notifications.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <img
              src="/figma-assets/launchpad/notifications.svg"
              alt="No notifications"
              width={44}
              height={44}
              className="mb-4 opacity-40"
            />
            <p className="text-[#636466]">{t.launchpad?.notifications?.noNotificationsYet || "No notifications yet"}</p>
          </div>
        ) : (
          <div className="py-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`
                  py-3 px-0 cursor-pointer transition-opacity
                  ${notification.isRead ? 'opacity-60' : ''}
                `}
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-full bg-[#1A1B23] border border-[#2B2D30] flex items-center justify-center">
                    <img
                      src="/figma-assets/launchpad/notifications.svg"
                      alt="Notification"
                      width={24}
                      height={24}
                      className="opacity-60"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title and Time */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-[#40E0D0]" />
                        )}
                        <h3 className="text-base font-medium text-white">
                          {notification.title}
                        </h3>
                      </div>
                      <span className="text-xs text-[#636466] flex-shrink-0">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>

                    {/* Body */}
                    <p className="text-sm text-[#A1A3A7] leading-relaxed">
                      {notification.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
