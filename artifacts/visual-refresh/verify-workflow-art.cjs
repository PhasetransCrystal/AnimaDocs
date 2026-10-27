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
  Math,
  require: name => name.endsWith('.css') ? {__esModule: true, default: new Proxy({}, {get: (_target, name) => name})} : resolvePackage(name),
});
const markup = renderToStaticMarkup(react.createElement(exportsObject.default));
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));

// Night: two observation plates (wide desktop, tall stacked grid), each with one disc and one satellite.
const plates = [...markup.matchAll(/<svg class="(plateWide|plateTall)"[\s\S]*?<\/svg>/g)];
assert.equal(plates.length, 2);
for (const [plate] of plates) {
  const discs = [...plate.matchAll(/<circle class="disc"[^>]*>/g)].map(m => attributes(m[0]));
  assert.equal(discs.length, 1, 'One flat red disc per plate');
  const sats = [...plate.matchAll(/<circle class="sat"[^>]*>/g)].map(m => attributes(m[0]));
  assert.equal(sats.length, 1, 'One satellite per plate');
  const main = attributes(plate.match(/<ellipse class="orbitMain"[^>]*>/)[0]);
  const disc = discs[0];
  const sat = sats[0];
  assert.equal(main.cx, disc.cx);
  assert.equal(main.cy, disc.cy);
  // The satellite sits on the main orbit (connectors start at real anchors).
  const rot = Number(main.transform.match(/rotate\((-?[\d.]+)/)[1]) * Math.PI / 180;
  const dx = Number(sat.cx) - Number(main.cx);
  const dy = Number(sat.cy) - Number(main.cy);
  const lx = dx * Math.cos(-rot) - dy * Math.sin(-rot);
  const ly = dx * Math.sin(-rot) + dy * Math.cos(-rot);
  const e = (lx / Number(main.rx)) ** 2 + (ly / Number(main.ry)) ** 2;
  assert.ok(Math.abs(e - 1) < 0.02, `satellite off orbit (${e.toFixed(3)})`);
}
assert.equal((markup.match(/class="leaderText"/g) || []).length, 1, 'One telemetry caption');

const css = fs.readFileSync(path.join(website, 'src/components/HomepageFeatures/workflow-art.module.css'), 'utf8');
assert.doesNotMatch(css, /animation/, 'Night plate is static');
assert.match(markup, /class="backgroundArt" aria-hidden="true"/);
assert.match(markup, /data-workflow-art="day"/);
assert.match(markup, /data-workflow-art="night"/);
console.log('Workflow art checks passed: two static observation plates, disc-centred orbits, satellite on main orbit, single caption, theme layers and decorative semantics.');
