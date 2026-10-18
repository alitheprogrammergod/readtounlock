/** Pure, deterministic Read to Unlock V2 goal state machine. */
export type UnlockPolicy =
  | { mode: 'daily'; requiredSeconds: number }
  | { mode: 'earned'; requiredSeconds: number; rewardSeconds: number };

export interface UnlockState {
  version: 2;
  dayKey: string;
  secondsRead: number;
  /** Highest recorded session duration; repeated checkpoints never double-credit. */
  sessionSeconds: Record<string, number>;
  rewardsGranted: number;
  unlockUntil: number | null;
  dailyUnlocked: boolean;
  permissionGranted: boolean;
  selectedApps: string[];
}

export type UnlockAction =
  | { type: 'record'; sessionId: string; sessionDay: string; elapsedSeconds: number }
  | { type: 'selectApps'; appIds: string[] }
  | { type: 'permission'; granted: boolean }
  | { type: 'tick' }
  | { type: 'reset' };

export function dayKeyAt(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function checkPolicy(policy: UnlockPolicy): void {
  if (!Number.isSafeInteger(policy.requiredSeconds) || policy.requiredSeconds < 60) {
    throw new Error('Reading goal must be at least one minute.');
  }
  if (policy.mode === 'earned' && (!Number.isSafeInteger(policy.rewardSeconds) || policy.rewardSeconds < 60)) {
    throw new Error('Timed rewards must be at least one minute.');
  }
}

export function createUnlockState(date: Date): UnlockState {
  return { version: 2, dayKey: dayKeyAt(date), secondsRead: 0, sessionSeconds: {},
    rewardsGranted: 0, unlockUntil: null, dailyUnlocked: false,
    permissionGranted: false, selectedApps: [] };
}

/** Reset at local midnight while allowing a previously granted timed reward to finish. */
function rollover(state: UnlockState, day: string, nowMs: number): UnlockState {
  if (day === state.dayKey) return state;
  return { ...state, dayKey: day, secondsRead: 0, sessionSeconds: {},
    rewardsGranted: 0, dailyUnlocked: false,
    unlockUntil: state.unlockUntil !== null && nowMs < state.unlockUntil ? state.unlockUntil : null };
}

function settle(state: UnlockState, policy: UnlockPolicy, nowMs: number): UnlockState {
  const s = { ...state };
  if (policy.mode === 'daily') {
    s.dailyUnlocked = s.secondsRead >= policy.requiredSeconds;
    s.unlockUntil = null;
    return s;
  }
  if (s.unlockUntil !== null && s.unlockUntil <= nowMs) s.unlockUntil = null;
  const earned = Math.floor(s.secondsRead / policy.requiredSeconds);
  // Do not consume a reward until selected apps and permission are available.
  if (s.permissionGranted && s.selectedApps.length && s.unlockUntil === null && earned > s.rewardsGranted) {
    s.rewardsGranted += 1;
    s.unlockUntil = nowMs + policy.rewardSeconds * 1000;
  }
  return s;
}

export function reduceUnlock(state: UnlockState, action: UnlockAction, now: Date, policy: UnlockPolicy): UnlockState {
  checkPolicy(policy);
  if (Number.isNaN(now.getTime())) throw new Error('Invalid clock time');
  const day = dayKeyAt(now);
  let s = rollover(state, day, now.getTime());
  switch (action.type) {
    case 'record': {
      if (!action.sessionId || action.sessionId.length > 128 ||
          !Number.isSafeInteger(action.elapsedSeconds) || action.elapsedSeconds < 0 ||
          action.elapsedSeconds > 86400) throw new Error('Invalid reading session');
      if (action.sessionDay !== day) break;
      const prior = s.sessionSeconds[action.sessionId] ?? 0;
      const delta = Math.max(0, action.elapsedSeconds - prior);
      s = { ...s, secondsRead: s.secondsRead + delta,
        sessionSeconds: { ...s.sessionSeconds, [action.sessionId]: Math.max(prior, action.elapsedSeconds) } };
      break;
    }
    case 'selectApps': {
      const ids = action.appIds.filter(id => typeof id === 'string' && id.length > 0 && id.length <= 200);
      s = { ...s, selectedApps: [...new Set(ids)] };
      break;
    }
    case 'permission': s = { ...s, permissionGranted: action.granted }; break;
    case 'tick': break;
    case 'reset': {
      s = { ...s, secondsRead: 0, sessionSeconds: {}, rewardsGranted: 0,
        unlockUntil: null, dailyUnlocked: false };
      break;
    }
  }
  return settle(s, policy, now.getTime());
}

export interface UnlockStatus {
  readingSeconds: number;
  secondsRemaining: number;
  unlocked: boolean;
  unlockedUntil: number | null;
  blockedApps: string[];
  permissionGranted: boolean;
  rewardsAvailable: number;
}

export function getUnlockStatus(state: UnlockState, now: Date, policy: UnlockPolicy): UnlockStatus {
  const s = reduceUnlock(state, { type: 'tick' }, now, policy);
  const unlocked = policy.mode === 'daily' ? s.dailyUnlocked : s.unlockUntil !== null && s.unlockUntil > now.getTime();
  const available = policy.mode === 'earned'
    ? Math.max(0, Math.floor(s.secondsRead / policy.requiredSeconds) - s.rewardsGranted) : 0;
  const progress = policy.mode === 'daily' ? s.secondsRead : s.secondsRead % policy.requiredSeconds;
  const secondsRemaining = unlocked || available > 0 ? 0 : Math.max(0, policy.requiredSeconds - progress);
  return { readingSeconds: s.secondsRead, secondsRemaining, unlocked, unlockedUntil: s.unlockUntil,
    blockedApps: s.permissionGranted && !unlocked ? [...s.selectedApps] : [],
    permissionGranted: s.permissionGranted, rewardsAvailable: available };
}
