import type {ReactNode} from 'react';

import styles from './altimeter.module.css';

/* Resting readings per theme. The live span is written by heroThemeSwitch.ts
 * only while a switch plays; at rest CSS picks the day/night variant from
 * html[data-theme], so the SSR markup is correct before hydration. */
export const ALTIMETER = {
  day: {value: '325', unit: 'm', place: '地面发射场', sr: '当前高度：325 米（地面发射场）'},
  night: {value: '799,000', unit: 'km', place: '高空轨道', sr: '当前高度：799,000 千米（高空轨道）'},
} as const;

export default function Altimeter(): ReactNode {
  return (
    <div className={styles.altimeter} data-altimeter="">
      <div className={styles.scale} aria-hidden="true">
        <span className={styles.ticks} data-alt-ticks="" />
        <span className={styles.zero} />
        <span className={styles.speed} data-alt-speed="" />
        <span className={styles.brake} data-alt-brake="" />
      </div>
      <p className={styles.reading} data-alt-reading="">
        <span className={`${styles.srOnly} ${styles.day}`} data-alt-sr="day">{ALTIMETER.day.sr}</span>
        <span className={`${styles.srOnly} ${styles.night}`} data-alt-sr="night">{ALTIMETER.night.sr}</span>
        <span className={styles.value} aria-hidden="true">
          <span className={styles.day}>{ALTIMETER.day.value}</span>
          <span className={styles.night}>{ALTIMETER.night.value}</span>
          <span className={styles.live} data-alt-value="" />
        </span>
        <span className={styles.unit} aria-hidden="true">
          <span className={styles.day}>{ALTIMETER.day.unit}</span>
          <span className={styles.night}>{ALTIMETER.night.unit}</span>
          <span className={styles.live} data-alt-unit="" />
        </span>
      </p>
      <p className={styles.place} aria-hidden="true" data-alt-place="">
        <span className={styles.day}>{ALTIMETER.day.place}</span>
        <span className={styles.night}>{ALTIMETER.night.place}</span>
      </p>
    </div>
  );
}
