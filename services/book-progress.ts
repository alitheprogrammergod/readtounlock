export interface BookProgress {
  currentPage: number;
  lastReadAt: string | null;
  totalTimeRead: number;
  creditedSessionIds?: string[];
}

/** Commit one verified session to a book without double-counting on retries. */
export function applyBookSession(
  progress: BookProgress, pageCount: number, page: number,
  minutes: number, sessionId?: string, now: Date = new Date()
): BookProgress {
  if (!Number.isSafeInteger(pageCount) || pageCount <= 0 ||
      !Number.isSafeInteger(page) || page < progress.currentPage || page > pageCount ||
      !Number.isSafeInteger(minutes) || minutes < 0 || minutes > 1440 ||
      (sessionId !== undefined && (sessionId.length < 1 || sessionId.length > 128))) {
    throw new Error('Invalid reading session');
  }
  const completed = progress.creditedSessionIds ?? [];
  const credited = !!sessionId && completed.includes(sessionId);
  return {
    ...progress,
    currentPage: page,
    lastReadAt: now.toISOString(),
    totalTimeRead: progress.totalTimeRead + (credited ? 0 : minutes),
    creditedSessionIds: sessionId && !credited ? [...completed, sessionId].slice(-500) : completed,
  };
}
