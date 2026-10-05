import type { Mission } from '../../core/types';

/**
 * M3 "The Quiet One" — insider threat.
 * Difficulty 6. Inspect NPCs with the Mouse to find the insider showing
 * indicators (after-hours access, mass downloads, USB exfil), then report the
 * correct person at the console. False accusations cost points.
 * Malware processes roam the floor.
 */
export const m03: Mission = {
  id: 'm03',
  title: 'THE QUIET ONE',
  difficulty: 6,
  objectives: ['2.1', '2.4', '4.4'],
  briefing:
    'Telemetry says someone on this floor is exfiltrating data — an insider ' +
    'threat (SY0-701 2.1). Inspect each employee with the MOUSE (slot 2): ' +
    'look for indicators — after-hours badge-ins, mass downloads, USB ' +
    'exfiltration (2.4). Then use the KEYBOARD at the security console to ' +
    'report your suspect. Accuse wrong and an innocent reputation burns — ' +
    'and points. Watch for the malware processes loose on the floor.',
  authorizedRoles: ['analyst'],
  map: {
    grid: [
      '################',
      '#......#......d#',
      '#.###..#..###..#',
      '#.#....#....#..#',
      '#.#.##.#.##.#..#',
      '#...#.....#....#',
      '###.#.###.#.####',
      '#...#.....#....#',
      '#.#.#####.#.##.#',
      '#.#.......#....#',
      '#....E.........#',
      '################',
    ],
    legend: {
      '#': { kind: 'wall', tex: 'wall-server' },
      '.': { kind: 'floor', tex: 'floor' },
      'd': { kind: 'door', tex: 'door', doorId: 'ops-door', accessRole: 'analyst' },
      'E': { kind: 'exit', tex: 'exit' },
    },
    spawn: { x: 1.5, y: 1.5, angle: 0 },
    defaultLight: 0.75,
  },
  entities: [
    {
      id: 'insider', kind: 'npc', x: 11, y: 7.5, sprite: 'npc-suit',
      ai: 'wander', reportable: true, culprit: true,
      inspect: {
        label: 'Employee — MULTIPLE INDICATORS',
        detail: 'Badges in at 3 AM, staged 40GB of downloads, seen with personal USB media — a classic insider-threat pattern (2.1/2.4). Report them.',
        category: 'suspicious',
        objectives: ['2.1', '2.4'],
        flags: ['after-hours access', 'mass downloads', 'USB exfiltration'],
      },
    },
    {
      id: 'dev', kind: 'npc', x: 5, y: 3.5, sprite: 'npc-m',
      ai: 'wander', reportable: true, culprit: false,
      inspect: {
        label: 'Employee — clean',
        detail: 'Late commits but only to his project repo; access matches his role. No indicators.',
        category: 'legit',
      },
    },
    {
      id: 'hr', kind: 'npc', x: 9, y: 9.5, sprite: 'npc-f',
      ai: 'stand', reportable: true, culprit: false,
      inspect: {
        label: 'Employee — clean',
        detail: 'Handles sensitive HR data, but all access is within her role and logged normally. No indicators.',
        category: 'legit',
      },
    },
    {
      id: 'intern', kind: 'npc', x: 3, y: 9.5, sprite: 'npc-m',
      ai: 'wander', reportable: true, culprit: false,
      inspect: {
        label: 'Intern — clean',
        detail: 'Nervous around you, but nervous is not an indicator. Access is minimal and normal.',
        category: 'legit',
      },
    },
    {
      id: 'console', kind: 'console', x: 13, y: 1.5, sprite: 'console',
      tags: ['report-console'],
      inspect: {
        label: 'Security console',
        detail: 'Use the Keyboard here to file your insider report — then stand by your evidence.',
        category: 'item',
        objectives: ['4.8'],
      },
    },
    {
      id: 'worm1', kind: 'enemy', x: 6, y: 5.5, sprite: 'worm',
      ai: 'chase', hp: 1, infected: true, tags: ['infected'],
      inspect: { label: 'Worm', detail: 'Self-replicating malware — clean it with a scanner charge.', category: 'malware', objectives: ['2.4'] },
    },
    {
      id: 'trojan1', kind: 'enemy', x: 10, y: 3.5, sprite: 'trojan',
      ai: 'chase', hp: 1, infected: true, tags: ['infected'],
      inspect: { label: 'Trojan', detail: 'Malware disguised as legit software. It does not spread by itself — but it bites.', category: 'malware', objectives: ['2.4'] },
    },
    {
      id: 'ransom1', kind: 'enemy', x: 7, y: 9.5, sprite: 'ransomware',
      ai: 'chase', hp: 2, infected: true, tags: ['infected'],
      inspect: { label: 'Ransomware', detail: 'Encrypts files and demands payment. Tougher — needs two scanner charges.', category: 'malware', objectives: ['2.4'] },
    },
    {
      id: 'charge1', kind: 'item', x: 1.5, y: 10.5, sprite: 'charge',
      tags: ['charge'], grants: { resource: 'usb-charge', amount: 6 },
      inspect: { label: 'Scanner charges', detail: 'Antimalware updates — ammo for your USB scanner.', category: 'item' },
    },
  ],
  missionObjectives: [
    { id: 'report-insider', text: 'Report the real insider at the console', kind: 'report' },
    { id: 'no-false-accuse', text: 'No false accusations', kind: 'avoid', tag: 'false-accuse' },
    { id: 'exit', text: 'Reach the exit', kind: 'reach-exit' },
  ],
  debriefQuestions: [
    {
      id: 'q1',
      prompt: 'Which pattern most strongly indicates an insider threat?',
      objectives: ['2.1', '2.4'],
      options: [
        { id: 'a', text: 'After-hours access + mass downloads + removable media', correct: true, explanation: 'The combination — unusual hours, data staging, and exfil channel — is the textbook insider pattern (2.1/2.4).' },
        { id: 'b', text: 'Working late on a deadline', correct: false, explanation: 'Late work alone is normal; indicators must be evaluated in context.' },
        { id: 'c', text: 'Acting nervous around security staff', correct: false, explanation: 'Nervousness is not a technical indicator of malicious activity.' },
      ],
    },
    {
      id: 'q2',
      prompt: 'Before accusing an employee, an analyst should…',
      objectives: ['4.9'],
      options: [
        { id: 'a', text: 'Correlate indicators and report through the security process', correct: true, explanation: 'Investigations rely on evidence from data sources, then escalation via incident-response channels (4.9).' },
        { id: 'b', text: 'Confront them publicly on the floor', correct: false, explanation: 'Public accusation risks the investigation and, if wrong, an innocent reputation.' },
        { id: 'c', text: 'Lock their account without evidence', correct: false, explanation: 'Contention without corroboration punishes innocents and tips off real culprits.' },
      ],
    },
    {
      id: 'q3',
      prompt: 'A worm differs from a trojan because…',
      objectives: ['2.4'],
      options: [
        { id: 'a', text: 'A worm self-replicates across the network; a trojan needs the user to run it', correct: true, explanation: 'Self-propagation defines a worm; trojans ride on deception and do not self-spread.' },
        { id: 'b', text: 'A trojan self-replicates; a worm does not', correct: false, explanation: 'It is the reverse — worms spread autonomously.' },
        { id: 'c', text: 'They are the same thing', correct: false, explanation: 'They are distinct malware classes with different vectors and mitigations.' },
      ],
    },
  ],
};
