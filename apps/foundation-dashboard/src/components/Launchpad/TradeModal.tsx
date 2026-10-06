"use client";

import { useState } from "react";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: {
    name: string;
    ticker: string;
    image?: string;
  };
}

type TradeMode = "buy" | "sell";

export default function TradeModal({ isOpen, onClose, token }: TradeModalProps) {
  const [mode, setMode] = useState<TradeMode>("buy");
  const [amount, setAmount] = useState("0.10345231");
  const [slippage, setSlippage] = useState("5");
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionId] = useState("5xK8...7mN2");

  // Calculate summary values
  const subtotal = amount ? parseFloat(amount) || 0 : 0;
  const fee = 0.002;
  const total = "1.4M";

  const handleConfirm = () => {
    setIsSuccess(true);
  };

  const handleDone = () => {
    setIsSuccess(false);
    setAmount("0.10345231");
    onClose();
  };

  if (!isOpen) return null;

  // Success Modal
  if (isSuccess) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
        onClick={onClose}
      >
        <div
          className="relative flex flex-col items-center"
          style={{
            width: "435px",
            backgroundColor: "#131519",
            borderRadius: "12px",
            boxShadow: "-12px -12px 64px 0px rgba(0, 0, 0, 0.24), 12px 12px 64px 0px rgba(0, 0, 0, 0.24)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <div className="absolute top-6 right-6">
            <button
              onClick={handleDone}
              className="flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="#636466" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Success Content */}
          <div className="flex flex-col items-center !px-8 !pt-16 !pb-8 w-full">
            {/* Success Icon */}
            <div
              className="flex items-center justify-center !mb-6"
              style={{
                width: "65px",
                height: "65px",
                backgroundColor: "#40E0D0",
                borderRadius: "50%",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M6 16L13 23L26 10" stroke="#090A11" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Title */}
            <h2
              className="!mb-2"
              style={{
                fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: "24px",
                fontWeight: 600,
                lineHeight: "1.3em",
                color: "#FFFFFF",
                textAlign: "center",
              }}
            >
              Trade successful!
            </h2>

            {/* Description */}
            <p
              className="!mb-6"
              style={{
                fontFamily: "'Inter Variable', Inter, sans-serif",
                fontSize: "14px",
                fontWeight: 400,
                lineHeight: "1.4em",
                letterSpacing: "-0.3px",
                color: "#636466",
                textAlign: "center",
              }}
            >
              You have successfully {mode === "buy" ? "purchased" : "sold"} {token.ticker}.
            </p>

            {/* View Transaction Link */}
            <button
              className="flex items-center !gap-1 !mb-8 hover:opacity-80 transition-opacity"
              onClick={() => void navigator.clipboard.writeText(transactionId)}
            >
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: "#40E0D0",
                }}
              >
                View transaction
              </span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5.25 3.5H10.5V8.75M10.5 3.5L3.5 10.5" stroke="#40E0D0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Done Button */}
            <button
              onClick={handleDone}
              className="w-full flex items-center justify-center !py-3.5 hover:opacity-90 transition-opacity"
              style={{
                backgroundColor: "#40E0D0",
                borderRadius: "100px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  lineHeight: "1.4em",
                  letterSpacing: "-0.3px",
                  color: "#090A11",
                }}
              >
                Done
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Trade Modal (Buy/Sell)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col justify-between"
        style={{
          width: "435px",
          height: "620px",
          backgroundColor: "#131519",
          borderRadius: "12px",
          boxShadow: "-12px -12px 64px 0px rgba(0, 0, 0, 0.24), 12px 12px 64px 0px rgba(0, 0, 0, 0.24)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Content */}
        <div className="flex flex-col" style={{ gap: "32px" }}>
          {/* Header */}
          <div
            className="flex items-center"
            style={{
              padding: "24px 0px",
              borderBottom: "0.2px solid #2B2D30",
            }}
          >
            <div className="flex items-center" style={{ padding: "0px 44px 0px 24px", flex: 1 }}>
              {/* Close Button */}
              <button
                onClick={onClose}
                className="hover:opacity-80 transition-opacity"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Title - Centered */}
              <span
                style={{
                  flex: 1,
                  fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontSize: "18px",
                  fontWeight: 600,
                  lineHeight: "1.19em",
                  color: "#FFFFFF",
                  textAlign: "center",
                }}
              >
                Make a trade
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col" style={{ gap: "20px", padding: "0px 24px" }}>
            {/* Buy/Sell Toggle */}
            <div
              className="flex items-stretch"
              style={{
                backgroundColor: "#2B2D30",
                border: "0.5px solid #2B2D30",
                borderRadius: "100px",
                padding: "4px",
              }}
            >
              <button
                onClick={() => setMode("buy")}
                className="flex-1 flex items-center justify-center transition-all"
                style={{
                  backgroundColor: mode === "buy" ? "#FFFFFF" : "transparent",
                  borderRadius: "100px",
                  padding: "12px 16px",
                  borderRight: mode === "buy" ? "0.2px solid #2B2D30" : "none",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: mode === "buy" ? 700 : 500,
                    lineHeight: "1.4em",
                    letterSpacing: "-0.3px",
                    color: mode === "buy" ? "#090A11" : "#FFFFFF",
                  }}
                >
                  Buy
                </span>
              </button>
              <button
                onClick={() => setMode("sell")}
                className="flex-1 flex items-center justify-center transition-all"
                style={{
                  backgroundColor: mode === "sell" ? "#FFFFFF" : "transparent",
                  borderRadius: "100px",
                  padding: "12px 16px",
                  borderRight: mode === "sell" ? "0.2px solid #2B2D30" : "none",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: mode === "sell" ? 700 : 500,
                    lineHeight: "1.4em",
                    letterSpacing: "-0.3px",
                    color: mode === "sell" ? "#090A11" : "#FFFFFF",
                  }}
                >
                  Sell
                </span>
              </button>
            </div>

            {/* Input Fields Section */}
            <div className="flex flex-col" style={{ gap: "16px" }}>
              {/* Amount Input with SOL */}
              <div className="flex flex-col" style={{ gap: "12px" }}>
                <div className="flex flex-col" style={{ gap: "16px" }}>
                  {/* SOL Input Row */}
                  <div
                    className="flex items-center justify-between"
                    style={{
                      backgroundColor: "#131519",
                      border: "0.5px solid #2B2D30",
                      borderRadius: "12px",
                      padding: "14px 10px 14px 12px",
                      height: "48px",
                    }}
                  >
                    {/* Left side - SOL with logo */}
                    <div className="flex items-center" style={{ gap: "32px" }}>
                      <div className="flex items-center" style={{ gap: "6px" }}>
                        {/* Solana Logo */}
                        <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
                          <defs>
                            <linearGradient id="solanaGradient1" x1="0" y1="0" x2="16" y2="14" gradientUnits="userSpaceOnUse">
                              <stop offset="6%" stopColor="#9945FF"/>
                              <stop offset="29%" stopColor="#8752F3"/>
                              <stop offset="50%" stopColor="#5497D5"/>
                              <stop offset="60%" stopColor="#43B4CA"/>
                              <stop offset="73%" stopColor="#28E0B9"/>
                              <stop offset="99%" stopColor="#19FB9B"/>
                            </linearGradient>
                          </defs>
                          <path d="M2.5 10.5L4 9H13.5L12 10.5H2.5Z" fill="url(#solanaGradient1)"/>
                          <path d="M2.5 3.5L4 5H13.5L12 3.5H2.5Z" fill="url(#solanaGradient1)"/>
                          <path d="M2.5 7L4 5.5H13.5L12 7H2.5Z" fill="url(#solanaGradient1)"/>
                        </svg>
                        <span
                          style={{
                            fontFamily: "'Inter Variable', Inter, sans-serif",
                            fontSize: "14px",
                            fontWeight: 500,
                            lineHeight: "1.4em",
                            letterSpacing: "-0.3px",
                            color: "#FFFFFF",
                          }}
                        >
                          SOL
                        </span>
                      </div>
                    </div>

                    {/* Right side - Amount input with cursor */}
                    <div className="flex items-center" style={{ gap: "2px", padding: "0px 2px" }}>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-transparent outline-none text-right"
                        style={{
                          fontFamily: "'Inter Variable', Inter, sans-serif",
                          fontSize: "14px",
                          fontWeight: 500,
                          lineHeight: "1.4em",
                          letterSpacing: "-0.3px",
                          color: "#FFFFFF",
                          width: "100px",
                        }}
                      />
                      {/* Cursor line */}
                      <div
                        style={{
                          width: "1px",
                          height: "11px",
                          backgroundColor: "#40E0D0",
                        }}
                      />
                    </div>

                    {/* Swap Icon */}
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: "28px",
                        height: "28px",
                        backgroundColor: "#2B2D30",
                        borderRadius: "14px",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7.5835 4.6678L9.9168 2.33447L12.2502 4.6678" stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9.9165 2.33447V11.6678" stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6.4167 9.3345L4.0833 11.6678L1.75 9.3345" stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4.0835 11.6678V2.33447" stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* Slippage Input */}
                  <div
                    className="flex items-center justify-between"
                    style={{
                      backgroundColor: "#131519",
                      border: "0.5px solid #2B2D30",
                      borderRadius: "12px",
                      padding: "14px 10px 14px 12px",
                      height: "48px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "14px",
                        fontWeight: 500,
                        lineHeight: "1.4em",
                        letterSpacing: "-0.3px",
                        color: "#B3B5B6",
                      }}
                    >
                      Slippage %
                    </span>
                    <input
                      type="text"
                      value={slippage}
                      onChange={(e) => setSlippage(e.target.value)}
                      placeholder="5"
                      className="bg-transparent outline-none text-right"
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "14px",
                        fontWeight: 500,
                        lineHeight: "1.4em",
                        letterSpacing: "-0.3px",
                        color: "#B3B5B6",
                        width: "50px",
                      }}
                    />
                  </div>
                </div>

                {/* Pay With Section - Only shown in Buy mode */}
                {mode === "buy" && (
                  <div className="flex flex-col items-center" style={{ gap: "8px" }}>
                    <span
                      className="self-start"
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "12px",
                        fontWeight: 500,
                        lineHeight: "1.5em",
                        letterSpacing: "-0.3px",
                        color: "#636466",
                      }}
                    >
                      Pay with
                    </span>
                    <div
                      className="flex items-center justify-between w-full cursor-pointer hover:border-[#3B3D40] transition-colors"
                      style={{
                        backgroundColor: "#131519",
                        border: "0.5px solid #2B2D30",
                        borderRadius: "14px",
                        padding: "14px 12px 14px 16px",
                      }}
                    >
                      <div className="flex items-center" style={{ gap: "10px" }}>
                        {/* Solana Logo Circle */}
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: "linear-gradient(38deg, #9945FF 6%, #8752F3 29%, #5497D5 50%, #43B4CA 60%, #28E0B9 73%, #19FB9B 99%)",
                          }}
                        />
                        <div className="flex flex-col justify-center">
                          <span
                            style={{
                              fontFamily: "'Inter Variable', Inter, sans-serif",
                              fontSize: "14px",
                              fontWeight: 600,
                              lineHeight: "1.4em",
                              letterSpacing: "-0.3px",
                              color: "#FFFFFF",
                            }}
                          >
                            Solana
                          </span>
                          <span
                            style={{
                              fontFamily: "'Inter Variable', Inter, sans-serif",
                              fontSize: "12px",
                              fontWeight: 400,
                              lineHeight: "1.5em",
                              letterSpacing: "-0.3px",
                              color: "#636466",
                            }}
                          >
                            Solana (SOL)
                          </span>
                        </div>
                      </div>
                      {/* Chevron Right */}
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M5.5 3L10.5 8L5.5 13" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Section */}
              <div className="flex flex-col" style={{ gap: "14px", padding: "0px 4px" }}>
                {/* Subtotal */}
                <div className="flex items-center justify-between" style={{ gap: "8px" }}>
                  <span
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 400,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                      color: "#B3B5B6",
                    }}
                  >
                    Subtotal
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 400,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                      color: "#636466",
                    }}
                  >
                    {subtotal.toFixed(8)} SOL
                  </span>
                </div>

                {/* Fee */}
                <div className="flex items-center justify-between" style={{ gap: "8px" }}>
                  <div className="flex items-center" style={{ gap: "4px" }}>
                    <span
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "14px",
                        fontWeight: 400,
                        lineHeight: "1.4em",
                        letterSpacing: "-0.3px",
                        color: "#B3B5B6",
                      }}
                    >
                      Fee
                    </span>
                    {/* Info Icon */}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M6.5625 6.5625L6.58642 6.55083C6.66122 6.51346 6.74516 6.49831 6.8283 6.50717C6.91145 6.51604 6.99031 6.54854 7.05556 6.60083C7.1208 6.65313 7.1697 6.72302 7.19645 6.80224C7.2232 6.88146 7.22669 6.96669 7.2065 7.04783L6.7935 8.70217C6.77317 8.78335 6.77655 8.86866 6.80324 8.94798C6.82993 9.0273 6.87881 9.0973 6.94408 9.14968C7.00935 9.20206 7.08828 9.23461 7.1715 9.24349C7.25471 9.25236 7.33873 9.23718 7.41358 9.19975L7.4375 9.1875M12.25 7C12.25 7.68944 12.1142 8.37213 11.8504 9.00909C11.5865 9.64605 11.1998 10.2248 10.7123 10.7123C10.2248 11.1998 9.64605 11.5865 9.00909 11.8504C8.37213 12.1142 7.68944 12.25 7 12.25C6.31056 12.25 5.62787 12.1142 4.99091 11.8504C4.35395 11.5865 3.7752 11.1998 3.28769 10.7123C2.80018 10.2248 2.41347 9.64605 2.14963 9.00909C1.8858 8.37213 1.75 7.68944 1.75 7C1.75 5.60761 2.30312 4.27226 3.28769 3.28769C4.27226 2.30312 5.60761 1.75 7 1.75C8.39239 1.75 9.72774 2.30312 10.7123 3.28769C11.6969 4.27226 12.25 5.60761 12.25 7ZM7 4.8125H7.00467V4.81717H7V4.8125Z" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 400,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                      color: "#636466",
                    }}
                  >
                    {fee} SOL
                  </span>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between" style={{ gap: "8px" }}>
                  <span
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "16px",
                      fontWeight: 400,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                      color: "#FFFFFF",
                    }}
                  >
                    Total
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "16px",
                      fontWeight: 400,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                      color: "#FFFFFF",
                    }}
                  >
                    {total} SOL
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom - Confirm Button */}
        <div
          className="flex"
          style={{
            padding: "24px",
            borderTop: "0.2px solid #2B2D30",
          }}
        >
          <button
            onClick={handleConfirm}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "#40E0D0",
              borderRadius: "100px",
              padding: "14px 32px",
            }}
          >
            <span
              style={{
                fontFamily: "'Inter Variable', Inter, sans-serif",
                fontSize: "14px",
                fontWeight: 700,
                lineHeight: "1.4em",
                letterSpacing: "-0.3px",
                color: "#090A11",
              }}
            >
              Confirm trade
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
