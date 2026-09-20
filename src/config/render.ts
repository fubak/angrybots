export const PALETTE = {
  outline: '#23180f',
  sky: { top: '#4fb0ee', bottom: '#cfeeff' },
  hills: { far: '#9fd07e', mid: '#7fc05a', near: '#5fae3f' },
  ground: {
    grass: '#6cc33c',
    grassLip: '#4f9e2a',
    dirt: '#9a6436',
    dirtDark: '#744824',
  },
  cloud: '#ffffff',
  wood: { base: '#d9974f', grain: '#b5733a', crack: '#5e3514' },
  stone: { base: '#a3a9b1', mortar: '#7c838c', crack: '#3e434a' },
  glass: { base: '#aee9ff', edge: '#ffffff', crack: '#ffffff' },
  tnt: { base: '#d8452b', band: '#2b1d14', text: '#ffd84a' },
  pig: {
    skin: '#86d94f',
    snout: '#6cc23d',
    nostril: '#2f5d1c',
    ear: '#72c840',
    helmet: '#b7bcc4',
    hat: '#8b5a2b',
    crown: '#ffcc33',
  },
  bot: {
    grok: '#3a3d4a',
    dash: '#f2a51f',
    split: '#37b6ff',
    heavy: '#6b5b95',
    blast: '#2b2b2b',
    accent: '#ff6a1a',
    eye: '#f5f7ff',
    visor: '#11131a',
  },
  sling: { wood: '#8a5a2b', band: '#4a2a14', pouch: '#6b3f1f' },
  trail: '#ffffff',
  ui: {
    button: '#ffb938',
    buttonEdge: '#c77d0a',
    primary: '#63c132',
    primaryEdge: '#3d8a17',
    panel: '#2b3a55',
    focus: '#ffffff',
  },
  score: {
    pig: '#8cf25a',
    wood: '#ffc16b',
    stone: '#e2e6ea',
    glass: '#b8f0ff',
    bonus: '#ffe066',
  },
} as const;

export const OUTLINE = {
  width: 0.035,
  terrain: 0.05,
  sling: 0.05,
} as const;

export const DEPTH = {
  sky: -100,
  hillsFar: -30,
  ground: 0,
  entities: 0,
  particles: 1,
  trail: 2,
  popups: 3,
} as const;

export const LAYERS = {
  sky: -100,
  hillsFar: -90,
  ground: 0,
  entities: 10,
  particles: 20,
  trail: 25,
  popups: 30,
} as const;
