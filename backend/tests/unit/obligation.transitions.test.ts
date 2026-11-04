import { canTransition } from '../../src/services/obligation.service';
import { OBLIGATION_STATUS_TRANSITIONS } from '../../src/config/constants';
import type { ObligationStatus } from '../../src/types';

describe('obligation status transitions', () => {
  it('allows the human review decisions from potential', () => {
    expect(canTransition('potential', 'confirmed')).toBe(true);
    expect(canTransition('potential', 'rejected')).toBe(true);
  });

  it('never lets a potential obligation jump straight to completed', () => {
    expect(canTransition('potential', 'completed')).toBe(false);
  });

  it('allows a confirmed obligation to be completed', () => {
    expect(canTransition('confirmed', 'completed')).toBe(true);
  });

  it('allows an overdue obligation to be completed or rejected', () => {
    expect(canTransition('overdue', 'completed')).toBe(true);
    expect(canTransition('overdue', 'rejected')).toBe(true);
  });

  it('treats a no-op transition as valid', () => {
    for (const status of Object.keys(OBLIGATION_STATUS_TRANSITIONS) as ObligationStatus[]) {
      expect(canTransition(status, status)).toBe(true);
    }
  });

  it('does not allow a rejected obligation to be confirmed directly', () => {
    expect(canTransition('rejected', 'confirmed')).toBe(false);
    expect(canTransition('rejected', 'potential')).toBe(true);
  });

  it('defines a transition list for every status', () => {
    const statuses: ObligationStatus[] = [
      'potential',
      'confirmed',
      'rejected',
      'completed',
      'overdue',
    ];
    for (const status of statuses) {
      expect(Array.isArray(OBLIGATION_STATUS_TRANSITIONS[status])).toBe(true);
    }
  });
});
