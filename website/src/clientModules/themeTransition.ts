/**
 * Day/night switch transition.
 *
 * Watches `html[data-theme]` and, for the duration of a switch, adds
 * `html.theme-transitioning` so CSS can (a) transition colours / radii on
 * ordinary elements and (b) dual-render the hero + workflow art for a
 * crossfade. Outside that window the inactive art stays `display: none`, so
 * resting and scrolling cost is unchanged.
 *
 * MutationObserver callbacks run as microtasks, i.e. after Docusaurus sets
 * the attribute but before the next frame is painted, so the class lands in
 * the same style recalc as the theme change and no frame snaps.
 */
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

/** Keep in sync with --anima-theme-switch-duration in art-adapters.css. */
const DURATION_MS = 520;
const CLASS_NAME = 'theme-transitioning';

/**
 * Reserved hook: whole-page View Transitions crossfade.
 * Off by default (it snapshots the page, which is heavy with the hero SVG and
 * blurs the art during the fade). Kept until the element-level transition is
 * signed off; delete this block and `installViewTransition` afterwards.
 */
const ENABLE_VIEW_TRANSITION = false;
const TOGGLE_SELECTOR = '[class*="colorModeToggle"] button';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function installClassTransition(): void {
  const root = document.documentElement;
  let timer: number | undefined;

  const observer = new MutationObserver((records) => {
    const changed = records.some(
      (r) => r.oldValue !== root.getAttribute('data-theme'),
    );
    if (!changed || prefersReducedMotion()) return;

    // Restart the window if the user toggles again mid-transition.
    window.clearTimeout(timer);
    root.classList.add(CLASS_NAME);
    timer = window.setTimeout(() => root.classList.remove(CLASS_NAME), DURATION_MS);
  });

  observer.observe(root, {
    attributes: true,
    attributeFilter: ['data-theme'],
    attributeOldValue: true,
  });
}

function installViewTransition(): void {
  type VTDocument = Document & {startViewTransition?: (cb: () => void) => unknown};
  const doc = document as VTDocument;
  if (typeof doc.startViewTransition !== 'function') return;

  let bypass = false;
  document.addEventListener(
    'click',
    (event) => {
      if (bypass || prefersReducedMotion()) return;
      const button = (event.target as Element | null)?.closest?.(TOGGLE_SELECTOR);
      if (!(button instanceof HTMLElement)) return;
      // Swallow the original click, then replay it inside the transition so
      // Docusaurus flips data-theme while the old frame is captured.
      event.stopImmediatePropagation();
      event.preventDefault();
      doc.startViewTransition!(() => {
        bypass = true;
        button.click();
        bypass = false;
      });
    },
    true,
  );
}

if (ExecutionEnvironment.canUseDOM) {
  installClassTransition();
  if (ENABLE_VIEW_TRANSITION) installViewTransition();
}
