/** Chapter metadata for Gate 3 progression (levels reference `chapter` id). */
export const CHAPTERS = [
  {
    id: 'training',
    name: 'Training Grounds',
    levelIds: [
      'training-yard',
      'low-wall',
      'twin-posts',
      'stone-lip',
      'glass-windows',
      'triple-deck',
      'dash-lane',
      'heavy-gate',
    ],
  },
  {
    id: 'glassworks',
    name: 'Glassworks',
    levelIds: ['glass-arch', 'glass-columns', 'glass-bridge'],
  },
  {
    id: 'blast',
    name: 'Blast Yard',
    levelIds: ['tnt-yard', 'tnt-pillar', 'tnt-duo'],
  },
] as const;
