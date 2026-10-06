"use client";

import React from "react";
import Image from "next/image";


export interface RewardItem {
  id: string | number;
  title: string;
  subtitle?: string;
  requirementLabel?: string;
  icon: string;
  claimed?: boolean;
}

interface RewardsListProps {
  rewards: RewardItem[];
  onRemove?: (id: string | number) => void;
  className?: string;
}

export const RewardsList: React.FC<RewardsListProps> = ({
  rewards,
  onRemove,
  className,
}) => {
  return (
    <div className={`flex flex-nowrap !gap-4 w-full min-w-full ${className ?? ''}`}>
      {rewards.map((reward) => (
        <div
          key={reward.id}
          className="min-w-[370px] w-[370px] h-[100px] flex items-center justify-between !gap-4 rounded-[12px] bg-[#131519] !px-4 !py-2 border border-[#2B2D30]"
        >
          {/* LEFT: Icon + Info */}
          <div className="flex items-center !gap-4">
            <div className="flex items-start justify-start rounded-md">
              <Image
                src={reward.icon}
                alt={reward.title}
                width={84}
                height={84}
                className="rounded-md object-contain"
              />
            </div>

            <div>
              {reward.requirementLabel && (
                <div className="text-[12px] font-semibold text-[#00F0C8] !mb-1">
                  {reward.requirementLabel}
                </div>
              )}
              <div className="text-[14px] font-semibold text-white">
                {reward.title}
              </div>
              {reward.subtitle && (
                <div className="text-[12px] text-[#636466] !mt-1">
                  {reward.subtitle}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Remove Button */}

          <button
            onClick={() => onRemove?.(reward.id)}
            className='w-6 h-6 cursor-pointer hover:opacity-70 transition-opacity'
          >
            <Image
              src="figma-assets/cross.svg"
              alt="Close"
              width={12}
              height={12}
              className="object-contain w-full h-full"
            />
          </button>
        </div>
      ))}
    </div>

  );
};
