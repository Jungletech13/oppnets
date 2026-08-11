import { describe, expect, it } from 'vitest';
import type { CollaborationGroup } from '@/types';
import { groupMatchesKind, showGroupsForKind, showIndividualsForKind } from './people-directory';

const pair = { kind: 'pair' } as CollaborationGroup;
const group = { kind: 'group' } as CollaborationGroup;
const team = { kind: 'team' } as CollaborationGroup;

describe('People and Teams type selection', () => {
  it('shows both directory sections when all types are selected', () => {
    expect(showIndividualsForKind('')).toBe(true);
    expect(showGroupsForKind('')).toBe(true);
    expect(groupMatchesKind(pair, '')).toBe(true);
  });

  it('shows only people when Individuals is selected', () => {
    expect(showIndividualsForKind('individual')).toBe(true);
    expect(showGroupsForKind('individual')).toBe(false);
    expect(groupMatchesKind(pair, 'individual')).toBe(false);
  });

  it.each([
    ['pair', pair],
    ['group', group],
    ['team', team],
  ] as const)('shows only the matching collaboration type for %s', (kind, matchingGroup) => {
    expect(showIndividualsForKind(kind)).toBe(false);
    expect(showGroupsForKind(kind)).toBe(true);
    expect(groupMatchesKind(matchingGroup, kind)).toBe(true);
    expect([pair, group, team].filter((candidate) => groupMatchesKind(candidate, kind))).toEqual([matchingGroup]);
  });
});
