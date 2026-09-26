import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Extracts the official GrokBot sticker SVGs into layered path data for
// src/render/botArt.generated.ts. Layers: white backing shape, colored body
// silhouette, white "extra" marks baked into the body texture (shines), and
// white eye shapes on their own plane so they can look/blink at runtime.
// Re-run after replacing any file in src/assets/bots/:
//   npx tsx tools/extract-bot-art.ts

const srcDir = join(import.meta.dirname, '../src/assets/bots');
const outFile = join(import.meta.dirname, '../src/render/botArt.generated.ts');

type Cmd = { op: string; args: number[] };
type Subpath = { d: string; box: [number, number, number, number]; area: number };

const NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

function tokenize(d: string): Cmd[] {
  const cmds: Cmd[] = [];
  const re = /([MmLlHhVvCcSsZz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/g;
  let m: RegExpExecArray | null;
  let op = '';
  let args: number[] = [];
  const arity: Record<string, number> = {
    M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Z: 0,
  };
  const flush = () => {
    if (op && (args.length > 0 || op.toUpperCase() === 'Z')) cmds.push({ op, args });
    op = '';
    args = [];
  };
  while ((m = re.exec(d))) {
    if (m[1]) {
      flush();
      op = m[1];
      if (op.toUpperCase() === 'Z') flush();
    } else if (op) {
      args.push(parseFloat(m[2]!));
      const need = arity[op.toUpperCase()] ?? 0;
      if (need > 0 && args.length === need) {
        const cmd = { op, args };
        cmds.push(cmd);
        // implicit lineto after moveto
        if (op === 'M') op = 'L';
        else if (op === 'm') op = 'l';
        args = [];
      }
    }
  }
  flush();
  return cmds.filter((c) => c.op !== '' );
}

/** Splits a path into subpaths at each moveto and returns {d, box} per part. */
function subpaths(d: string): Subpath[] {
  // split raw string at every M/m that is not the first char
  const parts: string[] = [];
  const re = /[Mm]/g;
  let m: RegExpExecArray | null;
  let prev = 0;
  let first = true;
  while ((m = re.exec(d))) {
    if (first) {
      first = false;
      prev = m.index;
      continue;
    }
    parts.push(d.slice(prev, m.index));
    prev = m.index;
  }
  parts.push(d.slice(prev));
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => ({ d: p, ...measure(p) }));
}

function measure(d: string): { box: [number, number, number, number]; area: number } {
  const cmds = tokenize(d);
  let x = 0, y = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const touch = (px: number, py: number) => {
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  };
  let prevCtrl: [number, number] | null = null;
  for (const c of cmds) {
    const rel = c.op === c.op.toLowerCase();
    const P = (i: number): [number, number] => {
      const px = c.args[i]! + (rel ? x : 0);
      const py = c.args[i + 1]! + (rel ? y : 0);
      return [px, py];
    };
    switch (c.op.toUpperCase()) {
      case 'M':
      case 'L': {
        const [px, py] = P(0);
        x = px; y = py; touch(x, y); prevCtrl = null;
        break;
      }
      case 'H': {
        x = c.args[0]! + (rel ? x : 0); touch(x, y); prevCtrl = null;
        break;
      }
      case 'V': {
        y = c.args[0]! + (rel ? y : 0); touch(x, y); prevCtrl = null;
        break;
      }
      case 'C': {
        const [x1, y1] = P(0);
        const [x2, y2] = P(2);
        const [x3, y3] = P(4);
        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          const u = 1 - t;
          touch(
            u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
            u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
          );
        }
        x = x3; y = y3; prevCtrl = [x2, y2];
        break;
      }
      case 'S': {
        const [x1, y1]: [number, number] = prevCtrl
          ? [2 * x - prevCtrl[0], 2 * y - prevCtrl[1]]
          : [x, y];
        const [x2, y2] = P(0);
        const [x3, y3] = P(2);
        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          const u = 1 - t;
          touch(
            u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
            u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
          );
        }
        x = x3; y = y3; prevCtrl = [x2, y2];
        break;
      }
      case 'Z': prevCtrl = null; break;
    }
  }
  const w = maxX - minX;
  const h = maxY - minY;
  return { box: [minX, minY, w, h], area: w * h };
}

type Sticker = {
  file: string;
  id: string;
  vbW: number;
  vbH: number;
  backing: { circle?: [number, number, number]; d?: string };
  bodyColor: string;
  body: string;
  eyes: { d: string; box: [number, number, number, number] }[];
  extras: { d: string; box: [number, number, number, number] }[];
  note: string;
};

function parseSticker(file: string, svg: string): Sticker {
  const id = file.match(/-(\d+)\.svg$/)![1]!;
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!;
  const vbW = parseFloat(vb[1]!);
  const vbH = parseFloat(vb[2]!);

  const classes = new Map<string, { fill?: string; evenodd: boolean }>();
  const style = svg.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
  for (const cm of style.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const body = cm[2]!;
    const fill = body.match(/fill:\s*(#[0-9a-fA-F]{3,8})/)?.[1]?.toLowerCase();
    const evenodd = /fill-rule:\s*evenodd/.test(body);
    for (const sel of cm[1]!.split(',')) {
      const name = sel.trim().replace(/^\./, '');
      if (!name || name.includes(' ')) continue;
      const prev = classes.get(name) ?? { evenodd: false };
      classes.set(name, {
        fill: fill ?? prev.fill,
        evenodd: prev.evenodd || evenodd,
      });
    }
  }

  const els: { tag: string; cls: string; attrs: Record<string, string> }[] = [];
  for (const em of svg.matchAll(/<(circle|path|ellipse|rect)\b([^>]*?)\/?>/g)) {
    const attrs: Record<string, string> = {};
    for (const am of em[2]!.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[am[1]!] = am[2]!;
    if (attrs['id'] === 'Artwork') continue;
    els.push({ tag: em[1]!, cls: attrs['class'] ?? '', attrs });
  }
  if (els.length < 2) throw new Error(`${file}: expected backing + body, got ${els.length}`);

  const back = els[0]!;
  const backCls = classes.get(back.cls);
  if (backCls?.fill !== '#fff') throw new Error(`${file}: backing not white (${backCls?.fill})`);
  const backing: Sticker['backing'] =
    back.tag === 'circle'
      ? { circle: [parseFloat(back.attrs['cx']!), parseFloat(back.attrs['cy']!), parseFloat(back.attrs['r']!)] }
      : { d: back.attrs['d']! };

  const bodyEl = els[1]!;
  const bodyCls = classes.get(bodyEl.cls);
  const bodyColor = bodyCls?.fill ?? '#000000';
  if (!bodyCls?.evenodd) throw new Error(`${file}: body path is not evenodd`);

  const parts = subpaths(bodyEl.attrs['d']!);
  const holes = parts.slice(1);
  if (holes.length === 0) throw new Error(`${file}: no feature subpaths`);

  // Feature classification: the biggest hole is always an eye (every bot has at
  // least one). A second hole < 20% of that area is a shine baked into the body
  // texture; anything comparable is a second eye on the animated layer.
  const byArea = [...holes].sort((a, b) => b.area - a.area);
  const maxArea = byArea[0]!.area;
  const eyes = holes.filter((h) => h.area >= maxArea * 0.2);
  const extras = holes.filter((h) => h.area < maxArea * 0.2);
  const note = `${holes.length} holes: ${eyes.length} eye(s)${extras.length ? ` + ${extras.length} baked shine` : ''}`;

  return {
    file, id, vbW, vbH, backing, bodyColor,
    body: parts[0]!.d,
    eyes: eyes.map((h) => ({ d: h.d, box: h.box })),
    extras: extras.map((h) => ({ d: h.d, box: h.box })),
    note,
  };
}

const stickers: Sticker[] = [];
for (const file of readdirSync(srcDir).filter((f) => f.endsWith('.svg')).sort()) {
  const svg = readFileSync(join(srcDir, file), 'utf8');
  const s = parseSticker(file, svg);
  stickers.push(s);
  console.log(
    `${s.id}: vb ${s.vbW}x${s.vbH} body ${s.bodyColor} — ${s.note}` +
      ` | eyes: ${s.eyes.map((e) => e.box.map((n) => n.toFixed(0)).join(',')).join(' / ')}` +
      `${s.extras.length ? ` | extras: ${s.extras.map((e) => e.box.map((n) => n.toFixed(0)).join(',')).join(' / ')}` : ''}`
  );
}

const esc = (d: string) => d.replace(/"/g, '\\"');
const roundBox = (b: [number, number, number, number]) =>
  `[${b.map((n) => +n.toFixed(2)).join(', ')}]`;

let out = `// GENERATED by tools/extract-bot-art.ts — do not edit by hand.
// Source: official GrokBot sticker SVGs in src/assets/bots/ (user-supplied).
// Layers per sticker: white backing shape, colored body silhouette, baked
// white "extras" (shines), and white eye shapes drawn on a separate layer so
// they can look/blink. eyeBox = union of eye bboxes in viewBox units.

export type StickerEye = { d: string; box: readonly [number, number, number, number] };

export type StickerArt = {
  id: string;
  vbW: number;
  vbH: number;
  backing: { circle?: readonly [number, number, number]; d?: string };
  bodyColor: string;
  body: string;
  eyes: readonly StickerEye[];
  extras: readonly StickerEye[];
  eyeBox: readonly [number, number, number, number];
};

export const STICKERS: readonly StickerArt[] = [
`;
for (const s of stickers) {
  const eyeBoxes = s.eyes.map((e) => e.box);
  const ex = Math.min(...eyeBoxes.map((b) => b[0]));
  const ey = Math.min(...eyeBoxes.map((b) => b[1]));
  const ex2 = Math.max(...eyeBoxes.map((b) => b[0] + b[2]));
  const ey2 = Math.max(...eyeBoxes.map((b) => b[1] + b[3]));
  out += `  {
    // ${s.file} — ${s.note}
    id: '${s.id}',
    vbW: ${s.vbW},
    vbH: ${s.vbH},
    backing: ${s.backing.circle ? `{ circle: [${s.backing.circle.join(', ')}] }` : `{ d: "${esc(s.backing.d!)}" }`},
    bodyColor: '${s.bodyColor}',
    body: "${esc(s.body)}",
    eyes: [
${s.eyes.map((e) => `      { d: "${esc(e.d)}", box: ${roundBox(e.box)} },`).join('\n')}
    ],
    extras: [
${s.extras.map((e) => `      { d: "${esc(e.d)}", box: ${roundBox(e.box)} },`).join('\n')}
    ],
    eyeBox: ${roundBox([ex, ey, ex2 - ex, ey2 - ey])},
  },
`;
}
out += `];

export const STICKER_BY_ID: Record<string, StickerArt> = Object.fromEntries(
  STICKERS.map((s) => [s.id, s])
);
`;

writeFileSync(outFile, out);
console.log(`wrote ${outFile} (${stickers.length} stickers)`);
