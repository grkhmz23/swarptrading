'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '@/services/api';
import { errorMessage, newIdempotencyKey } from '@/lib/http';
import { floorToDecimals, isAmountInput, parseAmount } from '@/lib/amount';
import { PinConfirmModal } from '@/components/ui/PinConfirmModal';

interface StakingPool {
  id: string;
  name: string;
  lockDays: number;
  apyPercent: number;
  minStake: number;
  maxStake: number;
  totalStaked: number;
}

interface StakingPosition {
  id: string;
  poolId: string;
  poolName: string;
  amount: number;
  apyPercent: number;
  earnedRewards: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN';
}

interface StakingSummary {
  totalStaked: number;
  totalEarned: number;
  activePositions: number;
  availableBalance: number;
}

interface StakingSectionProps {
  authToken: string | null;
}

const EMPTY_SUMMARY: StakingSummary = { totalStaked: 0, totalEarned: 0, activePositions: 0, availableBalance: 0 };

/** Number from an API field; strings like "12.5" are accepted, anything else is null. */
function num(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

/** Map a pool from the API; pools without an id, lock period or APY are not shown. */
function toPool(p: Record<string, unknown>): StakingPool | null {
  const id = str(p.id);
  const lockDays = num(p.lockDays);
  const apy = num(p.apyPercent) ?? num(p.apyRate);
  if (!id || lockDays === null || lockDays < 0 || apy === null) return null;
  return {
    id,
    name: str(p.name) ?? id,
    lockDays,
    apyPercent: apy,
    minStake: num(p.minStake) ?? 0,
    maxStake: num(p.maxStake) ?? Number.POSITIVE_INFINITY,
    totalStaked: num(p.totalStaked) ?? 0,
  };
}

export const StakingSection: React.FC<StakingSectionProps> = ({ authToken }) => {
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [positions, setPositions] = useState<StakingPosition[]>([]);
  const [summary, setSummary] = useState<StakingSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partialError, setPartialError] = useState<string | null>(null);

  const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [staking, setStaking] = useState(false);
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [stakeSuccess, setStakeSuccess] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [pendingStake, setPendingStake] = useState<{ pool: StakingPool; amount: number; amountText: string } | null>(null);
  const stakeKeyRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!authToken) {
      setLoading(false);
      setError('Please sign in to view staking.');
      return;
    }
    setLoading(true);
    setError(null);
    setPartialError(null);
    const [poolsRes, positionsRes, summaryRes] = await Promise.allSettled([
      apiService.getStakingPools(authToken),
      apiService.getStakingPositions(authToken),
      apiService.getStakingSummary(authToken),
    ]);

    if (poolsRes.status === 'fulfilled' && Array.isArray(poolsRes.value)) {
      setPools(poolsRes.value.map((p: Record<string, unknown>) => toPool(p)).filter((p): p is StakingPool => p !== null));
    } else {
      setPools([]);
      setError('Unable to load staking pools.');
    }

    if (positionsRes.status === 'fulfilled' && Array.isArray(positionsRes.value)) {
      setPositions(
        positionsRes.value
          .map((p: Record<string, unknown>) => ({
            id: str(p.id) ?? '',
            poolId: str(p.poolId) ?? '',
            poolName: str(p.poolName) ?? str(p.tokenSymbol) ?? 'SWARP',
            amount: num(p.amount) ?? 0,
            apyPercent: num(p.apyPercent) ?? num(p.apyRate) ?? 0,
            earnedRewards: num(p.earnedRewards) ?? 0,
            startDate: str(p.startDate) ?? '',
            endDate: str(p.endDate) ?? '',
            status: (str(p.status) ?? 'ACTIVE').toUpperCase() as StakingPosition['status'],
          }))
          .filter((p) => p.id)
      );
    } else {
      setPartialError('Your staking positions could not be loaded.');
    }

    if (summaryRes.status === 'fulfilled' && summaryRes.value) {
      const s = summaryRes.value as Record<string, unknown>;
      setSummary({
        totalStaked: num(s.totalStaked) ?? 0,
        totalEarned: num(s.totalEarned) ?? 0,
        activePositions: num(s.activePositions) ?? 0,
        availableBalance: num(s.availableBalance) ?? 0,
      });
    } else {
      setPartialError('Your staking balance could not be loaded.');
    }
    setLoading(false);
  }, [authToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /** Validate, then ask for the PIN. */
  const handleStake = () => {
    if (!authToken || !selectedPool || staking) return;
    const parsed = parseAmount(stakeAmount, 9, summary.availableBalance);
    if (!parsed.ok) { setStakeError(parsed.message); return; }
    if (parsed.value < selectedPool.minStake) { setStakeError(`Min ${selectedPool.minStake.toLocaleString()} SWARP`); return; }
    if (parsed.value > selectedPool.maxStake) { setStakeError(`Max ${selectedPool.maxStake.toLocaleString()} SWARP`); return; }
    setStakeError(null);
    if (!stakeKeyRef.current) stakeKeyRef.current = newIdempotencyKey();
    setPendingStake({ pool: selectedPool, amount: parsed.value, amountText: parsed.text });
  };

  const executeStake = async () => {
    if (!authToken || !pendingStake || !stakeKeyRef.current) return;
    setStaking(true);
    try {
      await apiService.stakeTokens(
        authToken,
        { amount: pendingStake.amount, lockDays: pendingStake.pool.lockDays, poolId: pendingStake.pool.id },
        stakeKeyRef.current
      );
      stakeKeyRef.current = null;
      setPendingStake(null);
      setStakeSuccess(true);
      setTimeout(() => { setSelectedPool(null); setStakeAmount(''); setStakeSuccess(false); fetchData(); }, 2000);
    } catch (err: unknown) {
      setStakeError(errorMessage(err, 'Staking failed.'));
      throw err;
    } finally {
      setStaking(false);
    }
  };

  const handleWithdraw = async (positionId: string) => {
    if (!authToken || withdrawingId) return;
    setWithdrawingId(positionId);
    setWithdrawError(null);
    try {
      await apiService.withdrawStake(authToken, positionId);
      await fetchData();
    } catch (err) {
      setWithdrawError(errorMessage(err, 'Withdrawal failed. Please try again.'));
    } finally {
      setWithdrawingId(null);
    }
  };

  const computeEstimates = (amount: number, apy: number, days: number) => {
    const daily = amount * (apy / 100 / 365);
    return { daily, monthly: daily * 30, atMaturity: daily * days };
  };

  const getProgress = (start: string, end: string) => {
    const s = new Date(start).getTime(), e = new Date(end).getTime(), n = Date.now();
    if (n >= e) return 100;
    if (n <= s) return 0;
    return Math.round(((n - s) / (e - s)) * 100);
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col !p-4 lg:!p-7">
        <div className="flex items-center justify-center py-16 flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#40E0D0] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col !p-4 lg:!p-7">
        <div className="bg-[#1A1B23] rounded-2xl !p-8 text-center">
          <p className="text-[#636466] !mb-4">{error}</p>
          <button onClick={fetchData} className="bg-[#40E0D0] text-black font-semibold !px-6 !py-2.5 rounded-xl hover:bg-[#40E0D0]/90 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const parsedStake = parseAmount(stakeAmount, 9);
  const parsedAmount = parsedStake.ok ? parsedStake.value : 0;
  const estimates = selectedPool ? computeEstimates(parsedAmount, selectedPool.apyPercent, selectedPool.lockDays) : null;

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-0 overflow-visible">
      {/* Main Content */}
      <div className="flex-1 flex flex-col !p-4 lg:!p-7 border-b lg:border-b-0 border-[#2B2D30] overflow-visible lg:overflow-y-auto">

        {/* Section Header */}
        <div className="!mb-6">
          <h3 className="text-[18px] font-semibold text-white !mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            Staking
          </h3>
          <p className="text-[#636466] text-sm">Earn rewards by staking your SWARP tokens</p>
        </div>

        {/* Summary Row */}
        <div className="flex items-center !gap-6 !mb-8">
          <div>
            <p className="text-[#636466] text-xs !mb-1">Total Staked</p>
            <p className="text-white text-lg font-semibold">{(summary.totalStaked ?? 0).toLocaleString()} <span className="text-[#636466] text-sm font-normal">SWARP</span></p>
          </div>
          <div className="w-px h-8 bg-[#2B2D30]" />
          <div>
            <p className="text-[#636466] text-xs !mb-1">Earned</p>
            <p className="text-[#40E0D0] text-lg font-semibold">{(summary.totalEarned ?? 0).toLocaleString()} <span className="text-[#40E0D0]/60 text-sm font-normal">SWARP</span></p>
          </div>
          <div className="w-px h-8 bg-[#2B2D30]" />
          <div>
            <p className="text-[#636466] text-xs !mb-1">Active</p>
            <p className="text-white text-lg font-semibold">{summary.activePositions ?? 0}</p>
          </div>
          <div className="w-px h-8 bg-[#2B2D30]" />
          <div>
            <p className="text-[#636466] text-xs !mb-1">Available</p>
            <p className="text-white text-lg font-semibold">{(summary.availableBalance ?? 0).toLocaleString()} <span className="text-[#636466] text-sm font-normal">SWARP</span></p>
          </div>
        </div>

        {partialError && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl !p-3 !mb-4">
            <p className="text-yellow-400 text-sm">{partialError}</p>
          </div>
        )}

        {/* Pool Cards */}
        <div className="!space-y-3 !mb-8">
          {pools.length === 0 && (
            <div className="bg-[#1A1B23] rounded-xl !p-6 text-center">
              <p className="text-[#636466] text-sm">No staking pools are open right now.</p>
            </div>
          )}
          {pools.map((pool) => (
            <div
              key={pool.id}
              className="bg-[#1A1B23] rounded-xl !p-4 flex items-center justify-between hover:bg-[#1A1B23]/80 transition-colors"
            >
              <div className="flex items-center !gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  pool.name === 'Diamond' ? 'bg-[#40E0D0]/15 text-[#40E0D0]' :
                  pool.name === 'Growth' ? 'bg-[#7B61FF]/15 text-[#7B61FF]' :
                  'bg-[#636466]/15 text-[#B3B5B6]'
                }`}>
                  {pool.name === 'Diamond' ? '◆' : pool.name === 'Growth' ? '▲' : '●'}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{pool.name}</p>
                  <p className="text-[#636466] text-xs">{pool.lockDays === 0 ? 'Flexible' : `${pool.lockDays} days lock`} · Min {(pool.minStake ?? 0).toLocaleString()} SWARP</p>
                </div>
              </div>
              <div className="flex items-center !gap-4">
                <div className="text-right">
                  <p className="text-[#40E0D0] text-lg font-bold">{pool.apyPercent}%</p>
                  <p className="text-[#636466] text-xs">APY</p>
                </div>
                <button
                  onClick={() => { setSelectedPool(pool); setStakeAmount(''); setStakeError(null); setStakeSuccess(false); }}
                  className="bg-[#40E0D0] text-[#090A11] font-semibold text-sm !px-5 !py-2 rounded-full hover:bg-[#40E0D0]/90 transition-colors"
                >
                  Stake
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Positions */}
        <div>
          <h3 className="text-[16px] font-semibold text-white !mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Your Positions
          </h3>
          {withdrawError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl !p-3 !mb-4" role="alert">
              <p className="text-red-400 text-sm">{withdrawError}</p>
            </div>
          )}

          {positions.length === 0 ? (
            <div className="bg-[#1A1B23] rounded-xl !p-8 text-center">
              <p className="text-[#636466] text-sm">No staking positions yet. Choose a pool above to start earning.</p>
            </div>
          ) : (
            <div className="!space-y-3">
              {positions.map((pos) => {
                const progress = getProgress(pos.startDate, pos.endDate);
                const canWithdraw = (pos.status === 'COMPLETED' || progress >= 100) && pos.status !== 'WITHDRAWN';

                return (
                  <div key={pos.id} className="bg-[#1A1B23] rounded-xl !p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between !mb-3">
                      <div className="flex items-center !gap-3">
                        <div>
                          <p className="text-white text-sm font-semibold">{pos.poolName}</p>
                          <p className="text-[#636466] text-xs">{(pos.amount ?? 0).toLocaleString()} SWARP · {pos.apyPercent}% APY</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium !px-3 !py-1 rounded-full ${
                        pos.status === 'ACTIVE' ? 'bg-[#40E0D0]/10 text-[#40E0D0]' :
                        pos.status === 'COMPLETED' ? 'bg-[#7B61FF]/10 text-[#7B61FF]' :
                        'bg-[#636466]/10 text-[#636466]'
                      }`}>
                        {pos.status}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-[6px] bg-[#2B2D30] rounded-full overflow-hidden !mb-3">
                      <div
                        className="h-full bg-[#40E0D0] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center !gap-4">
                        <span className="text-[#636466]">{fmtDate(pos.startDate)} → {fmtDate(pos.endDate)}</span>
                        <span className="text-[#40E0D0]">+{(pos.earnedRewards ?? 0).toLocaleString()} SWARP earned</span>
                      </div>
                      {pos.status !== 'WITHDRAWN' && (
                        <button
                          onClick={() => handleWithdraw(pos.id)}
                          disabled={!canWithdraw || withdrawingId === pos.id}
                          className={`text-xs font-semibold !px-4 !py-1.5 rounded-full transition-colors ${
                            canWithdraw
                              ? 'bg-white text-[#090A11] hover:bg-gray-100'
                              : 'bg-[#2B2D30] text-[#636466] cursor-not-allowed'
                          }`}
                        >
                          {withdrawingId === pos.id ? 'Withdrawing...' : canWithdraw ? 'Withdraw' : `${progress}% locked`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Stake Modal ─────────────────────────────────────────────────── */}
      {selectedPool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 !p-4">
          <div
            className="absolute inset-0"
            onClick={() => !staking && setSelectedPool(null)}
          />
          <div className="relative bg-[#1A1B23] rounded-3xl !p-6 w-full max-w-sm z-10">
            {/* Close */}
            <button
              onClick={() => !staking && setSelectedPool(null)}
              className="absolute top-4 right-4 text-[#636466] hover:text-white transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>

            {/* Header */}
            <div className="!mb-5">
              <h3 className="text-white text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                Stake {selectedPool.name}
              </h3>
              <p className="text-[#40E0D0] text-sm font-medium !mt-1">{selectedPool.apyPercent}% APY · {selectedPool.lockDays} day lock</p>
            </div>

            {/* Amount */}
            <div className="!mb-4">
              <div className="flex justify-between items-center !mb-2">
                <label className="text-[#636466] text-xs">Amount (SWARP)</label>
                <span className="text-[#636466] text-xs">Available: <span className="text-[#B3B5B6]">{(summary.availableBalance ?? 0).toLocaleString()}</span></span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={stakeAmount}
                  onChange={(e) => { if (isAmountInput(e.target.value)) { setStakeAmount(e.target.value); setStakeError(null); } }}
                  placeholder={`Min ${(selectedPool.minStake ?? 0).toLocaleString()}`}
                  disabled={staking || stakeSuccess}
                  className="w-full bg-[#090A11] border border-[#2B2D30] rounded-xl !px-4 !py-3 text-white placeholder-[#636466] focus:border-[#40E0D0] focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => setStakeAmount(floorToDecimals(summary.availableBalance ?? 0, 9))}
                  disabled={staking || stakeSuccess}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#40E0D0] text-xs font-bold"
                >
                  MAX
                </button>
              </div>
              {parsedAmount > (summary.availableBalance ?? 0) && parsedAmount > 0 && (
                <p className="text-red-400 text-xs !mt-1">Insufficient balance</p>
              )}
            </div>

            {/* Earnings Preview */}
            {parsedAmount > 0 && estimates && (
              <div className="bg-[#090A11] border border-[#2B2D30] rounded-xl !p-4 !mb-4 !space-y-2">
                <p className="text-[#636466] text-xs !mb-2">Estimated Earnings</p>
                <div className="flex justify-between text-sm">
                  <span className="text-[#636466]">Daily</span>
                  <span className="text-[#B3B5B6]">{estimates.daily.toFixed(4)} SWARP</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#636466]">Monthly</span>
                  <span className="text-[#B3B5B6]">{estimates.monthly.toFixed(4)} SWARP</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#636466]">At Maturity</span>
                  <span className="text-[#40E0D0] font-semibold">{estimates.atMaturity.toFixed(4)} SWARP</span>
                </div>
              </div>
            )}

            {/* Lock info */}
            <div className="bg-[#090A11] border border-[#2B2D30] rounded-xl !p-3 !mb-4 flex items-center !gap-3">
              <svg className="w-4 h-4 text-[#40E0D0] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              <p className="text-[#636466] text-xs">Tokens locked for {selectedPool.lockDays} days. Cannot withdraw early.</p>
            </div>

            {/* Error / Success */}
            {stakeError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl !p-3 !mb-4">
                <p className="text-red-400 text-sm">{stakeError}</p>
              </div>
            )}
            {stakeSuccess && (
              <div className="bg-[#40E0D0]/10 border border-[#40E0D0]/20 rounded-xl !p-3 !mb-4">
                <p className="text-[#40E0D0] text-sm font-medium">Staked successfully!</p>
              </div>
            )}

            {/* Button */}
            <button
              onClick={handleStake}
              disabled={staking || stakeSuccess || !parsedStake.ok || parsedAmount > (summary.availableBalance ?? 0)}
              className="w-full bg-[#40E0D0] text-[#090A11] font-semibold !py-3 rounded-xl hover:bg-[#40E0D0]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {staking ? (
                <span className="flex items-center justify-center !gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#090A11] border-t-transparent" />
                  Confirming...
                </span>
              ) : stakeSuccess ? 'Done!' : 'Review & Stake'}
            </button>
          </div>
        </div>
      )}
      <PinConfirmModal
        isOpen={pendingStake !== null}
        title="Confirm stake"
        confirmLabel="Stake"
        summary={
          pendingStake
            ? [
                { label: 'Amount', value: `${pendingStake.amountText} SWARP` },
                { label: 'Pool', value: pendingStake.pool.name },
                { label: 'Locked for', value: `${pendingStake.pool.lockDays} days` },
                { label: 'APY', value: `${pendingStake.pool.apyPercent}%` },
              ]
            : []
        }
        onCancel={() => setPendingStake(null)}
        onConfirmed={executeStake}
      />
    </div>
  );
};
