"use client";

import React from "react";

interface ToggleButtonProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({
  checked = true,
  onChange,
  disabled = false,
}) => {
  const handleCheckboxChange = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <label className={`flex cursor-pointer select-none items-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="relative">
        {/* Hidden Checkbox */}
        <input
          type="checkbox"
          checked={checked}
          onChange={handleCheckboxChange}
          disabled={disabled}
          className="sr-only"
        />

        {/* Track */}
        <div
          className={`block h-6 w-11 rounded-full transition-colors duration-300 ${
            checked ? "bg-[#40E0D0]" : "bg-[#1F2125]"
          }`}
        ></div>

        {/* Knob */}
        <div
          className={`absolute left-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ${
            checked ? "translate-x-5" : ""
          }`}
        ></div>
      </div>
    </label>
  );
};

export default ToggleButton;
