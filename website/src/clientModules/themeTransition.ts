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
import {getHeroSwitchHandler, heroSwitchState} from '../utils/heroSwitchHook';

/** Keep in sync with --anima-theme-switch-duration in art-adapters.css. */
const DURATION_MS = 520;
const CLASS_NAME = 'theme-transitioning';

/**
 * Primary path: whole-page View Transitions crossfade. The browser snapshots
 * the old frame once and fades it over the new one on the compositor, so no
 * per-element colour transitions run (the class path below eases ~740 nodes,
 * and inherited colours restart every frame). Browsers without
 * startViewTransition fall back to the class path.
 */
const ENABLE_VIEW_TRANSITION = true;
/** Set on <html> while a view transition runs; CSS pauses art loops with it. */
const VT_CLASS_NAME = 'theme-vt';
const TOGGLE_SELECTOR = '[class*="colorModeToggle"] button';
let viewTransitionActive = false;

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
      if (
        !changed ||
        viewTransitionActive ||
        heroSwitchState.active ||
        prefersReducedMotion()
      )
        return;

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
  type ViewTransition = {finished: Promise<void>};
  type VTDocument = Document & {
    startViewTransition?: (cb: () => void) => ViewTransition;
  };
  const doc = document as VTDocument;
  const canTransition =
    ENABLE_VIEW_TRANSITION && typeof doc.startViewTransition === 'function';

  const root = document.documentElement;
  let bypass = false;
  const toggleFrom = (target: EventTarget | null): HTMLElement | null => {
    const button = (target as Element | null)?.closest?.(TOGGLE_SELECTOR);
    return button instanceof HTMLElement ? button : null;
  };

  // While the hero choreography runs the toggle is aria-disabled: swallow
  // Enter/Space so the browser never synthesises a click from them.
  document.addEventListener(
    'keydown',
    (event) => {
      if (!heroSwitchState.active) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (!toggleFrom(event.target)) return;
      event.stopImmediatePropagation();
      event.preventDefault();
    },
    true,
  );

  document.addEventListener(
    'click',
    (event) => {
      if (bypass) return;
      const button = toggleFrom(event.target);
      if (!button) return;
      if (heroSwitchState.active) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return;
      }
      if (viewTransitionActive || prefersReducedMotion()) return;
      const flip = () => {
        bypass = true;
        button.click();
        bypass = false;
      };
      // The homepage hero gets first refusal: it runs its own launch/landing.
      const hero = getHeroSwitchHandler();
      if (hero && hero(flip)) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return;
      }
      if (!canTransition) return;
      // Swallow the original click, then replay it inside the transition so
      // Docusaurus flips data-theme while the old frame is captured.
      event.stopImmediatePropagation();
      event.preventDefault();
      viewTransitionActive = true;
      const transition = doc.startViewTransition!(() => {
        // Add the class in the same update as the theme flip: one full style
        // recalc instead of an extra one before the old frame is captured
        // (the old snapshot is a static image, so it needs no freezing).
        // Transitions see `transition: none` in the after-change style, so
        // none of the flipped colours start easing under the crossfade.
        root.classList.add(VT_CLASS_NAME);
        bypass = true;
        button.click();
        bypass = false;
      });
      transition.finished.finally(() => {
        viewTransitionActive = false;
        root.classList.remove(VT_CLASS_NAME);
      });
    },
    true,
  );
}

if (ExecutionEnvironment.canUseDOM) {
  installClassTransition();
  installViewTransition();
}
