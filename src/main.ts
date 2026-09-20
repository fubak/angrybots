import { App } from './app/App';

const root = document.querySelector('#app');
if (root) {
  new App(root as HTMLElement);
}
