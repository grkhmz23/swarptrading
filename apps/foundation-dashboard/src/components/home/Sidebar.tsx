'use client';

import React from 'react';
import Image from 'next/image';

interface NavigationItem {
  name: string;
  key: 'home' | 'wallet' | 'trade' | 'transactions' | 'rewards' | 'staking' | 'settings' | 'launchpad';
  icon: string;
  route: string;
}

interface SettingsItem {
  id: string;
  label: string;
  icon: string;
}

interface LaunchpadItem {
  id: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentSection: string;
  navigationItems: NavigationItem[];
  settingsItems: SettingsItem[];
  launchpadItems?: LaunchpadItem[];
  settingsExpanded: boolean;
  setSettingsExpanded: (expanded: boolean) => void;
  launchpadExpanded?: boolean;
  setLaunchpadExpanded?: (expanded: boolean) => void;
  onNavigationClick: (section: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  currentSection,
  navigationItems,
  settingsItems,
  launchpadItems = [],
  settingsExpanded,
  setSettingsExpanded,
  launchpadExpanded = false,
  setLaunchpadExpanded,
  onNavigationClick,
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation - Fixed */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-56 bg-[#090A11] border-r border-[#2B2D30]
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:relative lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo Section */}
        <div className="flex items-center justify-start !px-8 !py-4">
          <div className="w-12 h-16">
            <Image
              src="/sidebar-bg.svg"
              alt="Swarp Foundation Logo"
              width={48}
              height={64}
              className="object-contain w-full h-full"
            />
          </div>
        </div>

        {/* Navigation Items */}
        <nav>
          {navigationItems.map((item) => {
            const isSettings = item.key === "settings";
            const isLaunchpad = item.key === "launchpad";
            // Map key to section name for comparison (currentSection stores capitalized English names)
            const sectionName = item.key.charAt(0).toUpperCase() + item.key.slice(1);
            const isActive = currentSection === sectionName || (isLaunchpad && currentSection.startsWith("Launchpad"));

            return (
              <div key={item.key}>
                {/* Main nav item */}
                <div
                  onClick={() => {
                    if (isSettings && window.innerWidth < 1024) {
                      // md/sm screen → toggle nested dropdown
                      setSettingsExpanded(!settingsExpanded);
                      if (setLaunchpadExpanded) setLaunchpadExpanded(false);
                    } else if (isLaunchpad && window.innerWidth < 1024) {
                      // md/sm screen → toggle launchpad dropdown
                      if (setLaunchpadExpanded) setLaunchpadExpanded(!launchpadExpanded);
                      setSettingsExpanded(false);
                    } else {
                      // lg and up → normal navigation
                      onNavigationClick(sectionName);
                      setSettingsExpanded(false);
                      if (setLaunchpadExpanded) setLaunchpadExpanded(false);
                    }
                  }}
                  className={`
                    group flex items-center !gap-3 !px-8 !py-3 !mb-2 rounded- text-sm transition-all cursor-pointer
                    ${
                      isActive
                        ? "bg-[#132123] text-[#40E0D0] font-bold"
                        : "text-[#636466] font-normal hover:text-white hover:bg-[#1A1B23]"
                    }
                  `}
                >
                  {/* Icons */}
                  <div className="w-5 h-5 flex items-center justify-center transition-all cursor-pointer">
                    <div
                      className={`transition-all ${
                        isActive
                          ? "[filter:sepia(1)_hue-rotate(132deg)_saturate(4)_brightness(1.2)]"
                          : "opacity-60 group-hover:opacity-100 group-hover:brightness-0 group-hover:invert"
                      }`}
                    >
                      {item.icon === "home" && (
                        <Image src="figma-assets/house-final.svg" alt="Home" width={48} height={64} className="object-contain w-full h-full" />
                      )}
                      {item.icon === "wallet" && (
                        <Image src="figma-assets/wallet.svg" alt="Wallet" width={48} height={64} className="object-contain w-full h-full" />
                      )}
                      {item.icon === "trade" && (
                        <Image src="figma-assets/swap.svg" alt="Trade" width={48} height={64} className="object-contain w-full h-full" />
                      )}
                      {item.icon === "transactions" && (
                        <Image src="figma-assets/time.svg" alt="Transactions" width={48} height={64} className="object-contain w-full h-full" />
                      )}
                      {item.icon === "rewards" && (
                        <Image src="figma-assets/reward.svg" alt="Rewards" width={48} height={64} className="object-contain w-full h-full" />
                      )}
                      {item.icon === "staking" && (
                        <Image src="figma-assets/reward.svg" alt="Staking" width={48} height={64} className="object-contain w-full h-full" />
                      )}
                      {item.icon === "settings" && (
                        <Image src="figma-assets/setting.svg" alt="Settings" width={48} height={64} className="object-contain w-full h-full" />
                      )}
                      {item.icon === "launchpad" && (
                        <Image src="figma-assets/rocket.svg" alt="Launchpad" width={48} height={64} className="object-contain w-full h-full" />
                      )}
                    </div>
                  </div>

                  <span className="text-sm flex-1">{item.name}</span>

                  {/* Dropdown arrow for md/sm */}
                  {isSettings && (
                    <svg
                      className={`w-3 h-3 ml-auto transition-transform lg:hidden ${
                        settingsExpanded ? "rotate-180" : "rotate-0"
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                  {isLaunchpad && (
                    <svg
                      className={`w-3 h-3 ml-auto transition-transform lg:hidden ${
                        launchpadExpanded ? "rotate-180" : "rotate-0"
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>

                {/* Nested sub-items (Settings inner items for md/sm) */}
                {isSettings && (
                  <div
                    className={`pl-10 overflow-hidden lg:hidden transition-all duration-300 ${
                      settingsExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    {settingsItems.map((sub) => {
                      const isSubActive = currentSection === "Settings" && localStorage.getItem("swarp_fd_settings_subsection") === sub.id;

                      return (
                        <div
                          key={sub.id}
                          onClick={() => {
                            // Store the selected section
                            localStorage.setItem("swarp_fd_settings_subsection", sub.id);
                            // Dispatch a global event for real-time update
                            window.dispatchEvent(new CustomEvent("settings-subsection-change", { detail: sub.id }));
                            // Navigate to Settings page
                            onNavigationClick("Settings");
                            // Close dropdown
                            setSettingsExpanded(false);
                            setSidebarOpen(false);
                          }}
                          className={`group flex items-center !gap-3 !px-10 !py-3 !mb-2 rounded- text-sm transition-all cursor-pointer
                            ${
                              isSubActive
                                ? "bg-[#132123] text-[#40E0D0] font-bold"
                                : "text-[#636466] font-normal hover:text-white hover:bg-[#1A1B23]"
                            }
                          `}
                        >
                          {/* Sub-item icon */}
                          <div className="w-5 h-5 flex items-center justify-center transition-all cursor-pointer">
                            <div
                              className={`transition-all ${
                                isSubActive
                                  ? "[filter:sepia(1)_hue-rotate(132deg)_saturate(4)_brightness(1.2)]"
                                  : "opacity-60 group-hover:opacity-100 group-hover:brightness-0 group-hover:invert"
                              }`}
                            >
                              <Image
                                src={`figma-assets/${sub.icon}.svg`}
                                alt={sub.label}
                                width={48}
                                height={64}
                                className="object-contain w-full h-full"
                              />
                            </div>
                          </div>

                          {/* Label */}
                          <span className="text-sm flex-1">{sub.label}</span>

                          {/* Arrow Icon */}
                          <svg
                            className={`w-3 h-3 ml-auto transition-transform duration-300 ease-in-out ${
                              isSubActive ? "rotate-[-90deg] text-[#40E0D0]" : "rotate-0 text-[#636466]"
                            }`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Nested sub-items (Launchpad inner items for md/sm) */}
                {isLaunchpad && launchpadItems.length > 0 && (
                  <div
                    className={`pl-10 overflow-hidden lg:hidden transition-all duration-300 ${
                      launchpadExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    {launchpadItems.map((sub) => {
                      const isSubActive = currentSection === `Launchpad-${sub.id}` ||
                        (currentSection === "Launchpad" && localStorage.getItem("swarp_fd_launchpad_subsection") === sub.id);

                      return (
                        <div
                          key={sub.id}
                          onClick={() => {
                            // Store the selected section
                            localStorage.setItem("swarp_fd_launchpad_subsection", sub.id);
                            // Dispatch a global event for real-time update
                            window.dispatchEvent(new CustomEvent("launchpad-subsection-change", { detail: sub.id }));
                            // Navigate to Launchpad page
                            onNavigationClick("Launchpad");
                            // Close dropdown
                            if (setLaunchpadExpanded) setLaunchpadExpanded(false);
                            setSidebarOpen(false);
                          }}
                          className={`group flex items-center !gap-3 !px-10 !py-3 !mb-2 rounded- text-sm transition-all cursor-pointer
                            ${
                              isSubActive
                                ? "bg-[#132123] text-[#40E0D0] font-bold"
                                : "text-[#636466] font-normal hover:text-white hover:bg-[#1A1B23]"
                            }
                          `}
                        >
                          {/* Sub-item icon */}
                          <div className="w-5 h-5 flex items-center justify-center transition-all cursor-pointer">
                            <div
                              className={`transition-all ${
                                isSubActive
                                  ? "[filter:sepia(1)_hue-rotate(132deg)_saturate(4)_brightness(1.2)]"
                                  : "opacity-60 group-hover:opacity-100 group-hover:brightness-0 group-hover:invert"
                              }`}
                            >
                              <Image
                                src={`figma-assets/${sub.icon}.svg`}
                                alt={sub.label}
                                width={48}
                                height={64}
                                className="object-contain w-full h-full"
                              />
                            </div>
                          </div>

                          {/* Label */}
                          <span className="text-sm flex-1">{sub.label}</span>

                          {/* Arrow Icon */}
                          <svg
                            className={`w-3 h-3 ml-auto transition-transform duration-300 ease-in-out ${
                              isSubActive ? "rotate-[-90deg] text-[#40E0D0]" : "rotate-0 text-[#636466]"
                            }`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
