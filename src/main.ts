import { App } from './app/App';

const root = document.querySelector('#app');
if (root) {
  root.setAttribute('data-game', 'angrybots');
  new App(root as HTMLElement);
}
