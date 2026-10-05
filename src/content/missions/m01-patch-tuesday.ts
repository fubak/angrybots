import type { Mission } from '../../core/types';

/**
 * M1 "Patch Tuesday" — antimalware & endpoint basics.
 * Difficulty 1. Clean infected workstations with the USB scanner (slot 3),
 * do NOT plug in the found USB, reach the exit.
 */
export const m01: Mission = {
  id: 'm01',
  title: 'PATCH TUESDAY',
  difficulty: 1,
  objectives: ['2.4', '4.5', '1.2'],
  briefing:
    'Three workstations on this floor are showing malware indicators — ' +
    'pop-ups, encrypted files, suspicious processes (SY0-701 2.4). ' +
    'Fire your USB SCANNER (slot 3) to push antimalware charges and clean them. ' +
    'Someone dropped a USB stick in the hallway — unknown removable media is a ' +
    'classic attack vector. Do NOT walk up to it and plug it in. ' +
    'Then reach the exit.',
  authorizedRoles: ['staff'],
  map: {
    grid: [
      '############',
      '#..........#',
      '#.##....##.#',
      '#.#......#.#',
      '#.#......#.#',
      '#.##.##.##.#',
      '#..........#',
      '#....E.....#',
      '############',
    ],
    legend: {
      '#': { kind: 'wall', tex: 'wall-panel' },
      '.': { kind: 'floor', tex: 'floor' },
      'E': { kind: 'exit', tex: 'exit' },
    },
    spawn: { x: 2, y: 1.5, angle: Math.PI / 2 },
    defaultLight: 0.85,
  },
  entities: [
    {
      id: 'ws1', kind: 'workstation', x: 5, y: 3.5, sprite: 'workstation-infected',
      infected: true, tags: ['infected'],
      inspect: {
        label: 'Infected workstation',
        detail: 'Fake antivirus pop-ups and hijacked browser — classic malware indicators (2.4). Clean it with the USB scanner.',
        category: 'malware',
        objectives: ['2.4'],
      },
    },
    {
      id: 'ws2', kind: 'workstation', x: 8, y: 4.5, sprite: 'workstation-infected',
      infected: true, tags: ['infected'],
      inspect: {
        label: 'Infected workstation',
        detail: 'Files renamed with a strange extension and a ransom note — ransomware indicator (2.4).',
        category: 'malware',
        objectives: ['2.4'],
      },
    },
    {
      id: 'ws3', kind: 'workstation', x: 2, y: 6.5, sprite: 'workstation-infected',
      infected: true, tags: ['infected'],
      inspect: {
        label: 'Infected workstation',
        detail: 'Unknown process saturating the CPU and odd outbound traffic — likely a worm (2.4).',
        category: 'malware',
        objectives: ['2.4'],
      },
    },
    {
      id: 'found-usb', kind: 'item', x: 6, y: 1.5, sprite: 'usb',
      tags: ['found-usb'],
      inspect: {
        label: 'Unmarked USB stick',
        detail: 'Found media is a baiting attack — plugging it in can install malware (2.2 threat vectors). Turn it in; do NOT plug it in.',
        category: 'suspicious',
        objectives: ['2.2'],
      },
    },
    {
      id: 'charge1', kind: 'item', x: 10, y: 1.5, sprite: 'charge',
      tags: ['charge'], grants: { resource: 'usb-charge', amount: 4 },
      inspect: {
        label: 'Scanner charges',
        detail: 'Antimalware definition updates — ammo for your USB scanner.',
        category: 'item',
      },
    },
  ],
  missionObjectives: [
    { id: 'clean-all', text: 'Clean all 3 infected workstations', kind: 'clean', tag: 'infected', count: 3 },
    { id: 'no-usb', text: 'Do NOT plug in the found USB stick', kind: 'avoid', tag: 'found-usb' },
    { id: 'exit', text: 'Reach the exit', kind: 'reach-exit' },
  ],
  debriefQuestions: [
    {
      id: 'q1',
      prompt: 'A workstation shows fake antivirus pop-ups and a hijacked browser. These are best described as…',
      objectives: ['2.4'],
      options: [
        { id: 'a', text: 'Indicators of malicious activity', correct: true, explanation: 'Pop-ups, changed files, and odd processes are textbook malware indicators (2.4).' },
        { id: 'b', text: 'Normal patch behavior', correct: false, explanation: 'Legitimate updates do not spawn scareware pop-ups or hijack browsers.' },
        { id: 'c', text: 'A hardware failure', correct: false, explanation: 'Hardware faults do not impersonate security software.' },
      ],
    },
    {
      id: 'q2',
      prompt: 'You find an unmarked USB drive in the hallway. The correct action is to…',
      objectives: ['2.2'],
      options: [
        { id: 'a', text: 'Plug it in to find the owner', correct: false, explanation: 'Plugging in unknown media can execute malware — a classic baiting/removable-media vector.' },
        { id: 'b', text: 'Turn it in to security without plugging it in', correct: true, explanation: 'Unknown removable media should be handled by security, never connected to a host (2.2).' },
        { id: 'c', text: 'Leave it — it is harmless', correct: false, explanation: 'Ignoring it leaves a baiting attack in place for someone else to trigger.' },
      ],
    },
  ],
};
