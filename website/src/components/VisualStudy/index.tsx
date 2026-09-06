import type {ReactNode} from 'react';

import styles from './styles.module.css';

type VisualStudyProps = {
  variant?: 'field' | 'specimen';
};

const coordinates = Array.from({length: 25}, (_, index) => index);
const divisions = Array.from({length: 72}, (_, index) => {
  const angle = index * Math.PI / 36;
  const innerRadius = index % 6 === 0 ? 130 : 138;
  return {
    x1: 400 + Math.cos(angle) * innerRadius,
    y1: 220 + Math.sin(angle) * innerRadius,
    x2: 400 + Math.cos(angle) * 145,
    y2: 220 + Math.sin(angle) * 145,
  };
});

function wavePoint(column: number, row: number): string {
  const distance = Math.hypot(column - 12, row - 10);
  const lift = Math.exp(-distance * distance / 60) * 84;
  return `${160 + column * 17 + row * 5},${112 + row * 9 - column * 1.3 - lift}`;
}

function DraftStudy(): ReactNode {
  return (
    <g className={styles.dayArt}>
      <path className={styles.paperPlane} d="M172 64 598 96 676 316 254 283Z" />
      <path className={styles.bluePlane} d="m223 278 412 30-72 53-412-30Z" />
      <g className={styles.wireArt}>
        {coordinates.map((row) => (
          <polyline key={`row-${row}`} points={coordinates.map((column) => wavePoint(column, row)).join(' ')} />
        ))}
        {coordinates.map((column) => (
          <polyline key={`column-${column}`} points={coordinates.map((row) => wavePoint(column, row)).join(' ')} />
        ))}
      </g>
      <g className={styles.draftingLines}>
        <path d="M128 324 636 363 709 302M144 102 219 352M614 70 697 334M135 88 611 124" />
        <path d="m211 338 13 19-23 7m430-13 6 13-17 8M369 54v44m-22-22h44" />
        <ellipse cx="408" cy="214" rx="261" ry="147" transform="rotate(-12 408 214)" />
        <path d="M164 247h-49v-56h78m435 53h68v-72h-53" />
      </g>
      <g className={styles.inkMarks}>
        <path d="M132 137h22v22h-22zM643 272h16v16h-16zM589 92h8v8h-8z" />
        <path d="M100 318h38v4h-38zm0 8h24v2h-24zm0 6h31v2h-31z" />
      </g>
      <g className={styles.signalMarks}>
        <path d="M263 307h22v22h-22zM623 144h9v9h-9z" />
        <circle cx="370" cy="76" r="4" />
      </g>
    </g>
  );
}

function OrbitalStudy(): ReactNode {
  return (
    <g className={styles.nightArt}>
      <circle className={styles.signalDisc} cx="432" cy="205" r="152" />
      <g className={styles.orbitLines}>
        <ellipse cx="400" cy="220" rx="318" ry="106" transform="rotate(-17 400 220)" />
        <ellipse cx="400" cy="220" rx="276" ry="76" transform="rotate(23 400 220)" />
        <path d="M62 320 714 124M101 90 679 349M400 40v357M174 220h459" />
        <circle cx="400" cy="220" r="177" />
      </g>
      <g className={styles.mechanicalArt}>
        <path className={styles.bodyPlane} d="m210 163 156-60 185 51 46 106-154 73-184-47Z" />
        <path d="m210 163 184 57 157-66M394 220v100m-177-141 165 51m70-100 71 23m-295 70 99 32" />
        <path className={styles.bodyPlane} d="m273 163 58-47 167 51 35 67-63 50-164-47Z" />
        <circle className={styles.lensOuter} cx="400" cy="220" r="119" />
        <circle cx="400" cy="220" r="111" />
        <circle className={styles.lensInner} cx="400" cy="220" r="96" />
        <circle cx="400" cy="220" r="81" />
        <circle cx="400" cy="220" r="73" />
        <circle cx="400" cy="220" r="60" />
        <circle className={styles.aperture} cx="400" cy="220" r="47" />
        <path d="m400 173 40 23v47l-40 24-40-24v-47Zm-40 23 58 13m22-13-41 47m41 0-59-13m19 37-1-58m-39 34 40-46m0-24 20 57" />
      </g>
      <g className={styles.calibrationMarks}>
        {divisions.map((division, index) => <line key={index} {...division} />)}
      </g>
      <g className={styles.orbitLines}>
        <path d="M148 124v-23h80m348 231h79v-25M317 55h44m-22-8v16M574 115h58v36" />
        <circle cx="145" cy="294" r="5" />
        <circle cx="659" cy="142" r="5" />
      </g>
      <circle className={styles.warmMark} cx="581" cy="99" r="6" />
    </g>
  );
}

export default function VisualStudy({variant = 'field'}: VisualStudyProps): ReactNode {
  return (
    <div className={`${styles.backgroundArt} ${styles[variant]}`} aria-hidden="true">
      <svg className={styles.diagramArt} viewBox="0 0 800 440" fill="none" focusable="false">
        <DraftStudy />
        <OrbitalStudy />
      </svg>
      <div className={styles.noiseLayer} />
    </div>
  );
}
