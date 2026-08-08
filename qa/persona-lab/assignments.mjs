import { personas } from './personas.mjs';
import { scenarios } from './scenarios.mjs';

// Each persona receives six scenarios. The coprime strides spread 600 assignments
// across all 24 scenarios (25 appearances each) without randomness.
export const assignments = personas.flatMap((persona, personaIndex) =>
  Array.from({ length: 6 }, (_, slot) => {
    const scenarioIndex = (personaIndex * 5 + slot * 7) % scenarios.length;
    return {
      persona_id: persona.persona_id,
      scenario_id: scenarios[scenarioIndex].scenario_id,
      run_order: slot + 1,
    };
  }),
);

export const pilotPersonaIds = [
  'persona-001', 'persona-019', 'persona-037', 'persona-049',
  'persona-059', 'persona-067', 'persona-075', 'persona-083',
  'persona-091', 'persona-097', 'persona-099', 'persona-100',
];

export const pilotAssignments = assignments.filter((assignment) => pilotPersonaIds.includes(assignment.persona_id));
