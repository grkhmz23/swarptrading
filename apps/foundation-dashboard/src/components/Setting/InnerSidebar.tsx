"use client";

import React, { useState } from "react";
import Image from "next/image";

export interface InnerSidebarItem {
  id: string;
  label: string;
  icon: string;
}

interface InnerSidebarProps {
  items: InnerSidebarItem[];
  currentSection: string;
  onSelect: (sectionId: string) => void;
}

export default function InnerSidebar({
  items,
  currentSection,
  onSelect,
}: InnerSidebarProps) {
  const [sidebarOpen] = useState(true);

  const handleSectionSelect = (sectionId: string) => {
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem("swarp_fd_settings_subsection", sectionId);
    }
    
    // Update state through parent component
    onSelect(sectionId);
    
    // Dispatch custom event
    const event = new CustomEvent("settings-subsection-change", {
      detail: sectionId
    });
    window.dispatchEvent(event);
  };

  return (
    <aside
      className={`
        h-full !pt-4 w-full bg-[#090A11] border-r border-[#2B2D30]
        transform transition-transform duration-300 ease-in-out z-20
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >

      {/* Navigation Items */}
      <nav >
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => handleSectionSelect(item.id)}
            className={`
              group  flex items-center !gap-3 !px-8 !py-3 !mb-2 text-sm transition-all cursor-pointer
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
                <Image
                  src={`figma-assets/${item.icon}.svg`}
                  alt={item.label}
                  width={48}
                  height={64}
                  className="object-contain w-full h-full "
                />
              </div>
            </div>

            <span className="text-sm">{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}
  