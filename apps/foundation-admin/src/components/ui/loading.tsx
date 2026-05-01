import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8", 
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  className,
}) => {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-gray-300 border-t-2",
        sizeClasses[size],
        className
      )}
      style={{ borderTopColor: "var(--brand-primary)" }}
      data-testid="loading-spinner"
    />
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  spinnerSize?: "sm" | "md" | "lg" | "xl";
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  className,
  spinnerSize = "lg",
}) => {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="flex flex-col items-center space-y-3">
            <LoadingSpinner size={spinnerSize} />
            <p className="text-sm font-medium" style={{ color: "var(--text-medium)" }}>
              Loading...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

interface LoadingPageProps {
  message?: string;
  className?: string;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({
  message = "Loading...",
  className,
}) => {
  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center",
        className
      )}
      style={{ backgroundColor: "var(--bg-light-gray)" }}
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            <span className="text-white text-lg">📦</span>
          </div>
          <span
            className="text-xl font-semibold"
            style={{ color: "var(--text-dark)" }}
          >
            Swarp Foundation Admin
          </span>
        </div>
        <LoadingSpinner size="lg" />
        <p
          className="text-base font-medium"
          style={{ color: "var(--text-medium)" }}
        >
          {message}
        </p>
      </div>
    </div>
  );
};

interface LoadingCardProps {
  className?: string;
  lines?: number;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  className,
  lines = 3,
}) => {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index}>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            {index < lines - 1 && <div className="h-4 bg-gray-100 rounded w-1/2 mt-2"></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const LoadingTable: React.FC<LoadingTableProps> = ({
  rows = 5,
  columns = 4,
  className,
}) => {
  return (
    <div className={cn("animate-pulse", className)}>
      {/* Table Header */}
      <div className="flex space-x-4 mb-4 p-4 bg-gray-50 rounded-t-lg">
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="flex-1">
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
      
      {/* Table Rows */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-4 p-4 border-b border-gray-100">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="flex-1">
                <div className="h-3 bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  [key: string]: unknown;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  children,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      className={cn("relative flex items-center justify-center", className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <LoadingSpinner size="sm" className="mr-2" />
      )}
      {children}
    </button>
  );
};