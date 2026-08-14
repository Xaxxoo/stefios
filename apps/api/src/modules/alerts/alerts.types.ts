export const ALERT_QUEUE = 'alerts';

export type AlertObservation = {
  value?: string;
  eventKey?: string;
  state?: string;
  targetRef?: string;
  metadata?: Record<string, unknown>;
};

export type AlertJob = {
  userId: string;
  ruleId: string;
  observation?: AlertObservation;
};
