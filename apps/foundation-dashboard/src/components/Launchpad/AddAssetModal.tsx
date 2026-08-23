"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiService } from "@/services/api";
import { useT } from "@/i18n/I18nProvider";

// Project type from API
interface Project {
  id: string;
  name: string;
  ticker: string;
  imageUrl?: string;
  status: string;
  isWatching?: boolean;
}

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export default function AddAssetModal({ isOpen, onClose, onSave }: AddAssetModalProps) {
  const t = useT();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [liveProjects, setLiveProjects] = useState<Project[]>([]);
  const [watchedProjectIds, setWatchedProjectIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("swarp_fd_access_token");

      // Fetch live projects (status = bonding)
      const projectsResponse = await apiService.getLaunchpadProjects({ status: "bonding", limit: 50 });
      setLiveProjects(projectsResponse.projects || []);

      if (token) {
        try {
          const watchlistResponse = await apiService.getLaunchpadWatchlist(token);
          const watchedIds = new Set((watchlistResponse.projects || []).map((p: Project) => p.id));
          setWatchedProjectIds(watchedIds);
        } catch {
          // User may not be logged in, continue without watchlist
          setWatchedProjectIds(new Set());
        }
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setError(t.launchpad?.watchlist?.failedToLoad || "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchData();
      // Reset selection when modal opens
      setSelectedProjects(new Set());
      setSearchQuery("");
    }
  }, [isOpen, fetchData]);

  if (!isOpen) return null;

  // Filter projects based on search (exclude already watched)
  const filteredProjects = liveProjects.filter(
    (project) =>
      !watchedProjectIds.has(project.id) &&
      (project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       project.ticker.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Toggle project selection
  const toggleProject = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleSave = async () => {
    const token = localStorage.getItem("swarp_fd_access_token");

    if (!token) {
      setError(t.launchpad?.watchlist?.loginRequired || "Please login to add to watchlist");
      return;
    }

    if (selectedProjects.size === 0) {
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      // Add each selected project to watchlist
      const projectIds = Array.from(selectedProjects);
      for (const projectId of projectIds) {
        await apiService.toggleLaunchpadWatchlist(projectId, token);
      }

      // Call onSave callback to refresh parent
      onSave?.();
      onClose();
    } catch (err) {
      console.error("Failed to add to watchlist:", err);
      setError(t.launchpad?.watchlist?.failedToAdd || "Failed to add projects to watchlist. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center !p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      onClick={handleBackdropClick}
    >
      {/* Modal Container */}
      <div
        className="relative flex flex-col w-full"
        style={{
          maxWidth: "435px",
          height: "620px",
          maxHeight: "calc(100vh - 2rem)",
          backgroundColor: "#131519",
          borderRadius: "12px",
          boxShadow: "-12px -12px 64px rgba(0, 0, 0, 0.24), 12px 12px 64px rgba(0, 0, 0, 0.24)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center !px-6 !py-5"
          style={{ borderBottom: "0.2px solid #2B2D30" }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex cursor-pointer  items-center justify-center w-8 h-8 rounded-full hover:bg-[#2B2D30] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                stroke="#B3B5B6"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Title */}
          <h2
            className="flex-1 text-center"
            style={{
              fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: "18px",
              fontWeight: 600,
              lineHeight: "1.33em",
              color: "#FFFFFF",
              marginRight: "32px", // Compensate for close button width
            }}
          >
            {t.launchpad?.watchlist?.addAsset || "Add asset"}
          </h2>
        </div>

        {/* Search Input */}
        <div className="!px-6 !py-4">
          <div
            className="flex items-center !gap-3 !px-4 !py-3"
            style={{
              backgroundColor: "#2B2D30",
              borderRadius: "100px",
              border: "1px solid #2B2D30",
            }}
          >
            {/* Search Icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M8.25 14.25C11.5637 14.25 14.25 11.5637 14.25 8.25C14.25 4.93629 11.5637 2.25 8.25 2.25C4.93629 2.25 2.25 4.93629 2.25 8.25C2.25 11.5637 4.93629 14.25 8.25 14.25Z"
                stroke="#636466"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15.75 15.75L12.4875 12.4875"
                stroke="#636466"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {/* Input */}
            <input
              type="text"
              placeholder={t.launchpad?.watchlist?.searchTokens || "Search tokens"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none"
              style={{
                fontFamily: "'Inter Variable', Inter, sans-serif",
                fontSize: "14px",
                fontWeight: 400,
                lineHeight: "1.4em",
                letterSpacing: "-0.3px",
                color: "#FFFFFF",
              }}
            />
          </div>
        </div>

        {/* Token List */}
        <div
          className="flex-1 overflow-y-auto !px-6"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#46484C transparent",
          }}
        >
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center !py-12">
              <div className="w-6 h-6 border-2 border-[#40E0D0] border-t-transparent rounded-full animate-spin" />
              <span
                className="!mt-3"
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 400,
                  color: "#636466",
                }}
              >
                {t.launchpad?.watchlist?.loadingProjects || "Loading projects..."}
              </span>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center !py-12">
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 400,
                  color: "#EB5757",
                }}
              >
                {error}
              </span>
              <button
                onClick={fetchData}
                className="!mt-3 !px-4 !py-2 bg-[#2B2D30] rounded-full text-sm text-white hover:bg-[#3B3D40]"
              >
                {t.launchpad?.watchlist?.tryAgain || "Try Again"}
              </button>
            </div>
          )}

          {/* Project List */}
          {!isLoading && !error && (
            <div className="flex flex-col">
              {filteredProjects.map((project) => {
                const isSelected = selectedProjects.has(project.id);
                return (
                  <div
                    key={project.id}
                    onClick={() => toggleProject(project.id)}
                    className="flex items-center justify-between !px-4 !py-3 cursor-pointer hover:bg-[#1A1B23] rounded-lg transition-colors"
                  >
                    {/* Left - Token Info */}
                    <div className="flex items-center !gap-3">
                      {/* Token Image */}
                      <div
                        className="w-[30px] h-[30px] rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500"
                        style={project.imageUrl ? { backgroundImage: `url(${project.imageUrl})`, backgroundSize: 'cover' } : {}}
                      />
                      {/* Token Name and Ticker */}
                      <div className="flex flex-col">
                        <span
                          style={{
                            fontFamily: "'Inter Variable', Inter, sans-serif",
                            fontSize: "14px",
                            fontWeight: 600,
                            lineHeight: "1.4em",
                            letterSpacing: "-0.3px",
                            color: "#FFFFFF",
                          }}
                        >
                          {project.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "'Inter Variable', Inter, sans-serif",
                            fontSize: "12px",
                            fontWeight: 400,
                            lineHeight: "1.5em",
                            letterSpacing: "-0.3px",
                            color: "#636466",
                          }}
                        >
                          {project.ticker}
                        </span>
                      </div>
                    </div>

                    {/* Right - Checkbox Icon */}
                    <div className="flex items-center justify-center">
                      {isSelected ? (
                        // Checked Checkbox
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path
                            d="M13.4917 1.66675H6.50841C3.47508 1.66675 1.66675 3.47508 1.66675 6.50841V13.4834C1.66675 16.5251 3.47508 18.3334 6.50841 18.3334H13.4834C16.5167 18.3334 18.3251 16.5251 18.3251 13.4917V6.50841C18.3334 3.47508 16.5251 1.66675 13.4917 1.66675ZM13.9834 8.08341L9.25841 12.8084C9.14175 12.9251 8.98341 12.9917 8.81675 12.9917C8.65008 12.9917 8.49175 12.9251 8.37508 12.8084L6.01675 10.4501C5.77508 10.2084 5.77508 9.80841 6.01675 9.56675C6.25841 9.32508 6.65841 9.32508 6.90008 9.56675L8.81675 11.4834L13.1001 7.20008C13.3417 6.95842 13.7417 6.95842 13.9834 7.20008C14.2251 7.44175 14.2251 7.83341 13.9834 8.08341Z"
                            fill="#40E0D0"
                          />
                        </svg>
                      ) : (
                        // Unchecked Checkbox
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path
                            d="M7.83105 2.5H12.8291C14.8622 2.50001 16.1557 2.91022 16.9531 3.70801C17.7504 4.50585 18.1601 5.79945 18.1602 7.83301V12.833C18.1602 14.8669 17.7505 16.1611 16.9531 16.959C16.1557 17.7568 14.8622 18.167 12.8291 18.167H7.83105C5.79791 18.167 4.50451 17.7568 3.70703 16.959C2.90958 16.1611 2.5 14.867 2.5 12.833V7.83301C2.50004 5.79938 2.90973 4.50584 3.70703 3.70801C4.45462 2.96012 5.63798 2.55288 7.45801 2.50488L7.83105 2.5Z"
                            stroke="#636466"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Empty Search State */}
              {filteredProjects.length === 0 && (
                <div className="flex flex-col items-center justify-center !py-12">
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
                    {liveProjects.length === 0
                      ? t.launchpad?.watchlist?.noLiveProjects || "No live projects available"
                      : searchQuery
                      ? t.launchpad?.watchlist?.noTokensFound || "No tokens found"
                      : t.launchpad?.watchlist?.allInWatchlist || "All projects are already in your watchlist"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="!px-6 !py-5">
          <button
            onClick={handleSave}
            disabled={selectedProjects.size === 0 || isSaving}
            className="w-full cursor-pointer  flex items-center justify-center !py-3.5 rounded-full transition-colors"
            style={{
              backgroundColor: selectedProjects.size > 0 && !isSaving ? "#40E0D0" : "#2B2D30",
              cursor: selectedProjects.size > 0 && !isSaving ? "pointer" : "not-allowed",
            }}
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-[#090A11] border-t-transparent rounded-full animate-spin" />
            ) : (
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "16px",
                  fontWeight: 700,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: selectedProjects.size > 0 ? "#090A11" : "#636466",
                }}
              >
                {t.launchpad?.watchlist?.save || "Save"} {selectedProjects.size > 0 ? `(${selectedProjects.size})` : ""}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
