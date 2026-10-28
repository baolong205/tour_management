import test from 'node:test';
import assert from 'node:assert/strict';
import { observeTilt, tiltValues } from '../src/tilt.js';

test('tilt is neutral at center, bounded at edges, safe for zero dimensions', () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 };
  assert.equal(tiltValues(100, 50, rect)['--tilt-angle'], '0deg');
  const edge = tiltValues(1000, -1000, rect);
  assert.equal(edge['--tilt-angle'], '6deg');
  assert.equal(edge['--light-x'], '100%');
  assert.equal(edge['--light-y'], '0%');
  assert.equal(tiltValues(200, 100, rect, 2)['--tilt-angle'], '2deg');
  assert.equal(tiltValues(20, 20, { ...rect, width: 0, height: 0 })['--tilt-angle'], '0deg');
});

function fixture() {
  const handlers = new Map();
  const globals = new Map();
  const frames = new Map();
  const changes = new Map();
  const values = new Map();
  const classes = new Set();
  const motion = { matches: false, addEventListener: (_, fn) => changes.set('motion', fn), removeEventListener: () => changes.delete('motion') };
  const pointer = { ...motion, matches: true, addEventListener: (_, fn) => changes.set('pointer', fn), removeEventListener: () => changes.delete('pointer') };
  const target = {
    isConnected: true, closest() { return this; }, matches: () => false,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 100 }),
    classList: { add: (...names) => names.forEach(n => classes.add(n)), remove: name => classes.delete(name) },
    style: { setProperty: (key, value) => values.set(key, value), removeProperty: key => values.delete(key) },
    contains: node => node === target,
  };
  const root = { contains: node => node === target, addEventListener: (key, fn) => handlers.set(key, fn), removeEventListener: key => handlers.delete(key), querySelectorAll: () => [target] };
  let next = 0;
  const environment = {
    matchMedia: query => query.includes('reduced') ? motion : pointer,
    requestAnimationFrame: fn => { frames.set(++next, fn); return next; }, cancelAnimationFrame: id => frames.delete(id),
    addEventListener: (key, fn) => globals.set(key, fn), removeEventListener: key => globals.delete(key),
  };
  const event = { target, pointerType: 'mouse', clientX: 180, clientY: 10 };
  return { root, environment, handlers, globals, frames, changes, values, classes, motion, pointer, target, event };
}

test('delegated tilt batches frames, resets and cleans listeners', () => {
  const f = fixture();
  const cleanup = observeTilt(f.root, f.environment);
  f.handlers.get('pointermove')(f.event);
  f.handlers.get('pointermove')({ ...f.event, clientX: 160 });
  assert.equal(f.frames.size, 1);
  [...f.frames.values()][0]();
  f.frames.clear();
  assert.ok(f.values.has('--tilt-angle'));
  assert.ok(f.classes.has('tilt-active'));
  f.handlers.get('pointerout')({ relatedTarget: f.target });
  assert.ok(f.classes.has('tilt-active'));
  f.globals.get('scroll')();
  assert.equal(f.values.size, 0);
  assert.equal(f.classes.has('tilt-active'), false);
  f.handlers.get('pointermove')(f.event);
  cleanup();
  assert.equal(f.frames.size, 0);
  assert.equal(f.handlers.size, 0);
  assert.equal(f.globals.size, 0);
  assert.equal(f.changes.size, 0);
  assert.equal(f.classes.size, 0);
});

test('touch, reduced motion and coarse pointers never start tilt', () => {
  const f = fixture();
  const cleanup = observeTilt(f.root, f.environment);
  f.handlers.get('pointermove')({ ...f.event, pointerType: 'touch' });
  assert.equal(f.frames.size, 0);
  f.motion.matches = true;
  f.handlers.get('pointermove')(f.event);
  assert.equal(f.frames.size, 0);
  f.motion.matches = false;
  f.pointer.matches = false;
  f.handlers.get('pointermove')(f.event);
  assert.equal(f.frames.size, 0);
  f.pointer.matches = true;
  f.handlers.get('pointermove')(f.event);
  f.motion.matches = true;
  f.changes.get('motion')();
  assert.equal(f.frames.size, 0);
  assert.equal(f.classes.has('tilt-active'), false);
  cleanup();
});

test('missing browser support leaves content untouched', () => {
  assert.equal(typeof observeTilt({}, {}), 'function');
});