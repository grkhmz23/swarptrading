"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiService, LaunchpadProject } from "@/services/api";
import { useT } from "@/i18n/I18nProvider";
import { getAccessToken } from '@/lib/session';
import { errorMessage } from '@/lib/http';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export default function AddAssetModal({ isOpen, onClose, onSave }: AddAssetModalProps) {
  if (!isOpen) return null;
  // Mounted fresh on every open so selection, errors and the watchlist snapshot never leak between sessions.
  return <AddAssetModalContent onClose={onClose} onSave={onSave} />;
}

function AddAssetModalContent({ onClose, onSave }: Omit<AddAssetModalProps, "isOpen">) {
  const t = useT();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [liveProjects, setLiveProjects] = useState<LaunchpadProject[]>([]);
  // null = the current watchlist is unknown. Saving is disabled until it is known,
  // because the API only offers a toggle and toggling blind could remove watched projects.
  const [watchedProjectIds, setWatchedProjectIds] = useState<Set<string> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchWatchedIds = useCallback(async (token: string): Promise<Set<string>> => {
    const response = await apiService.getLaunchpadWatchlist(token);
    return new Set((response.projects || []).map((p) => p.id));
  }, []);

  const loadData = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setWatchedProjectIds(null);
        setLoadError(t.launchpad?.watchlist?.loginRequired || "Please login to add to watchlist");
        return;
      }
      const [projectsResponse, watchedIds] = await Promise.all([
        apiService.getLaunchpadProjects({ status: "bonding", limit: 50 }),
        fetchWatchedIds(token),
      ]);
      setLiveProjects(projectsResponse.projects || []);
      setWatchedProjectIds(watchedIds);
      setLoadError(null);
    } catch (err) {
      setWatchedProjectIds(null);
      setLoadError(errorMessage(err, t.launchpad?.watchlist?.failedToLoad || "Failed to load your watchlist"));
    } finally {
      setIsLoading(false);
    }
  }, [t, fetchWatchedIds]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);
    void loadData();
  };

  // Projects that are confirmed not to be on the watchlist (empty while the watchlist is unknown).
  const query = searchQuery.toLowerCase();
  const filteredProjects = watchedProjectIds
    ? liveProjects.filter(
        (project) =>
          !watchedProjectIds.has(project.id) &&
          (project.name.toLowerCase().includes(query) || project.ticker.toLowerCase().includes(query))
      )
    : [];

  const canSave = watchedProjectIds !== null && selectedProjects.size > 0 && !isSaving && !isLoading;

  // Toggle project selection
  const toggleProject = (projectId: string) => {
    if (isSaving) return;
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const projectLabel = (projectId: string) => {
    const project = liveProjects.find((p) => p.id === projectId);
    return project ? project.ticker || project.name : projectId;
  };

  const handleSave = async () => {
    if (!canSave) return;

    const token = getAccessToken();
    if (!token) {
      setSaveError(t.launchpad?.watchlist?.loginRequired || "Please login to add to watchlist");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const added: string[] = [];
    let failure: { projectId: string; message: string } | null = null;
    let current: Set<string> | null = null;

    try {
      // Confirm the current watchlist right before toggling, so nothing already watched is toggled off.
      try {
        current = await fetchWatchedIds(token);
      } catch (err) {
        setSaveError(errorMessage(err, t.launchpad?.watchlist?.failedToLoad || "Could not confirm your current watchlist. Nothing was changed."));
        return;
      }

      const toAdd = Array.from(selectedProjects).filter((id) => !current?.has(id));

      for (const projectId of toAdd) {
        try {
          let result = await apiService.toggleLaunchpadWatchlist(projectId, token);
          if (!result.isWatching) {
            // The project was added elsewhere after our check, so this toggle removed it. Restore it.
            result = await apiService.toggleLaunchpadWatchlist(projectId, token);
          }
          if (!result.isWatching) {
            failure = { projectId, message: "The server did not confirm the project was added." };
            break;
          }
          added.push(projectId);
        } catch (err) {
          failure = { projectId, message: errorMessage(err, t.launchpad?.watchlist?.failedToAdd || "Failed to add to watchlist") };
          break;
        }
      }

      if (!failure) {
        onSave?.();
        onClose();
        return;
      }

      if (added.length > 0) onSave?.();

      const succeeded = added.length > 0 ? ` Added: ${added.map(projectLabel).join(", ")}.` : "";
      const reason = failure.message.replace(/\.+$/, "");
      setSaveError(`Could not add ${projectLabel(failure.projectId)}: ${reason}.${succeeded} Remaining selections were not changed.`);
      // Drop what is now on the watchlist from the selection so a retry only toggles what is still missing.
      setSelectedProjects((prev) => {
        const next = new Set(prev);
        for (const id of added) next.delete(id);
        if (current) for (const id of current) next.delete(id);
        return next;
      });

      // Re-read the watchlist so the list reflects the server, not our assumptions.
      try {
        setWatchedProjectIds(await fetchWatchedIds(token));
      } catch (err) {
        setWatchedProjectIds(null);
        setLoadError(errorMessage(err, t.launchpad?.watchlist?.failedToLoad || "Failed to load your watchlist"));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
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
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            aria-label="Close"
            className="flex cursor-pointer  items-center justify-center w-8 h-8 rounded-full hover:bg-[#2B2D30] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
          {loadError && !isLoading && (
            <div className="flex flex-col items-center justify-center !py-12">
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 400,
                  color: "#EB5757",
                }}
              >
                {loadError}
              </span>
              <button
                type="button"
                onClick={handleRetry}
                className="!mt-3 !px-4 !py-2 bg-[#2B2D30] rounded-full text-sm text-white hover:bg-[#3B3D40]"
              >
                {t.launchpad?.watchlist?.tryAgain || "Try Again"}
              </button>
            </div>
          )}

          {/* Project List */}
          {!isLoading && !loadError && (
            <div className="flex flex-col">
              {filteredProjects.map((project) => {
                const isSelected = selectedProjects.has(project.id);
                return (
                  <div
                    key={project.id}
                    onClick={() => toggleProject(project.id)}
                    className={`flex items-center justify-between !px-4 !py-3 hover:bg-[#1A1B23] rounded-lg transition-colors ${isSaving ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
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
          {saveError && (
            <div
              role="alert"
              className="!mb-3"
              style={{
                fontFamily: "'Inter Variable', Inter, sans-serif",
                fontSize: "13px",
                fontWeight: 400,
                lineHeight: "1.4em",
                color: "#EB5757",
              }}
            >
              {saveError}
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="w-full cursor-pointer  flex items-center justify-center !py-3.5 rounded-full transition-colors"
            style={{
              backgroundColor: canSave ? "#40E0D0" : "#2B2D30",
              cursor: canSave ? "pointer" : "not-allowed",
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
                  color: canSave ? "#090A11" : "#636466",
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
