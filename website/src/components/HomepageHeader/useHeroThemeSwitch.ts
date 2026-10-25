import {useEffect, type RefObject} from 'react';
import {useThemeConfig} from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';

import {installHeroThemeSwitch} from './heroThemeSwitch';

/** Install the hero theme-switch choreography for the homepage header. */
export default function useHeroThemeSwitch(
  sectionRef: RefObject<HTMLElement | null>,
  artRef: RefObject<HTMLDivElement | null>,
): void {
  // The navbar logo is a React ThemedImage (one <img> for the current mode);
  // the lite ink borrows the target source until the document flips.
  const logo = useThemeConfig().navbar.logo;
  const light = useBaseUrl(logo?.src ?? '');
  const dark = useBaseUrl(logo?.srcDark || logo?.src || '');
  useEffect(() => {
    const section = sectionRef.current;
    const art = artRef.current?.querySelector<HTMLElement>('[data-hero-art]');
    if (!section || !art) return undefined;
    const altimeter = section.querySelector<HTMLElement>('[data-altimeter]');
    return installHeroThemeSwitch(art, altimeter, logo?.src ? {light, dark} : undefined);
  }, [sectionRef, artRef, logo?.src, light, dark]);
}
