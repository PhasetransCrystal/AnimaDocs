import {useEffect, useRef} from 'react';
import watchHeroArtLoad from './heroArtLite';

export default function useHeroPaging() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    const copy = copyRef.current;
    const art = artRef.current;
    if (!section || !content || !copy || !art) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 997px) and (pointer: fine)');
    const supportsScrollEnd = 'onscrollend' in window;
    let sceneHeight = 0;
    let sectionTop = 0;
    let pagingEnabled = false;
    let frame = 0;
    let measureFrame = 0;
    let animationTimer = 0;
    let settleTimer = 0;
    let pointerDown = false;
    let animating = false;
    let direction = 0;
    let wheelAmount = 0;
    let lastWheel = 0;
    let scrollIdleTimer = 0;
    let scrolling = false;
    let offscreen = false;
    let wheelBound = false;
    let lastTransform = '';
    const writtenVars = new Map<string, string>();
    // Hero theme switch in progress (heroThemeSwitch.ts): pause loops and snap.
    const switching = () => document.documentElement.dataset.heroSwitching !== undefined;

    // Custom properties on the section inherit into the whole hero subtree, so
    // only write them when the value actually changes.
    const setVar = (name: string, value: string) => {
      if (writtenVars.get(name) === value) return;
      writtenVars.set(name, value);
      section.style.setProperty(name, value);
    };

    // The art plate pauses its loops while the page scrolls and once it has
    // left the viewport. The flag sits on the art wrapper and VisualStudy's
    // CSS matches only the animated nodes, so toggling it restyles ~20
    // elements instead of the whole plate.
    const syncPause = () => {
      // Hidden page: mobile browsers keep compositing a backgrounded tab for
      // a while (and the snapshot for the tab switcher), so park the loops.
      const paused = scrolling || offscreen || switching() || document.hidden;
      if ((art.dataset.artPaused === 'true') === paused) return;
      if (paused) art.dataset.artPaused = 'true';
      else delete art.dataset.artPaused;
    };

    const paint = () => {
      frame = 0;
      const progress = sceneHeight > 0 ? Math.max(0, Math.min(1, (window.scrollY - sectionTop) / sceneHeight)) : 0;
      // Transform goes straight onto the composited art layer: no inherited
      // custom property, so a scroll frame restyles one element.
      const transform = reducedMotion.matches ? 'none' : `translateY(${-progress * 120}px)`;
      if (transform !== lastTransform) {
        lastTransform = transform;
        art.style.transform = transform;
      }
      offscreen = progress >= 1;
      syncPause();
      syncWheel();
    };

    const measure = () => {
      // All layout and style reads first, then writes: one layout per measure.
      const navbarHeight = document.querySelector('.navbar')?.getBoundingClientRect().height ?? 60;
      const viewport = window.innerHeight - navbarHeight;
      const narrow = window.innerWidth < 997;
      const contentHeight = content.getBoundingClientRect().height;
      const copyHeight = copy.getBoundingClientRect().height;
      const sectionStyle = getComputedStyle(section);
      const carryOffset = parseFloat(sectionStyle.getPropertyValue('--carry-offset')) || 20;
      const borderHeight = parseFloat(sectionStyle.borderBottomWidth) || 0;
      sectionTop = section.getBoundingClientRect().top + window.scrollY - navbarHeight;
      const bottomSpace = narrow ? 32 : 64;
      const artSpace = Math.max(narrow ? 220 : 240, viewport - (narrow ? copyHeight : contentHeight) - bottomSpace);
      sceneHeight = narrow ? artSpace + contentHeight + bottomSpace : Math.max(viewport, artSpace + contentHeight + bottomSpace);
      pagingEnabled = desktop.matches && !reducedMotion.matches && contentHeight < viewport - 72 && sceneHeight <= viewport + 2;
      const paging = pagingEnabled ? 'enabled' : 'natural';
      if (section.dataset.paging !== paging) section.dataset.paging = paging;
      setVar('--scene-height', `${sceneHeight}px`);
      setVar('--art-space', `${artSpace}px`);
      setVar('--carry-height', pagingEnabled ? `${contentHeight + carryOffset + borderHeight}px` : '0px');
      paint();
    };

    let measureDeferred = false;
    const scheduleMeasure = () => {
      if (measureFrame) window.cancelAnimationFrame(measureFrame);
      measureFrame = window.requestAnimationFrame(() => {
        measureFrame = 0;
        measure();
      });
    };

    // Flag active scrolling so CSS can pause the art loops and keep the layer
    // cached. section[data-scrolling] only drives the dark panel's blur rule;
    // the art pause goes through syncPause().
    const markScrolling = () => {
      if (!scrolling) {
        scrolling = true;
        section.dataset.scrolling = 'true';
        syncPause();
      }
      window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        scrolling = false;
        delete section.dataset.scrolling;
        syncPause();
      }, 220);
    };

    // A non-passive wheel listener turns the whole page into a slow-scroll
    // region (the compositor must wait for the main thread on every wheel
    // event). Bind it only while the viewport is inside the paging range, so
    // reading the rest of the page scrolls on the compositor.
    const syncWheel = () => {
      const offset = window.scrollY - sectionTop;
      const inZone = pagingEnabled && (animating || (offset >= -3 && offset <= sceneHeight + 3));
      if (inZone === wheelBound) return;
      wheelBound = inZone;
      if (inZone) window.addEventListener('wheel', onWheel, {passive: false});
      else window.removeEventListener('wheel', onWheel);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
      // Bind synchronously as well: the next wheel event can arrive before
      // the paint frame when the user scrolls back up into the hero.
      syncWheel();
      markScrolling();
      window.clearTimeout(settleTimer);
      if (!supportsScrollEnd && !animating && !pointerDown) settleTimer = window.setTimeout(settle, 160);
    };

    const finish = () => {
      if (!animating) return;
      animating = false;
      window.clearTimeout(animationTimer);
      syncWheel();
    };

    const turn = (nextDirection: number) => {
      direction = nextDirection;
      animating = true;
      syncWheel();
      wheelAmount = 0;
      window.clearTimeout(settleTimer);
      window.clearTimeout(animationTimer);
      window.scrollTo({top: sectionTop + (nextDirection > 0 ? sceneHeight : 0), behavior: 'smooth'});
      animationTimer = window.setTimeout(finish, 1300);
    };

    const settle = () => {
      window.clearTimeout(settleTimer);
      if (!pagingEnabled || pointerDown || animating || document.hidden || switching()) return;
      // Cheap position check first: most scrollends land on a page edge or
      // outside the hero, and ignoreTarget() reads computed style.
      const offset = window.scrollY - sectionTop;
      if (!(offset > 3 && offset < sceneHeight - 3)) return;
      const focused = document.activeElement;
      if (focused instanceof Element && (ignoreTarget(focused, false) || focused.closest('a'))) return;
      turn(offset >= sceneHeight / 2 ? 1 : -1);
    };

    const onScrollEnd = () => {
      finish();
      settle();
    };

    const onPointerDown = () => {
      pointerDown = true;
      window.clearTimeout(settleTimer);
      if (animating) {
        finish();
        window.scrollTo({top: window.scrollY, behavior: 'instant'});
      }
    };

    const onPointerUp = () => {
      pointerDown = false;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, 160);
    };

    const ignoreTarget = (target: EventTarget | null, ignoreButtons = true) => {
      if (!(target instanceof Element)) return true;
      if (ignoreButtons && target.closest('button')) return true;
      if (target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], .navbar-sidebar')) return true;
      const root = document.documentElement;
      for (let element: Element | null = target; element && element !== section && element !== root && element !== document.body; element = element.parentElement) {
        // Only elements that actually overflow can be inner scrollers; the
        // computed-style read is skipped for everything else.
        if (element.scrollHeight <= element.clientHeight + 1) continue;
        if (/(auto|scroll)/.test(getComputedStyle(element).overflowY)) return true;
      }
      return document.querySelector('.navbar__toggle[aria-expanded="true"]') !== null;
    };

    const onWheel = (event: WheelEvent) => {
      if (switching()) {
        event.preventDefault();
        return;
      }
      if (!pagingEnabled || event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const now = performance.now();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      const nextDirection = Math.sign(delta);
      const offset = window.scrollY - sectionTop;
      const atCover = offset >= -3 && offset < sceneHeight - 3;
      const atLanding = offset > 3 && offset <= sceneHeight + 3;
      // Position checks are cheap; the DOM walk in ignoreTarget() runs only
      // when this event would actually be taken over.
      if (!animating && !((atCover && nextDirection > 0) || (atLanding && nextDirection < 0))) return;
      if (ignoreTarget(event.target)) return;
      if (animating) {
        event.preventDefault();
        if (nextDirection !== direction && Math.abs(delta) >= 12) turn(nextDirection);
        return;
      }
      event.preventDefault();
      if (now - lastWheel > 160 || Math.sign(wheelAmount) !== nextDirection) wheelAmount = 0;
      lastWheel = now;
      wheelAmount += delta;
      if (Math.abs(wheelAmount) >= 28) turn(nextDirection);
    };

    const onKey = (event: KeyboardEvent) => {
      if (switching()) return;
      if (!pagingEnabled || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || ignoreTarget(event.target)) return;
      if (event.target instanceof Element && event.target.closest('a') && event.key === ' ') return;
      const nextDirection = event.key === 'PageDown' || event.key === 'ArrowDown' || (event.key === ' ' && !event.shiftKey) ? 1 : event.key === 'PageUp' || event.key === 'ArrowUp' || (event.key === ' ' && event.shiftKey) ? -1 : 0;
      if (!nextDirection) return;
      if (animating) {
        event.preventDefault();
        if (!event.repeat && nextDirection !== direction) turn(nextDirection);
        return;
      }
      const offset = window.scrollY - sectionTop;
      if ((nextDirection > 0 && offset >= -3 && offset < sceneHeight - 3) || (nextDirection < 0 && offset > 3 && offset <= sceneHeight + 3)) {
        event.preventDefault();
        if (!event.repeat) turn(nextDirection);
      }
    };

    const cancelMotion = () => {
      const wasAnimating = animating;
      finish();
      window.clearTimeout(settleTimer);
      if (wasAnimating) window.scrollTo({top: window.scrollY, behavior: 'instant'});
      measure();
    };

    const observer = new ResizeObserver(measure);
    const themeObserver = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.attributeName === 'data-hero-switching')) {
        syncPause();
        if (!switching()) {
          // Re-measure once the hero choreography has ended; doing it on the
          // mid-animation theme flip forced a ~57ms layout inside a rAF.
          if (measureDeferred) {
            measureDeferred = false;
            scheduleMeasure();
          }
          settle();
        }
      }
      if (!mutations.some((mutation) => mutation.attributeName === 'data-theme')) return;
      if (switching()) {
        measureDeferred = true;
        return;
      }
      scheduleMeasure();
    });
    observer.observe(content);
    observer.observe(copy);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-hero-switching'],
    });
    measure();
    // Low-end GPUs get quantised art loops; see heroArtLite.ts.
    const stopLiteProbe = watchHeroArtLoad(art, () => art.dataset.artPaused === undefined && !switching());
    const onVisibility = () => {
      if (document.hidden) {
        // Drop pending scroll work too: nothing paints while hidden.
        window.cancelAnimationFrame(frame);
        frame = 0;
        window.clearTimeout(settleTimer);
        window.clearTimeout(scrollIdleTimer);
        scrolling = false;
        delete section.dataset.scrolling;
        finish();
      }
      syncPause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onVisibility);
    window.addEventListener('pageshow', onVisibility);
    window.addEventListener('resize', cancelMotion);
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('scrollend', onScrollEnd);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);
    window.addEventListener('blur', onPointerUp);
    window.addEventListener('keydown', onKey);
    reducedMotion.addEventListener('change', cancelMotion);
    desktop.addEventListener('change', cancelMotion);

    return () => {
      stopLiteProbe();
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(measureFrame);
      window.clearTimeout(animationTimer);
      window.clearTimeout(settleTimer);
      window.clearTimeout(scrollIdleTimer);
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onVisibility);
      window.removeEventListener('pageshow', onVisibility);
      window.removeEventListener('resize', cancelMotion);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', onScrollEnd);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
      window.removeEventListener('blur', onPointerUp);
      window.removeEventListener('wheel', onWheel);
      wheelBound = false;
      window.removeEventListener('keydown', onKey);
      reducedMotion.removeEventListener('change', cancelMotion);
      desktop.removeEventListener('change', cancelMotion);
    };
  }, []);

  return {sectionRef, contentRef, copyRef, artRef};
}
