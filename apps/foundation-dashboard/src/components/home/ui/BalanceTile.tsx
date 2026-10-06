"use client";

import Image from "next/image";
import type { TileItem } from "@/types/home";

interface BalanceTileProps {
  item: TileItem;
  onClick?: (id: string | number) => void;
}

export function BalanceTile({ item, onClick }: BalanceTileProps) {
  return (
    <button
      onClick={() => onClick?.(item.id)}
      className="
        w-full flex items-center justify-between
        
        bg-transparent
      "
    >
      {/* SECTION 1: ICON + TITLE */}
      <div className="flex items-center gap-3 min-w-[98px]">
        <div className="w-10 h-10 rounded-full bg-[#131519] flex items-center justify-center">
          <Image
            src={item.icon}
            alt={item.title}
            width={20}
            height={20}
            className="object-contain"
          />
        </div>

        <span className="text-white text-[14px] font-medium">
          {item.title}
        </span>
      </div>

      {/* SECTION 2: BALANCE */}
      <div className="flex flex-col items-start min-w-[98px]">
        <span className="text-[#46484C] text-[14px]">
          Balance
        </span>

        <span className="text-white text-[14px] mt-1.5">
          {item.balance}
        </span>
      </div>

      {/* SECTION 3: CURRENT PRICE */}
      <div className="flex flex-col items-start  text-right min-w-[98px]">
        <span className="text-[#46484C] text-[14px]">
          Current price
        </span>

        <div className="flex items-center justify-center mt-1.5 gap-1.5">
          <Image
            src="/figma-assets/UpArrow.svg"
            alt="increase"
            width={16}
            height={16}
          />

          <p className="text-[#27AE60] text-[14px]">
            {item.currentPrice}
          </p>
        </div>
      </div>

      {/* SECTION 4: SIDE ARROW */}
      <Image
        src="/figma-assets/rightArrow.svg"
        alt="arrow"
        width={16}
        height={16}
      />
    </button>
  );
}
