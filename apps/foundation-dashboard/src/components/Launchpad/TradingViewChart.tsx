"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  Time,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  CandlestickData,
  HistogramData,
  LineStyle,
} from "lightweight-charts";
import { tradesToOHLC, type ChartTrade, type Timeframe } from "@/lib/ohlc";

// Types for trade data

// Props for the chart component
interface TradingViewChartProps {
  trades: ChartTrade[];
  currentPrice?: number;
  tokenSymbol?: string;
  height?: number;
  timeframe?: Timeframe;
  onTimeframeChange?: (tf: Timeframe) => void;
}

// Colors matching Figma design exactly
const colors = {
  // Background colors
  background: "#090A11",        // Neutral/600

  // Text colors
  textPrimary: "#FFFFFF",       // White
  textSecondary: "#B3B5B6",     // Neutral/100
  textMuted: "#636466",         // Neutral/200

  // Border/Grid
  border: "#2B2D30",            // Neutral/400
  gridLine: "#1A1B23",          // Subtle grid - darker than border

  // Candlestick colors from Figma
  upColor: "#33AD5F",           // Accent - Green/accent - green-400
  upColorDark: "#009937",       // Accent - Green/accent - green-500 (wick)
  downColor: "#F74E4E",         // Red/Red

  // Volume colors (more transparent)
  volumeUp: "rgba(51, 173, 95, 0.3)",
  volumeDown: "rgba(247, 78, 78, 0.3)",

  // Crosshair
  crosshairColor: "#636466",

  // Primary accent
  primary: "#40E0D0",           // Primary/Main
};

// Timeframe to milliseconds mapping
/** Candles + volume in the shape lightweight-charts expects. */
function chartSeries(trades: ChartTrade[], timeframe: Timeframe, currentPrice?: number) {
  const { candles, volume } = tradesToOHLC(trades, timeframe, currentPrice);
  return {
    candles: candles.map((c) => ({ ...c, time: c.time as Time })),
    volume: volume.map((v) => ({ time: v.time as Time, value: v.value, color: v.up ? colors.volumeUp : colors.volumeDown })),
  };
}

/** Price label formatter: scientific notation for tiny bonding-curve prices. */
const formatChartPrice = (price: number): string => {
  if (price === 0) return "0";
  const absPrice = Math.abs(price);
  if (absPrice < 0.0001) {
    const exp = Math.floor(Math.log10(absPrice));
    const mantissa = absPrice / Math.pow(10, exp);
    return `${mantissa.toFixed(2)}e${exp}`;
  }
  if (absPrice < 0.01) return absPrice.toFixed(6);
  if (absPrice < 0.1) return absPrice.toFixed(5);
  if (absPrice < 1) return absPrice.toFixed(4);
  if (absPrice < 100) return absPrice.toFixed(2);
  return absPrice.toFixed(0);
};

const getPrecision = (price: number): number => {
  if (!price) return 10;
  const absPrice = Math.abs(price);
  if (absPrice >= 1) return 4;
  if (absPrice >= 0.01) return 6;
  if (absPrice >= 0.0001) return 8;
  if (absPrice >= 0.000001) return 10;
  return 12;
};

// OHLC Legend data structure
interface OHLCLegendData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isUp: boolean;
}

export default function TradingViewChart({
  trades,
  currentPrice,
  tokenSymbol = "TOKEN",
  height = 400,
  timeframe: initialTimeframe = "4h",
  onTimeframeChange,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(initialTimeframe);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [ohlcLegend, setOhlcLegend] = useState<OHLCLegendData | null>(null);
  const [hasData, setHasData] = useState(false);
  // Latest inputs for the crosshair handler, which is registered once per chart.
  const latestRef = useRef({ trades, timeframe: initialTimeframe, currentPrice });
  useEffect(() => {
    latestRef.current = { trades, timeframe: selectedTimeframe, currentPrice };
  }, [trades, selectedTimeframe, currentPrice]);

  // Available timeframes for display
  const primaryTimeframes: Timeframe[] = ["1s", "30s", "1m"];
  const allTimeframes: Timeframe[] = ["1s", "5s", "15s", "30s", "1m", "5m", "15m", "1h", "4h", "1d"];

  // Format price for OHLC legend display
  const formatLegendPrice = (price: number): string => {
    if (price === 0) return "0";
    const absPrice = Math.abs(price);

    // Use scientific notation for very small numbers
    if (absPrice < 0.0001) {
      const exp = Math.floor(Math.log10(absPrice));
      const mantissa = absPrice / Math.pow(10, exp);
      return `${mantissa.toFixed(2)}e${exp}`;
    }

    // Format with K suffix for thousands
    if (absPrice >= 1000) {
      return `${(absPrice / 1000).toFixed(2)}K`;
    }

    // Regular formatting
    if (absPrice < 0.01) return absPrice.toFixed(6);
    if (absPrice < 0.1) return absPrice.toFixed(5);
    if (absPrice < 1) return absPrice.toFixed(4);
    return absPrice.toFixed(4);
  };

  // Format volume for legend display
  const formatVolume = (vol: number): string => {
    if (vol === 0) return "0";
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(2)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(2)}K`;
    return vol.toFixed(2);
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.textSecondary,
        fontFamily: "'Inter Variable', Inter, sans-serif",
        fontSize: 11,
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      grid: {
        vertLines: {
          color: colors.gridLine,
          style: LineStyle.Dotted,
        },
        horzLines: {
          color: colors.gridLine,
          style: LineStyle.Dotted,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: colors.primary,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: colors.primary,
        },
        horzLine: {
          color: colors.primary,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: colors.primary,
        },
      },
      rightPriceScale: {
        borderColor: colors.border,
        borderVisible: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.25, // More room for volume
        },
        textColor: colors.textSecondary,
      },
      timeScale: {
        borderColor: colors.border,
        borderVisible: true,
        timeVisible: true,
        secondsVisible: ["1s", "5s", "15s", "30s"].includes(latestRef.current.timeframe),
        rightOffset: 5,
        minBarSpacing: 6,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const precision = getPrecision(latestRef.current.currentPrice || 0);

    // Add candlestick series using v5 API with custom price format
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderVisible: false,
      wickUpColor: colors.upColorDark,
      wickDownColor: colors.downColor,
      borderUpColor: colors.upColor,
      borderDownColor: colors.downColor,
      priceFormat: {
        type: "custom",
        formatter: formatChartPrice,
        minMove: Math.pow(10, -precision),
      },
      lastValueVisible: false, // Hide the horizontal price line
      priceLineVisible: false, // Hide the price line
    });

    // Add volume histogram series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: colors.volumeUp,
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      lastValueVisible: false, // Hide the last value label
      priceLineVisible: false, // Hide the price line
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
      borderVisible: false,
      visible: false, // Hide the volume scale labels entirely
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // Subscribe to crosshair move for OHLC legend
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        // Reset to latest candle when not hovering
        const latest = latestRef.current;
        const { candles, volume } = chartSeries(latest.trades, latest.timeframe, latest.currentPrice);
        if (candles.length > 0) {
          const lastCandle = candles[candles.length - 1];
          const lastVolume = volume.length > 0 ? volume[volume.length - 1].value : 0;
          setOhlcLegend({
            open: lastCandle.open,
            high: lastCandle.high,
            low: lastCandle.low,
            close: lastCandle.close,
            volume: lastVolume,
            isUp: lastCandle.close >= lastCandle.open,
          });
        }
        return;
      }

      const candleData = param.seriesData.get(candlestickSeries) as CandlestickData<Time> | undefined;
      const volumeData = param.seriesData.get(volumeSeries) as HistogramData<Time> | undefined;

      if (candleData) {
        setOhlcLegend({
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volumeData?.value || 0,
          isUp: candleData.close >= candleData.open,
        });
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    // Use ResizeObserver for better resize handling
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [height]);

  // Update chart data when trades or timeframe changes
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return;

    const { candles, volume } = chartSeries(trades, selectedTimeframe, currentPrice);

    const precision = getPrecision(currentPrice || candles[candles.length - 1]?.close || 0);
    candlestickSeriesRef.current.applyOptions({ priceFormat: { type: "custom", formatter: formatChartPrice, minMove: Math.pow(10, -precision) } });
    candlestickSeriesRef.current.setData(candles as CandlestickData<Time>[]);
    volumeSeriesRef.current.setData(volume as HistogramData<Time>[]);
    setHasData(candles.length > 0);
    if (candles.length === 0) setOhlcLegend(null);

    if (candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const lastVolume = volume.length > 0 ? volume[volume.length - 1].value : 0;
      setOhlcLegend({
        open: lastCandle.open,
        high: lastCandle.high,
        low: lastCandle.low,
        close: lastCandle.close,
        volume: lastVolume,
        isUp: lastCandle.close >= lastCandle.open,
      });
    }

    // Fit content
    if (chartRef.current && candles.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [trades, currentPrice, selectedTimeframe]);

  const handleTimeframeChange = useCallback(
    (tf: Timeframe) => {
      setSelectedTimeframe(tf);
      setIsDropdownOpen(false);
      onTimeframeChange?.(tf);

      if (chartRef.current) {
        chartRef.current.applyOptions({
          timeScale: {
            secondsVisible: ["1s", "5s", "15s", "30s"].includes(tf),
          },
        });
      }
    },
    [onTimeframeChange]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (_e: MouseEvent) => {
      if (isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <div className="flex flex-col" style={{ gap: "24px" }}>
      {/* Chart Navigation Bar - matches Figma layout_MF5SSK */}
      <div
        className="flex items-center"
        style={{
          gap: "12px",
          padding: "0px 0px 0px 4px",
        }}
      >
        {/* Timeframe Selector */}
        <div className="flex items-center">
          {/* Time Frame Group */}
          <div className="flex items-center" style={{ gap: "32px" }}>
            {primaryTimeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                className="cursor-pointer transition-colors"
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  lineHeight: "1.5em",
                  color: selectedTimeframe === tf ? colors.textPrimary : colors.textSecondary,
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Dropdown Arrow */}
          <div className="relative" style={{ marginLeft: "8px" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(!isDropdownOpen);
              }}
              className="cursor-pointer transition-colors flex items-center justify-center"
              style={{
                background: "none",
                border: "none",
                padding: "4px",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                <path
                  d="M2.5 4.5L6 8L9.5 4.5"
                  stroke={colors.textSecondary}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div
                className="absolute top-full left-0 z-50"
                style={{
                  marginTop: "8px",
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "8px",
                  minWidth: "70px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {allTimeframes
                  .filter((tf) => !primaryTimeframes.includes(tf))
                  .map((tf) => (
                    <button
                      key={tf}
                      onClick={() => handleTimeframeChange(tf)}
                      className="w-full text-left cursor-pointer transition-colors"
                      style={{
                        fontFamily: "'Inter Variable', Inter, sans-serif",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: selectedTimeframe === tf ? colors.primary : colors.textSecondary,
                        background: "none",
                        border: "none",
                        padding: "8px 12px",
                        display: "block",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#131519";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {tf}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Separator Line */}
        <div
          style={{
            width: "1px",
            height: "22px",
            backgroundColor: colors.border,
          }}
        />

        {/* Candlestick Icon */}
       <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21" fill="none">
  <path d="M12.1404 7.85956V12.1475H14.2844V7.85956H12.1404ZM11.7831 7.1449H14.6418C14.7365 7.1449 14.8274 7.18254 14.8944 7.24956C14.9615 7.31657 14.9991 7.40746 14.9991 7.50223V12.5049C14.9991 12.5996 14.9615 12.6905 14.8944 12.7575C14.8274 12.8246 14.7365 12.8622 14.6418 12.8622H11.7831C11.6883 12.8622 11.5975 12.8246 11.5304 12.7575C11.4634 12.6905 11.4258 12.5996 11.4258 12.5049V7.50223C11.4258 7.40746 11.4634 7.31657 11.5304 7.24956C11.5975 7.18254 11.6883 7.1449 11.7831 7.1449Z" fill="#B3B5B6"/>
  <path d="M12.8545 5.00188H13.5692V7.5032H12.8545V5.00188ZM12.8545 12.5058H13.5692V15.0072H12.8545V12.5058Z" fill="#B3B5B6"/>
  <path d="M6.43146 5.71654V14.2925H8.57545V5.71654H6.43146ZM6.07413 5.00188H8.93278C9.02755 5.00188 9.11844 5.03952 9.18546 5.10654C9.25247 5.17355 9.29012 5.26444 9.29012 5.35921V14.6498C9.29012 14.7446 9.25247 14.8355 9.18546 14.9025C9.11844 14.9695 9.02755 15.0072 8.93278 15.0072H6.07413C5.97936 15.0072 5.88847 14.9695 5.82146 14.9025C5.75444 14.8355 5.7168 14.7446 5.7168 14.6498V5.35921C5.7168 5.26444 5.75444 5.17355 5.82146 5.10654C5.88847 5.03952 5.97936 5.00188 6.07413 5.00188Z" fill="#B3B5B6"/>
  <path d="M7.1377 2.85776H7.85236V5.35908H7.1377V2.85776ZM7.1377 14.6497H7.85236V17.151H7.1377V14.6497Z" fill="#B3B5B6"/>
</svg>

      </div>

      {/* Chart Container */}
      <div className="relative">
        <div
          ref={chartContainerRef}
          style={{
            width: "100%",
            height: `${height}px`,
            borderRadius: "0px",
          }}
        />

        {!hasData && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span style={{ fontFamily: "'Inter Variable', Inter, sans-serif", fontSize: "13px", color: colors.textMuted }}>
              No trades yet{tokenSymbol ? ` for ${tokenSymbol}` : ""}
            </span>
          </div>
        )}

        {/* OHLC Legend Overlay */}
        {ohlcLegend && (
          <div
            className="absolute flex flex-col"
            style={{
              top: "8px",
              left: "8px",
              gap: "2px",
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            {/* Token pair and timeframe */}
            <div
              style={{
                fontFamily: "'Inter Variable', Inter, sans-serif",
                fontSize: "12px",
                fontWeight: 600,
                lineHeight: "1.5em",
                color: colors.textSecondary,
              }}
            >
              {tokenSymbol}/SOL • {selectedTimeframe}
            </div>

            {/* OHLC Values Row */}
            <div className="flex items-center" style={{ gap: "12px" }}>
              {/* Open */}
              <div className="flex items-center" style={{ gap: "4px" }}>
                <span
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    lineHeight: "1.5em",
                    color: "#B3B5B6", // Neutral/100 - labels are always gray
                  }}
                >
                  O
                </span>
                <span
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "12px",
                    fontWeight: 400,
                    lineHeight: "1.5em",
                    color: ohlcLegend.isUp ? "#27AE60" : "#EB5757", // Success/Danger - values are colored
                  }}
                >
                  {formatLegendPrice(ohlcLegend.open)}
                </span>
              </div>

              {/* High */}
              <div className="flex items-center" style={{ gap: "4px" }}>
                <span
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    lineHeight: "1.5em",
                    color: "#B3B5B6", // Neutral/100 - labels are always gray
                  }}
                >
                  H
                </span>
                <span
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "12px",
                    fontWeight: 400,
                    lineHeight: "1.5em",
                    color: ohlcLegend.isUp ? "#27AE60" : "#EB5757", // Success/Danger - values are colored
                  }}
                >
                  {formatLegendPrice(ohlcLegend.high)}
                </span>
              </div>

              {/* Low */}
              <div className="flex items-center" style={{ gap: "4px" }}>
                <span
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    lineHeight: "1.5em",
                    color: "#B3B5B6", // Neutral/100 - labels are always gray
                  }}
                >
                  L
                </span>
                <span
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "12px",
                    fontWeight: 400,
                    lineHeight: "1.5em",
                    color: ohlcLegend.isUp ? "#27AE60" : "#EB5757", // Success/Danger - values are colored
                  }}
                >
                  {formatLegendPrice(ohlcLegend.low)}
                </span>
              </div>

              {/* Close */}
              <div className="flex items-center" style={{ gap: "4px" }}>
                <span
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "12px",
                    fontWeight: 600,
                    lineHeight: "1.5em",
                    color: "#B3B5B6", // Neutral/100 - labels are always gray
                  }}
                >
                  C
                </span>
                <span
                  style={{
                    fontFamily: "'Inter Variable', Inter, sans-serif",
                    fontSize: "12px",
                    fontWeight: 400,
                    lineHeight: "1.5em",
                    color: ohlcLegend.isUp ? "#27AE60" : "#EB5757", // Success/Danger - values are colored
                  }}
                >
                  {formatLegendPrice(ohlcLegend.close)}
                </span>
              </div>
            </div>

            {/* Volume Row */}
            <div className="flex items-center" style={{ gap: "4px" }}>
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  lineHeight: "1.5em",
                  color: colors.textSecondary,
                }}
              >
                Volume
              </span>
              <span
                style={{
                  fontFamily: "'Inter Variable', Inter, sans-serif",
                  fontSize: "12px",
                  fontWeight: 400,
                  lineHeight: "1.5em",
                  color: ohlcLegend.isUp ? "#27AE60" : "#EB5757",
                }}
              >
                {formatVolume(ohlcLegend.volume)}
              </span>
            </div>
          </div>
        )}

        {/* TradingView Logo Watermark */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            bottom: "16px",
            left: "16px",
            width: "28px",
            height: "28px",
            backgroundColor: "rgba(9, 10, 17, 0.8)",
            borderRadius: "6px",
            border: `0.5px solid ${colors.border}`,
          }}
        >
          {/* TV Logo */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 10L6 6L9 9L14 4"
              stroke={colors.textSecondary}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
