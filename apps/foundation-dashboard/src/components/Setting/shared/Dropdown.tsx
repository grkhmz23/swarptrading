"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface DropdownProps {
  options: string[];
  onSelect?: (selected: string) => void;
  selected?: string; // controlled selected value
}

const Dropdown: React.FC<DropdownProps> = ({ options, onSelect, selected: propSelected }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(propSelected || options[0] || "");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);

  // Sync internal state with prop
  useEffect(() => {
    if (propSelected) {
      setSelected(propSelected);
    }
  }, [propSelected]);

  const handleSelect = (option: string) => {
    setSelected(option);
    setOpen(false);
    if (onSelect) onSelect(option);
  };

  // (The rest of your positioning / click outside / resize / scroll logic remains unchanged)
  useEffect(() => {
    if (open && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedItemHeight = 40;
      const menuHeight = Math.min(
        options.length * estimatedItemHeight,
        Math.max(120, window.innerHeight - 40)
      );
      const width = Math.max(rect.width, 224);

      if (spaceBelow >= 150) {
        setMenuStyle({
          position: "fixed",
          top: rect.bottom + 8,
          left: rect.right - width,
          width,
        });
      } else {
        const top = Math.max(8, rect.top - menuHeight - 8);
        setMenuStyle({
          position: "fixed",
          top,
          left: rect.right - width,
          width,
        });
      }
    }
  }, [open, options.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = dropdownRef.current?.contains(target);
      const inMenu = menuRef.current?.contains(target);
      if (!inTrigger && !inMenu) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="!relative !inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex w-[120px] justify-center !gap-x-10 rounded-lg bg-[#131519] border-[0.5px] border-[#2B2D30] !pl-4 !py-2.5 text-[12px] font-[400] !pr-3 text-white ring-1 ring-white/5 hover:bg-[#1A1B23]"
      >
        {selected}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className="!-mr-1 !w-5 !h-5 text-gray-400 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
          />
        </svg>
      </button>

      {open &&
        menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="!z-50 rounded-md bg-[#131519] shadow-lg ring-1 ring-white/10 transition-transform duration-150 overflow-hidden"
          >
            <div className="!py-1">
              {options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  className="block w-full !px-4 !py-2 text-left text-sm text-white hover:bg-[#1A1B23] hover:text-[#40E0D0]"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Dropdown;
