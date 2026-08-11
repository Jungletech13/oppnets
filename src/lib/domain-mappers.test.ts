import { describe, expect, it } from 'vitest';
import { mapCompanyRow, mapProfessionalRow, mapSpaceRow } from '@/lib/domain-mappers';

describe('domain mappers', () => {
  it('maps professional directory rows through one shared contract', () => {
    expect(mapProfessionalRow({
      id: 'pro-1',
      business_name: 'Example Studio',
      category: 'Designer',
      services: ['Branding'],
      industries_served: ['Technology'],
      professional_reviews: [],
    })).toMatchObject({
      id: 'pro-1',
      businessName: 'Example Studio',
      category: 'Designer',
      services: ['Branding'],
      industriesServed: ['Technology'],
      verified: false,
    });
  });

  it('maps company rows through one shared contract', () => {
    expect(mapCompanyRow({
      id: 'company-1',
      name: 'Example Company',
      size: '11-50',
      industries: ['Technology'],
      company_reviews: [],
    })).toMatchObject({
      id: 'company-1',
      name: 'Example Company',
      size: '11-50',
      industries: ['Technology'],
      verified: false,
    });
  });

  it('loads persisted modules and record acknowledgments for a space', () => {
    const modules = [{ kind: 'tasks', label: 'Tasks', pinned: true, visible: true, order: 0 }];
    const mapped = mapSpaceRow({
      id: 'space-1',
      opportunity_id: 'opportunity-1',
      name: 'Workspace',
      created_at: '2026-08-11T00:00:00Z',
      space_members: [{ user_id: 'user-1', role: 'Lead' }],
      modules,
      collaboration_record_acknowledgments: [{ user_id: 'user-1' }],
    });

    expect(mapped.modules).toEqual(modules);
    expect(mapped.record.acknowledgments).toEqual(['user-1']);
  });
});
