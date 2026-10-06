"use client";

import React, { useRef, useCallback } from "react";
import Image from "next/image";
import { BalanceTile } from './ui/BalanceTile';
import { RewardsList } from './ui/RewardCard';
import CryptoCard from './ui/CryptoCard';
import { useT } from "@/i18n/I18nProvider";
import type { TileItem } from '@/types/home';

// For CryptoCard items
export interface CryptoItem {
  id: string | number;
  title: string;
  price: string;
  change: string; // "+0.45%" etc.
  icon: string;
}

// For Rewards items
export interface RewardItem {
  id: string | number;
  progress: number;
  requirementLabel: string;
  title: string;
  subtitle: string;
  claimed: boolean;
  icon: string;
}

interface DashboardProps {
  items: TileItem[];
  cryptoData: CryptoItem[];
  rewards: RewardItem[];
  onRemoveReward?: (id: string | number) => void;
}

const REWARDS_VIEWPORT_WIDTH = 900;
const TOP_MOVERS_VIEWPORT_WIDTH = 900;

export default function HomeDashboard({
  items,
  cryptoData,
  rewards,
  onRemoveReward,
}: DashboardProps) {
  const t = useT();
  const rewardsCarouselRef = useRef<HTMLDivElement | null>(null);
  const topMoversCarouselRef = useRef<HTMLDivElement | null>(null);

  // Shared scroll container function
  const scrollContainer = useCallback(
    (
      ref: React.RefObject<HTMLDivElement | null>,
      direction: "left" | "right"
    ) => {
      const node = ref.current;
      if (!node) return;

      const scrollAmount = node.clientWidth || 0;

      node.scrollBy({
        left: direction === "right" ? scrollAmount : -scrollAmount,
        behavior: "smooth",
      });
    },
    []
  );

  const handleRewardsScroll = (direction: "left" | "right") => {
    scrollContainer(rewardsCarouselRef, direction);
  };

  const handleTopMoversScroll = (direction: "left" | "right") => {
    scrollContainer(topMoversCarouselRef, direction);
  };

  return (
<div className="w-[812px] lg:w-[670px] xl:w-[812px] mx-auto">
      {/* Balance Tiles */}
      <div className="!p-7 border-b border-[#2B2D30] flex flex-col gap-[28px]">
        {items.map((item) => (
          <BalanceTile key={item.id} item={item} />
        ))}
      </div>

      {/* Unlock Rewards */}
      <div className="!p-7 border-b border-[#2B2D30] flex flex-col gap-[28px]">
        <div className="flex justify-between">
          <span
            className="text-[20px] font-semibold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t.dashboard?.unlockRewards || "Unlock Rewards"}
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleRewardsScroll("left")}
              className="flex items-center justify-center rounded-full cursor-pointer"
            >
              <Image
                src="/figma-assets/leftArrow.svg"
                alt="Scroll left"
                width={16}
                height={16}
              />
            </button>

            <button
              type="button"
              onClick={() => handleRewardsScroll("right")}
              className="flex items-center justify-center rounded-full cursor-pointer"
            >
              <Image
                src="/figma-assets/rightArrow.svg"
                alt="Scroll right"
                width={16}
                height={16}
              />
            </button>
          </div>
        </div>

        <div className="!mt-7">
          <div
            ref={rewardsCarouselRef}
            className="carousel-scroll w-full"
            style={{
              width: "100%",
              maxWidth: `${REWARDS_VIEWPORT_WIDTH}px`,
            }}
          >
            <RewardsList
              rewards={rewards}
              onRemove={onRemoveReward}
              className="pr-4"
            />
          </div>
        </div>
      </div>

      {/* Top Movers */}
      <div className="!p-7 flex flex-col !gap-[28px]">
        <div className="flex justify-between">
          <span
            className="text-[20px] font-semibold"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t.dashboard?.topMovers || "Top Movers"}
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleTopMoversScroll("left")}
              className="flex items-center justify-center rounded-full cursor-pointer"
            >
              <Image
                src="/figma-assets/leftArrow.svg"
                alt="Scroll left"
                width={16}
                height={16}
              />
            </button>

            <button
              type="button"
              onClick={() => handleTopMoversScroll("right")}
              className="flex items-center justify-center rounded-full cursor-pointer"
            >
              <Image
                src="/figma-assets/rightArrow.svg"
                alt="Scroll right"
                width={16}
                height={16}
              />
            </button>
          </div>
        </div>

        <div className="!mt-7">
          <div
            ref={topMoversCarouselRef}
            className="carousel-scroll w-full"
            style={{
              width: "100%",
              maxWidth: `${TOP_MOVERS_VIEWPORT_WIDTH}px`,
            }}
          >
            <div className="flex !gap-5 w-max">
              {cryptoData.map((item) => (
                <CryptoCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
