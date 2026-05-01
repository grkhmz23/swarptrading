"use client";

import React, { useState, useEffect } from "react";
import InnerSidebar, { InnerSidebarItem } from "./InnerSidebar";
import ReferSection from "./Refer&Earn/ReferSection";
import General from "./General";
import AdressBook from "./AdressBook";
import Notifications from "./Notifications";
import SecurityPrivacy from "./Security&Privacy";


interface SettingsLayoutProps {
  innerItems: InnerSidebarItem[];
}

export default function SettingsLayout({ innerItems }: SettingsLayoutProps) {
  const [currentSection, setCurrentSection] = useState(innerItems[0]?.id || "");

  // Listen for changes in the settings subsection
useEffect(() => {
  // 1️⃣ Load initial section on mount
  const storedSection = localStorage.getItem("swarp_fd_settings_subsection");
  if (storedSection) {
    setCurrentSection(storedSection);
  }

  // 2️⃣ Listen for custom subsection change events
  const handleSubChange = (e: Event) => {
    const customEvent = e as CustomEvent<string>;
    setCurrentSection(customEvent.detail);
  };

  window.addEventListener("settings-subsection-change", handleSubChange as EventListener);

  return () => {
    window.removeEventListener("settings-subsection-change", handleSubChange as EventListener);
  };
}, []);



  return (
    <div className="flex flex-1 h-full">
      {/* Settings Inner Sidebar */}
      <div className="fixed top-19 left-56 h-screen w-56 hidden lg:block ">
        <InnerSidebar
          items={innerItems}
          currentSection={currentSection}
          onSelect={setCurrentSection}
        />
      </div>

      {/* Main Content Area */}
    <main className="flex-1 !ml-[12px] sm:!ml-[96px] lg:!ml-[200px] 2xl:!ml-[112px] xl:!ml-[152px]  h-full overflow-y-auto">
        {currentSection === "refer" ? (
          <ReferSection />
        ) : currentSection === "general" ? (
          <General />
        ) : currentSection === "address-book" ? (
          <AdressBook />
        ) : currentSection === "notifications" ? (
          <Notifications />
        ) : currentSection === "security" ? (
          <SecurityPrivacy />
        ) : (
          <div className="h-full flex flex-col items-center text-center">
            <h1 className="text-xl mb-4 capitalize">
              {currentSection.replace("-", " ")}
            </h1>
            <p className="text-[#636466]">This Section is Coming Soon</p>
          </div>
        )}
      </main>

    </div>
  );
}
