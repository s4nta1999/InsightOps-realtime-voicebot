import { virtualConsultationScenario } from './virtualConsultation';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  virtualConsultation: virtualConsultationScenario,
};

export const defaultAgentSetKey = 'virtualConsultation';
