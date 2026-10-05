import type { ObjectiveRef } from '../core/types';

/**
 * CURRICULUM: SY0-701 objective catalog.
 * Domain numbers and objective ids/titles follow the published
 * CompTIA Security+ (SY0-701) exam objectives.
 */
export const OBJECTIVES: ObjectiveRef[] = [
  // Domain 1 — General Security Concepts
  { domain: 1, id: '1.1', title: 'Compare and contrast various types of security controls' },
  { domain: 1, id: '1.2', title: 'Summarize fundamental security concepts' },
  { domain: 1, id: '1.3', title: 'Explain the importance of change management processes and the impact to security' },
  { domain: 1, id: '1.4', title: 'Explain the importance of using appropriate cryptographic solutions' },

  // Domain 2 — Threats, Vulnerabilities, and Mitigations
  { domain: 2, id: '2.1', title: 'Explain common threat actors and motivations' },
  { domain: 2, id: '2.2', title: 'Explain common threat vectors and attack surfaces' },
  { domain: 2, id: '2.3', title: 'Explain various types of vulnerabilities' },
  { domain: 2, id: '2.4', title: 'Given a scenario, analyze indicators of malicious activity' },
  { domain: 2, id: '2.5', title: 'Explain the purpose of mitigation techniques used to secure the enterprise' },

  // Domain 3 — Security Architecture
  { domain: 3, id: '3.1', title: 'Compare and contrast security implications of different architecture models' },
  { domain: 3, id: '3.2', title: 'Given a scenario, apply security principles to secure enterprise infrastructure' },
  { domain: 3, id: '3.3', title: 'Compare and contrast concepts and strategies to protect data' },
  { domain: 3, id: '3.4', title: 'Explain the importance of resilience and recovery in security architecture' },

  // Domain 4 — Security Operations
  { domain: 4, id: '4.1', title: 'Given a scenario, apply common security techniques to computing resources' },
  { domain: 4, id: '4.2', title: 'Explain the security implications of proper hardware, software, and data asset management' },
  { domain: 4, id: '4.3', title: 'Explain various activities associated with vulnerability management' },
  { domain: 4, id: '4.4', title: 'Explain security alerting and monitoring concepts and tools' },
  { domain: 4, id: '4.5', title: 'Given a scenario, modify enterprise capabilities to enhance security' },
  { domain: 4, id: '4.6', title: 'Given a scenario, implement and maintain identity and access management' },
  { domain: 4, id: '4.7', title: 'Explain the importance of automation and orchestration related to secure operations' },
  { domain: 4, id: '4.8', title: 'Explain appropriate incident response activities' },
  { domain: 4, id: '4.9', title: 'Given a scenario, use data sources to support an investigation' },

  // Domain 5 — Security Program Management and Oversight
  { domain: 5, id: '5.1', title: 'Summarize elements of effective security governance' },
  { domain: 5, id: '5.2', title: 'Explain elements of the risk management process' },
  { domain: 5, id: '5.3', title: 'Explain the processes associated with third-party risk assessment and management' },
  { domain: 5, id: '5.4', title: 'Summarize elements of effective security compliance' },
  { domain: 5, id: '5.5', title: 'Explain types and purposes of audits and assessments' },
  { domain: 5, id: '5.6', title: 'Given a scenario, implement security awareness practices' },
];

const byId = new Map(OBJECTIVES.map((o) => [o.id, o]));

export function objectiveById(id: string): ObjectiveRef | undefined {
  return byId.get(id);
}
