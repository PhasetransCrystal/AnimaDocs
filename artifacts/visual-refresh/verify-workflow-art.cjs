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
assert.equal(arcs.length, 4);
for (const [index, arc] of arcs.entries()) {
  assert.equal(arc.cx, '76%');
  assert.equal(arc.cy, '-42%');
  assert.equal(Number(arc['data-orbit-radius']), 16 + index * 13);
  assert.equal(arc.r, `${16 + index * 13}%`);
  if (index > 0) assert.ok(Number(arc.opacity) < Number(arcs[index - 1].opacity));
}
const bands = [...markup.matchAll(/<circle\b[^>]*data-orbit-band[^>]*>/g)].map(match => attributes(match[0]));
assert.equal(bands.length, 2);
assert.notEqual(bands[0].class, bands[1].class);
assert.ok(bands.every(band => band.cx === '76%' && band.cy === '-42%'));
assert.equal((markup.match(/class="registrationMark"/g) || []).length, 5);
const masks = [...markup.matchAll(/<mask\b([^>]*)>([\s\S]*?)<\/mask>/g)];
assert.equal(masks.length, 2, 'Both crossing layers need their own subtraction mask');
for (const mask of masks) {
  const maskAttributes = attributes(mask[1]);
  assert.equal(maskAttributes.maskUnits, 'userSpaceOnUse');
  assert.match(mask[2], /<rect width="100%" height="100%" fill="white"/);
  assert.match(mask[2], /<use href="#workflow-orbit-[^"]+" stroke="black"/);
  assert.doesNotMatch(mask[2], /fill="black"/, 'Subtract actual shared geometry, not rectangular halos');
}
assert.match(masks[0][2], /href="#[^"]+-marks"/);
assert.match(masks[1][2], /href="#[^"]+-bands"/);
assert.match(markup, /class="registrationStudy" mask="url\(#[^"]+-marks-mask\)"/);
const css = fs.readFileSync(path.join(website, 'src/components/HomepageFeatures/workflow-art.module.css'), 'utf8');
assert.match(css, /stroke-opacity: var\(--orbit-narrow-opacity, 1\)/);
assert.match(css, /stroke-opacity: var\(--orbit-wide-opacity, 1\)/);
assert.match(css, /\.nightLogPrimary \{ left: 44%; top: 65%; \}/);
assert.match(css, /\.nightLogSecondary \{ right: 7%; top: 17%; \}/);
assert.match(markup, /<g mask="url\(#workflow-orbit-/);
assert.match(markup, /class="backgroundArt" aria-hidden="true"/);
assert.match(markup, /data-workflow-art="day"/);
assert.match(markup, /data-workflow-art="night"/);
console.log('Workflow art checks passed: exact 10-degree rays, four fading arcs, shared geometry with reciprocal knockout masks, separated logs, theme layers and decorative semantics.');
