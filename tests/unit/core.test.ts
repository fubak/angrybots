import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/EventBus';
import { FixedStepLoop } from '../../src/core/FixedStepLoop';
import { StateMachine } from '../../src/core/StateMachine';
import { rng } from '../../src/core/rng';

describe('EventBus', () => {
  it('delivers in subscription order and unsubscribe works', () => {
    const bus = new EventBus<{ a: { n: number } }>();
    const order: number[] = [];
    const off1 = bus.on('a', () => order.push(1));
    bus.on('a', () => order.push(2));
    bus.emit('a', { n: 0 });
    expect(order).toEqual([1, 2]);
    off1();
    bus.emit('a', { n: 1 });
    expect(order).toEqual([1, 2, 2]);
  });

  it('clear removes all listeners', () => {
    const bus = new EventBus<{ a: {} }>();
    let n = 0;
    bus.on('a', () => {
      n++;
    });
    bus.clear();
    bus.emit('a', {});
    expect(n).toBe(0);
  });
});

describe('FixedStepLoop', () => {
  function makeLoop(opts: Partial<Parameters<typeof FixedStepLoop>[0]> = {}) {
    const updates: number[] = [];
    const renders: { alpha: number; frameDt: number }[] = [];
    let nowMs = 0;
    const scheduled: Array<(t: number) => void> = [];
    const loop = new FixedStepLoop({
      step: 1 / 60,
      maxStepsPerFrame: 5,
      update: (dt) => updates.push(dt),
      render: (alpha, frameDt) => renders.push({ alpha, frameDt }),
      schedule: (cb) => {
        const id = scheduled.length;
        scheduled.push(cb);
        return id;
      },
      now: () => nowMs,
      ...opts,
    });
    return { loop, updates, renders, scheduled, setNow: (t: number) => (nowMs = t) };
  }

  it('runs 3 updates for 50ms frame and caps at 5 for 500ms', () => {
    const a = makeLoop();
    a.loop.start();
    a.setNow(50);
    a.scheduled[0](50);
    expect(a.updates.length).toBe(3);
    expect(a.updates.every((dt) => Math.abs(dt - 1 / 60) < 1e-9)).toBe(true);

    const b = makeLoop();
    b.loop.start();
    b.setNow(500);
    b.scheduled[0](500);
    expect(b.updates.length).toBe(5);
  });

  it('paused skips updates but still renders', () => {
    const { loop, updates, renders, scheduled, setNow } = makeLoop();
    loop.paused = true;
    loop.start();
    setNow(100);
    scheduled[0](100);
    expect(updates.length).toBe(0);
    expect(renders.length).toBe(1);
  });

  it('timeScale halves updates', () => {
    const { loop, updates, scheduled, setNow } = makeLoop();
    loop.timeScale = 0.5;
    loop.start();
    setNow(100);
    scheduled[0](100);
    expect(updates.length).toBe(Math.floor(100 / 1000 / (1 / 60) * 0.5));
  });

  it('render alpha is in [0, 1)', () => {
    const { loop, renders, scheduled, setNow } = makeLoop();
    loop.start();
    setNow(33);
    scheduled[0](33);
    expect(renders[0].alpha).toBeGreaterThanOrEqual(0);
    expect(renders[0].alpha).toBeLessThan(1);
  });

  it('advance runs n steps synchronously', () => {
    const { loop, updates } = makeLoop();
    loop.advance(4);
    expect(updates.length).toBe(4);
  });
});

describe('StateMachine', () => {
  it('throws on illegal transition and calls exit then enter', () => {
    const log: string[] = [];
    const sm = new StateMachine('a', {
      a: {
        exit: () => log.push('exit-a'),
        enter: () => log.push('enter-a'),
        next: ['b'],
      },
      b: {
        exit: () => log.push('exit-b'),
        enter: () => log.push('enter-b'),
        next: ['a'],
      },
    });
    log.length = 0;
    sm.go('b');
    expect(log).toEqual(['exit-a', 'enter-b']);
    expect(() => sm.go('b')).toThrow();
  });
});

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = rng(42);
    const b = rng(42);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
    const c = rng(43);
    expect(c()).not.toBe(seqA[0]);
  });
});
