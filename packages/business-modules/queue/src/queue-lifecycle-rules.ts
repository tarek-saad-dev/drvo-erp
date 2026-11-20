/**
 * Cashier queueLifecycleEngine (pin 046bf19, blob 1aaa037e) adapted for DRVO SQL026
 * uppercase statuses. Pure NONPOSTING helpers: compute effective status, blocking, and
 * operator-action flags. Never posts sale/Treasury/GL (ADR-031).
 *
 * Deliberate DRVO differences vs Cashier:
 *  - statuses are WAITING/CALLED/IN_SERVICE/DONE/CANCELLED/NO_SHOW (no arrived/skipped);
 *  - settle-expired (operator) only closes WAITING/CALLED past ExpectedEndAt + grace to
 *    NO_SHOW; overdue IN_SERVICE stays needsOperatorAction (DONE/CANCEL required).
 */
export const QUEUE_LIFECYCLE_STATE = "NONPOSTING_QUEUE_LIFECYCLE" as const;
export const QUEUE_GRACE_MINUTES_DEFAULT = 15 as const;

export type QueueTicketStatus =
  | "WAITING"
  | "CALLED"
  | "IN_SERVICE"
  | "DONE"
  | "CANCELLED"
  | "NO_SHOW";

export type QueueEffectiveStatus =
  | QueueTicketStatus
  | "NO_SHOW_CANDIDATE"
  | "OVERDUE_FINISH_REQUIRED";

export type QueueLifecycleTicket = Readonly<{
  status: QueueTicketStatus;
  expectedStartAtUtc: string | Date | null;
  expectedEndAtUtc: string | Date | null;
  durationMinutes: number | null;
  serviceStartedAtUtc?: string | Date | null;
}>;

export type QueueLifecycleView = Readonly<{
  actualStatus: QueueTicketStatus;
  effectiveStatus: QueueEffectiveStatus;
  expectedStartAt: Date | null;
  expectedEndAt: Date | null;
  durationMinutes: number;
  isBlockingAvailability: boolean;
  isCountingAhead: boolean;
  needsOperatorAction: boolean;
  overdueMinutes: number;
  settleEligible: boolean;
}>;

export type QueueLifecycleConfig = Readonly<{
  graceMinutes: number;
  defaultDurationMinutes: number;
}>;

const DEFAULT_CONFIG: QueueLifecycleConfig = {
  graceMinutes: QUEUE_GRACE_MINUTES_DEFAULT,
  defaultDurationMinutes: 30,
};

const CLOSED = new Set<QueueTicketStatus>(["DONE", "CANCELLED", "NO_SHOW"]);

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Cashier computeEffectiveTicket adapted to DRVO uppercase statuses. */
export function computeQueueLifecycle(
  ticket: QueueLifecycleTicket,
  now: Date,
  config: QueueLifecycleConfig = DEFAULT_CONFIG,
): QueueLifecycleView {
  const actualStatus = ticket.status;
  const duration = Math.max(
    1,
    Number(ticket.durationMinutes) || config.defaultDurationMinutes,
  );
  const expectedStartAt = toDate(ticket.expectedStartAtUtc);
  let expectedEndAt = toDate(ticket.expectedEndAtUtc);
  if (!expectedEndAt && expectedStartAt) {
    expectedEndAt = new Date(expectedStartAt.getTime() + duration * 60_000);
  }
  if (actualStatus === "IN_SERVICE" && !expectedEndAt && ticket.serviceStartedAtUtc) {
    const started = toDate(ticket.serviceStartedAtUtc);
    if (started) expectedEndAt = new Date(started.getTime() + duration * 60_000);
  }

  const graceMs = config.graceMinutes * 60_000;
  let overdueMinutes = 0;
  if (expectedEndAt) {
    const elapsed = now.getTime() - expectedEndAt.getTime();
    if (elapsed > 0) overdueMinutes = Math.floor(elapsed / 60_000);
  }

  let effectiveStatus: QueueEffectiveStatus = actualStatus;
  let isBlockingAvailability = false;
  let isCountingAhead = false;
  let needsOperatorAction = false;
  let settleEligible = false;

  if (CLOSED.has(actualStatus)) {
    effectiveStatus = actualStatus;
  } else if (actualStatus === "IN_SERVICE") {
    if (expectedEndAt && now.getTime() > expectedEndAt.getTime() + graceMs) {
      effectiveStatus = "OVERDUE_FINISH_REQUIRED";
      needsOperatorAction = true;
    } else {
      isBlockingAvailability = true;
      isCountingAhead = true;
    }
  } else if (actualStatus === "WAITING" || actualStatus === "CALLED") {
    if (expectedEndAt && now.getTime() > expectedEndAt.getTime() + graceMs) {
      effectiveStatus = "NO_SHOW_CANDIDATE";
      needsOperatorAction = true;
      settleEligible = true;
    } else if (expectedEndAt && now.getTime() > expectedEndAt.getTime()) {
      needsOperatorAction = true;
    } else {
      isBlockingAvailability = true;
      isCountingAhead = true;
    }
  }

  return {
    actualStatus,
    effectiveStatus,
    expectedStartAt,
    expectedEndAt,
    durationMinutes: duration,
    isBlockingAvailability,
    isCountingAhead,
    needsOperatorAction,
    overdueMinutes,
    settleEligible,
  };
}

export function enrichQueueTickets<T extends QueueLifecycleTicket>(
  tickets: readonly T[],
  now: Date,
  config: QueueLifecycleConfig = DEFAULT_CONFIG,
): Array<T & QueueLifecycleView> {
  return tickets.map((t) => ({...t, ...computeQueueLifecycle(t, now, config)}));
}

export function countSettleEligible(
  tickets: readonly QueueLifecycleView[],
): number {
  return tickets.filter((t) => t.settleEligible).length;
}
