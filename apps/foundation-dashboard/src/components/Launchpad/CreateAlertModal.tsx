"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiService, LaunchpadProject, LaunchpadAlert } from "@/services/api";
import { useT } from "@/i18n/I18nProvider";
import { getAccessToken } from '@/lib/session';

interface CreateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  editAlert?: LaunchpadAlert | null;
}

export default function CreateAlertModal({
  isOpen,
  onClose,
  onSave,
  editAlert,
}: CreateAlertModalProps) {
  const t = useT();
  const [projects, setProjects] = useState<LaunchpadProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<LaunchpadProject | null>(null);
  const [condition, setCondition] = useState<"goes_over" | "goes_under">("goes_over");
  const [targetPrice, setTargetPrice] = useState("");
  const [note, setNote] = useState("");
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isConditionDropdownOpen, setIsConditionDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_NOTE_LENGTH = 50;

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getLaunchpadProjects({ status: "bonding", limit: 50 });
      setProjects(response.projects || []);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setError(t.launchpad?.alerts?.failedToLoad || "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchProjects();

      if (editAlert) {
        // Populate form with existing alert data
        setCondition(editAlert.condition);
        setTargetPrice(editAlert.targetPrice.toString());
        setNote(editAlert.note || "");
        // Find and set the project
        const project = projects.find((p) => p.id === editAlert.projectId);
        if (project) {
          setSelectedProject(project);
        }
      } else {
        // Reset form
        setSelectedProject(null);
        setCondition("goes_over");
        setTargetPrice("");
        setNote("");
      }
      setError(null);
    }
  }, [isOpen, editAlert, fetchProjects]);

  // Update selected project when projects load and editing
  useEffect(() => {
    if (editAlert && projects.length > 0) {
      const project = projects.find((p) => p.id === editAlert.projectId);
      if (project) {
        setSelectedProject(project);
      }
    }
  }, [editAlert, projects]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle note input
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_NOTE_LENGTH) {
      setNote(value);
    }
  };

  const handleSave = async () => {
    if (!selectedProject || !targetPrice) {
      setError(t.launchpad?.alerts?.errors?.selectTokenAndPrice || "Please select a token and enter a target price");
      return;
    }

    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      setError(t.launchpad?.alerts?.errors?.invalidPrice || "Please enter a valid price");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError(t.launchpad?.alerts?.errors?.loginToCreate || "Please login to create alerts");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (editAlert) {
        await apiService.updateLaunchpadAlert(
          editAlert.id,
          { condition, targetPrice: price, note: note || undefined },
          token
        );
      } else {
        await apiService.createLaunchpadAlert(
          {
            projectId: selectedProject.id,
            condition,
            targetPrice: price,
            currency: "USD",
            note: note || undefined,
          },
          token
        );
      }

      onSave?.();
      onClose();
    } catch (err) {
      console.error("Failed to save alert:", err);
      setError(t.launchpad?.alerts?.errors?.failedToSave || "Failed to save alert. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Check if form is valid
  const isFormValid = selectedProject && targetPrice && parseFloat(targetPrice) > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center !p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
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
          boxShadow:
            "-12px -12px 64px rgba(0, 0, 0, 0.24), 12px 12px 64px rgba(0, 0, 0, 0.24)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center !px-6 !py-6"
          style={{ borderBottom: "0.2px solid #2B2D30" }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex cursor-pointer items-center justify-center w-5 h-5 hover:opacity-70 transition-opacity"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M1 15L11 5M1 5L11 15"
                stroke="white"
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
              lineHeight: "1.19em",
              color: "#FFFFFF",
              marginRight: "20px", // Compensate for close button width
            }}
          >
            {editAlert ? (t.launchpad?.alerts?.editAlert || "Edit alert") : (t.launchpad?.alerts?.newAlert || "New alert")}
          </h2>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex flex-col !gap-8 !px-6 !pt-8 overflow-y-auto">
          {/* Alert Me When Section */}
          <div className="flex flex-col !gap-4">
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
              {t.launchpad?.alerts?.alertMeWhen || "Alert me when"}
            </span>

            {/* Token Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="w-full flex items-center justify-between !px-3 !py-3.5"
                style={{
                  backgroundColor: "#131519",
                  border: "0.5px solid #2B2D30",
                  borderRadius: "12px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: 400,
                    lineHeight: "1.4em",
                    letterSpacing: "-0.3px",
                    color: selectedProject ? "#FFFFFF" : "#636466",
                  }}
                >
                  {selectedProject ? `${selectedProject.name} ${t.launchpad?.alerts?.priceInUSD || "Price in USD"}` : (t.launchpad?.alerts?.selectToken || "Select token")}
                </span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  style={{
                    transform: isProjectDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                >
                  <path
                    d="M4.5 6.75L9 11.25L13.5 6.75"
                    stroke="#636466"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isProjectDropdownOpen && (
                <div
                  className="absolute left-0 right-0 top-full !mt-2 z-50 max-h-48 overflow-y-auto"
                  style={{
                    backgroundColor: "#131519",
                    border: "0.5px solid #2B2D30",
                    borderRadius: "12px",
                    scrollbarWidth: "thin",
                    scrollbarColor: "#46484C transparent",
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center !py-4">
                      <div className="w-5 h-5 border-2 border-[#40E0D0] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="!px-3 !py-3">
                      <span
                        style={{
                          fontFamily: "'Inter Variable', Inter, sans-serif",
                          fontSize: "14px",
                          fontWeight: 400,
                          color: "#636466",
                        }}
                      >
                        {t.launchpad?.alerts?.noTokensAvailable || "No tokens available"}
                      </span>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => {
                          setSelectedProject(project);
                          setIsProjectDropdownOpen(false);
                        }}
                        className="w-full flex items-center !gap-3 !px-3 !py-3 hover:bg-[#1A1B23] transition-colors"
                      >
                        {/* Token Image */}
                        <div
                          className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500"
                          style={
                            project.imageUrl
                              ? { backgroundImage: `url(${project.imageUrl})`, backgroundSize: "cover" }
                              : {}
                          }
                        />
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
                          {project.name} ({project.ticker})
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Condition and Price Row */}
            <div className="flex !gap-3">
              {/* Condition Dropdown */}
              <div className="relative" style={{ width: "145px" }}>
                <button
                  onClick={() => setIsConditionDropdownOpen(!isConditionDropdownOpen)}
                  className="w-full flex items-center justify-between !px-3 !py-3.5"
                  style={{
                    backgroundColor: "#131519",
                    border: "0.5px solid #2B2D30",
                    borderRadius: "12px",
                  }}
                >
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
                    {condition === "goes_over" ? (t.launchpad?.alerts?.goesOver || "Goes over") : (t.launchpad?.alerts?.goesUnder || "Goes under")}
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    style={{
                      transform: isConditionDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  >
                    <path
                      d="M4.5 6.75L9 11.25L13.5 6.75"
                      stroke="#636466"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Condition Dropdown Menu */}
                {isConditionDropdownOpen && (
                  <div
                    className="absolute left-0 right-0 top-full !mt-2 z-50"
                    style={{
                      backgroundColor: "#131519",
                      border: "0.5px solid #2B2D30",
                      borderRadius: "12px",
                    }}
                  >
                    <button
                      onClick={() => {
                        setCondition("goes_over");
                        setIsConditionDropdownOpen(false);
                      }}
                      className="w-full !px-3 !py-3 text-left hover:bg-[#1A1B23] transition-colors"
                      style={{ borderRadius: "12px 12px 0 0" }}
                    >
                      <span
                        style={{
                          fontFamily: "'Inter Variable', Inter, sans-serif",
                          fontSize: "14px",
                          fontWeight: 400,
                          lineHeight: "1.4em",
                          letterSpacing: "-0.3px",
                          color: condition === "goes_over" ? "#40E0D0" : "#636466",
                        }}
                      >
                        {t.launchpad?.alerts?.goesOver || "Goes over"}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setCondition("goes_under");
                        setIsConditionDropdownOpen(false);
                      }}
                      className="w-full !px-3 !py-3 text-left hover:bg-[#1A1B23] transition-colors"
                      style={{ borderRadius: "0 0 12px 12px" }}
                    >
                      <span
                        style={{
                          fontFamily: "'Inter Variable', Inter, sans-serif",
                          fontSize: "14px",
                          fontWeight: 400,
                          lineHeight: "1.4em",
                          letterSpacing: "-0.3px",
                          color: condition === "goes_under" ? "#40E0D0" : "#636466",
                        }}
                      >
                        {t.launchpad?.alerts?.goesUnder || "Goes under"}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Price Input */}
              <div
                className="flex-1 flex items-center !gap-2 !px-3 !py-3.5"
                style={{
                  backgroundColor: "#131519",
                  border: "0.5px solid #2B2D30",
                  borderRadius: "12px",
                }}
              >
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
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
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

            {/* Note Input */}
            <div
              className="flex flex-col !gap-4 !px-3 !py-3.5"
              style={{
                backgroundColor: "#131519",
                border: "0.5px solid #2B2D30",
                borderRadius: "12px",
                height: "104px",
              }}
            >
              <textarea
                placeholder={t.launchpad?.alerts?.writeNote || "Write a note (optional)"}
                value={note}
                onChange={handleNoteChange}
                className="flex-1 bg-transparent outline-none resize-none"
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 400,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: note ? "#FFFFFF" : "#636466",
                }}
              />
              <div className="flex justify-end">
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
                  {MAX_NOTE_LENGTH - note.length}
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="!px-3">
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
            </div>
          )}
        </div>

        {/* Footer - Create Alert Button */}
        <div
          className="!px-6 !py-6"
          style={{ borderTop: "0.2px solid #2B2D30" }}
        >
          <button
            onClick={handleSave}
            disabled={!isFormValid || isSaving}
            className="w-full cursor-pointer  flex items-center justify-center !py-3.5 rounded-full transition-colors"
            style={{
              backgroundColor: isFormValid && !isSaving ? "#40E0D0" : "#2B2D30",
              borderRadius: "100px",
              cursor: isFormValid && !isSaving ? "pointer" : "not-allowed",
            }}
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-[#090A11] border-t-transparent rounded-full animate-spin" />
            ) : (
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: isFormValid ? "#090A11" : "#636466",
                }}
              >
                {editAlert ? (t.launchpad?.alerts?.saveChanges || "Save changes") : (t.launchpad?.alerts?.createAlert || "Create alert")}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
