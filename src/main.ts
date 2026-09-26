import { App } from './app/App';

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
