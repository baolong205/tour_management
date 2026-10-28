const SELECTOR = '.tour-card, .benefit, .journey-banner, .hero';
const PROPERTIES = ['--tilt-axis-x', '--tilt-axis-y', '--tilt-angle', '--light-x', '--light-y', '--depth-x', '--depth-y'];

export function tiltValues(x, y, rect, limit = 6) {
  const clamp = value => Math.max(-1, Math.min(1, value));
  const horizontal = rect.width > 0 ? clamp((x - rect.left) / rect.width * 2 - 1) : 0;
  const vertical = rect.height > 0 ? clamp((y - rect.top) / rect.height * 2 - 1) : 0;
  const magnitude = Math.hypot(horizontal, vertical);
  return {
    '--tilt-axis-x': magnitude ? String(-vertical / magnitude) : '0',
    '--tilt-axis-y': magnitude ? String(horizontal / magnitude) : '1',
    '--tilt-angle': `${Math.min(1, magnitude) * limit}deg`,
    '--light-x': `${(horizontal + 1) * 50}%`,
    '--light-y': `${(vertical + 1) * 50}%`,
    '--depth-x': `${horizontal * 8}px`,
    '--depth-y': `${vertical * 6}px`,
  };
}

// Delegation handles API-loaded cards without registering listeners per card.
export function observeTilt(root, environment = window) {
  if (!root || !environment.matchMedia || !environment.requestAnimationFrame || !environment.cancelAnimationFrame) return () => {};
  const motion = environment.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = environment.matchMedia('(hover: hover) and (pointer: fine)');
  let active = null;
  let bounds = null;
  let frame = null;
  let position = null;
  const enabled = () => !motion.matches && pointer.matches;
  function reset() {
    if (frame !== null) environment.cancelAnimationFrame(frame);
    frame = null;
    if (active) {
      active.classList.remove('tilt-active');
      PROPERTIES.forEach(property => active.style.removeProperty(property));
    }
    active = null;
    bounds = null;
  }
  function move(event) {
    if (!enabled() || event.pointerType !== 'mouse') return;
    const target = event.target?.closest?.(SELECTOR);
    if (!target || !root.contains(target)) { reset(); return; }
    if (active !== target) {
      reset();
      active = target;
      bounds = target.getBoundingClientRect();
      active.classList.add('tilt-surface', 'tilt-active');
    }
    position = { x: event.clientX, y: event.clientY };
    if (frame !== null) return;
    frame = environment.requestAnimationFrame(() => {
      frame = null;
      if (!active?.isConnected || !enabled()) { reset(); return; }
      const limit = active.matches('.hero, .journey-banner') ? 2 : 6;
      for (const [property, value] of Object.entries(tiltValues(position.x, position.y, bounds, limit))) active.style.setProperty(property, value);
    });
  }
  function out(event) {
    if (active && !active.contains(event.relatedTarget)) reset();
  }
  const passive = { passive: true };
  root.addEventListener('pointermove', move, passive);
  root.addEventListener('pointerout', out, passive);
  root.addEventListener('pointerleave', reset, passive);
  root.addEventListener('pointercancel', reset, passive);
  environment.addEventListener('scroll', reset, true);
  environment.addEventListener('resize', reset, passive);
  environment.addEventListener('blur', reset);
  motion.addEventListener?.('change', reset);
  pointer.addEventListener?.('change', reset);
  return () => {
    reset();
    root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerout', out);
    root.removeEventListener('pointerleave', reset);
    root.removeEventListener('pointercancel', reset);
    environment.removeEventListener('scroll', reset, true);
    environment.removeEventListener('resize', reset);
    environment.removeEventListener('blur', reset);
    motion.removeEventListener?.('change', reset);
    pointer.removeEventListener?.('change', reset);
    root.querySelectorAll('.tilt-surface').forEach(element => element.classList.remove('tilt-surface'));
  };
}