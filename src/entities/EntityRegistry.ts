import type { GameEntity } from './types';

export class EntityRegistry {
  private byId = new Map<string, GameEntity>();
  private list: GameEntity[] = [];

  add(entity: GameEntity): void {
    this.byId.set(entity.id, entity);
    this.list.push(entity);
  }

  get(id: string): GameEntity | undefined {
    return this.byId.get(id);
  }

  all(): readonly GameEntity[] {
    return this.list;
  }

  blocksAndPigs(): GameEntity[] {
    return this.list.filter((e) => e.alive && (e.kind === 'block' || e.kind === 'pig'));
  }

  clear(): void {
    this.byId.clear();
    this.list.length = 0;
  }
}
