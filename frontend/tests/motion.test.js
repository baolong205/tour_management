import test from 'node:test';
import assert from 'node:assert/strict';
import { observePageMotion } from '../src/motion.js';

function fixture(reduced = false) {
  const listeners = new Map();
  const preference = { matches: reduced, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const intersections = [];
  const mutations = [];
  function element() {
    const classes = new Set();
    return { nodeType: 1, parentElement: null, matches: () => true, querySelectorAll: () => [], style: { setProperty() {} }, classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) } };
  }
  const card = element();
  const root = { nodeType: 1, matches: () => false, querySelectorAll: selector => selector === '.motion-enter' ? [card].filter(e => e.classList.contains(selector.slice(1))) : [card] };
  const environment = {
    matchMedia: () => preference,
    IntersectionObserver: class {
      observed = new Set();
      constructor(callback) { this.callback = callback; intersections.push(this); }
      observe(node) { this.observed.add(node); }
      unobserve(node) { this.observed.delete(node); }
      disconnect() { this.observed.clear(); }
    },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; mutations.push(this); }
      observe() { this.connected = true; }
      disconnect() { this.connected = false; }
    },
  };
  return { root, card, environment, preference, listeners, intersections, mutations, element };
}

test('content remains untouched without observer support', () => {
  assert.equal(typeof observePageMotion({}, {}), 'function');
  assert.equal(typeof observePageMotion(null, {}), 'function');
});
test('reveal observes initial and asynchronously added elements once', () => {
  const f = fixture();
  const cleanup = observePageMotion(f.root, f.environment);
  const observer = f.intersections[0];
  assert.ok(observer.observed.has(f.card));
  observer.callback([{ target: f.card, isIntersecting: false }]);
  assert.equal(f.card.classList.contains('motion-enter'), false);
  observer.callback([{ target: f.card, isIntersecting: true }]);
  assert.ok(f.card.classList.contains('motion-enter'));
  assert.equal(observer.observed.has(f.card), false);
  const added = f.element();
  f.mutations[0].callback([{ addedNodes: [added], removedNodes: [] }]);
  assert.ok(observer.observed.has(added));
  f.mutations[0].callback([{ addedNodes: [], removedNodes: [added] }]);
  assert.equal(observer.observed.has(added), false);
  cleanup();
  assert.equal(observer.observed.size, 0);
  assert.equal(f.mutations[0].connected, false);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.card.classList.contains('motion-enter'), false);
});
test('reduced motion disables observers and supports live preference changes', () => {
  const f = fixture(true);
  const cleanup = observePageMotion(f.root, f.environment);
  assert.equal(f.intersections.length, 0);
  f.preference.matches = false;
  f.listeners.get('change')();
  assert.ok(f.intersections[0].observed.has(f.card));
  f.preference.matches = true;
  f.listeners.get('change')();
  assert.equal(f.intersections[0].observed.size, 0);
  f.preference.matches = false;
  f.listeners.get('change')();
  assert.ok(f.intersections[1].observed.has(f.card));
  cleanup();
});