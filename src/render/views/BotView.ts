import type { BotKind } from '../../levels/schema';
import { makeBotCharacter } from '../characters';

export class BotView {
  readonly object = makeBotCharacter('grok', 0.58);

  setKind(kind: BotKind, radius: number): void {
    this.object.clear();
    this.object.add(makeBotCharacter(kind, radius));
  }

  sync(): void {}
}
