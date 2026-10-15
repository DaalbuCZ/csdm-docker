import vm from 'node:vm';
import { describe, it, expect } from 'vite-plus/test';
import { WEB_UI_HTML } from './web-ui';

describe('hosted browser scripts', () => {
  it('ships syntactically valid JavaScript to the browser', () => {
    const scripts = Array.from(WEB_UI_HTML.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g), (match) => match[1]).filter(
      (script) => script.trim(),
    );
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) expect(() => new vm.Script(script)).not.toThrow();
  });

  it('cancels playback when leaving a replay', () => {
    const source = WEB_UI_HTML.slice(
      WEB_UI_HTML.indexOf('/* ---------- 2D viewer ---------- */'),
      WEB_UI_HTML.indexOf('/* ---------- settings ---------- */'),
    );
    const cancelled: number[] = [];
    const context = vm.createContext({
      cancelAnimationFrame: (id: number) => cancelled.push(id),
      window: { removeEventListener: () => undefined },
    });
    vm.runInContext(source, context);
    vm.runInContext('viewer = { raf: 42, playing: true }; stopViewer();', context);
    expect(cancelled).toEqual([42]);
    expect(vm.runInContext('viewer', context)).toBe(null);
  });
});
