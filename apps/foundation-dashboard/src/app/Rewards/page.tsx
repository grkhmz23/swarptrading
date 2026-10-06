"use client";

export default function RewardsPage() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#090A11]">
      <p className="text-white">Rewards coming soon...</p>
    </div>
  );
}

// "use client";
// import Image from "next/image";
// import React, { useState } from "react";
// import { Check, User } from "lucide-react";

// function Page() {
//   // ✅ Reward list (main)
//   const [rewards, setRewards] = useState([
//     {
//       id: "r1",
//       requirementLabel: "+10 SWRP",
//       title: "Welcome Bonus",
//       subtitle: "You referred 1 friend who transacted",
//       claimed: true,
//       icon: "/figma-assets/welcomeBonusReferred.svg",
//     },
//     {
//       id: "r2",
//       requirementLabel: "+15 SWRP",
//       title: "First Cashback",
//       subtitle: "Complete your first transaction",
//       claimed: true,
//       icon: "/figma-assets/firstCashback.svg",
//     },
//     {
//       id: "r3",
//       requirementLabel: "3% Cashback",
//       title: "Cashback Booster",
//       subtitle: "Spend over $200 in a week",
//       claimed: false,
//       icon: "/figma-assets/cashbackBoosterSvg.svg",
//     },
//   ]);

//   // ✅ More rewards
//   const [moreRewards, setMoreRewards] = useState([
//     {
//       id: "m1",
//       requirementLabel: "Early access",
//       title: "Airdrop Ready",
//       subtitle: "Refer 5 friends who completes a transaction",
//       claimed: false,
//       icon: "/figma-assets/earlyAirDropAccessSvg.svg",
//     },
//     {
//       id: "m2",
//       requirementLabel: "+15 SWRP",
//       title: "Staking Sprout",
//       subtitle: "Stake 500 SWRP for 7+ days",
//       claimed: false,
//       icon: "/figma-assets/stakingSprout.svg",
//     },
//     {
//       id: "m3",
//       requirementLabel: "+12 SWRP",
//       title: "Swap Streak",
//       subtitle: "Complete 5 token swaps for 7+ days",
//       claimed: false,
//       icon: "/figma-assets/swapStreak.svg",
//     },
//   ]);

//   const handleClaim = (id: string) => {
//     setRewards((prev) =>
//       prev.map((m) => (m.id === id ? { ...m, claimed: true } : m))
//     );
//     setMoreRewards((prev) =>
//       prev.map((m) => (m.id === id ? { ...m, claimed: true } : m))
//     );
//   };

//   return (
//     <div className="flex flex-col lg:flex-row h-[100vh] overflow-hidden border-t border-[#2B2D30]">
//       {/* ✅ Left Column - Rewards */}
//       <div className="flex-1 flex flex-col !p-4 lg:!p-7 border-b border-[#2B2D30] min-h-0 overflow-y-auto">
//         {/* Your Rewards */}
//         <div className="!mb-4">
//           <h3 className="text-[18px] font-semibold text-white">
//             Your Rewards
//           </h3>
//         </div>

//         <div className="!space-y-4">
//           {rewards.map((m) => (
//             <RewardCard key={m.id} data={m} onClaim={handleClaim} />
//           ))}
//         </div>

//         {/* More Rewards */}
//         <div className="!my-4">
//           <h3 className="text-[18px] font-semibold text-white">
//             More Rewards
//           </h3>
//         </div>

//         <div className="!space-y-4">
//           {moreRewards.map((m) => (
//             <RewardCard key={m.id} data={m} onClaim={handleClaim} />
//           ))}
//         </div>
//       </div>

//       {/* ✅ Right Column - Wallet Info */}
//       <div className="w-full lg:w-[400px] lg:min-w-[400px] !p-4 lg:!p-7 !space-y-4 lg:!space-y-6 border-b lg:border-l border-[#2B2D30] overflow-y-auto overflow-x-hidden h-full">
//         {/* My Wallet Section */}
//         <div>
//           <div className="flex items-center !gap-3 !mb-4">
//             <div className="w-10 h-10 bg-[#40E0D0] rounded-full flex items-center justify-center">
//               <span className="text-[#090A11] font-semibold">U</span>
//             </div>
//             <div className="flex-1">
//               <h3
//                 className="text-white text-base font-medium"
//                 style={{ fontFamily: "var(--font-heading)" }}
//               >
//                 My Wallet
//               </h3>
//               <div className="flex items-center !gap-2">
//                 <p
//                   className="text-[#636466] text-sm"
//                   style={{ fontFamily: "var(--font-sans)" }}
//                 >
//                   A2D9...C0F8
//                 </p>
//                 <button className="!p-1 hover:bg-[#2B2D30] rounded transition-colors cursor-pointer">
//                   <svg
//                     width="14"
//                     height="14"
//                     viewBox="0 0 24 24"
//                     fill="none"
//                   >
//                     <path
//                       d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z"
//                       stroke="#636466"
//                       strokeWidth="1.5"
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                     />
//                   </svg>
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* Balance Display */}
//           <div className="text-start !mb-6">
//             <div className="flex items-center gap-1">
//               <p className="text-[#636466] text-sm !mb-2">
//                 Estimated balance
//               </p>
//               <div className="w-4 h-4 !mb-1.5">
//                 <Image
//                   src="figma-assets/info.svg"
//                   alt="Arrow down"
//                   width={12}
//                   height={12}
//                   className="object-contain w-full h-full"
//                 />
//               </div>
//             </div>
//             <h2
//               className="text-white text-3xl lg:text-5xl font-semibold"
//               style={{ fontFamily: "var(--font-heading)" }}
//             >
//               0.000000 SOL
//             </h2>
//           </div>

//           {/* Action Buttons */}
//           <div className="flex flex-col !gap-2 !mb-6">
//             {[
//               { icon: "send", label: "Send" },
//               { icon: "receive", label: "Receive" },
//               { icon: "swap", label: "Swap" },
//               { icon: "topup", label: "Top up" },
//               { icon: "withdraw", label: "Withdraw" },
//             ].map((action) => (
//               <button
//                 key={action.label}
//                 className="flex items-center justify-start !gap-2 !p-2 hover:bg-[#131519] rounded-lg transition-colors cursor-pointer w-full min-w-0"
//               >
//                 <div className="w-10 h-10 bg-[#131519] rounded-full flex items-center justify-center">
//                   <div className="w-9 h-9 rounded-full flex items-center justify-center">
//                     <Image
//                       src={`figma-assets/${action.icon}.svg`}
//                       alt={action.label}
//                       width={12}
//                       height={12}
//                       className="object-contain w-full h-full"
//                     />
//                   </div>
//                 </div>
//                 <span className="text-[#B3B5B6] text-xs">{action.label}</span>
//               </button>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Page;

// /* ✅ Reusable Reward Card */
// interface RewardData {
//   id: string;
//   requirementLabel: string;
//   title: string;
//   subtitle: string;
//   claimed: boolean;
//   icon: string;
// }

// function RewardCard({
//   data,
//   onClaim,
// }: {
//   data: RewardData;
//   onClaim: (id: string) => void;
// }) {
//   const { id, requirementLabel, title, subtitle, claimed, icon } = data;
//   return (
//     <div className="flex items-start justify-between gap-4 rounded-lg">
//       {/* Left: icon + texts */}
//       <div className="flex items-start !gap-4">
//         <div className="flex items-center justify-center rounded-md">
//           <ImageOrFallback src={icon} alt={title} size={84} />
//         </div>

//         <div>
//           <div className="text-[12px] font-semibold text-[#00F0C8] !mb-1">
//             {requirementLabel}
//           </div>
//           <div className="text-[16px]  font-semibold text-white">{title}</div>
//           <div className="text-[12px] text-[#636466] !mt-1">{subtitle}</div>
//         </div>
//       </div>

//       {/* Right: Claim / Claimed */}
//       <div className="flex items-center">
//         {claimed ? (
//           <button
//             disabled
//             className="!px-6 !py-2 rounded-full bg-[#1B1C1F] text-[#8B8E92] text-[14px] font-medium cursor-not-allowed flex items-center gap-1"
//           >
//             <Check size={20} />
//             Claimed
//           </button>
//         ) : (
//           <button
//             onClick={() => onClaim(id)}
//             className="!px-6 !py-2 rounded-full bg-white text-black text-[14px] font-bold hover:opacity-95 transition"
//           >
//             Claim
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }

// /* ✅ Image fallback utility */
// function ImageOrFallback({
//   src,
//   alt,
//   size = 40,
// }: {
//   src?: string;
//   alt?: string;
//   size?: number;
// }) {
//   if (src) {
//     return (
//       <Image
//         src={src}
//         alt={alt || ""}
//         width={size}
//         height={size}
//         className="object-contain"
//       />
//     );
//   }
//   return <User size={size} className="text-[#9AA0A3]" />;
// }
