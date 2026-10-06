"use client";

import React from "react";
import Image from "next/image";

export interface SettingsTileProps {
  title: string;
  subtitle?: string;
  topSubtitle?: string;
  iconSrc?: string | React.ReactNode;
  iconAlt?: string;
  rightElement?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function SettingsTile({
  title,
  subtitle,
  topSubtitle,
  iconSrc,
  iconAlt = "",
  rightElement,
  onClick,
  className = "",
}: SettingsTileProps) {
  const isCustomIcon = typeof iconSrc !== "string" && !!iconSrc;

  return (
    <div className={`w-full max-w-3xl ${className}`}>
      <div
        role={onClick ? "button" : "group"}
        onClick={onClick}
        className={`w-full !py-6
          flex items-center justify-between !gap-4
          transition-shadow duration-150
          border-b-[0.2px] border-[#2B2D30]
          
          ${onClick ? "cursor-pointer hover:shadow-[0_6px_18px_rgba(0,0,0,0.6)]" : ""}
          sm:!py-6 !py-4
        `}
      >
        {topSubtitle ? (
          <div className="flex flex-col items-start justify-start w-full">
            <div className="text-[#636466] font-[500] text-[14px] leading-[14px] !pb-4 sm:text-[14px] sm:leading-[16px] ">
              {topSubtitle}
            </div>

            <div className="flex items-center !gap-3 min-w-0">
              {iconSrc ? (
                <div
                  className="flex-shrink-0 !w-[38px] !h-[38px] rounded-full bg-[#0F1113] border border-[#232426] flex items-center justify-center overflow-hidden
                  sm:!w-[44px] sm:!h-[44px] "
                  aria-hidden
                >
                  {isCustomIcon ? (
                    iconSrc
                  ) : (
                    <Image
                      src={iconSrc as string}
                      alt={iconAlt} 
                      width={22}
                      height={22}
                      className="object-contain sm:w-[22px] sm:h-[22px] w-[18px] h-[18px]"
                    />
                  )}
                </div>
              ) : null}

              <div className="min-w-0">
                <div className="text-white font-semibold text-[16px]  truncate sm:text-[16px] sm:leading-[20px] ">
                  {title}
                </div>

                {subtitle && (
                  <div className="text-[#636466] text-[14px] truncate   ">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            {rightElement && (
              <div className="flex-shrink-0 !ml-4 flex items-center justify-end w-full sm:scale-100 scale-90">
                {rightElement}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center !gap-3 min-w-0">
              {iconSrc ? (
                <div
                  className="flex-shrink-0 !w-[38px] !h-[38px] rounded-full bg-[#0F1113] border border-[#232426] flex items-center justify-center overflow-hidden
                  sm:!w-[44px] sm:!h-[44px] "
                  aria-hidden
                >
                  {isCustomIcon ? (
                    iconSrc
                  ) : (
                    <Image
                      src={iconSrc as string}
                      alt={iconAlt}
                      width={22}
                      height={22}
                      className="object-contain sm:w-[22px] sm:h-[22px] w-[18px] h-[18px]"
                    />
                  )}
                </div>
              ) : null}

              <div className="min-w-0">
                <div className="text-white font-semibold text-[16px] truncate  ">
                  {title}
                </div>

                {subtitle && (
                  <div className="text-[#636466] text-[14px] truncate !mt-1.5 ">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            {rightElement && (
              <div className="flex-shrink-0 !ml-4 flex items-center justify-end sm:scale-100 scale-90">
                {rightElement}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
