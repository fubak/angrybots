declare module 'howler' {
  export class Howl {
    constructor(options: {
      src: string[];
      volume?: number;
      sprite?: Record<string, [number, number]>;
    });
    play(id?: string): number;
    stop(id?: number): this;
  }
}
