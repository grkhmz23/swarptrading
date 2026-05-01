"use client";

import React, { useEffect, useState } from "react";
import SettingsTile from "./shared/SettingsTile";
import AddContactModal from "./AddContactModal";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store";
import { fetchContacts, addContact } from "@/store/slices/contactSlice";
import Image from "next/image";
import { useT } from "@/i18n/I18nProvider";
const resolveProfileImageSrc = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Allow data URIs
  if (trimmed.startsWith("data:image")) {
    return trimmed;
  }

  // Allow http/https URLs that point to configured remote hosts
  try {
    const asUrl = new URL(trimmed);
    if (asUrl.protocol === "http:" || asUrl.protocol === "https:") {
      return trimmed;
    }
  } catch {
    // Not a full URL – fall through to check for relative/static paths
  }

  // Allow references to assets served from /public when they include an extension
  const looksLikeFile = /\.[a-zA-Z0-9]+($|\?)/.test(trimmed);
  if (looksLikeFile) {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed.replace(/^\/?/, "")}`;
  }

  // Unknown string (e.g. username/nickname) – treat as no picture
  return null;
};

export default function AddressBook() {
  const t = useT();
  const dispatch = useDispatch<AppDispatch>();
  const { items: contacts, loading, error } = useSelector((state: RootState) => state.contacts);
  const userId = useSelector((state: RootState) => state.user.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAuthToken(localStorage.getItem("swarp_fd_access_token"));

    // Check for initial search query from header
    const initialQuery = localStorage.getItem("swarp_fd_address_book_search") || "";
    setSearchQuery(initialQuery);

    // Listen for search query changes from header
    const handleSearchChange = (e: CustomEvent<string>) => {
      setSearchQuery(e.detail || "");
    };

    window.addEventListener("address-book-search", handleSearchChange as EventListener);

    return () => {
      window.removeEventListener("address-book-search", handleSearchChange as EventListener);
    };
  }, []);

  // Filter contacts based on search query
  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      contact.nickname.toLowerCase().includes(query) ||
      contact.address.toLowerCase().includes(query)
    );
  });

  // Fetch contacts whenever authentication data changes
  useEffect(() => {
    if (!authToken || !userId) return;
    dispatch(fetchContacts({ userId, token: authToken }));
  }, [dispatch, authToken, userId]);

  // Add contact via Redux action
  const handleAddContact = async (data: { nickname: string; address: string }) => {
    if (!authToken || !userId) return;
    const result = await dispatch(addContact({ userId, data, token: authToken }));

    if (addContact.rejected.match(result)) return; // keep modal open on error

    // Fetch fresh contacts so we get signed/profile URLs from backend
    dispatch(fetchContacts({ userId, token: authToken }));

    setIsModalOpen(false);
  };

  return (
    <div className="w-full mx-auto flex flex-wrap justify-center gap-7 cursor-default px-4 sm:px-4">
      <div className="w-full flex flex-col items-center">
        {/* Header */}
        <div className="gap-2.5 w-full max-w-[742px] md:max-w-[450px] lg:max-w-[540px] xl:max-w-[742px] 2xl:max-w-[742px]">
          <div className="flex justify-between items-center flex-wrap gap-3 sm:gap-0">
            <h4
              className="text-[20px] font-bold !py-7 text-white max-md:text-[18px] max-sm:!py-5 sm:text-left"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t.settings?.addressBook?.title || "Address Book"}
            </h4>

            <div
              className="flex items-center text-[14px] font-semibold gap-1.5 cursor-pointer text-white max-sm:text-[13px]"
              onClick={() => setIsModalOpen(true)}
            >
              <Image src="/figma-assets/add.svg" alt="add" width={16} height={16} unoptimized />
              {t.settings?.addressBook?.addContact || "Add Contact"}
            </div>
          </div>

          {/* Divider */}
          <div className="border-[0.2px] border-[#2B2D30] rounded-xs" />
        </div>

        {loading && <p className="text-white/70 mt-4">{t.common?.loading || "Loading..."}</p>}

        {/* Contacts List */}
        <div className="flex justify-center w-full !pt-8">
          <div className="w-[742px] sm:w-[550px] md:w-[450px] lg:w-[540px] xl:w-[742px] 2xl:w-[742px] flex flex-col transition-all duration-200 max-xl:w-[85%] max-lg:w-[90%] max-md:w-full max-sm:!p-5 max-sm:!pt-3">
            {filteredContacts.length === 0 && !loading && (
              <p className="text-white/50">
                {searchQuery.trim()
                  ? (t.settings?.addressBook?.noContactsFound || "No contacts found")
                  : (t.settings?.addressBook?.noContacts || "No contacts yet")}
              </p>
            )}
            {filteredContacts.map((c, i) => {
              const profileSrc = resolveProfileImageSrc(c.profilePicture);
              return (
              <SettingsTile
                key={i}
                topSubtitle={i === 0 ? (t.settings?.addressBook?.contacts || "Contacts") : undefined}
                title={c.nickname}
                subtitle={c.address}
                iconAlt={c.nickname}
                iconSrc={
                  profileSrc ? (
                    <Image
                      src={profileSrc}
                      alt={c.nickname}
                      width={38}
                      height={38}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-[38px] h-[38px] rounded-full bg-[#40E0D0] text-black font-semibold text-lg">
                      {c.nickname.charAt(0).toUpperCase()}
                    </div>
                  )
                }
              />
            );
            })}
          </div>
        </div>
      </div>

      {/* Pass Redux error to modal */}
      <AddContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddContact}
        externalError={error}
      />
    </div>
  );
}
