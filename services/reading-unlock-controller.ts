import { checkPolicy, createUnlockState, getUnlockStatus, reduceUnlock,
  type UnlockAction, type UnlockPolicy, type UnlockState, type UnlockStatus } from './reading-unlock-engine';

export interface GoalStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
export interface AppShield { applyBlockedApps(appIds: string[]): Promise<void> }
export interface Clock { now(): Date }

/** Serialize reading updates, save the resulting state, then sync the native shield.
 * If shielding fails, the saved state remains and sync() can retry without double-crediting.
 */
export class ReadingUnlockController {
  private state: UnlockState | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly key = '@read_to_unlock_v2';

  constructor(private readonly storage: GoalStorage, private readonly shield: AppShield,
              private readonly clock: Clock, private policy: UnlockPolicy) { checkPolicy(policy); }

  private async ensureLoaded(): Promise<UnlockState> {
    if (this.state) return this.state;
    const serialized = await this.storage.getItem(this.key);
    if (serialized) {
      const parsed: unknown = JSON.parse(serialized);
      if (!isState(parsed)) throw new Error('Stored reading goal data is invalid');
      this.state = parsed;
    } else this.state = createUnlockState(this.clock.now());
    return this.state;
  }

  private exclusive<T>(run: () => Promise<T>): Promise<T> {
    const result = this.queue.then(run, run);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async write(action: UnlockAction): Promise<UnlockStatus> {
    const now = this.clock.now();
    const next = reduceUnlock(await this.ensureLoaded(), action, now, this.policy);
    await this.storage.setItem(this.key, JSON.stringify(next));
    this.state = next;
    const status = getUnlockStatus(next, now, this.policy);
    if (next.permissionGranted) await this.shield.applyBlockedApps(status.blockedApps);
    return status;
  }

  async initialize(): Promise<UnlockStatus> { return this.exclusive(() => this.write({ type: 'tick' })); }
  async recordReading(sessionId: string, sessionDay: string, elapsedSeconds: number): Promise<UnlockStatus> {
    return this.exclusive(() => this.write({ type: 'record', sessionId, sessionDay, elapsedSeconds }));
  }
  async selectApps(appIds: string[]): Promise<UnlockStatus> {
    return this.exclusive(() => this.write({ type: 'selectApps', appIds }));
  }
  async setPermission(granted: boolean): Promise<UnlockStatus> {
    return this.exclusive(() => this.write({ type: 'permission', granted }));
  }
  async setPolicy(policy: UnlockPolicy): Promise<UnlockStatus> {
    checkPolicy(policy);
    return this.exclusive(async () => {
      this.policy = policy;
      return this.write({ type: 'tick' });
    });
  }
  async getSelectedApps(): Promise<string[]> {
    return this.exclusive(async () => [...(await this.ensureLoaded()).selectedApps]);
  }
  async sync(): Promise<UnlockStatus> { return this.exclusive(() => this.write({ type: 'tick' })); }
  async status(): Promise<UnlockStatus> { return this.sync(); }
}

function isState(v: unknown): v is UnlockState {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return s.version === 2 && typeof s.dayKey === 'string' &&
    Number.isSafeInteger(s.secondsRead) && (s.secondsRead as number) >= 0 &&
    typeof s.sessionSeconds === 'object' && !!s.sessionSeconds && !Array.isArray(s.sessionSeconds) &&
    Number.isSafeInteger(s.rewardsGranted) && (s.rewardsGranted as number) >= 0 &&
    (s.unlockUntil === null || typeof s.unlockUntil === 'number') &&
    typeof s.dailyUnlocked === 'boolean' && typeof s.permissionGranted === 'boolean' &&
    Array.isArray(s.selectedApps) && s.selectedApps.every(id => typeof id === 'string');
}
