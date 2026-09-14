import {useId, type ReactNode} from 'react';

import styles from './workflow-art.module.css';

const registrationPositions = [12, 31, 50, 69, 88];
const polarRadii = [8, 14, 20, 26, 32, 38, 44, 50, 56, 62, 68, 74, 80, 86, 92, 98];
const rayAngles = Array.from({length: 19}, (_value, index) => index * 10 - 90);
const orbitArcs = [
  {radius: 16, opacity: 1},
  {radius: 29, opacity: 0.62},
  {radius: 42, opacity: 0.32},
  {radius: 55, opacity: 0.12},
];

function NightStudy(): ReactNode {
  const maskId = `workflow-orbit-${useId().replace(/:/g, '')}`;
  const bandsId = `${maskId}-bands`;
  const marksId = `${maskId}-marks`;
  const marksMaskId = `${maskId}-marks-mask`;

  return (
    <div className={styles.nightArt} data-workflow-art="night">
      <svg className={styles.polarGrid} width="100%" height="100%" focusable="false">
        {polarRadii.map((radius) => <circle key={radius} cx="-8%" cy="78%" r={`${radius}%`} />)}
        <svg data-polar-origin="true" x="-8%" y="78%" width="1" height="1" overflow="visible" focusable="false">
          {rayAngles.map((angle) => (
            <line key={angle} data-polar-angle={angle} x1="0" y1="0" x2="4096" y2="0" transform={`rotate(${angle})`} />
          ))}
        </svg>
      </svg>
      <svg className={styles.orbitStudy} width="100%" height="100%" focusable="false">
        <defs>
          <g id={bandsId}>
            <circle className={styles.orbitBandNarrow} data-orbit-band="narrow" cx="76%" cy="-42%" r="18%" />
            <circle className={styles.orbitBandWide} data-orbit-band="wide" cx="76%" cy="-42%" r="39%" />
          </g>
          <g id={marksId}>
            {registrationPositions.map((position) => (
              <g key={position} className={styles.registrationMark}>
                <line x1={`${position}%`} x2={`${position}%`} y1="0" y2="18" />
                <line x1={`${position}%`} x2={`${position}%`} y1="46" y2="100%" />
                <svg x={`${position}%`} y="26" width="14" height="12" overflow="visible">
                  <path d="M-6 6 H6 M0 0 V12" />
                </svg>
              </g>
            ))}
          </g>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect width="100%" height="100%" fill="white" />
            <use href={`#${marksId}`} stroke="black" strokeWidth="1" />
          </mask>
          <mask id={marksMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect width="100%" height="100%" fill="white" />
            <use href={`#${bandsId}`} stroke="black" />
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          <g className={styles.orbitBands}>
            <use href={`#${bandsId}`} />
          </g>
          <g className={styles.orbitArcs}>
            {orbitArcs.map(({radius, opacity}) => (
              <circle key={radius} data-orbit-radius={radius} cx="76%" cy="-42%" r={`${radius}%`} opacity={opacity} />
            ))}
          </g>
        </g>
        <g className={styles.registrationStudy} mask={`url(#${marksMaskId})`}>
          <use href={`#${marksId}`} />
        </g>
      </svg>
      <div className={`${styles.decorativeCopy} ${styles.nightLogPrimary}`}>
        <span>0000: 7F 45 4C 46 / 02 01 00 00</span>
        <span>0010: 00 00 00 00 / 28 C0 7F FF</span>
        <span>0020: 10 00 A8 3E / 00 00 00 00</span>
        <span>0030: 03 FF 00 00 / 7E 18 40 00</span>
        <span>0040: .... .... .... ....</span>
        <span>0x00007ff0 :: [0000] / &lt;null&gt;</span>
      </div>
      <div className={`${styles.decorativeCopy} ${styles.nightLogSecondary}`}>
        <span>R00 00000000 / R01 7FF03C18</span>
        <span>R02 00001000 / R03 00000000</span>
        <span>SP  00FF7A20 / IP  00003F80</span>
        <span>[00] +0018 -&gt; 7FF0:03C0</span>
        <span>[01] +0020 -&gt; 0000:0000</span>
        <span>-------- / 0x00 / --------</span>
      </div>
    </div>
  );
}

function DayStudy(): ReactNode {
  return (
    <div className={styles.dayArt} data-workflow-art="day">
      <div className={styles.draftingGrid} />
      <div className={styles.paperPlane} />
      <div className={styles.paperFold} />
      <svg className={styles.draftingRules} width="100%" height="100%" focusable="false">
        <line x1="0" y1="12%" x2="100%" y2="12%" />
        <line x1="0" y1="88%" x2="100%" y2="88%" />
        <line x1="3%" y1="0" x2="3%" y2="100%" />
        <line x1="97%" y1="0" x2="97%" y2="100%" />
      </svg>
      <svg className={styles.constructionStudy} viewBox="0 0 500 500" fill="none" focusable="false">
        <g className={styles.constructionLines}>
          <circle cx="250" cy="250" r="204" />
          <circle cx="250" cy="250" r="158" strokeDasharray="2 8" />
          <path d="M250 18 V88 M250 412 V482 M18 250 H88 M412 250 H482" />
          <path d="M60 164 H348 V398 H126 V92 H420" />
          <path d="M105 395 L395 105 M86 86 L414 414" />
        </g>
        <path className={styles.constructionAccent} d="M250 46 A204 204 0 0 1 454 250" />
        <path className={styles.constructionWash} d="M250 46 A204 204 0 0 1 454 250 H412 A162 162 0 0 0 250 88 Z" />
        <g className={styles.constructionPoints}>
          <rect x="246" y="42" width="8" height="8" />
          <rect x="450" y="246" width="8" height="8" />
          <rect x="122" y="88" width="8" height="8" />
        </g>
      </svg>
      <div className={styles.cornerMarks}><i /><i /><i /><i /></div>
      <div className={styles.daySwatches}><i /><i /><i /><span>03 / INPUT STUDY</span></div>
      <div className={`${styles.decorativeCopy} ${styles.dayAnnotation}`}>
        <span>PLATE 01 — IMAGE CONSTRUCTION</span>
        <span>MODEL / LATENT / CONDITIONING</span>
      </div>
      <div className={styles.dayMeasurement}><span>01</span><i /><span>09</span></div>
    </div>
  );
}

export default function WorkflowArt(): ReactNode {
  return (
    <div className={styles.backgroundArt} aria-hidden="true">
      <DayStudy />
      <NightStudy />
    </div>
  );
}
