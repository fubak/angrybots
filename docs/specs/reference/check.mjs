import { validateStatic, buildWorld, settle, idle } from './sim.mjs';
import { SLICE_LEVELS } from './levels.mjs';
for (const L of SLICE_LEVELS) {
  const errs = validateStatic(L);
  const s = buildWorld(L); const st = settle(s); const died = idle(s, 3);
  console.log(L.id.padEnd(14), 'static:', errs.length ? errs.join('; ') : 'ok',
    `| settle move ${st.maxMove.toFixed(3)} rot ${st.maxRotDeg.toFixed(2)}° | idle deaths: ${died.join(',') || 'none'}`);
}
