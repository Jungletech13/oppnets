import type { CollaborationGroup, GroupKind } from '@/types';

export type DirectoryKind = GroupKind | '';

export function showIndividualsForKind(kind: DirectoryKind): boolean {
  return kind === '' || kind === 'individual';
}

export function showGroupsForKind(kind: DirectoryKind): boolean {
  return kind !== 'individual';
}

export function groupMatchesKind(group: CollaborationGroup, kind: DirectoryKind): boolean {
  return kind === '' || (kind !== 'individual' && group.kind === kind);
}
