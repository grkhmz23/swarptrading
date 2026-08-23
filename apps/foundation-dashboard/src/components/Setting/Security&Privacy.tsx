"use client";

import { useState } from "react";
import SettingsTile from "./shared/SettingsTile";
import ChangePasscodeModal from "./ChangePasscodeModal";
import { apiService } from "@/services/api";
import { useRouter } from "next/navigation";
import DeleteAccountModal from "./DeleteAccountModal";
import { useT } from "@/i18n/I18nProvider";

export default function SecurityPrivacy() {
  const t = useT();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const router = useRouter();
  const handlePasscodeSubmit = async (data: { oldPasscode: string; newPasscode: string }) => {
    const token = localStorage.getItem("swarp_fd_access_token");
    if (!token) throw new Error("Please login first");

    try {
      await apiService.updatePasscode(token, data.oldPasscode, data.newPasscode);
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      if (err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
        throw new Error((err as { message: string }).message);
      }
      throw new Error("Failed to update passcode");
    }
  };

const handleDeleteAccount = async () => {
  const token = localStorage.getItem("swarp_fd_access_token");
  if (!token) {
    throw new Error("Please login first");
  }

  setIsDeleting(true);

  try {
    await apiService.deleteUserAccount(token);
    // success -> do nothing, modal will handle it
     router.push("/");
      window.location.reload();
  } catch (err: unknown) {
    console.error("Error deleting account:", err);
    const message =
      err instanceof Error ? err.message : "Failed to delete account";
    throw new Error(message); // modal catches this
  } finally {
    setIsDeleting(false);
  }
};


  return (
    <div className="w-full mx-auto flex flex-wrap justify-center gap-7 cursor-default px-4 sm:px-0">
      <div className="w-full flex flex-col items-center">
        {/* Page Title */}
        <div className="gap-2.5 w-full max-w-[742px] md:max-w-[450px] lg:max-w-[540px] xl:max-w-[742px] 2xl:max-w-[742px]">
          <h4
            className="text-[20px] font-bold !py-7 text-white max-md:text-[18px] max-sm:!py-5 sm:text-left"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t.settings?.security?.title || "Security & Privacy"}
          </h4>
          <div className="border-[0.2px] border-[#2B2D30] rounded-xs" />
        </div>
        {/* Tiles Section */}
        <div className="flex justify-center w-full !pt-8">
          <div
            className="
              w-[742px] sm:w-[550px] md:w-[450px] lg:w-[540px] xl:w-[742px] 2xl:w-[742px]
              h-full rounded-[12px] flex flex-col
              transition-all duration-200
              max-xl:w-[85%] max-lg:w-[90%] max-md:w-full max-md:h-auto
              max-sm:!p-5 max-sm:!pt-3
            "
          >
            {/* Passcode */}
            <SettingsTile
              title={t.settings?.security?.passcode?.title || "Passcode"}
              subtitle={t.settings?.security?.passcode?.subtitle || "Update your account security"}
              iconSrc="/figma-assets/passcode.svg"
              iconAlt="passcode"
              rightElement={
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-[134px] h-[38px] rounded-4xl bg-white cursor-pointer !px-4 !py-2.5 text-[12px] font-bold text-[#090A11] whitespace-nowrap flex items-center justify-center"
                >
                  {t.settings?.security?.passcode?.changeButton || "Change passcode"}
                </button>
              }
            />
            {/* Delete Account */}
            <SettingsTile
              title={t.settings?.security?.deleteAccount?.title || "Delete Account"}
              subtitle={t.settings?.security?.deleteAccount?.subtitle || "Remove wallet and clear all data"}
              iconSrc="/figma-assets/logout.svg"
              iconAlt="logout"
              rightElement={
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-[134px] h-[38px] rounded-4xl cursor-pointer bg-red-600 hover:bg-red-700 !px-4 !py-2.5 text-[12px] font-bold text-white flex items-center justify-center"
                >
                  {t.settings?.security?.deleteAccount?.deleteButton || "Delete"}
                </button>
              }
            />
            {/* Delete Confirmation Modal */}
            <DeleteAccountModal
              isOpen={showDeleteModal}
              onClose={() => setShowDeleteModal(false)}
              onConfirm={handleDeleteAccount}
              isLoading={isDeleting}
            />
          </div>
        </div>
      </div>
      {/* Change Passcode Modal */}
      <ChangePasscodeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handlePasscodeSubmit}
      />
    </div>
  );
}
