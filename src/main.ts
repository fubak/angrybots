import { installGoogleAnalytics } from './analytics/ga';
import { App } from './app/App';

if (import.meta.env.PROD) installGoogleAnalytics(import.meta.env.VITE_GA_MEASUREMENT_ID);

const root = document.querySelector('#app');
if (root) {
  root.setAttribute('data-game', 'angrybots');
  new App(root as HTMLElement);
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
    .catch(() => {});
}
