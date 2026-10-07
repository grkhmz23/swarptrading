/**
 * Parsing and limits for user-entered token amounts.
 *
 * Amounts are validated as decimal strings so a value with more fractional
 * digits than the token supports is rejected instead of silently rounded.
 */

/** SOL kept back on "max" so the network fee and any token-account rent can still be paid. */
export const SOL_FEE_RESERVE = 0.01;

export type AmountProblem = 'empty' | 'invalid' | 'zero' | 'too_precise' | 'insufficient';

export interface ParsedAmount {
  ok: true;
  value: number;
  text: string;
}

export interface AmountError {
  ok: false;
  problem: AmountProblem;
  message: string;
}

const MESSAGES: Record<AmountProblem, string> = {
  empty: 'Enter an amount',
  invalid: 'Enter a valid amount',
  zero: 'Amount must be greater than zero',
  too_precise: 'Too many decimal places for this token',
  insufficient: 'Insufficient balance',
};

/** Characters allowed while typing: digits with at most one dot. */
export function isAmountInput(text: string): boolean {
  return /^\d*\.?\d*$/.test(text);
}

/**
 * Validate an amount string against the token's decimals and, optionally,
 * the spendable balance.
 */
export function parseAmount(text: string, decimals: number, spendable?: number): ParsedAmount | AmountError {
  const trimmed = text.trim();
  const fail = (problem: AmountProblem): AmountError => ({ ok: false, problem, message: MESSAGES[problem] });
  if (!trimmed) return fail('empty');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(trimmed)) return fail('invalid');
  const fraction = trimmed.split('.')[1] ?? '';
  if (fraction.length > decimals) return fail('too_precise');
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return fail('invalid');
  if (value <= 0) return fail('zero');
  if (spendable !== undefined && value > spendable + 1e-12) return fail('insufficient');
  return { ok: true, value, text: trimmed };
}

/** Round down to `decimals` places and render without exponent or trailing zeros. */
export function floorToDecimals(value: number, decimals: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  const places = Math.max(0, Math.min(decimals, 12));
  const factor = 10 ** places;
  const floored = Math.floor(value * factor + 1e-9) / factor;
  const text = floored.toFixed(places);
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
}

/** Largest amount that can be sent: whole balance for tokens, balance minus the fee reserve for SOL. */
export function maxSpendable(balance: number, decimals: number, isNativeSol: boolean): string {
  const available = isNativeSol ? balance - SOL_FEE_RESERVE : balance;
  return floorToDecimals(Math.max(0, available), decimals);
}

/** A fraction (e.g. 0.25) of the spendable balance, floored to the token's decimals. */
export function fractionOfSpendable(balance: number, fraction: number, decimals: number, isNativeSol: boolean): string {
  const available = Math.max(0, isNativeSol ? balance - SOL_FEE_RESERVE : balance);
  return floorToDecimals(available * fraction, decimals);
}
