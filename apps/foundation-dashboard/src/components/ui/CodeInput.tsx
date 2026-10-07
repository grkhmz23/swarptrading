'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';

export interface CodeInputHandle {
  focus: () => void;
}

interface CodeInputProps {
  /** Current digits; always `length` entries, '' for empty boxes. */
  value: string[];
  onChange: (digits: string[]) => void;
  /** Called once when every box holds a digit. */
  onComplete?: (code: string) => void;
  length?: number;
  /** Mask the digits (PIN entry). */
  secret?: boolean;
  /** One-time code from SMS: lets the browser offer autofill. */
  oneTimeCode?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  ariaLabel: string;
  className?: string;
  boxClassName?: string;
}

/**
 * Row of single-digit boxes. Accepts only digits, supports paste of a full
 * code into any box, and moves focus forward/backward as digits are typed or
 * deleted.
 */
export const CodeInput = forwardRef<CodeInputHandle, CodeInputProps>(function CodeInput(
  {
    value,
    onChange,
    onComplete,
    length = 6,
    secret = false,
    oneTimeCode = false,
    disabled = false,
    invalid = false,
    autoFocus = false,
    ariaLabel,
    className = 'flex gap-3 justify-center',
    boxClassName = 'w-12 h-12 text-center text-white text-xl font-semibold bg-[#131519] border rounded-xl focus:outline-none transition-colors',
  },
  ref
) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useImperativeHandle(ref, () => ({
    focus: () => inputs.current[0]?.focus(),
  }));

  const commit = (next: string[], focusIndex: number) => {
    onChange(next);
    inputs.current[Math.min(Math.max(focusIndex, 0), length - 1)]?.focus();
    if (next.every((d) => d !== '')) onComplete?.(next.join(''));
  };

  const fillFrom = (start: number, raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, length - start).split('');
    if (digits.length === 0) return;
    const next = [...value];
    digits.forEach((d, i) => {
      next[start + i] = d;
    });
    commit(next, start + digits.length);
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (raw === '') {
      const next = [...value];
      next[index] = '';
      onChange(next);
      return;
    }
    if (!digits) return;
    if (digits.length > 1) {
      // SMS autofill delivers the whole code into one box (boxes select on focus,
      // so ordinary typing always yields a single character).
      fillFrom(index, digits);
      return;
    }
    const next = [...value];
    next[index] = digits;
    commit(next, index + 1);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      e.preventDefault();
      const next = [...value];
      next[index - 1] = '';
      onChange(next);
      inputs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fillFrom(index, e.clipboardData.getData('text'));
  };

  return (
    <div className={className} role="group" aria-label={ariaLabel}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          data-index={index}
          type={secret ? 'password' : 'text'}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={oneTimeCode && index === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && index === 0}
          aria-label={`${ariaLabel} digit ${index + 1}`}
          value={value[index] ?? ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          className={`${boxClassName} ${invalid ? 'border-red-500' : 'border-[#2B2D30] focus:border-[#40E0D0]'} ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
      ))}
    </div>
  );
});

export function emptyCode(length = 6): string[] {
  return Array.from({ length }, () => '');
}
