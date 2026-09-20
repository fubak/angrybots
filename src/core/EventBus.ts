type Handler<E> = (event: E) => void;

export class EventBus<E extends Record<string, unknown>> {
  private listeners = new Map<keyof E, Set<Handler<E[keyof E]>>>();

  on<K extends keyof E>(type: K, fn: (e: E[K]) => void): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(fn as Handler<E[keyof E]>);
    return () => {
      set!.delete(fn as Handler<E[keyof E]>);
    };
  }

  emit<K extends keyof E>(type: K, e: E[K]): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const fn of set) {
      fn(e as E[keyof E]);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
