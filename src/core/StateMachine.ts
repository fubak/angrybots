export type StateDef<S extends string> = {
  enter?(): void;
  exit?(): void;
  update?(dt: number): void;
  next: S[];
};

export class StateMachine<S extends string> {
  private _current: S;
  private readonly table: Record<S, StateDef<S>>;

  constructor(initial: S, table: Record<S, StateDef<S>>) {
    this._current = initial;
    this.table = table;
    table[initial].enter?.();
  }

  get current(): S {
    return this._current;
  }

  go(to: S): void {
    const def = this.table[this._current];
    if (!def.next.includes(to)) {
      throw new Error(`Illegal transition ${this._current} → ${to}`);
    }
    def.exit?.();
    this._current = to;
    this.table[to].enter?.();
  }

  update(dt: number): void {
    this.table[this._current].update?.(dt);
  }
}
