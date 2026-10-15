import { describe, it, expect } from 'vite-plus/test';
import { computeClipWindow } from './highlight-clips';

describe('computeClipWindow', () => {
  it('should pad kill ticks and clamp to round bounds', () => {
    const window = computeClipWindow({
      roundStartTick: 1000,
      roundEndTick: 20000,
      firstKillTick: 5000,
      lastKillTick: 7000,
      tickrate: 64,
      paddingSeconds: 6,
      maxSeconds: 90,
    });

    expect(window).toEqual({ startTick: 5000 - 384, endTick: 7000 + 384 });
  });

  it('should clamp padding to the round start and end', () => {
    const window = computeClipWindow({
      roundStartTick: 4800,
      roundEndTick: 7200,
      firstKillTick: 5000,
      lastKillTick: 7000,
      tickrate: 64,
      paddingSeconds: 6,
      maxSeconds: 90,
    });

    expect(window).toEqual({ startTick: 4800, endTick: 7200 });
  });

  it('should trim symmetrically when the window exceeds the max length', () => {
    const window = computeClipWindow({
      roundStartTick: 0,
      roundEndTick: 100_000,
      firstKillTick: 10_000,
      lastKillTick: 20_000,
      tickrate: 64,
      paddingSeconds: 100,
      maxSeconds: 90,
    });

    expect(window.endTick - window.startTick).toBe(90 * 64);
    expect(window.startTick).toBeGreaterThanOrEqual(0);
  });
});

describe('highlight action boundaries', () => {
  it('preserves all kill ticks when padding is asymmetric at the round boundary', () => {
    const window = computeClipWindow({
      roundStartTick: 4800,
      roundEndTick: 20000,
      firstKillTick: 5000,
      lastKillTick: 7000,
      tickrate: 64,
      paddingSeconds: 100,
      maxSeconds: 45,
    });
    expect(window.startTick).toBeLessThanOrEqual(5000);
    expect(window.endTick).toBeGreaterThanOrEqual(7000);
    expect(window.endTick - window.startTick).toBeLessThanOrEqual(45 * 64);
  });

  it('keeps the last kill when the action exceeds the maximum clip length', () => {
    const window = computeClipWindow({
      roundStartTick: 0,
      roundEndTick: 20000,
      firstKillTick: 1000,
      lastKillTick: 15000,
      tickrate: 64,
      paddingSeconds: 6,
      maxSeconds: 90,
    });
    expect(window.endTick).toBe(15000);
    expect(window.endTick - window.startTick).toBe(90 * 64);
  });
});
