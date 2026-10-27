const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const website = path.join(__dirname, '../../website');
const resolvePackage = name => require(require.resolve(name, {paths: [website]}));
const react = resolvePackage('react');
const {renderToStaticMarkup} = resolvePackage('react-dom/server');
const ts = resolvePackage('typescript');
const source = fs.readFileSync(path.join(website, 'src/components/HomepageFeatures/WorkflowArt.tsx'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX},
}).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, {
  exports: exportsObject,
  require: name => name.endsWith('.css') ? {__esModule: true, default: new Proxy({}, {get: (_target, name) => name})} : resolvePackage(name),
});
const markup = renderToStaticMarkup(react.createElement(exportsObject.default));
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
const rays = [...markup.matchAll(/<line\b[^>]*data-polar-angle[^>]*>/g)].map(match => attributes(match[0]));
assert.equal(rays.length, 19);
const origin = attributes(markup.match(/<svg\b[^>]*data-polar-origin[^>]*>/)[0]);
assert.equal(origin.x, '-8%');
assert.equal(origin.y, '78%');
assert.equal(origin.width, '1');
assert.equal(origin.height, '1');
assert.equal(origin.viewBox, undefined, 'Do not distort ray angles with a stretched viewBox');
assert.equal(origin.overflow, 'visible');
for (const [index, ray] of rays.entries()) {
  const angle = Number(ray['data-polar-angle']);
  assert.equal(angle, -90 + index * 10);
  assert.equal(ray.transform, `rotate(${angle})`);
  assert.equal(ray.x1, '0');
  assert.equal(ray.y1, '0');
  assert.equal(ray.y2, '0');
  assert.ok(Number(ray.x2) >= 4096);
}
const arcs = [...markup.matchAll(/<circle\b[^>]*data-orbit-radius[^>]*>/g)].map(match => attributes(match[0]));
assert.equal(arcs.length, 5);
const radii = arcs.map(arc => Number(arc['data-orbit-radius']));
for (const [index, arc] of arcs.entries()) {
  assert.equal(arc.cx, '80%');
  assert.equal(arc.cy, '-5%');
  assert.equal(arc.r, `${radii[index]}%`);
  if (index > 0) assert.ok(Number(arc.opacity) < Number(arcs[index - 1].opacity));
}
const gaps = radii.slice(1).map((radius, index) => radius - radii[index]);
for (let index = 1; index < gaps.length; index += 1) {
  const ratio = gaps[index] / gaps[index - 1];
  assert.ok(ratio > 1.15 && ratio < 1.35, 'Arc gaps grow by a steady ~1.25x');
}
assert.doesNotMatch(markup, /lensTwin/, 'Shade edge has no white outline');
assert.doesNotMatch(markup, /data-orbit-band/, 'Wide white orbit bands were removed');
assert.equal((markup.match(/data-star-disc/g) || []).length, 1);
assert.equal((markup.match(/data-planet=/g) || []).length, 1);
assert.match(markup, /data-orbit-side="far" d="[^"]+" mask="url\(#[^"]+-behind\)"/);
assert.equal((markup.match(/class="registrationMark"/g) || []).length, 5);
// The star system's own "behind the disc" mask is checked above; this is the marks knockout on the arcs.
const masks = [...markup.matchAll(/<mask\b([^>]*)>([\s\S]*?)<\/mask>/g)].filter(mask => !/-behind"/.test(mask[1]));
assert.equal(masks.length, 1, 'Arcs keep the registration-mark knockout');
for (const mask of masks) {
  const maskAttributes = attributes(mask[1]);
  assert.equal(maskAttributes.maskUnits, 'userSpaceOnUse');
  assert.match(mask[2], /<rect width="100%" height="100%" fill="white"/);
  assert.match(mask[2], /<use href="#workflow-orbit-[^"]+" stroke="black"/);
  assert.doesNotMatch(mask[2], /fill="black"/, 'Subtract actual shared geometry, not rectangular halos');
}
assert.match(masks[0][2], /href="#[^"]+-marks"/);
const css = fs.readFileSync(path.join(website, 'src/components/HomepageFeatures/workflow-art.module.css'), 'utf8');
assert.match(css, /\.nightArt \{ --star-x: 80%; --star-y: -5%; \}/);
assert.doesNotMatch(markup, /0000: 7F 45 4C 46|R00 00000000/, 'Hex-dump copy was replaced');
assert.match(markup, /class="nightSwatches"><i><\/i><i><\/i><i><\/i><span>06 \/ CORE STUDY<\/span>/);
assert.match(markup, /FIG\.06 — SAMPLER CORE/);
assert.match(css, /\.nightSwatches i \{ background: var\(--anima-red\); border-radius: 50%;/);
assert.match(markup, /<g mask="url\(#workflow-orbit-/);
assert.match(markup, /class="backgroundArt" aria-hidden="true"/);
assert.match(markup, /data-workflow-art="day"/);
assert.match(markup, /data-workflow-art="night"/);
console.log('Workflow art checks passed: exact 10-degree rays, five fading arcs with ~1.25x gap growth around the star, planet orbit behind the disc, no white bands, marks knockout on arcs, separated logs, theme layers and decorative semantics.');
