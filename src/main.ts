import './style.css';
import { Game } from './Game';

const app = document.querySelector<HTMLDivElement>('#app')!;
const game = new Game(app);
if (import.meta.env.DEV) {
  (window as unknown as { __game: Game }).__game = game;
}

let last = performance.now();
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.tick(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
