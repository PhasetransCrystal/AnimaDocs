import {useEffect, type RefObject} from 'react';

import {installHeroThemeSwitch} from './heroThemeSwitch';

/** Install the hero theme-switch choreography for the homepage header. */
export default function useHeroThemeSwitch(
  sectionRef: RefObject<HTMLElement | null>,
  artRef: RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    const section = sectionRef.current;
    const art = artRef.current?.querySelector<HTMLElement>('[data-hero-art]');
    if (!section || !art) return undefined;
    const altimeter = section.querySelector<HTMLElement>('[data-altimeter]');
    return installHeroThemeSwitch(art, altimeter);
  }, [sectionRef, artRef]);
}
