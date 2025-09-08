import { virtualChatAgent } from './chatAgent';
import { virtualSupervisorAgent } from './supervisorAgent';

// Chat-Supervisor 패턴으로 설정
virtualChatAgent.handoffs = [virtualSupervisorAgent];

export const virtualConsultationScenario = [virtualChatAgent, virtualSupervisorAgent];
