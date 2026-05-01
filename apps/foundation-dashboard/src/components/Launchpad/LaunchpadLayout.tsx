"use client";

import React, { useState, useEffect } from "react";
import { InnerSidebarItem } from "../Setting/InnerSidebar";
import { useT } from "@/i18n/I18nProvider";
import LaunchpadHome from "./sections/LaunchpadHome";
import RequestToken from "./sections/RequestToken";
import TradeHistory from "./sections/TradeHistory";
import Portfolio from "./sections/Portfolio";
import Watchlist from "./sections/Watchlist";
import Alerts from "./sections/Alerts";
import TokenDetail from "./sections/TokenDetail";

interface LaunchpadLayoutProps {
  innerItems: InnerSidebarItem[];
}

export default function LaunchpadLayout({ innerItems }: LaunchpadLayoutProps) {
  const t = useT();
  const [currentSection, setCurrentSection] = useState(innerItems[0]?.id || "home");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Helper function to get translated label for navigation items
  const getTranslatedLabel = (itemId: string): string => {
    const labelKeyMap: Record<string, string> = {
      "home": t.launchpad?.navigation?.home || "Home",
      "portfolio": t.launchpad?.navigation?.portfolio || "Portfolio",
      "trade-history": t.launchpad?.navigation?.tradeHistory || "Trade History",
      "watchlist": t.launchpad?.navigation?.watchlist || "Watchlist",
      "alerts": t.launchpad?.navigation?.alerts || "Alerts",
      "request-token": t.launchpad?.navigation?.requestToken || "Request Token",
      "support": t.launchpad?.navigation?.support || "Support",
    };
    return labelKeyMap[itemId] || itemId;
  };

  // Listen for changes in the launchpad subsection
  useEffect(() => {
    // Load initial section on mount
    const storedSection = localStorage.getItem("swarp_fd_launchpad_subsection");
    if (storedSection) {
      setCurrentSection(storedSection);
    }

    // Listen for custom subsection change events
    const handleSubChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setCurrentSection(customEvent.detail);
      // Clear selected project when navigating away
      setSelectedProjectId(null);
    };

    // Listen for token detail navigation events
    const handleTokenDetail = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setSelectedProjectId(customEvent.detail);
    };

    window.addEventListener("launchpad-subsection-change", handleSubChange as EventListener);
    window.addEventListener("launchpad-token-detail", handleTokenDetail as EventListener);

    return () => {
      window.removeEventListener("launchpad-subsection-change", handleSubChange as EventListener);
      window.removeEventListener("launchpad-token-detail", handleTokenDetail as EventListener);
    };
  }, []);

  // Custom onSelect handler for launchpad
  const handleSelect = (sectionId: string) => {
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem("swarp_fd_launchpad_subsection", sectionId);
    }

    // Update state
    setCurrentSection(sectionId);

    // Dispatch custom event
    const event = new CustomEvent("launchpad-subsection-change", {
      detail: sectionId
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="flex flex-1 h-full">
      {/* Launchpad Inner Sidebar */}
      <div className="fixed top-19 left-56 h-screen w-56 hidden lg:block">
        <aside
          className="h-full !pt-4 w-full bg-[#090A11] border-r border-[#2B2D30] transform transition-transform duration-300 ease-in-out z-20"
        >
          {/* Navigation Items */}
          <nav>
            {innerItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`
                  group flex items-center !gap-3 !px-8 !py-3 !mb-2 text-sm transition-all cursor-pointer
                  ${
                    currentSection === item.id
                      ? "bg-[#132123] text-[#40E0D0] font-bold"
                      : "text-[#636466] font-normal hover:text-white hover:bg-[#1A1B23]"
                  }
                `}
              >
                {/* Icons */}
                <div className="w-5 h-5 flex items-center justify-center transition-all cursor-pointer">
                  <div
                    className={`transition-all ${
                      currentSection === item.id
                        ? "[filter:sepia(1)_hue-rotate(132deg)_saturate(4)_brightness(1.2)]"
                        : "opacity-60 group-hover:opacity-100 group-hover:brightness-0 group-hover:invert"
                    }`}
                  >
                    <img
                      src={`/figma-assets/${item.icon}.svg`}
                      alt={getTranslatedLabel(item.id)}
                      width={20}
                      height={20}
                      className="object-contain w-5 h-5"
                    />
                  </div>
                </div>

                <span className="text-sm">{getTranslatedLabel(item.id)}</span>
              </div>
            ))}
          </nav>
        </aside>
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 !ml-0 lg:!ml-[224px] h-full ${selectedProjectId ? 'relative overflow-hidden' : 'overflow-y-auto'}`}>
        {selectedProjectId ? (
          <TokenDetail
            projectId={selectedProjectId}
            onBack={() => setSelectedProjectId(null)}
          />
        ) : currentSection === "home" ? (
          <LaunchpadHome />
        ) : currentSection === "request-token" ? (
          <RequestToken />
        ) : currentSection === "portfolio" ? (
          <Portfolio />
        ) : currentSection === "trade-history" ? (
          <TradeHistory />
        ) : currentSection === "watchlist" ? (
          <Watchlist />
        ) : currentSection === "alerts" ? (
          <Alerts />
        ) : currentSection === "support" ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <h1 className="text-xl !mb-4 text-white">{t.launchpad?.navigation?.support || "Support"}</h1>
            <p className="text-[#636466]">{t.launchpad?.navigation?.thisSection || "This Section is"} {t.launchpad?.navigation?.comingSoon || "Coming Soon"}</p>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <h1 className="text-xl !mb-4 capitalize text-white">
              {getTranslatedLabel(currentSection)}
            </h1>
            <p className="text-[#636466]">{t.launchpad?.navigation?.thisSection || "This Section is"} {t.launchpad?.navigation?.comingSoon || "Coming Soon"}</p>
          </div>
        )}
      </main>
    </div>
  );
}
