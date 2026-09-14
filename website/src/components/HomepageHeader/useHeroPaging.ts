import {useEffect, useRef} from 'react';

export default function useHeroPaging() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    const copy = copyRef.current;
    if (!section || !content || !copy) return;

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

    const paint = () => {
      frame = 0;
      const progress = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / sceneHeight));
      section.style.setProperty('--hero-progress', String(progress));
      section.style.setProperty('--art-travel', `${-progress * 120}px`);
    };

    const measure = () => {
      const navbarHeight = document.querySelector('.navbar')?.getBoundingClientRect().height ?? 60;
      const viewport = window.innerHeight - navbarHeight;
      const narrow = window.innerWidth < 997;
      const contentHeight = content.getBoundingClientRect().height;
      const copyHeight = copy.getBoundingClientRect().height;
      const bottomSpace = narrow ? 32 : 64;
      const artSpace = Math.max(narrow ? 220 : 240, viewport - (narrow ? copyHeight : contentHeight) - bottomSpace);
      sceneHeight = narrow ? artSpace + contentHeight + bottomSpace : Math.max(viewport, artSpace + contentHeight + bottomSpace);
      sectionTop = section.getBoundingClientRect().top + window.scrollY - navbarHeight;
      pagingEnabled = desktop.matches && !reducedMotion.matches && contentHeight < viewport - 72 && sceneHeight <= viewport + 2;
      section.dataset.paging = pagingEnabled ? 'enabled' : 'natural';
      section.style.setProperty('--scene-height', `${sceneHeight}px`);
      section.style.setProperty('--art-space', `${artSpace}px`);
      const sectionStyle = getComputedStyle(section);
      const carryOffset = parseFloat(sectionStyle.getPropertyValue('--carry-offset')) || 20;
      const borderHeight = parseFloat(sectionStyle.borderBottomWidth) || 0;
      section.style.setProperty('--carry-height', pagingEnabled ? `${contentHeight + carryOffset + borderHeight}px` : '0px');
      paint();
    };

    const scheduleMeasure = () => {
      if (measureFrame) window.cancelAnimationFrame(measureFrame);
      measureFrame = window.requestAnimationFrame(() => {
        measureFrame = 0;
        measure();
      });
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
      window.clearTimeout(settleTimer);
      if (!supportsScrollEnd && !animating && !pointerDown) settleTimer = window.setTimeout(settle, 160);
    };

    const finish = () => {
      if (!animating) return;
      animating = false;
      window.clearTimeout(animationTimer);
    };

    const turn = (nextDirection: number) => {
      direction = nextDirection;
      animating = true;
      wheelAmount = 0;
      window.clearTimeout(settleTimer);
      window.clearTimeout(animationTimer);
      window.scrollTo({top: sectionTop + (nextDirection > 0 ? sceneHeight : 0), behavior: 'smooth'});
      animationTimer = window.setTimeout(finish, 1300);
    };

    const settle = () => {
      window.clearTimeout(settleTimer);
      if (!pagingEnabled || pointerDown || animating || document.hidden) return;
      const focused = document.activeElement;
      if (focused instanceof Element && (ignoreTarget(focused, false) || focused.closest('a'))) return;
      const offset = window.scrollY - sectionTop;
      if (offset > 3 && offset < sceneHeight - 3) turn(offset >= sceneHeight / 2 ? 1 : -1);
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
      for (let element: Element | null = target; element && element !== section; element = element.parentElement) {
        const style = getComputedStyle(element);
        if (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1 && element !== document.documentElement && element !== document.body) return true;
      }
      return document.querySelector('.navbar__toggle[aria-expanded="true"]') !== null;
    };

    const onWheel = (event: WheelEvent) => {
      if (!pagingEnabled || event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY) || ignoreTarget(event.target)) return;
      const now = performance.now();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      const nextDirection = Math.sign(delta);
      const offset = window.scrollY - sectionTop;
      const atCover = offset >= -3 && offset < sceneHeight - 3;
      const atLanding = offset > 3 && offset <= sceneHeight + 3;
      if (animating) {
        event.preventDefault();
        if (nextDirection !== direction && Math.abs(delta) >= 12) turn(nextDirection);
        return;
      }
      if (!((atCover && nextDirection > 0) || (atLanding && nextDirection < 0))) return;
      event.preventDefault();
      if (now - lastWheel > 160 || Math.sign(wheelAmount) !== nextDirection) wheelAmount = 0;
      lastWheel = now;
      wheelAmount += delta;
      if (Math.abs(wheelAmount) >= 28) turn(nextDirection);
    };

    const onKey = (event: KeyboardEvent) => {
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
      if (!mutations.some((mutation) => mutation.attributeName === 'data-theme')) return;
      scheduleMeasure();
    });
    observer.observe(content);
    observer.observe(copy);
    themeObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
    measure();
    window.addEventListener('resize', cancelMotion);
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('scrollend', onScrollEnd);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);
    window.addEventListener('blur', onPointerUp);
    window.addEventListener('wheel', onWheel, {passive: false});
    window.addEventListener('keydown', onKey);
    reducedMotion.addEventListener('change', cancelMotion);
    desktop.addEventListener('change', cancelMotion);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(measureFrame);
      window.clearTimeout(animationTimer);
      window.clearTimeout(settleTimer);
      themeObserver.disconnect();
      window.removeEventListener('resize', cancelMotion);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', onScrollEnd);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
      window.removeEventListener('blur', onPointerUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      reducedMotion.removeEventListener('change', cancelMotion);
      desktop.removeEventListener('change', cancelMotion);
    };
  }, []);

  return {sectionRef, contentRef, copyRef};
}
