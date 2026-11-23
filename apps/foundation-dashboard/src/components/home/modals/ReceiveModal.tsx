'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import Immage from 'next/image';
import { useT } from '@/i18n/I18nProvider';
import { IS_MAINNET, NETWORK_LABEL } from '@/config/env';

interface ReceiveModalProps {
  walletAddress: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  walletAddress,
  isOpen,
  onClose,
}) => {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');

  // Generate QR code when wallet address changes
  useEffect(() => {
    const generateQRCode = async () => {
      if (!walletAddress) return;
      
      try {
        // Generate beautiful Solana-styled QR code matching Figma design
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // High resolution canvas for crisp output
        const size = 600;
        canvas.width = size;
        canvas.height = size;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        // Generate QR code matrix data
        const QRCodeLib = (await import('qrcode')).default;
        const qrMatrix = QRCodeLib.create(walletAddress, { errorCorrectionLevel: 'H' });
        const modules = qrMatrix.modules;
        const moduleCount = modules.size;
        const qrSize = 550; // Much larger QR area, only 25px padding on each side
        const moduleSize = qrSize / moduleCount;
        const offsetX = (size - qrSize) / 2;
        const offsetY = (size - qrSize) / 2;

        const createGradient = (x: number, y: number, radius: number) => {
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          // Blue to purple gradient like Figma
          gradient.addColorStop(0, '#4F46E5'); // Indigo
          gradient.addColorStop(0.5, '#7C3AED'); // Purple
          gradient.addColorStop(1, '#3B82F6'); // Blue
          return gradient;
        };

        // Draw QR modules as colorful circles
        for (let row = 0; row < moduleCount; row++) {
          for (let col = 0; col < moduleCount; col++) {
            if (modules.get(row, col)) {
              const x = offsetX + col * moduleSize + moduleSize / 2;
              const y = offsetY + row * moduleSize + moduleSize / 2;
              const radius = moduleSize * 0.4;

              // Skip center area for logo
              const centerX = size / 2;
              const centerY = size / 2;
              const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
              
              if (distanceFromCenter > 60) { // Don't draw dots too close to center
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI);
                ctx.fillStyle = createGradient(x, y, radius);
                ctx.fill();
              }
            }
          }
        }

        // Draw corner detection squares (keep them black for scanning)
        const drawCornerSquare = (x: number, y: number) => {
          const squareSize = moduleSize * 7;
          ctx.fillStyle = '#000000';
          ctx.fillRect(x, y, squareSize, squareSize);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x + moduleSize, y + moduleSize, squareSize - 2 * moduleSize, squareSize - 2 * moduleSize);
          ctx.fillStyle = '#000000';
          ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, squareSize - 4 * moduleSize, squareSize - 4 * moduleSize);
        };

        drawCornerSquare(offsetX, offsetY); // Top-left
        drawCornerSquare(offsetX + (moduleCount - 7) * moduleSize, offsetY); // Top-right  
        drawCornerSquare(offsetX, offsetY + (moduleCount - 7) * moduleSize); // Bottom-left

        // Load and draw sollet-icon.svg in center (no background)
        const logoImg = new Image();
        logoImg.onload = () => {
          const iconSize = 60; // Icon size
          const iconX = (size - iconSize) / 2;
          const iconY = (size - iconSize) / 2;
          ctx.drawImage(logoImg, iconX, iconY, iconSize, iconSize);
          
          // Convert to final image after logo is loaded
          const finalDataURL = canvas.toDataURL('image/png');
          setQrCodeDataURL(finalDataURL);
        };
        
        logoImg.onerror = () => {
          // If SVG fails to load, just complete without logo
          const finalDataURL = canvas.toDataURL('image/png');
          setQrCodeDataURL(finalDataURL);
        };
        
        logoImg.src = '/sollet-icon.svg';
      } catch (error) {
        console.error('Error generating custom QR code:', error);
        // Fallback to standard QR generation
        try {
          const fallbackQR = await QRCode.toDataURL(walletAddress, {
            width: 400,
            margin: 4,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H'
          });
          setQrCodeDataURL(fallbackQR);
        } catch (fallbackError) {
          console.error('Fallback QR generation failed:', fallbackError);
        }
      }
    };

    generateQRCode();
  }, [walletAddress]);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 !p-4 overflow-y-auto">
      <div className="bg-[#1A1B23] rounded-3xl !p-6 w-full max-w-sm my-auto min-h-fit max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between !mb-6">
          <h2 className="text-xl font-bold text-white">{t.modals?.receive?.title || "Receive SOL"}</h2>
          <button
            onClick={onClose}
            className="!p-2 text-[#636466] hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className={`rounded-xl !px-4 !py-3 !mb-4 text-sm ${IS_MAINNET ? 'bg-[#40E0D0]/10 text-[#40E0D0]' : 'bg-yellow-500/10 text-yellow-300'}`} role="note">
          {IS_MAINNET
            ? 'Only send Solana (SOL or SPL tokens) on Solana mainnet to this address.'
            : `This wallet runs on Solana ${NETWORK_LABEL}. Funds sent from mainnet will not appear here.`}
        </div>

        {/* QR Code */}
        <div className="bg-[#090A11] flex flex-col justify-center items-center rounded-2xl !p-6 !mb-6 text-center">
          <div className="w-48 h-48 bg-white rounded-xl mx-auto !mb-4 flex items-center justify-center !p-4">
            {qrCodeDataURL ? (
             <Immage
      src={qrCodeDataURL}
      alt="Wallet Address QR Code"
      width={192}
      height={192}
      className="w-full h-full object-contain rounded-xl"
      unoptimized
    />
            ) : (
              <div className="text-black text-xs font-mono break-all !p-2 flex items-center justify-center">
                {t.modals?.receive?.generatingQR || "Generating QR Code..."}
              </div>
            )}
          </div>
          <p className="text-[#636466] text-sm">
            {t.modals?.receive?.scanQRCode || "Scan this QR code to send SOL to this wallet"}
          </p>
        </div>

        {/* Wallet Address */}
        <div className="bg-[#090A11] rounded-2xl !p-4 !mb-6">
          <div className="flex items-center justify-between !mb-2">
            <p className="text-white text-sm font-medium">{t.modals?.receive?.yourWalletAddress || "Your Wallet Address"}</p>
            <button
              onClick={handleCopyAddress}
              className="!p-1 text-[#40E0D0] hover:text-[#40E0D0]/80 transition-colors"
            >
              {copied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
          <p className="text-[#636466] text-xs font-mono break-all leading-relaxed">
            {walletAddress}
          </p>
          {copied && (
            <p className="text-green-400 text-xs !mt-2">{t.modals?.receive?.addressCopied || "Address copied to clipboard!"}</p>
          )}
        </div>

        {/* Instructions */}
        <div className="!space-y-3">
          <div className="flex items-start gap-3 !space-x-3">
            <div className="w-6 h-6 bg-[#40E0D0] rounded-full flex items-center justify-center flex-shrink-0 !mt-0.5">
              <span className="text-black text-xs font-bold">1</span>
            </div>
            <p className="text-[#636466] text-sm !mt-1">
              {t.modals?.receive?.step1 || "Share this address with the sender"}
            </p>
          </div>
          <div className="flex items-start gap-3 !space-x-3">
            <div className="w-6 h-6 bg-[#40E0D0] rounded-full flex items-center justify-center flex-shrink-0 !mt-0.5">
              <span className="text-black text-xs font-bold">2</span>
            </div>
            <p className="text-[#636466] text-sm mt-1">
              {t.modals?.receive?.step2 || "Or they can scan the QR code above"}
            </p>
          </div>
          <div className="flex items-start gap-3 !space-x-3">
            <div className="w-6 h-6 bg-[#40E0D0] rounded-full flex items-center justify-center flex-shrink-0 !mt-0.5">
              <span className="text-black text-xs font-bold">3</span>
            </div>
            <p className="text-[#636466] text-sm mt-1">
              {t.modals?.receive?.step3 || "SOL will appear in your wallet once confirmed"}
            </p>
          </div>
        </div>

        {/* Note */}
        <div className="!mt-6 !p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
          <p className="text-orange-400 text-xs">
            <strong>Note:</strong> {t.modals?.receive?.note || "Please send here only tokens that are tradable on Swarp. Make sure the token is listed in Swarp before sending. Unsupported tokens may be lost."}
          </p>
        </div>
      </div>
    </div>
  );
};