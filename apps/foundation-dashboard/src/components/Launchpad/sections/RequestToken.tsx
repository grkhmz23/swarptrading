"use client";

import React, { useState, useRef } from "react";
import { apiService, LaunchpadCustodialCreateRequest, ApiError } from "@/services/api";
import { useT } from "@/i18n/I18nProvider";

interface FormData {
  name: string;
  ticker: string;
  description: string;
  image: File | null;
  imagePreview: string | null;
  websiteUrl: string;
  twitterUrl: string;
  telegramUrl: string;
  discordUrl: string;
}

interface SuccessModalData {
  tokenName: string;
  tokenMint: string;
  transactionSignature: string;
}

export default function RequestToken() {
  const t = useT();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    ticker: "",
    description: "",
    image: null,
    imagePreview: null,
    websiteUrl: "",
    twitterUrl: "",
    telegramUrl: "",
    discordUrl: "",
  });

  const [socialLinksExpanded, setSocialLinksExpanded] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState<SuccessModalData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "error" | "success" | "info"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show toast notification
  const showToast = (type: "error" | "success" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const maxDescriptionLength = 100;

  const handleInputChange = (field: keyof FormData, value: string) => {
    if (field === "description" && value.length > maxDescriptionLength) {
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "video/mp4"];
      if (!validTypes.includes(file.type)) {
        showToast("error", t.launchpad?.requestToken?.errors?.invalidImageFile || "Please upload a valid image file (JPG, PNG, SVG, GIF, or MP4)");
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          image: file,
          imagePreview: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "video/mp4"];
      if (!validTypes.includes(file.type)) {
        showToast("error", t.launchpad?.requestToken?.errors?.invalidImageFile || "Please upload a valid image file (JPG, PNG, SVG, GIF, or MP4)");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          image: file,
          imagePreview: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleCancel = () => {
    // Clear all input fields
    setFormData({
      name: "",
      ticker: "",
      description: "",
      image: null,
      imagePreview: null,
      websiteUrl: "",
      twitterUrl: "",
      telegramUrl: "",
      discordUrl: "",
    });
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleModalClose = () => {
    setSuccessModal(null);
    handleCancel();
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name.trim()) {
      showToast("error", t.launchpad?.requestToken?.errors?.enterTokenName || "Please enter a token name");
      return;
    }
    if (!formData.ticker.trim()) {
      showToast("error", t.launchpad?.requestToken?.errors?.enterTokenTicker || "Please enter a token ticker");
      return;
    }

    // Get auth token from localStorage
    const token = localStorage.getItem("swarp_fd_access_token");
    if (!token) {
      showToast("error", t.launchpad?.requestToken?.errors?.loginRequired || "Please log in to create a token");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Upload image first if provided
      let imageUrl: string | undefined;
      if (formData.image) {
        try {
          const uploadResponse = await apiService.uploadLaunchpadProjectImage(
            formData.image,
            token
          );
          imageUrl = uploadResponse.imageUrl;
        } catch (uploadError) {
          console.error("Failed to upload image:", uploadError);
          const errorMessage = (uploadError as ApiError)?.message || t.launchpad?.requestToken?.errors?.uploadImageFailed || "Failed to upload image";
          showToast("error", errorMessage);
          setIsSubmitting(false);
          return;
        }
      }

      // Step 2: Prepare custodial token creation request
      // No wallet address needed - the backend will use the user's Swarp Foundation wallet
      const custodialData: LaunchpadCustodialCreateRequest = {
        name: formData.name.trim(),
        ticker: formData.ticker.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
        imageUrl,
        metadataUri: imageUrl || undefined,
        websiteUrl: formData.websiteUrl.trim() || undefined,
        twitterUrl: formData.twitterUrl.trim() || undefined,
        telegramUrl: formData.telegramUrl.trim() || undefined,
        discordUrl: formData.discordUrl.trim() || undefined,
      };

      // Step 3: Create token using custodial API (server signs automatically)
      const response = await apiService.createLaunchpadTokenCustodial(custodialData, token);

      console.log("Token created on Solana:", response);

      // Show success modal instead of alert
      setSuccessModal({
        tokenName: formData.name,
        tokenMint: response.tokenMint,
        transactionSignature: response.transactionSignature,
      });
    } catch (error) {
      console.error("Failed to create token:", error);
      const errorMessage = (error as ApiError)?.message || t.launchpad?.requestToken?.errors?.createTokenFailed || "Failed to create token. Please try again.";
      showToast("error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row h-full overflow-y-auto xl:overflow-hidden">
      {/* Form Section */}
      <div className="flex-1 !p-6 xl:!p-8 xl:overflow-y-auto xl:border-r border-[#2B2D30]">
        {/* Header */}
        <div className="!mb-8">
          <h1 className="text-white text-2xl font-semibold !mb-2">{t.launchpad?.requestToken?.title || "Request to list a token"}</h1>
          <p className="text-[#636466] text-sm">
            {t.launchpad?.requestToken?.subtitle || "Choose carefully, these can't be changed once the token is created."}
          </p>
        </div>

        {/* Form Fields */}
        <div className="!space-y-5">
          {/* Name Field */}
          <div className="!space-y-2">
            <div className="!space-y-2.5">
              <label className="text-white text-sm">{t.launchpad?.requestToken?.name || "Name"}</label>
              <input
                type="text"
                placeholder={t.launchpad?.requestToken?.namePlaceholder || "Add token name"}
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full !px-3 !py-3.5 bg-[#131519] border border-[#2B2D30] rounded-xl text-white text-sm placeholder-[#636466] outline-none focus:border-[#40E0D0] transition-colors"
              />
            </div>
            <p className="text-[#46484C] text-xs">
              {t.launchpad?.requestToken?.nameHelper || "Can't be changed or edited after the token is created."}
            </p>
          </div>

          {/* Ticker Field */}
          <div className="!space-y-2">
            <div className="!space-y-2.5">
              <label className="text-white text-sm">{t.launchpad?.requestToken?.ticker || "Ticker"}</label>
              <input
                type="text"
                placeholder={t.launchpad?.requestToken?.tickerPlaceholder || "Add a token ticker (e.g. DOGE)"}
                value={formData.ticker}
                onChange={(e) => handleInputChange("ticker", e.target.value.toUpperCase())}
                className="w-full !px-3 !py-3.5 bg-[#131519] border border-[#2B2D30] rounded-xl text-white text-sm placeholder-[#636466] outline-none focus:border-[#40E0D0] transition-colors uppercase"
              />
            </div>
            <p className="text-[#46484C] text-xs">
              {t.launchpad?.requestToken?.tickerHelper || "Can't be changed or edited after the token is created."}
            </p>
          </div>

          {/* Description Field */}
          <div className="!space-y-2.5">
            <div className="flex items-center !gap-1">
              <label className="text-white text-sm">{t.launchpad?.requestToken?.description || "Description"}</label>
              <span className="text-[#46484C] text-sm">{t.launchpad?.requestToken?.optional || "(Optional)"}</span>
            </div>
            <div className="relative">
              <textarea
                placeholder={t.launchpad?.requestToken?.descriptionPlaceholder || "Write a short description"}
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="w-full h-[126px] !px-4 !py-3.5 bg-[#131519] border border-[#2B2D30] rounded-xl text-white text-sm placeholder-[#636466] outline-none focus:border-[#40E0D0] transition-colors resize-none"
              />
              <div className="absolute bottom-3 right-4">
                <span className="text-[#636466] text-xs">
                  {formData.description.length} / {maxDescriptionLength}
                </span>
              </div>
            </div>
          </div>

          {/* Image/Video Upload */}
          <div className="!space-y-2.5">
            <label className="text-white text-sm">{t.launchpad?.requestToken?.imageVideo || "Image / Video"}</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="h-[164px] border border-dashed border-[#2B2D30] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#40E0D0] transition-colors"
            >
              {formData.imagePreview ? (
                <div className="relative w-full h-full">
                  <img
                    src={formData.imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData((prev) => ({ ...prev, image: null, imagePreview: null }));
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-white text-sm !mb-2">{t.launchpad?.requestToken?.uploadText || "Click to upload or drag and drop"}</p>
                  <div className="flex items-center !gap-1.5 text-[#636466] text-xs">
                    <span>1000 × 1000</span>
                    <span className="w-0.5 h-0.5 bg-[#636466] rounded-full" />
                    <span>{t.launchpad?.requestToken?.uploadSpecs || "JPG, PNG, SVG, GIF, MP4"}</span>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/svg+xml,image/gif,video/mp4"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="!space-y-2.5">
            <button
              onClick={() => setSocialLinksExpanded(!socialLinksExpanded)}
              className="flex cursor-pointer  items-center justify-between w-full"
            >
              <span className="text-white text-sm">{t.launchpad?.requestToken?.socialLinks || "Social links"}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className={`transition-transform ${socialLinksExpanded ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {socialLinksExpanded && (
              <div className="!space-y-4">
                {/* Website */}
                <div className="flex items-center !gap-2.5 !px-4 !py-3 bg-[#131519] border border-[#2B2D30] rounded-xl">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="7.5" stroke="#636466" strokeWidth="1.5"/>
                    <path d="M10 2.5c-2 2-3 4.5-3 7.5s1 5.5 3 7.5c2-2 3-4.5 3-7.5s-1-5.5-3-7.5z" stroke="#636466" strokeWidth="1.5"/>
                    <path d="M2.5 10h15" stroke="#636466" strokeWidth="1.5"/>
                  </svg>
                  <div className="w-px h-5 bg-[#2B2D30]" />
                  <input
                    type="url"
                    placeholder={t.launchpad?.requestToken?.websitePlaceholder || "http://website.com"}
                    value={formData.websiteUrl}
                    onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm placeholder-[#636466] outline-none"
                  />
                </div>

                {/* Twitter/X */}
                <div className="flex items-center !gap-2.5 !px-4 !py-3 bg-[#131519] border border-[#2B2D30] rounded-xl">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M11.905 8.462L17.57 2h-1.343l-4.919 5.615L7.05 2H2l5.937 8.492L2 17.5h1.343l5.19-5.93L13.05 17.5H18l-6.095-9.038zm-1.837 2.1l-.601-.845L4.05 3.08h2.06l3.863 5.433.601.845 5.018 7.055h-2.06l-4.09-5.75.626-.841z" fill="#636466"/>
                  </svg>
                  <div className="w-px h-5 bg-[#2B2D30]" />
                  <input
                    type="url"
                    placeholder={t.launchpad?.requestToken?.twitterPlaceholder || "http://x.com"}
                    value={formData.twitterUrl}
                    onChange={(e) => handleInputChange("twitterUrl", e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm placeholder-[#636466] outline-none"
                  />
                </div>

                {/* Telegram */}
                <div className="flex items-center !gap-2.5 !px-4 !py-3 bg-[#131519] border border-[#2B2D30] rounded-xl">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M18.333 2.5L9.167 11.667M18.333 2.5l-5.833 15-3.333-6.667L2.5 7.5l15.833-5z" stroke="#636466" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="w-px h-5 bg-[#2B2D30]" />
                  <input
                    type="url"
                    placeholder={t.launchpad?.requestToken?.telegramPlaceholder || "http://telegram.com"}
                    value={formData.telegramUrl}
                    onChange={(e) => handleInputChange("telegramUrl", e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm placeholder-[#636466] outline-none"
                  />
                </div>

                {/* Discord/Other */}
                <div className="flex items-center !gap-2.5 !px-4 !py-3 bg-[#131519] border border-[#2B2D30] rounded-xl">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M14.167 2.5l-4.167 15M10 2.5L5.833 17.5M4.167 6.667h12.5M3.333 13.333h12.5" stroke="#636466" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="w-px h-5 bg-[#2B2D30]" />
                  <input
                    type="url"
                    placeholder={t.launchpad?.requestToken?.otherPlaceholder || "http://other.com"}
                    value={formData.discordUrl}
                    onChange={(e) => handleInputChange("discordUrl", e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm placeholder-[#636466] outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="w-full xl:w-[400px] !p-6 xl:!p-8 flex flex-col border-t xl:border-t-0 border-[#2B2D30]">
        {/* Preview Header */}
        <div className="!mb-6">
          <h2 className="text-white text-lg font-semibold text-center !mb-5">{t.launchpad?.requestToken?.previewTitle || "Preview of your token"}</h2>
          <p className="text-[#636466] text-sm text-center">
            {t.launchpad?.requestToken?.previewSubtitle || "This is how your token will appear to users on SwarpLaunch when they're browsing or purchasing your token."}
          </p>
        </div>

        {/* Preview Card - Image Only */}
        <div className="rounded-2xl overflow-hidden bg-[#1A1B23]" style={{ height: "280px" }}>
          {formData.imagePreview ? (
            <img
              src={formData.imagePreview}
              alt="Token preview"
              className="w-full h-full object-cover"
              style={{ objectPosition: "top" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-[#636466] text-sm">{t.launchpad?.requestToken?.noImageUploaded || "No image uploaded"}</div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center !gap-3 !mt-6 !pt-5 border-t border-[#2B2D30]">
          <button
            onClick={handleCancel}
            className="flex-1 cursor-pointer  !py-2.5 !px-4 border border-[#2B2D30] rounded-full text-white text-sm font-medium hover:bg-[#1A1B23] transition-colors"
          >
            {t.launchpad?.requestToken?.cancel || "Cancel"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name || !formData.ticker}
            className="flex-1 cursor-pointer !py-2.5 !px-4 bg-[#40E0D0] rounded-full text-[#090A11] text-sm font-bold hover:bg-[#40E0D0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center !gap-2">
                <div className="w-4 h-4 border-2 border-[#090A11]/30 border-t-[#090A11] rounded-full animate-spin" />
                <span>{t.launchpad?.requestToken?.submitting || "Submitting..."}</span>
              </div>
            ) : (
              t.launchpad?.requestToken?.submit || "Submit"
            )}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleModalClose}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md !mx-4 bg-[#131519] border border-[#2B2D30] rounded-2xl !p-6 shadow-xl">
            {/* Success Icon */}
            <div className="flex justify-center !mb-4">
              <div className="w-16 h-16 rounded-full bg-[#40E0D0]/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="#40E0D0"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-white text-xl font-semibold text-center !mb-2">
              {t.launchpad?.requestToken?.successTitle || "Token Created Successfully!"}
            </h2>
            <p className="text-[#636466] text-sm text-center !mb-6">
              {(t.launchpad?.requestToken?.successSubtitle || "Your token \"{{tokenName}}\" has been created on Solana Devnet.").replace("{{tokenName}}", successModal.tokenName)}
            </p>

            {/* Token Mint Address */}
            <div className="!space-y-3">
              <div className="!space-y-2">
                <label className="text-[#9B9DA0] text-xs font-medium">{t.launchpad?.requestToken?.tokenMintAddress || "Token Mint Address"}</label>
                <div className="flex items-center !gap-2 !p-3 bg-[#090A11] border border-[#2B2D30] rounded-xl">
                  <code className="flex-1 text-white text-sm font-mono truncate">
                    {successModal.tokenMint}
                  </code>
                  <button
                    onClick={() => handleCopy(successModal.tokenMint, "mint")}
                    className="flex-shrink-0 !p-2 hover:bg-[#2B2D30] rounded-lg transition-colors"
                    title="Copy mint address"
                  >
                    {copiedField === "mint" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17L4 12" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="#636466" strokeWidth="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="#636466" strokeWidth="2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Transaction Signature */}
              <div className="!space-y-2">
                <label className="text-[#9B9DA0] text-xs font-medium">{t.launchpad?.requestToken?.transactionSignature || "Transaction Signature"}</label>
                <div className="flex items-center !gap-2 !p-3 bg-[#090A11] border border-[#2B2D30] rounded-xl">
                  <code className="flex-1 text-white text-sm font-mono truncate">
                    {successModal.transactionSignature}
                  </code>
                  <button
                    onClick={() => handleCopy(successModal.transactionSignature, "tx")}
                    className="flex-shrink-0 !p-2 hover:bg-[#2B2D30] cursor-pointer  rounded-lg transition-colors"
                    title="Copy transaction signature"
                  >
                    {copiedField === "tx" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17L4 12" stroke="#40E0D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="#636466" strokeWidth="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="#636466" strokeWidth="2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* View on Explorer Link */}
            <a
              href={`https://explorer.solana.com/address/${successModal.tokenMint}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center !gap-2 !mt-4 text-[#40E0D0] text-sm hover:underline"
            >
              {t.launchpad?.requestToken?.viewOnExplorer || "View on Solana Explorer"}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>

            {/* Close Button */}
            <button
              onClick={handleModalClose}
              className="w-full !mt-6 !py-3 bg-[#40E0D0] rounded-full text-[#090A11] text-sm font-bold hover:bg-[#40E0D0]/90 transition-colors"
            >
              {t.launchpad?.requestToken?.done || "Done"}
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div
            className={`flex items-center !gap-3 !px-4 !py-3 rounded-xl shadow-lg border ${
              toast.type === "error"
                ? "bg-[#FF5252]/10 border-[#FF5252]/30 text-[#FF5252]"
                : toast.type === "success"
                ? "bg-[#40E0D0]/10 border-[#40E0D0]/30 text-[#40E0D0]"
                : "bg-[#FFB800]/10 border-[#FFB800]/30 text-[#FFB800]"
            }`}
          >
            {/* Icon */}
            {toast.type === "error" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M15 9L9 15M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : toast.type === "success" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="!ml-2 hover:opacity-70 transition-opacity"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
