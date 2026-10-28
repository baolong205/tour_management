// Progressive enhancement: content stays readable even if observers are unavailable.
const TARGETS = '.section-heading, .center-heading, .tour-card, .benefit, .journey-banner, .panel, .booking-panel, .filter-panel, .detail-cover, .auth-layout';

export function observePageMotion(root, environment = window) {
  if (!root || !environment.matchMedia || !environment.IntersectionObserver || !environment.MutationObserver) return () => {};
  const preference = environment.matchMedia('(prefers-reduced-motion: reduce)');
  let seen = new WeakSet();
  let intersection;
  let mutations;
  let disposed = false;

  function scan(node) {
    if (node.nodeType !== 1) return;
    const elements = [...(node.matches(TARGETS) ? [node] : []), ...node.querySelectorAll(TARGETS)];
    for (const element of elements) {
      if (seen.has(element)) continue;
      seen.add(element);
      // Cap stagger so long grids never leave the user waiting for content.
      const siblings = element.parentElement ? [...element.parentElement.children] : [];
      element.style.setProperty('--reveal-delay', `${Math.max(0, siblings.indexOf(element) % 3) * 65}ms`);
      intersection.observe(element);
    }
  }

  function stop() {
    intersection?.disconnect();
    mutations?.disconnect();
    root.querySelectorAll('.motion-enter').forEach(element => element.classList.remove('motion-enter'));
  }

  function start() {
    stop();
    if (disposed || preference.matches) return;
    seen = new WeakSet();
    intersection = new environment.IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('motion-enter');
          intersection.unobserve(entry.target);
        }
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    scan(root);
    // Includes asynchronously fetched tours and protected screens after login.
    mutations = new environment.MutationObserver(records => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (node.nodeType !== 1) continue;
          intersection.unobserve(node);
          node.querySelectorAll(TARGETS).forEach(element => intersection.unobserve(element));
        }
        record.addedNodes.forEach(scan);
      }
    });
    mutations.observe(root, { childList: true, subtree: true });
  }

  start();
  preference.addEventListener?.('change', start);
  return () => {
    disposed = true;
    stop();
    preference.removeEventListener?.('change', start);
  };
}