import type { Gender, Mission, ScoreEvent } from '../core/types';
import { missionRegistry } from '../content/missions';
import { objectiveById } from '../content/objectives';

/**
 * ARSENAL/LOOK: HTML overlay screens — title, character select, mission
 * select, briefing, debrief quiz. Each returns a DOM element; main.ts
 * swaps them in/out of #app.
 */

function el(tag: string, cls = '', html = ''): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

function button(label: string, onClick: () => void, cls = 'btn'): HTMLElement {
  const b = el('button', cls, label);
  b.addEventListener('click', onClick);
  return b;
}

export function titleScreen(onStart: () => void): HTMLElement {
  const s = el('div', 'screen');
  s.appendChild(el('h1', '', 'CYBERDOOM'));
  s.appendChild(el('h2', '', 'SECURITY+ FIELD TRAINING'));
  s.appendChild(
    el('p', '', 'A Doom-style first-person training ground for the CompTIA ' +
      'Security+ SY0-701. Your weapons are IT tools: keyboard, mouse, USB ' +
      'scanner, and your badge. Clean malware. Enforce least privilege. ' +
      'Catch the insider.'),
  );
  s.appendChild(button('INSERT COIN — START', onStart));
  s.appendChild(
    el('p', '', 'WASD move · mouse look · arrows turn · Shift run · ' +
      'LMB use tool · E/Space interact · 1-4 / wheel select tool'),
  );
  return s;
}

function drawPortrait(canvas: HTMLCanvasElement, gender: Gender): void {
  const g = canvas.getContext('2d')!;
  canvas.width = 48;
  canvas.height = 48;
  const skin = gender === 'female' ? '#f0c8a0' : '#e8b98a';
  const hair = gender === 'female' ? '#620' : '#432';
  const shirt = gender === 'female' ? '#7a2d8e' : '#27407a';
  g.fillStyle = '#0a0a10';
  g.fillRect(0, 0, 48, 48);
  g.fillStyle = shirt;
  g.fillRect(12, 34, 24, 14);
  g.fillStyle = skin;
  g.fillRect(16, 12, 16, 16);
  g.fillStyle = hair;
  g.fillRect(15, 8, 18, 6);
  if (gender === 'female') {
    g.fillRect(13, 12, 4, 22);
    g.fillRect(31, 12, 4, 22);
  }
  g.fillStyle = '#111';
  g.fillRect(19, 19, 3, 3);
  g.fillRect(26, 19, 3, 3);
  g.fillRect(21, 26, 6, 2);
  // headset
  g.fillStyle = '#39d353';
  g.fillRect(14, 20, 2, 6);
  g.fillRect(14, 26, 8, 2);
}

export function characterSelect(onPick: (g: Gender) => void): HTMLElement {
  const s = el('div', 'screen');
  s.appendChild(el('h2', '', 'SELECT YOUR ANALYST'));
  const cards = el('div', 'char-cards');
  const mk = (gender: Gender, name: string, role: string) => {
    const c = el('div', 'char-card');
    const cv = document.createElement('canvas');
    drawPortrait(cv, gender);
    c.appendChild(cv);
    c.appendChild(el('div', 'name', name));
    c.appendChild(el('div', 'role', role));
    c.addEventListener('click', () => onPick(gender));
    return c;
  };
  cards.appendChild(mk('male', 'RAY', 'SOC Analyst'));
  cards.appendChild(mk('female', 'VEGA', 'SOC Analyst'));
  s.appendChild(cards);
  return s;
}

export function missionSelect(onPick: (id: string) => void): HTMLElement {
  const s = el('div', 'screen');
  s.appendChild(el('h2', '', 'SELECT MISSION'));
  for (const m of missionRegistry.all()) {
    const row = el('div', 'mission-row');
    row.appendChild(el('span', 'diff', '☣'.repeat(Math.min(3, Math.ceil(m.difficulty / 3)))));
    const body = el('div');
    body.appendChild(el('div', 'mtitle', `M${m.id.slice(1)} — ${m.title}`));
    body.appendChild(
      el(
        'div',
        'objs',
        m.objectives
          .map((id) => `${id} ${objectiveById(id)?.title ?? ''}`.slice(0, 70))
          .join(' · '),
      ),
    );
    row.appendChild(body);
    row.addEventListener('click', () => onPick(m.id));
    s.appendChild(row);
  }
  return s;
}

export function briefing(mission: Mission, onGo: () => void): HTMLElement {
  const s = el('div', 'screen');
  s.appendChild(el('h2', '', `MISSION ${mission.id.toUpperCase()}: ${mission.title}`));
  const box = el('div', 'brief-box');
  box.appendChild(el('p', '', mission.briefing));
  const objs = el('div', 'objlist');
  for (const o of mission.missionObjectives) {
    objs.appendChild(el('div', 'pending', o.text));
  }
  box.appendChild(objs);
  s.appendChild(box);
  s.appendChild(button('DEPLOY ▸', onGo));
  return s;
}

export function debrief(opts: {
  mission: Mission;
  won: boolean;
  score: number;
  scoreLog: ScoreEvent[];
  objectives: { text: string; done: boolean; failed: boolean }[];
  onDone: (quizScore: number) => void;
}): HTMLElement {
  const s = el('div', 'screen');
  s.appendChild(
    el('h2', opts.won ? 'debrief-good' : 'debrief-bad',
      opts.won ? `MISSION COMPLETE — ${opts.mission.title}` : `MISSION FAILED — ${opts.mission.title}`),
  );
  s.appendChild(el('div', 'score-big', `SCORE ${opts.score}`));

  const objl = el('div', 'objlist');
  for (const o of opts.objectives) {
    objl.appendChild(
      el('div', o.failed ? 'failed' : o.done ? 'done' : 'pending',
        `${o.failed ? '✗' : o.done ? '✓' : '·'} ${o.text}`),
    );
  }
  s.appendChild(objl);

  const log = el('div', 'debrief-table');
  for (const e of opts.scoreLog) {
    const d = el(
      'div',
      e.good ? 'debrief-good' : 'debrief-bad',
      `${e.points >= 0 ? '+' : ''}${e.points} — ${e.text}` +
        (e.objectives.length ? ` <small>(${e.objectives.join(', ')})</small>` : ''),
    );
    log.appendChild(d);
  }
  s.appendChild(log);

  // quiz
  const quiz = el('div', 'quiz');
  let correct = 0;
  let answered = 0;
  const total = opts.mission.debriefQuestions.length;
  for (const q of opts.mission.debriefQuestions) {
    const qd = el('div', 'q');
    qd.appendChild(el('div', 'qtext', q.prompt));
    for (const opt of q.options) {
      const label = el('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = q.id;
      label.appendChild(radio);
      label.appendChild(document.createTextNode(' ' + opt.text));
      const expl = el('div', 'expl', opt.explanation);
      label.appendChild(expl);
      radio.addEventListener('change', () => {
        if (qd.classList.contains('answered')) return;
        qd.classList.add('answered');
        answered++;
        if (opt.correct) {
          correct++;
          label.classList.add('opt-correct');
        } else {
          label.classList.add('opt-wrong');
          qd.querySelectorAll('label').forEach((l, i) => {
            if (q.options[i].correct) l.classList.add('opt-correct');
          });
        }
        if (answered === total) doneBtn.textContent = `CONTINUE ▸ (${correct}/${total} correct)`;
      });
      qd.appendChild(label);
    }
    quiz.appendChild(qd);
  }
  s.appendChild(quiz);

  const doneBtn = button('CONTINUE ▸', () => opts.onDone(correct));
  s.appendChild(doneBtn);
  return s;
}
