"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiService, LaunchpadProject, LaunchpadAlert } from "@/services/api";
import { useT } from "@/i18n/I18nProvider";
import { getAccessToken } from '@/lib/session';
import { errorMessage } from '@/lib/http';
import { parseAmount, isAmountInput, floorToDecimals } from '@/lib/amount';

interface CreateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  editAlert?: LaunchpadAlert | null;
}

type AlertCurrency = "SOL" | "USD";

/** Maximum fractional digits accepted for a target price (bonding-curve prices can be ~1e-9 SOL). */
const PRICE_DECIMALS = 12;
const MAX_NOTE_LENGTH = 50;

/** A project's current price, in SOL per token. */
const projectPriceInSol = (project: LaunchpadProject): number | null => {
  const value = typeof project.price === "number" ? project.price : Number(project.currentPrice);
  return Number.isFinite(value) && value > 0 ? value : null;
};

/** Significant-digit formatting so tiny prices (e.g. 5e-8) stay readable. */
const formatSolPrice = (value: number): string => {
  if (value >= 1) return `${value.toLocaleString("en-US", { maximumFractionDigits: 4 })} SOL`;
  const rounded = Number(value.toPrecision(4));
  return `${value < 0.0001 ? rounded.toExponential() : String(rounded)} SOL`;
};

/** Turn a stored target price (string, possibly exponent form) into plain decimal input text. */
const toPriceInput = (value: string | number): string => {
  const text = String(value).trim();
  const num = Number(text);
  if (!Number.isFinite(num) || num <= 0) return "";
  if (/^\d+(\.\d+)?$/.test(text)) {
    const trimmed = text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
    if ((trimmed.split(".")[1] ?? "").length <= PRICE_DECIMALS) return trimmed;
  }
  return floorToDecimals(num, PRICE_DECIMALS);
};

export default function CreateAlertModal({ isOpen, onClose, onSave, editAlert }: CreateAlertModalProps) {
  if (!isOpen) return null;
  // Mounted fresh on every open (keyed by the alert) so the form always starts from the right values.
  return (
    <CreateAlertForm
      key={editAlert?.id ?? "new"}
      onClose={onClose}
      onSave={onSave}
      editAlert={editAlert ?? null}
    />
  );
}

function CreateAlertForm({
  onClose,
  onSave,
  editAlert,
}: Omit<CreateAlertModalProps, "isOpen" | "editAlert"> & { editAlert: LaunchpadAlert | null }) {
  const t = useT();
  const isEditing = editAlert !== null;
  const [projects, setProjects] = useState<LaunchpadProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<LaunchpadProject | null>(null);
  // When editing, the token is fixed (the update API cannot change it), so its price is fetched directly.
  const [editProjectPrice, setEditProjectPrice] = useState<number | null>(null);
  const [condition, setCondition] = useState<"goes_over" | "goes_under">(editAlert?.condition ?? "goes_over");
  // Launchpad tokens are priced in SOL, so SOL is the default; an edited alert keeps its own currency.
  const [currency, setCurrency] = useState<AlertCurrency>(editAlert?.currency === "USD" ? "USD" : "SOL");
  const [targetPrice, setTargetPrice] = useState(() => (editAlert ? toPriceInput(editAlert.targetPrice) : ""));
  const [note, setNote] = useState(editAlert?.note ?? "");
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isConditionDropdownOpen, setIsConditionDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      if (editAlert) {
        const project = await apiService.getLaunchpadProject(editAlert.projectId, getAccessToken());
        setEditProjectPrice(projectPriceInSol(project));
      } else {
        const response = await apiService.getLaunchpadProjects({ status: "bonding", limit: 50 });
        setProjects(response.projects || []);
      }
      setLoadError(null);
    } catch (err) {
      setLoadError(
        errorMessage(
          err,
          editAlert ? "Could not load the token's current price" : t.launchpad?.alerts?.failedToLoad || "Failed to load tokens"
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [editAlert, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRetryLoad = () => {
    setIsLoading(true);
    setLoadError(null);
    void loadData();
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

  // Handle note input
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_NOTE_LENGTH) {
      setNote(value);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isAmountInput(value)) {
      setTargetPrice(value);
    }
  };

  const projectId = editAlert ? editAlert.projectId : selectedProject?.id ?? null;
  const tokenLabel = editAlert
    ? `${editAlert.projectName} (${editAlert.projectTicker})`
    : selectedProject
      ? `${selectedProject.name} (${selectedProject.ticker})`
      : null;
  const currentPrice = editAlert ? editProjectPrice : selectedProject ? projectPriceInSol(selectedProject) : null;
  const parsedPrice = parseAmount(targetPrice, PRICE_DECIMALS);
  const priceProblem =
    targetPrice.trim() === "" || parsedPrice.ok
      ? null
      : parsedPrice.problem === "too_precise"
        ? `Use at most ${PRICE_DECIMALS} decimal places`
        : t.launchpad?.alerts?.errors?.invalidPrice || "Please enter a valid price";

  const handleSave = async () => {
    if (isSaving) return;
    if (!projectId || targetPrice.trim() === "") {
      setError(t.launchpad?.alerts?.errors?.selectTokenAndPrice || "Please select a token and enter a target price");
      return;
    }
    if (!parsedPrice.ok) {
      setError(priceProblem ?? (t.launchpad?.alerts?.errors?.invalidPrice || "Please enter a valid price"));
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
          // Always send the note so clearing it in the form clears it on the server.
          { condition, targetPrice: parsedPrice.value, currency, note: note.trim() },
          token
        );
      } else {
        await apiService.createLaunchpadAlert(
          {
            projectId,
            condition,
            targetPrice: parsedPrice.value,
            currency,
            note: note.trim() || undefined,
          },
          token
        );
      }

      onSave?.();
      onClose();
    } catch (err) {
      setError(errorMessage(err, t.launchpad?.alerts?.errors?.failedToSave || "Failed to save alert. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  // Check if form is valid
  const isFormValid = projectId !== null && parsedPrice.ok;

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
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            aria-label="Close"
            className="flex cursor-pointer items-center justify-center w-5 h-5 hover:opacity-70 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
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
                type="button"
                onClick={() => {
                  if (!isEditing) setIsProjectDropdownOpen(!isProjectDropdownOpen);
                }}
                disabled={isEditing}
                className="w-full flex items-center justify-between !px-3 !py-3.5 disabled:cursor-default"
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
                    color: tokenLabel ? "#FFFFFF" : "#636466",
                  }}
                >
                  {tokenLabel ?? (t.launchpad?.alerts?.selectToken || "Select token")}
                </span>
                {!isEditing && (
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
                )}
              </button>

              {/* Dropdown Menu */}
              {!isEditing && isProjectDropdownOpen && (
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
                  ) : loadError ? (
                    <div className="flex flex-col items-start !gap-2 !px-3 !py-3">
                      <span
                        role="alert"
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
                        onClick={handleRetryLoad}
                        className="cursor-pointer !px-3 !py-1 bg-[#2B2D30] rounded-full text-sm text-white hover:bg-[#3B3D40]"
                      >
                        {t.launchpad?.watchlist?.tryAgain || "Try again"}
                      </button>
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
                        type="button"
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
                  type="button"
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
                      type="button"
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
                      type="button"
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
                {currency === "USD" && (
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
                )}
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label="Target price"
                  aria-invalid={priceProblem !== null}
                  placeholder="0.00"
                  value={targetPrice}
                  onChange={handlePriceChange}
                  className="flex-1 min-w-0 bg-transparent outline-none"
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: 400,
                    lineHeight: "1.4em",
                    letterSpacing: "-0.3px",
                    color: "#FFFFFF",
                  }}
                />
                {/* Currency the target price is quoted in */}
                <div
                  role="group"
                  aria-label="Price currency"
                  className="flex shrink-0 rounded-full overflow-hidden"
                  style={{ border: "0.5px solid #2B2D30" }}
                >
                  {(["SOL", "USD"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={currency === option}
                      onClick={() => setCurrency(option)}
                      className="cursor-pointer !px-2 !py-0.5 transition-colors"
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "12px",
                        fontWeight: 600,
                        lineHeight: "1.5em",
                        backgroundColor: currency === option ? "#40E0D0" : "transparent",
                        color: currency === option ? "#090A11" : "#636466",
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Price hint: validation problem, or the token's current price for reference */}
            {(priceProblem || projectId) && (
              <span
                role={priceProblem ? "alert" : undefined}
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "12px",
                  fontWeight: 400,
                  lineHeight: "1.5em",
                  letterSpacing: "-0.3px",
                  color: priceProblem ? "#EB5757" : "#636466",
                  marginTop: "-8px",
                }}
              >
                {priceProblem
                  ?? (currentPrice !== null
                    ? `Current price: ${formatSolPrice(currentPrice)}${currency === "USD" ? " (USD price not available)" : ""}`
                    : isEditing && isLoading
                      ? "Loading current price…"
                      : isEditing && loadError
                        ? loadError
                        : "Current price unavailable")}
              </span>
            )}

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
