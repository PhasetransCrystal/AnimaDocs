/**
 * Shared hook between the global theme-switch client module and the homepage
 * hero. The hero registers a handler while mounted; the client module asks it
 * first whenever the colour-mode toggle is clicked.
 */

/**
 * Return true when the hero took the click (it ran, or is running, its own
 * choreography). `flip` replays the toggle click so Docusaurus flips the theme.
 */
export type HeroSwitchHandler = (flip: () => void) => boolean;

let handler: HeroSwitchHandler | null = null;

/** True while the hero choreography owns the switch; the class fallback stays off. */
export const heroSwitchState = {active: false};

export function setHeroSwitchHandler(next: HeroSwitchHandler): () => void {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

export function getHeroSwitchHandler(): HeroSwitchHandler | null {
  return handler;
}
