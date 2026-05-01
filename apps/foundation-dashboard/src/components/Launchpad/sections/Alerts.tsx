"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import CreateAlertModal from "../CreateAlertModal";
import { apiService, LaunchpadAlert } from "@/services/api";
import { useT } from "@/i18n/I18nProvider";

// Format price for display
const formatPrice = (price: string | number, currency: string): string => {
  const priceNum = typeof price === "string" ? parseFloat(price) : price;
  if (currency === "SOL") {
    return `${priceNum.toFixed(10)} SOL`;
  }
  return `$${priceNum.toFixed(2)}`;
};

export default function Alerts() {
  const t = useT();

  const [alerts, setAlerts] = useState<LaunchpadAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<LaunchpadAlert | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Helper function to format time ago with translations
  const formatTimeAgo = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMins < 1) {
      return t.launchpad?.alerts?.timeAgo?.lessThanMinute || "less than a minute ago";
    }
    if (diffMins < 60) {
      const plural = diffMins > 1 ? "s" : "";
      return (t.launchpad?.alerts?.timeAgo?.minutesAgo || "{{count}} minute{{plural}} ago")
        .replace("{{count}}", String(diffMins))
        .replace("{{plural}}", plural);
    }
    if (diffHours < 24) {
      const plural = diffHours > 1 ? "s" : "";
      return (t.launchpad?.alerts?.timeAgo?.hoursAgo || "{{count}} hour{{plural}} ago")
        .replace("{{count}}", String(diffHours))
        .replace("{{plural}}", plural);
    }
    if (diffDays < 7) {
      const plural = diffDays > 1 ? "s" : "";
      return (t.launchpad?.alerts?.timeAgo?.daysAgo || "{{count}} day{{plural}} ago")
        .replace("{{count}}", String(diffDays))
        .replace("{{plural}}", plural);
    }
    const plural = diffWeeks > 1 ? "s" : "";
    return (t.launchpad?.alerts?.timeAgo?.weeksAgo || "{{count}} week{{plural}} ago")
      .replace("{{count}}", String(diffWeeks))
      .replace("{{plural}}", plural);
  }, [t]);

  // Fetch alerts from API
  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("swarp_fd_access_token");
      if (!token) {
        setError(t.launchpad?.alerts?.loginRequired || "Please login to view your alerts");
        setIsLoading(false);
        return;
      }

      const response = await apiService.getLaunchpadAlerts(token);
      setAlerts(response.alerts || []);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
      setError(t.launchpad?.alerts?.failedToLoad || "Failed to load alerts");
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpenPopoverId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle create new alert
  const handleOpenCreateModal = () => {
    setEditingAlert(null);
    setIsCreateModalOpen(true);
  };

  // Handle edit alert
  const handleEditAlert = (alert: LaunchpadAlert) => {
    setEditingAlert(alert);
    setIsCreateModalOpen(true);
    setOpenPopoverId(null);
  };

  // Handle delete alert
  const handleDeleteAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem("swarp_fd_access_token");
      if (!token) return;

      await apiService.deleteLaunchpadAlert(alertId, token);
      setAlerts(alerts.filter(a => a.id !== alertId));
      setOpenPopoverId(null);
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingAlert(null);
  };

  // Handle alert saved
  const handleAlertSaved = () => {
    fetchAlerts();
  };

  // Toggle popover
  const togglePopover = (alertId: string) => {
    setOpenPopoverId(openPopoverId === alertId ? null : alertId);
  };

  return (
    <div className="flex flex-col">
      {/* Header Section */}
      <div
        className="flex justify-between items-center !px-7 !py-5"
        style={{ borderBottom: "0.2px solid #2B2D30" }}
      >
        {/* Title */}
        <h1
          style={{
            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: "20px",
            fontWeight: 700,
            lineHeight: "1.19em",
            color: "#FFFFFF",
          }}
        >
          {t.launchpad?.alerts?.title || "Alerts"}
        </h1>

        {/* New Alert Button */}
        <button
          onClick={handleOpenCreateModal}
          className="flex cursor-pointer  items-center !gap-1.5 !px-4 !py-2.5 bg-white rounded-full hover:bg-gray-100 transition-colors"
          style={{ paddingLeft: "14px", paddingRight: "18px" }}
        >
          {/* Plus Icon */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2.83301 8H13.4997"
              stroke="#090A11"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.1665 2.6665V13.3332"
              stroke="#090A11"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontFamily: "'Inter Variable', Inter, sans-serif",
              fontSize: "14px",
              fontWeight: 700,
              lineHeight: "1.4em",
              letterSpacing: "-0.3px",
              color: "#090A11",
            }}
          >
            {t.launchpad?.alerts?.newAlert || "New alert"}
          </span>
        </button>
      </div>

      {/* Loading State - Skeleton */}
      {isLoading && (
        <div className="!px-7 !py-7">
          <div
            className="flex flex-col !p-5 !gap-4"
            style={{
              backgroundColor: "#131519",
              borderRadius: "12px",
            }}
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex flex-col">
                <div
                  className="flex justify-between items-start !pb-4"
                  style={{ borderBottom: "0.2px solid #2B2D30" }}
                >
                  <div className="flex flex-col !gap-2.5">
                    {/* Status Badge Skeleton */}
                    <div className="flex items-center !gap-1">
                      <div className="w-4 h-4 rounded-full bg-[#1A1B23] animate-pulse" />
                      <div className="h-4 w-12 bg-[#1A1B23] rounded animate-pulse" />
                    </div>
                    {/* Alert Text Skeleton */}
                    <div className="flex flex-col !gap-2">
                      <div className="h-5 w-72 bg-[#1A1B23] rounded animate-pulse" />
                      <div className="h-4 w-32 bg-[#1A1B23] rounded animate-pulse" />
                    </div>
                  </div>
                  {/* Menu Icon Skeleton */}
                  <div className="w-5 h-5 bg-[#1A1B23] rounded animate-pulse" />
                </div>
                {/* Note Section Skeleton */}
                <div className="flex items-center !gap-1.5 !pt-4">
                  <div className="w-5 h-5 bg-[#1A1B23] rounded animate-pulse" />
                  <div className="h-4 w-48 bg-[#1A1B23] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts List */}
      {!isLoading && alerts.length > 0 && (
        <div className="!px-7 !py-7">
          <div
            className="flex flex-col !p-5 !gap-4"
            style={{
              backgroundColor: "#131519",
              borderRadius: "12px",
            }}
          >
            {alerts.map((alert) => (
              <div key={alert.id} className="flex flex-col">
                {/* Alert Card Top Section */}
                <div
                  className="flex justify-between items-start !pb-4"
                  style={{ borderBottom: "0.2px solid #2B2D30" }}
                >
                  {/* Left Side - Status and Alert Info */}
                  <div className="flex flex-col !gap-2.5">
                    {/* Status Badge */}
                    <div className="flex items-center !gap-1">
                      {/* Active Icon */}
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="3" fill="#40E0D0" />
                      </svg>
                      <span
                        style={{
                          fontFamily: "'Inter Variable', Inter, sans-serif",
                          fontSize: "14px",
                          fontWeight: 700,
                          lineHeight: "1.4em",
                          letterSpacing: "-0.3px",
                          color: "#40E0D0",
                        }}
                      >
                        {t.launchpad?.alerts?.active || "Active"}
                      </span>
                    </div>

                    {/* Alert Trigger Text */}
                    <div className="flex flex-col !gap-2">
                      <span
                        style={{
                          fontFamily: "'Inter Variable', Inter, sans-serif",
                          fontSize: "16px",
                          fontWeight: 400,
                          lineHeight: "1.4em",
                          letterSpacing: "-0.3px",
                        }}
                      >
                        <span style={{ color: "#FFFFFF" }}>
                          {(t.launchpad?.alerts?.alertTriggers || "Alert triggers if {{projectName}} price").replace("{{projectName}}", alert.projectName)}{" "}
                        </span>
                        <span style={{ color: "#EB5757" }}>
                          {alert.condition === "goes_under"
                            ? (t.launchpad?.alerts?.goesUnder || "goes under")
                            : (t.launchpad?.alerts?.goesOver || "goes over")}{" "}
                          {formatPrice(alert.targetPrice, alert.currency)}
                        </span>
                      </span>
                      <span
                        style={{
                          fontFamily: "'Inter Variable', Inter, sans-serif",
                          fontSize: "14px",
                          fontWeight: 400,
                          lineHeight: "1.4em",
                          letterSpacing: "-0.3px",
                          color: "#636466",
                        }}
                      >
                        {t.launchpad?.alerts?.created || "Created"} {formatTimeAgo(alert.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Right Side - Three Dots Menu */}
                  <div className="relative">
                    <button
                      onClick={() => togglePopover(alert.id)}
                      className="flex cursor-pointer items-center justify-center w-5 h-5 hover:opacity-70 transition-opacity"
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M9.99984 10.8334C10.4601 10.8334 10.8332 10.4603 10.8332 10.0001C10.8332 9.53984 10.4601 9.16675 9.99984 9.16675C9.5396 9.16675 9.1665 9.53984 9.1665 10.0001C9.1665 10.4603 9.5396 10.8334 9.99984 10.8334Z"
                          stroke="white"
                          strokeWidth="1.66667"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.99984 4.99992C10.4601 4.99992 10.8332 4.62682 10.8332 4.16659C10.8332 3.70635 10.4601 3.33325 9.99984 3.33325C9.5396 3.33325 9.1665 3.70635 9.1665 4.16659C9.1665 4.62682 9.5396 4.99992 9.99984 4.99992Z"
                          stroke="white"
                          strokeWidth="1.66667"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.99984 16.6667C10.4601 16.6667 10.8332 16.2936 10.8332 15.8333C10.8332 15.3731 10.4601 15 9.99984 15C9.5396 15 9.1665 15.3731 9.1665 15.8333C9.1665 16.2936 9.5396 16.6667 9.99984 16.6667Z"
                          stroke="white"
                          strokeWidth="1.66667"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {/* Popover Menu */}
                    {openPopoverId === alert.id && (
                      <div
                        ref={popoverRef}
                        className="absolute right-0 top-6 z-50 flex flex-col !py-1"
                        style={{
                          width: "176px",
                          backgroundColor: "#090A11",
                          borderRadius: "12px",
                          boxShadow: "0px 0px 32px 0px rgba(19, 21, 25, 0.12)",
                        }}
                      >
                        {/* Edit Option */}
                        <button
                          onClick={() => handleEditAlert(alert)}
                          className="flex items-center !gap-2 !px-4 !py-2 hover:bg-[#131519] transition-colors"
                        >
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path
                              d="M3 16.1069H6.15934L14.4526 7.81366C14.6601 7.60622 14.8246 7.35994 14.9369 7.0889C15.0492 6.81786 15.1069 6.52736 15.1069 6.23399C15.1069 5.94062 15.0492 5.65012 14.9369 5.37908C14.8246 5.10804 14.6601 4.86177 14.4526 4.65432C14.2452 4.44688 13.9989 4.28232 13.7279 4.17005C13.4568 4.05778 13.1663 4 12.8729 4C12.5796 4 12.2891 4.05778 12.018 4.17005C11.747 4.28232 11.5007 4.44688 11.2933 4.65432L3 12.9476V16.1069Z"
                              stroke="white"
                              strokeWidth="0.947802"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M10.5034 5.44409L13.6628 8.60343"
                              stroke="white"
                              strokeWidth="0.947802"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M12.478 15.3169H17.217"
                              stroke="white"
                              strokeWidth="0.947802"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span
                            style={{
                              fontFamily: "'Inter Variable', Inter, sans-serif",
                              fontSize: "14px",
                              fontWeight: 400,
                              lineHeight: "1.4em",
                              letterSpacing: "-0.3px",
                              color: "#FFFFFF",
                            }}
                          >
                            {t.launchpad?.alerts?.edit || "Edit"}
                          </span>
                        </button>

                        {/* Delete Option */}
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="flex items-center !gap-2 !px-4 !py-2 hover:bg-[#131519] transition-colors"
                          style={{ backgroundColor: "rgba(235, 87, 87, 0.1)", borderRadius: "0 0 7px 7px" }}
                        >
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path
                              d="M4 6.11108H16.4445"
                              stroke="#EB5757"
                              strokeWidth="0.966672"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M8.66699 9.22241V13.8891"
                              stroke="#EB5757"
                              strokeWidth="0.966672"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M11.7773 9.22241V13.8891"
                              stroke="#EB5757"
                              strokeWidth="0.966672"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M4.77734 6.11108L5.55513 15.4445C5.55513 15.857 5.71901 16.2527 6.01074 16.5444C6.30246 16.8361 6.69813 17 7.11069 17H13.3329C13.7455 17 14.1412 16.8361 14.4329 16.5444C14.7246 16.2527 14.8885 15.857 14.8885 15.4445L15.6663 6.11108"
                              stroke="#EB5757"
                              strokeWidth="0.966672"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M7.88916 6.11113V3.77778C7.88916 3.5715 7.9711 3.37367 8.11697 3.22781C8.26283 3.08194 8.46066 3 8.66694 3H11.7781C11.9844 3 12.1822 3.08194 12.328 3.22781C12.4739 3.37367 12.5559 3.5715 12.5559 3.77778V6.11113"
                              stroke="#EB5757"
                              strokeWidth="0.966672"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span
                            style={{
                              fontFamily: "'Inter Variable', Inter, sans-serif",
                              fontSize: "14px",
                              fontWeight: 400,
                              lineHeight: "1.4em",
                              letterSpacing: "-0.3px",
                              color: "#EB5757",
                            }}
                          >
                            {t.launchpad?.alerts?.delete || "Delete"}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Alert Card Bottom Section - Note */}
                {alert.note && (
                  <div className="flex items-center !gap-1.5 !pt-4">
                    {/* Info Icon */}
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="6.5" stroke="#636466" strokeWidth="1.2" />
                      <path
                        d="M10 9V13"
                        stroke="#636466"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                      <circle cx="10" cy="7" r="0.75" fill="#636466" />
                    </svg>
                    <span
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "14px",
                        fontWeight: 400,
                        lineHeight: "1.4em",
                        letterSpacing: "-0.3px",
                        color: "#636466",
                      }}
                    >
                      {alert.note}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && alerts.length === 0 && (
        <div className="flex flex-col items-center justify-center !py-16 !gap-4">
          <span
            style={{
              fontFamily: "'Inter Variable', Inter, sans-serif",
              fontSize: "16px",
              fontWeight: 600,
              lineHeight: "1.4em",
              letterSpacing: "-0.3px",
              color: "#B3B5B6",
            }}
          >
            {t.launchpad?.alerts?.noAlertsYet || "No alerts yet"}
          </span>
          <span
            style={{
              fontFamily: "'Inter Variable', Inter, sans-serif",
              fontSize: "14px",
              fontWeight: 400,
              lineHeight: "1.4em",
              letterSpacing: "-0.3px",
              color: "#636466",
            }}
          >
            {t.launchpad?.alerts?.noAlertsDescription || "Create an alert to get notified when a token reaches your target price."}
          </span>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center !gap-1.5 !px-4 !py-2.5 bg-white rounded-full hover:bg-gray-100 transition-colors !mt-2"
            style={{ paddingLeft: "14px", paddingRight: "18px" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2.83301 8H13.4997"
                stroke="#090A11"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8.1665 2.6665V13.3332"
                stroke="#090A11"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontFamily: "'Inter Variable', Inter, sans-serif",
                fontSize: "14px",
                fontWeight: 700,
                lineHeight: "1.4em",
                letterSpacing: "-0.3px",
                color: "#090A11",
              }}
            >
              {t.launchpad?.alerts?.createAlert || "Create alert"}
            </span>
          </button>
        </div>
      )}

      {/* Create Alert Modal */}
      <CreateAlertModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        onSave={handleAlertSaved}
        editAlert={editingAlert}
      />
    </div>
  );
}
