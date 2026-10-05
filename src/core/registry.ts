/** Minimal id-keyed registry used for tools, missions, textures, sprites. */
export class Registry<T> {
  private items = new Map<string, T>();

  register(id: string, item: T): void {
    this.items.set(id, item);
  }

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  require(id: string): T {
    const v = this.items.get(id);
    if (v === undefined) throw new Error(`Registry: unknown id "${id}"`);
    return v;
  }

  all(): T[] {
    return [...this.items.values()];
  }

  ids(): string[] {
    return [...this.items.keys()];
  }
}
