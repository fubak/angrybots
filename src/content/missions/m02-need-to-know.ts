import type { Mission } from '../../core/types';

/**
 * M2 "Need to Know" — least privilege & access control.
 * Difficulty 3. Badge only doors your role ('analyst') is authorized for.
 * A sysadmin NPC offers a shared password — refuse it. Reach the exit.
 */
export const m02: Mission = {
  id: 'm02',
  title: 'NEED TO KNOW',
  difficulty: 3,
  objectives: ['4.6', '1.2', '5.6'],
  briefing:
    'Your badge grants ANALYST access only — least privilege means you take ' +
    'the doors your role needs and nothing more (SY0-701 4.6). ' +
    'The ADMIN-ONLY door is out of scope for you; badging it anyway is a ' +
    'policy violation and costs points. A sysadmin may offer you a shared ' +
    'password — shared credentials destroy accountability. Refuse and report ' +
    'with the Keyboard. Reach the exit.',
  authorizedRoles: ['analyst'],
  map: {
    grid: [
      '################',
      '#......#.......#',
      '#..##..D..###..#',
      '#..#...#....#..#',
      '#..#...#....#..#',
      '#..#####.####..#',
      '#..............#',
      '#..#....d...#..#',
      '#..#....#...#..#',
      '#..######.###..#',
      '#.......E......#',
      '################',
    ],
    legend: {
      '#': { kind: 'wall', tex: 'wall-panel' },
      '.': { kind: 'floor', tex: 'floor' },
      'D': { kind: 'door', tex: 'door', doorId: 'admin-door', accessRole: 'admin' },
      'd': { kind: 'door', tex: 'door', doorId: 'lab-door', accessRole: 'analyst' },
      'E': { kind: 'exit', tex: 'exit' },
    },
    spawn: { x: 1.5, y: 1.5, angle: 0 },
    defaultLight: 0.85,
    lights: { '7,7': 1.0 },
  },
  entities: [
    {
      id: 'sysadmin', kind: 'npc', x: 7.5, y: 6.5, sprite: 'npc-suit',
      ai: 'stand', reportable: true, culprit: true, tags: ['shared-pw-offer'],
      inspect: {
        label: 'Sysadmin (offers shared password)',
        detail: 'He offers you "the shared admin password". Shared credentials destroy accountability — refuse and report (4.6).',
        category: 'person',
        objectives: ['4.6'],
        flags: ['offers shared credentials'],
      },
    },
    {
      id: 'analyst-npc', kind: 'npc', x: 5, y: 8.5, sprite: 'npc-f',
      ai: 'wander', reportable: true, culprit: false,
      inspect: {
        label: 'Fellow analyst',
        detail: 'Badging only the doors her role needs — least privilege working as intended.',
        category: 'legit',
        objectives: ['1.2'],
      },
    },
    {
      id: 'console1', kind: 'console', x: 12, y: 6.5, sprite: 'console',
      tags: ['report-console'],
      inspect: {
        label: 'Security reporting console',
        detail: 'Use the Keyboard here to report the shared-password offer to security.',
        category: 'item',
        objectives: ['4.8'],
      },
    },
    {
      id: 'worm1', kind: 'enemy', x: 11, y: 1.5, sprite: 'worm',
      ai: 'chase', hp: 1, infected: true, tags: ['infected'],
      inspect: {
        label: 'Worm process',
        detail: 'Self-replicating malware loose on the floor. One scanner charge cleans it.',
        category: 'malware',
        objectives: ['2.4'],
      },
    },
  ],
  missionObjectives: [
    { id: 'no-violations', text: 'No unauthorized badge attempts', kind: 'doors' },
    { id: 'report-admin', text: 'Report the shared-password offer at the console', kind: 'interact', tag: 'report-console' },
    { id: 'exit', text: 'Reach the exit', kind: 'reach-exit' },
  ],
  debriefQuestions: [
    {
      id: 'q1',
      prompt: 'Least privilege means…',
      objectives: ['4.6'],
      options: [
        { id: 'a', text: 'Access limited to what your role requires', correct: true, explanation: 'Least privilege grants only the minimum access needed for the job (4.6).' },
        { id: 'b', text: 'Everyone gets admin for convenience', correct: false, explanation: 'Broad access violates least privilege and widens the blast radius of any compromise.' },
        { id: 'c', text: 'Access granted on request without review', correct: false, explanation: 'Requests still require authorization and need-to-know justification.' },
      ],
    },
    {
      id: 'q2',
      prompt: 'A colleague offers you a shared admin password. Accepting it is wrong because…',
      objectives: ['4.6'],
      options: [
        { id: 'a', text: 'Shared credentials destroy accountability', correct: true, explanation: 'With shared accounts, actions cannot be tied to an individual — auditing and incident response break down.' },
        { id: 'b', text: 'It is fine if you only use it once', correct: false, explanation: 'Any use of credentials not issued to you is a policy violation regardless of frequency.' },
        { id: 'c', text: 'Passwords expire anyway', correct: false, explanation: 'Expiration does not fix the accountability problem.' },
      ],
    },
  ],
};
