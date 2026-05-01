"use client";

import React from "react";
import Image from "next/image";

export interface CryptoCardItem {
  id: string | number;
  title: string;
  price: string;
  change: string; // e.g. "+0.45%" or "-2.45%"
  icon: string; // image url
}

interface CryptoCardProps {
  item: CryptoCardItem;
  onClick?: (id: string | number) => void;
}

export default function CryptoCard({ item, onClick }: CryptoCardProps) {
  const isNegative = item.change.startsWith("-");

  return (
    <button
      onClick={() => onClick?.(item.id)}
      className="w-[138.4px] h-[146px] bg-[#0F1115] rounded-[16px] !p-5  flex flex-col items-start justify-between hover:opacity-90 transition"
    >
      <div className="flex items-start ">
        <div className="rounded-full bg-black/10 flex items-center justify-center !p-0">
          <Image src={item.icon} alt={item.title} width={28} height={28} />
        </div>
      </div>

      <div className="flex flex-col items-start justify-start !gap-1 ">
        <span className="text-[12px] font-medium text-[#636466]">{item.title}</span>
        <span className="text-[14px] font-semibold text-white">${item.price}</span>
        <div className={`flex items-center gap-1 text-[12px] font-medium ${isNegative ? "text-[#EE4126]" : "text-[#27AE60]"}`}>
          <Image
            src={isNegative ? "/figma-assets/downArrow.svg" : "/figma-assets/upArrow.svg"}
            alt="trend"
            width={14}
            height={14}
          />
          {item.change}
        </div>
      </div>
    </button>
  );
}
