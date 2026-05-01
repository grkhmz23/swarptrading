"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { apiService, LaunchpadProject } from "@/services/api";
import { useT } from "@/i18n/I18nProvider";
import type { TranslationKeys } from "@/i18n";

// Types for display (transformed from API response)
interface FeaturedProject {
  id: string;
  name: string;
  ticker: string;
  imageUrl: string;
  marketCap: string;
  age: string;
  isMigrated?: boolean;
}

interface LiveProject {
  id: string;
  name: string;
  ticker: string;
  imageUrl: string;
  status: "bonding" | "migrated";
  creator: string;
  creatorAvatar?: string;
  createdAt: string;
  marketCap: string;
  priceChange: number;
  bondingProgress: number;
  description: string;
}

// Filter types
interface FilterState {
  category: string;
  status: string;
  marketCapMin: string;
  marketCapMax: string;
  ageMin: string;
  ageMax: string;
  ageUnit: "hours" | "days" | "weeks";
}

const defaultFilters: FilterState = {
  category: "All",
  status: "All",
  marketCapMin: "",
  marketCapMax: "",
  ageMin: "",
  ageMax: "",
  ageUnit: "hours",
};

const categoryOptions = ["All", "DeFi", "Gaming", "NFT", "Meme", "Infrastructure", "Social"];
const statusOptions = ["All", "Bonding", "Migrated"];
const ageUnitOptions: Array<"hours" | "days" | "weeks"> = ["hours", "days", "weeks"];

// Helper function to format time ago
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Transform API project to Featured display format
const transformToFeaturedProject = (project: LaunchpadProject): FeaturedProject => ({
  id: project.id,
  name: project.name,
  ticker: project.ticker,
  imageUrl: project.imageUrl || "/figma-assets/launchpad/featured-1.png",
  marketCap: project.marketCapFormatted || `$${(project.marketCap / 1000000).toFixed(1)}M`,
  age: formatTimeAgo(project.createdAt),
  isMigrated: project.status === "migrated",
});

// Transform API project to Live display format
const transformToLiveProject = (project: LaunchpadProject, noDescText: string = "No description available"): LiveProject => {
  // Handle creator - can be string or object {id, username, profilePicture}
  let creatorName = "Anonymous";
  let creatorAvatar: string | undefined;

  if (project.creator) {
    if (typeof project.creator === "object" && project.creator !== null) {
      creatorName = (project.creator as { username?: string }).username || "Anonymous";
      creatorAvatar = (project.creator as { profilePicture?: string }).profilePicture;
    } else if (typeof project.creator === "string") {
      creatorName = project.creator;
    }
  }

  return {
    id: project.id,
    name: project.name,
    ticker: project.ticker,
    imageUrl: project.imageUrl || "/figma-assets/launchpad/project-1.png",
    status: project.status,
    creator: creatorName,
    creatorAvatar: creatorAvatar || project.creatorAvatar,
    createdAt: formatTimeAgo(project.createdAt),
    marketCap: project.marketCapFormatted || `$${(project.marketCap / 1000).toFixed(1)}K`,
    priceChange: typeof project.priceChange24h === 'string' ? parseFloat(project.priceChange24h) || 0 : (project.priceChange24h || 0),
    bondingProgress: project.bondingProgress || 0,
    description: project.description || noDescText,
  };
};

// Navigate to token detail
const navigateToTokenDetail = (projectId: string) => {
  const event = new CustomEvent("launchpad-token-detail", {
    detail: projectId,
  });
  window.dispatchEvent(event);
};

// Featured Card Component
const FeaturedCard: React.FC<{ project: FeaturedProject; t: TranslationKeys }> = ({ project, t }) => {
  return (
    <div
      className="relative min-w-[280px] h-[180px] rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group"
      onClick={() => navigateToTokenDetail(project.id)}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${project.imageUrl})`,
          backgroundColor: '#1A1B23'
        }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 !p-4">
        <div className="flex items-center justify-between !mb-2">
          <div>
            <h3 className="text-white text-xl font-bold">{project.name}</h3>
            <p className="text-[#F5F5F5] text-xs">{project.ticker}</p>
          </div>
          {project.isMigrated && (
            <span className="!px-2 !py-1 bg-[#40E0D0]/20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
              {t.launchpad?.home?.migrated || "Migrated"}
            </span>
          )}
        </div>

        <div className="flex items-center !gap-6">
          <div>
            <p className="text-[#F5F5F5] text-xs">{t.launchpad?.home?.mc || "MC"}</p>
            <p className="text-white text-sm font-bold">{project.marketCap}</p>
          </div>
          <div>
            <p className="text-[#F5F5F5] text-xs">{t.launchpad?.home?.age || "Age"}</p>
            <p className="text-white text-sm font-bold">{project.age}</p>
          </div>
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

// Live Project Card Component
const LiveProjectCard: React.FC<{ project: LiveProject; t: TranslationKeys }> = ({ project, t }) => {
  const isPositive = project.priceChange >= 0;

  return (
    <div
      className="flex !gap-3 cursor-pointer transition-colors"
      onClick={() => navigateToTokenDetail(project.id)}
    >
      {/* Image - Left Side */}
      <div
        className="w-[140px] h-[140px] lg:w-[160px] lg:h-[160px] xl:w-[180px] xl:h-[180px] bg-cover bg-center rounded-xl flex-shrink-0"
        style={{
          backgroundImage: `url(${project.imageUrl})`,
          backgroundColor: '#1A1B23'
        }}
      />

      {/* Content - Right Side */}
      <div className="flex-1 min-w-0 !py-1">
        {/* Header */}
        <div className="flex items-start justify-between !mb-2">
          <div>
            <h3 className="text-white text-base font-semibold">{project.name}</h3>
            <p className="text-[#B3B5B6] text-sm">{project.ticker}</p>
          </div>
          <span
            className={`!px-2 !py-0.5 rounded-full text-[10px] font-medium ${
              project.status === "bonding"
                ? "bg-[#FFB800]/10 text-[#FFB800]"
                : "bg-[#00C853]/10 text-[#00C853]"
            }`}
          >
            {project.status === "bonding" ? (t.launchpad?.home?.bonding || "Bonding") : (t.launchpad?.home?.migrated || "Migrated")}
          </span>
        </div>

        {/* Creator Info */}
        <div className="flex items-center justify-between !mb-3">
          <div className="flex items-center !gap-1.5">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
            <span className="text-[#9B9DA0] text-xs">{project.creator}</span>
          </div>
          <span className="text-[#9B9DA0] text-xs">{project.createdAt}</span>
        </div>

        {/* Stats with Progress Bar */}
        <div className="flex items-center !gap-2 !mb-3">
          <div className="flex items-center !gap-1">
            <span className="text-[#B3B5B6] text-xs">{t.launchpad?.home?.mc || "MC"}</span>
            <span className="text-white text-xs font-medium">{project.marketCap}</span>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 h-1.5 bg-[#2B2D30] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(Math.abs(project.priceChange) * 2, 100)}%`,
                background: isPositive
                  ? 'linear-gradient(90deg, #00C853 0%, #40E0D0 100%)'
                  : 'linear-gradient(90deg, #FF5252 0%, #FF8A80 100%)'
              }}
            />
          </div>

          {/* Price Change */}
          <div className="flex items-center !gap-0.5">
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className={isPositive ? "" : "rotate-180"}
            >
              <path
                d="M5 2L8 6H2L5 2Z"
                fill={isPositive ? "#00C853" : "#FF5252"}
              />
            </svg>
            <span
              className={`text-xs font-medium ${
                isPositive ? "text-[#00C853]" : "text-[#FF5252]"
              }`}
            >
              {Math.abs(project.priceChange).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-[#B3B5B6] text-xs line-clamp-2">
          {project.description}
        </p>
      </div>
    </div>
  );
};

export default function LaunchpadHome() {
  const t = useT();
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredProjects, setFeaturedProjects] = useState<FeaturedProject[]>([]);
  const [liveProjects, setLiveProjects] = useState<LiveProject[]>([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [tempFilters, setTempFilters] = useState<FilterState>(defaultFilters);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Fetch featured projects
  const fetchFeaturedProjects = useCallback(async () => {
    setIsLoadingFeatured(true);
    try {
      const response = await apiService.getLaunchpadFeaturedProjects();
      const projects = response?.projects || [];
      const transformed = projects.map(transformToFeaturedProject);
      setFeaturedProjects(transformed);
    } catch (err) {
      console.error("Failed to fetch featured projects:", err);
      setError("Failed to load featured projects");
    } finally {
      setIsLoadingFeatured(false);
    }
  }, []);

  // Fetch live projects
  const fetchLiveProjects = useCallback(async (search?: string) => {
    setIsLoadingLive(true);
    try {
      const response = await apiService.getLaunchpadLiveProjects({
        search,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      const projects = response?.projects || [];
      const noDescText = t.launchpad?.home?.noDescription || "No description available";
      const transformed = projects.map((p) => transformToLiveProject(p, noDescText));
      setLiveProjects(transformed);
    } catch (err) {
      console.error("Failed to fetch live projects:", err);
      setError("Failed to load live projects");
    } finally {
      setIsLoadingLive(false);
    }
  }, [t]);

  // Initial fetch on mount
  useEffect(() => {
    fetchFeaturedProjects();
    fetchLiveProjects();
  }, [fetchFeaturedProjects, fetchLiveProjects]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        fetchLiveProjects(searchQuery);
      } else {
        fetchLiveProjects();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, fetchLiveProjects]);

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Filter modal handlers
  const handleOpenFilterModal = () => {
    setTempFilters(filters);
    setShowFilterModal(true);
    setOpenDropdown(null);
  };

  const handleCloseFilterModal = () => {
    setShowFilterModal(false);
    setOpenDropdown(null);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterModal(false);
    setOpenDropdown(null);
  };

  const handleResetFilters = () => {
    setTempFilters(defaultFilters);
  };

  const handleDropdownToggle = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  // Filter projects based on search and filters
  const filteredProjects = liveProjects.filter((project: LiveProject) => {
    // Search filter
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.ticker.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus =
      filters.status === "All" ||
      project.status.toLowerCase() === filters.status.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="!p-6">
      {/* Featured Section */}
      <div className="!mb-8">
        <div className="flex items-center justify-between !mb-4">
          <h2 className="text-white text-lg font-semibold">{t.launchpad?.home?.featured || "Featured"}</h2>
          <div className="flex items-center !gap-2">
            <button
              onClick={() => scrollCarousel("left")}
              className="w-8 h-8 cursor-pointer rounded-full bg-[#1A1B23] flex items-center justify-center hover:bg-[#2B2D30] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="#B3B5B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={() => scrollCarousel("right")}
              className="w-8 h-8 cursor-pointer rounded-full bg-[#1A1B23] flex items-center justify-center hover:bg-[#2B2D30] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="#B3B5B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={carouselRef}
          className="flex !gap-4 overflow-x-auto scrollbar-hide !pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isLoadingFeatured ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="min-w-[280px] h-[180px] rounded-xl bg-[#1A1B23] animate-pulse flex-shrink-0"
              />
            ))
          ) : featuredProjects.length > 0 ? (
            featuredProjects.map((project) => (
              <FeaturedCard key={project.id} project={project} t={t} />
            ))
          ) : (
            <div className="min-w-[280px] h-[180px] rounded-xl bg-[#1A1B23] flex items-center justify-center">
              <p className="text-[#636466] text-sm">{t.launchpad?.home?.noFeaturedProjects || "No featured projects"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Live Projects Section */}
      <div>
        <div className="flex items-center justify-between !mb-4">
          <h2 className="text-white text-lg font-semibold">{t.launchpad?.home?.liveProjects || "Live projects"}</h2>

          <div className="flex items-center !gap-3">
            {/* Search Input */}
            <div className="flex items-center !gap-2 !px-3 !py-2 bg-[#131519] border border-[#2B2D30] rounded-full">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="#636466" strokeWidth="2"/>
                <path d="M21 21L16.65 16.65" stroke="#636466" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div className="w-px h-4 " />
              <input
                type="text"
                placeholder={t.launchpad?.home?.search || "Search"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-white text-sm placeholder-[#636466] outline-none w-20"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={handleOpenFilterModal}
              className={`w-10 h-10 rounded-full border cursor-pointer flex items-center justify-center transition-colors ${
                filters.status !== "All" || filters.category !== "All" || filters.marketCapMin || filters.marketCapMax || filters.ageMin || filters.ageMax
                  ? "bg-[#40E0D0]/10 border-[#40E0D0]/30"
                  : "bg-[#1A1B23] border-[#2B2D30] hover:bg-[#2B2D30]"
              }`}
            >
              <Image
                src="/figma-assets/launchpad/filter.svg"
                alt="Filter"
                width={40}
                height={40}
              />
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center !py-8 !mb-4">
            <p className="text-[#FF5252] text-sm !mb-2">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchFeaturedProjects();
                fetchLiveProjects();
              }}
              className="!px-4 !py-2 bg-[#40E0D0] text-[#090A11] rounded-full text-sm font-medium hover:bg-[#40E0D0]/90"
            >
              {t.launchpad?.home?.tryAgain || "Try Again"}
            </button>
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 !gap-4">
          {isLoadingLive ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex !gap-3">
                <div className="w-[140px] h-[140px] lg:w-[160px] lg:h-[160px] xl:w-[180px] xl:h-[180px] rounded-xl bg-[#1A1B23] animate-pulse flex-shrink-0" />
                <div className="flex-1 !py-1">
                  <div className="h-5 w-24 bg-[#1A1B23] rounded animate-pulse !mb-2" />
                  <div className="h-4 w-16 bg-[#1A1B23] rounded animate-pulse !mb-3" />
                  <div className="h-3 w-full bg-[#1A1B23] rounded animate-pulse !mb-2" />
                  <div className="h-3 w-3/4 bg-[#1A1B23] rounded animate-pulse" />
                </div>
              </div>
            ))
          ) : (
            filteredProjects.map((project) => (
              <LiveProjectCard key={project.id} project={project} t={t} />
            ))
          )}
        </div>

        {!isLoadingLive && filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center !py-12">
            <p className="text-[#636466] text-sm">{t.launchpad?.home?.noProjectsFound || "No projects found"}</p>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseFilterModal}
          />

          {/* Modal - 435px width, 620px height from Figma */}
          <div
            className="relative flex flex-col justify-between bg-[#131519] rounded-xl w-[435px] h-[620px]"
            style={{
              boxShadow: "-12px -12px 64px 0px rgba(0, 0, 0, 0.24), 12px 12px 64px 0px rgba(0, 0, 0, 0.24)",
            }}
          >
            {/* Content Container */}
            <div className="flex flex-col !gap-8 h-[524px]">
              {/* Header - 24px padding vertical, border bottom */}
              <div
                className="flex items-center !gap-8 !py-6"
                style={{ borderBottom: "0.2px solid #2B2D30" }}
              >
                <div className="flex items-center !px-6 !pr-11 flex-1">
                  {/* Close Icon */}
                  <button
                    onClick={handleCloseFilterModal}
                    className="w-5 h-5 flex items-center justify-center cursor-pointer  hover:opacity-70 transition-opacity"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M15 5L5 15M5 5L15 15" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {/* Title - H5/Semibold: SF Pro Display 18px semibold */}
                  <h2
                    className="flex-1 text-center text-white"
                    style={{
                      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontSize: "18px",
                      fontWeight: 600,
                      lineHeight: "1.19em",
                    }}
                  >
                    {t.launchpad?.home?.filters?.title || "Filters"}
                  </h2>
                </div>
              </div>

              {/* Filter Fields - 24px horizontal padding, 16px gap */}
              <div className="flex flex-col !gap-4 !px-6">
                {/* Category Dropdown */}
                <div className="flex flex-col !gap-2.5">
                  <label
                    className="text-white"
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 400,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                    }}
                  >
                    {t.launchpad?.home?.filters?.category || "Category"}
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => handleDropdownToggle("category")}
                      className="flex items-center justify-between w-[387px] !px-3 !py-3.5 bg-[#131519] border border-[#2B2D30] rounded-xl hover:border-[#3B3D40] transition-colors"
                      style={{ borderWidth: "0.5px" }}
                    >
                      <span
                        className="text-white"
                        style={{
                          fontFamily: "'Inter Variable', Inter, sans-serif",
                          fontSize: "14px",
                          fontWeight: 400,
                          lineHeight: "1.4em",
                          letterSpacing: "-0.3px",
                        }}
                      >
                        {tempFilters.category}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6L8 10L12 6" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {openDropdown === "category" && (
                      <div className="absolute top-full left-0 right-0 !mt-1 bg-[#131519] border border-[#2B2D30] rounded-xl overflow-hidden z-10 max-h-[200px] overflow-y-auto">
                        {categoryOptions.map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              setTempFilters({ ...tempFilters, category: option });
                              setOpenDropdown(null);
                            }}
                            className={`w-full !px-3 !py-2.5 text-left hover:bg-[#2B2D30] transition-colors ${
                              tempFilters.category === option ? "bg-[#2B2D30]" : ""
                            }`}
                            style={{
                              fontFamily: "'Inter Variable', Inter, sans-serif",
                              fontSize: "14px",
                              fontWeight: 400,
                              lineHeight: "1.4em",
                              letterSpacing: "-0.3px",
                              color: "#FFFFFF",
                            }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="flex flex-col !gap-2.5">
                  <label
                    className="text-white"
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 400,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                    }}
                  >
                    {t.launchpad?.home?.filters?.status || "Status"}
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => handleDropdownToggle("status")}
                      className="flex items-center justify-between w-[387px] !px-3 !py-3.5 bg-[#131519] border border-[#2B2D30] rounded-xl hover:border-[#3B3D40] transition-colors"
                      style={{ borderWidth: "0.5px" }}
                    >
                      <span
                        className="text-white"
                        style={{
                          fontFamily: "'Inter Variable', Inter, sans-serif",
                          fontSize: "14px",
                          fontWeight: 400,
                          lineHeight: "1.4em",
                          letterSpacing: "-0.3px",
                        }}
                      >
                        {tempFilters.status}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6L8 10L12 6" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {openDropdown === "status" && (
                      <div className="absolute top-full left-0 right-0 !mt-1 bg-[#131519] border border-[#2B2D30] rounded-xl overflow-hidden z-10">
                        {statusOptions.map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              setTempFilters({ ...tempFilters, status: option });
                              setOpenDropdown(null);
                            }}
                            className={`w-full !px-3 !py-2.5 text-left hover:bg-[#2B2D30] transition-colors ${
                              tempFilters.status === option ? "bg-[#2B2D30]" : ""
                            }`}
                            style={{
                              fontFamily: "'Inter Variable', Inter, sans-serif",
                              fontSize: "14px",
                              fontWeight: 400,
                              lineHeight: "1.4em",
                              letterSpacing: "-0.3px",
                              color: "#FFFFFF",
                            }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Market Cap Range */}
                <div className="flex flex-col !gap-2.5">
                  <label
                    className="text-white"
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 400,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                    }}
                  >
                    {t.launchpad?.home?.filters?.marketCap || "Market cap"}
                  </label>
                  <div className="flex !gap-3">
                    {/* Min Input */}
                    <div
                      className="flex items-center justify-between flex-1 !px-3 !py-3.5 bg-[#131519] border border-[#2B2D30] rounded-xl"
                      style={{ borderWidth: "0.5px" }}
                    >
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
                        {t.launchpad?.home?.filters?.min || "Min"}
                      </span>
                      <div className="flex items-center !gap-1">
                        <span
                          style={{
                            fontFamily: "'Inter Variable', Inter, sans-serif",
                            fontSize: "14px",
                            fontWeight: 400,
                            lineHeight: "1.4em",
                            letterSpacing: "-0.3px",
                            color: "#FFFFFF",
                          }}
                        >
                          $
                        </span>
                        <input
                          type="text"
                          value={tempFilters.marketCapMin}
                          onChange={(e) =>
                            setTempFilters({ ...tempFilters, marketCapMin: e.target.value })
                          }
                          placeholder=""
                          className="w-16 bg-transparent text-white text-right outline-none"
                          style={{
                            fontFamily: "'Inter Variable', Inter, sans-serif",
                            fontSize: "14px",
                            fontWeight: 400,
                            lineHeight: "1.4em",
                            letterSpacing: "-0.3px",
                          }}
                        />
                      </div>
                    </div>
                    {/* Max Input */}
                    <div
                      className="flex items-center justify-between flex-1 !px-3 !py-3.5 bg-[#131519] border border-[#2B2D30] rounded-xl"
                      style={{ borderWidth: "0.5px" }}
                    >
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
                        {t.launchpad?.home?.filters?.max || "Max"}
                      </span>
                      <div className="flex items-center !gap-1">
                        <span
                          style={{
                            fontFamily: "'Inter Variable', Inter, sans-serif",
                            fontSize: "14px",
                            fontWeight: 400,
                            lineHeight: "1.4em",
                            letterSpacing: "-0.3px",
                            color: "#FFFFFF",
                          }}
                        >
                          $
                        </span>
                        <input
                          type="text"
                          value={tempFilters.marketCapMax}
                          onChange={(e) =>
                            setTempFilters({ ...tempFilters, marketCapMax: e.target.value })
                          }
                          placeholder=""
                          className="w-16 bg-transparent text-white text-right outline-none"
                          style={{
                            fontFamily: "'Inter Variable', Inter, sans-serif",
                            fontSize: "14px",
                            fontWeight: 400,
                            lineHeight: "1.4em",
                            letterSpacing: "-0.3px",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Age Range */}
                <div className="flex flex-col !gap-2.5">
                  <label
                    className="text-white"
                    style={{
                      fontFamily: "'Inter Variable', Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 400,
                      lineHeight: "1.4em",
                      letterSpacing: "-0.3px",
                    }}
                  >
                    {t.launchpad?.home?.filters?.age || "Age"}
                  </label>
                  <div className="flex !gap-3">
                    {/* Min Input with Unit Dropdown */}
                    <div
                      className="flex items-center justify-between flex-1 !px-3 !py-3.5 bg-[#131519] border border-[#2B2D30] rounded-xl"
                      style={{ borderWidth: "0.5px" }}
                    >
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
                        {t.launchpad?.home?.filters?.min || "Min"}
                      </span>
                      <div className="flex items-center !gap-1.5">
                        <input
                          type="text"
                          value={tempFilters.ageMin}
                          onChange={(e) =>
                            setTempFilters({ ...tempFilters, ageMin: e.target.value })
                          }
                          placeholder=""
                          className="w-8 bg-transparent text-white text-right outline-none"
                          style={{
                            fontFamily: "'Inter Variable', Inter, sans-serif",
                            fontSize: "14px",
                            fontWeight: 400,
                            lineHeight: "1.4em",
                            letterSpacing: "-0.3px",
                          }}
                        />
                        <div className="relative">
                          <button
                            onClick={() => handleDropdownToggle("ageUnitMin")}
                            className="flex items-center !gap-1.5"
                          >
                            <span
                              style={{
                                fontFamily: "'Inter Variable', Inter, sans-serif",
                                fontSize: "14px",
                                fontWeight: 400,
                                lineHeight: "1.4em",
                                letterSpacing: "-0.3px",
                                color: "#FFFFFF",
                              }}
                            >
                              {tempFilters.ageUnit}
                            </span>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          {openDropdown === "ageUnitMin" && (
                            <div className="absolute top-full right-0 !mt-1 bg-[#131519] border border-[#2B2D30] rounded-xl overflow-hidden z-10 min-w-[80px]">
                              {ageUnitOptions.map((option) => (
                                <button
                                  key={option}
                                  onClick={() => {
                                    setTempFilters({ ...tempFilters, ageUnit: option });
                                    setOpenDropdown(null);
                                  }}
                                  className={`w-full !px-3 !py-2 text-left hover:bg-[#2B2D30] transition-colors ${
                                    tempFilters.ageUnit === option ? "bg-[#2B2D30]" : ""
                                  }`}
                                  style={{
                                    fontFamily: "'Inter Variable', Inter, sans-serif",
                                    fontSize: "14px",
                                    fontWeight: 400,
                                    lineHeight: "1.4em",
                                    letterSpacing: "-0.3px",
                                    color: "#FFFFFF",
                                  }}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Max Input with Unit Dropdown */}
                    <div
                      className="flex items-center justify-between flex-1 !px-3 !py-3.5 bg-[#131519] border border-[#2B2D30] rounded-xl"
                      style={{ borderWidth: "0.5px" }}
                    >
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
                        {t.launchpad?.home?.filters?.max || "Max"}
                      </span>
                      <div className="flex items-center !gap-1.5">
                        <input
                          type="text"
                          value={tempFilters.ageMax}
                          onChange={(e) =>
                            setTempFilters({ ...tempFilters, ageMax: e.target.value })
                          }
                          placeholder=""
                          className="w-8 bg-transparent text-white text-right outline-none"
                          style={{
                            fontFamily: "'Inter Variable', Inter, sans-serif",
                            fontSize: "14px",
                            fontWeight: 400,
                            lineHeight: "1.4em",
                            letterSpacing: "-0.3px",
                          }}
                        />
                        <div className="relative">
                          <button
                            onClick={() => handleDropdownToggle("ageUnitMax")}
                            className="flex items-center !gap-1.5"
                          >
                            <span
                              style={{
                                fontFamily: "'Inter Variable', Inter, sans-serif",
                                fontSize: "14px",
                                fontWeight: 400,
                                lineHeight: "1.4em",
                                letterSpacing: "-0.3px",
                                color: "#FFFFFF",
                              }}
                            >
                              {tempFilters.ageUnit}
                            </span>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          {openDropdown === "ageUnitMax" && (
                            <div className="absolute top-full right-0 !mt-1 bg-[#131519] border border-[#2B2D30] rounded-xl overflow-hidden z-10 min-w-[80px]">
                              {ageUnitOptions.map((option) => (
                                <button
                                  key={option}
                                  onClick={() => {
                                    setTempFilters({ ...tempFilters, ageUnit: option });
                                    setOpenDropdown(null);
                                  }}
                                  className={`w-full !px-3 !py-2 text-left hover:bg-[#2B2D30] transition-colors ${
                                    tempFilters.ageUnit === option ? "bg-[#2B2D30]" : ""
                                  }`}
                                  style={{
                                    fontFamily: "'Inter Variable', Inter, sans-serif",
                                    fontSize: "14px",
                                    fontWeight: 400,
                                    lineHeight: "1.4em",
                                    letterSpacing: "-0.3px",
                                    color: "#FFFFFF",
                                  }}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - 24px padding, border top */}
            <div
              className="flex items-center justify-between !px-6 !py-6"
              style={{ borderTop: "0.2px solid #2B2D30" }}
            >
              {/* Reset Button */}
              <button
                onClick={handleResetFilters}
                className="flex items-center cursor-pointer !gap-1.5 hover:opacity-70 transition-opacity"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0_reset)">
                    <path d="M16.6666 9.16665C16.4628 7.70016 15.7825 6.34136 14.7305 5.29956C13.6784 4.25776 12.313 3.59074 10.8446 3.40127C9.37624 3.2118 7.88627 3.51038 6.60425 4.25102C5.32224 4.99165 4.31929 6.13326 3.74992 7.49998M3.33325 4.16665V7.49998H6.66659" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3.33325 10.8333C3.53705 12.2998 4.21736 13.6586 5.26939 14.7004C6.32141 15.7422 7.68679 16.4092 9.15519 16.5987C10.6236 16.7882 12.1136 16.4896 13.3956 15.7489C14.6776 15.0083 15.6805 13.8667 16.2499 12.5M16.6666 15.8333V12.5H13.3333" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </g>
                  <defs>
                    <clipPath id="clip0_reset">
                      <rect width="20" height="20" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
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
                  {t.launchpad?.home?.filters?.reset || "Reset"}
                </span>
              </button>

              {/* Apply Button - Primary/Main: #40E0D0 */}
              <button
                onClick={handleApplyFilters}
                className="flex items-center justify-center cursor-pointer !px-8 !py-3.5 rounded-full transition-colors hover:opacity-90"
                style={{
                  width: "125px",
                  backgroundColor: "#40E0D0",
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
                  {t.launchpad?.home?.filters?.apply || "Apply"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
