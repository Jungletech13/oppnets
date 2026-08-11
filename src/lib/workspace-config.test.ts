import { describe, expect, it } from 'vitest';
import { taskProgress } from '@/lib/workspace-config';
import type { Task } from '@/types';

describe('taskProgress', () => {
  it('keeps completion and approved completion distinct', () => {
    const task = {
      checklist: [
        { id: '1', text: 'Done', done: true, submittedForReview: false },
        { id: '2', text: 'Pending review', done: true, submittedForReview: true },
        { id: '3', text: 'Open', done: false },
      ],
    } as Task;

    expect(taskProgress(task)).toEqual({ done: 2, total: 3, pct: 67, approvedPct: 33 });
  });
});
