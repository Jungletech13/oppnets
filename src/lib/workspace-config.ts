import type { ModuleKind, Task } from '@/types';

export function taskProgress(task: Task): { done: number; total: number; pct: number; approvedPct: number } {
  const total = task.checklist.length;
  const done = task.checklist.filter((item) => item.done).length;
  const approvedDone = task.checklist.filter((item) => item.done && !item.submittedForReview).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const approvedPct = total ? Math.round((approvedDone / total) * 100) : 0;
  return { done, total, pct, approvedPct };
}

export const MODULE_CATALOG: { kind: ModuleKind; label: string; description: string }[] = [
  { kind: 'team_chat', label: 'Team Chat', description: 'Conversation for the team' },
  { kind: 'tasks', label: 'Tasks', description: 'Tasks with checklists and reviews' },
  { kind: 'calendar', label: 'Calendar', description: 'Dates and deadlines' },
  { kind: 'milestones', label: 'Milestones', description: 'Key milestones' },
  { kind: 'files', label: 'Files', description: 'Shared files' },
  { kind: 'notes', label: 'Notes', description: 'Shared notes' },
  { kind: 'budget', label: 'Budget', description: 'Budget tracker' },
  { kind: 'contacts', label: 'Contacts', description: 'Contacts directory' },
  { kind: 'vendors', label: 'Vendors', description: 'Vendor list' },
  { kind: 'customer_pipeline', label: 'Customer Pipeline', description: 'Pipeline of leads and clients' },
  { kind: 'property_tracker', label: 'Property Tracker', description: 'Properties and status' },
  { kind: 'equipment_tracker', label: 'Equipment Tracker', description: 'Equipment inventory' },
  { kind: 'investors', label: 'Investors', description: 'Investor pipeline' },
  { kind: 'hiring', label: 'Hiring', description: 'Open roles and candidates' },
  { kind: 'project_timeline', label: 'Project Timeline', description: 'Timeline of events' },
  { kind: 'decision_log', label: 'Decision Log', description: 'Major decisions' },
  { kind: 'collaboration_record', label: 'Collaboration Record', description: 'Reference record' },
];

export const MODULE_PRESETS: Record<string, ModuleKind[]> = {
  'Real Estate Project': ['team_chat', 'tasks', 'milestones', 'property_tracker', 'budget', 'vendors', 'decision_log', 'collaboration_record', 'files', 'notes'],
  'Technology Startup': ['team_chat', 'tasks', 'milestones', 'hiring', 'investors', 'project_timeline', 'decision_log', 'collaboration_record', 'files', 'notes'],
  'Service Business': ['team_chat', 'tasks', 'milestones', 'customer_pipeline', 'hiring', 'equipment_tracker', 'budget', 'decision_log', 'collaboration_record', 'notes'],
  'Creative Project': ['team_chat', 'tasks', 'milestones', 'contacts', 'budget', 'files', 'decision_log', 'collaboration_record', 'notes'],
  'E-commerce Business': ['team_chat', 'tasks', 'milestones', 'customer_pipeline', 'vendors', 'budget', 'decision_log', 'collaboration_record', 'files', 'notes'],
  'General Collaboration': ['team_chat', 'tasks', 'milestones', 'notes', 'files', 'decision_log', 'collaboration_record', 'project_timeline'],
};
