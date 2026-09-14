const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../website/node_modules/typescript');

const source = fs.readFileSync(path.join(__dirname, '../../website/src/components/HomepageHeader/useHeroPaging.ts'), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;

function mount({width = 1440, height = 900, reduced = false, contentHeight = 430, supportsScrollEnd = true} = {}) {
  const listeners = new Map();
  const media = new Map();
  const scrollCalls = [];
  const styles = new Map();
  const timers = new Map();
  const animationFrames = new Map();
  let animationFrameId = 0;
  const mutationObservers = [];
  let timerId = 0;
  let cleanup;
  let menuOpen = false;
  const window = {
    innerWidth: width, innerHeight: height, scrollY: 0,
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: name => listeners.delete(name),
    matchMedia: query => {
      const result = {matches: query.includes('reduced') ? reduced : width >= 997,
        addEventListener: (_, callback) => {result.change = callback;}, removeEventListener() {}};
      media.set(query, result);
      return result;
    },
    scrollTo: options => {scrollCalls.push(options); window.scrollY = options.top;},
    requestAnimationFrame: callback => {animationFrames.set(++animationFrameId, callback); return animationFrameId;},
    cancelAnimationFrame: id => animationFrames.delete(id),
    setTimeout: callback => {timers.set(++timerId, callback); return timerId;},
    clearTimeout: id => timers.delete(id),
  };
  class Element {
    constructor(kind = 'div') {this.kind = kind; this.parentElement = null; this.scrollHeight = 0; this.clientHeight = 0;}
    closest(selector) {
      if (selector.split(',').some(part => part.trim() === this.kind)) return this;
      return this.parentElement?.closest(selector) ?? null;
    }
  }
  if (supportsScrollEnd) window.onscrollend = null;
  const target = new Element();
  const section = new Element();
  section.dataset = {};
  section.style = {setProperty: (key, value) => styles.set(key, value)};
  section.getBoundingClientRect = () => ({top: 60 - window.scrollY});
  const refs = [{current: section}, {current: {getBoundingClientRect: () => ({height: contentHeight})}}, {current: {getBoundingClientRect: () => ({height: 350})}}];
  const document = {
    body: {}, documentElement: {},
    querySelector: selector => selector === '.navbar' ? {getBoundingClientRect: () => ({height: 60})} : menuOpen ? {} : null,
  };
  class MutationObserver {
    constructor(callback) {this.callback = callback; mutationObservers.push(this);}
    observe(target, options) {this.target = target; this.options = options;}
    disconnect() {this.disconnected = true;}
  }
  let effect;
  const exports = {};
  vm.runInNewContext(compiled, {exports, window, document, Element, MutationObserver,
    require: () => ({useRef: () => refs.shift(), useEffect: callback => {effect = callback;}}),
    ResizeObserver: class {observe() {} disconnect() {}},
    getComputedStyle: () => ({overflowY: 'visible', borderBottomWidth: '1px', getPropertyValue: () => '20px'}), performance: {now: () => 1000},
  });
  exports.default();
  cleanup = effect();
  const dispatch = (name, options = {}) => {
    const event = {target, deltaX: 0, deltaY: 120, deltaMode: 0, key: '', prevented: false,
      preventDefault() {this.prevented = true;}, ...options};
    listeners.get(name)?.(event);
    return event;
  };
  const flushTimers = () => {
    const pending = [...timers.values()];
    timers.clear();
    pending.forEach(callback => callback());
  };
  const flushFrames = () => {
    const pending = [...animationFrames.values()];
    animationFrames.clear();
    pending.forEach(callback => callback());
  };
  return {window, styles, section, scrollCalls, media, listeners, dispatch, cleanup, Element, timers, animationFrames, document, mutationObservers, flushTimers, flushFrames, setContentHeight: value => {contentHeight = value;}, setMenu: value => {menuOpen = value;}};
}

const desktop = mount();
assert.equal(desktop.section.dataset.paging, 'enabled');
assert.equal(desktop.styles.get('--scene-height'), '840px');
assert.equal(desktop.styles.get('--carry-height'), '451px');
assert.equal(desktop.dispatch('wheel').prevented, true);
assert.equal(desktop.scrollCalls.at(-1).top, 840);
assert.equal(desktop.scrollCalls.at(-1).behavior, 'smooth');
desktop.dispatch('scrollend');
assert.equal(desktop.dispatch('wheel').prevented, false, 'No cooldown after reaching the landing');
desktop.window.scrollY = 860;
assert.equal(desktop.dispatch('wheel', {deltaY: -12}).prevented, false, 'No reverse capture below the landing');
desktop.window.scrollY = 840;
desktop.dispatch('wheel', {deltaY: -120});
assert.equal(desktop.scrollCalls.at(-1).top, 0);
desktop.dispatch('scrollend');
desktop.dispatch('keydown', {key: 'PageDown'});
assert.equal(desktop.scrollCalls.at(-1).top, 840);
desktop.dispatch('scrollend');
desktop.dispatch('keydown', {key: 'PageUp'});
assert.equal(desktop.scrollCalls.at(-1).top, 0);
desktop.dispatch('scrollend');
assert.equal(desktop.dispatch('wheel', {ctrlKey: true}).prevented, false);
assert.equal(desktop.dispatch('wheel', {deltaX: 200}).prevented, false);
assert.equal(desktop.dispatch('wheel', {target: new desktop.Element('input')}).prevented, false);
desktop.setMenu(true);
assert.equal(desktop.dispatch('wheel').prevented, false);
desktop.setMenu(false);
desktop.window.scrollY = 1600;
assert.equal(desktop.dispatch('wheel').prevented, false);
desktop.cleanup();
assert.equal(desktop.listeners.size, 0);

const themed = mount();
const themeMutation = themed.mutationObservers[0];
themed.setContentHeight(450);
themeMutation.callback([{attributeName: 'data-theme'}]);
themed.flushFrames();
themed.flushFrames();
assert.equal(themed.styles.get('--carry-height'), '471px', 'Theme changes measure updated geometry, not unchanged cached values');
assert.equal(themeMutation.target, themed.document.documentElement);
assert.equal(themeMutation.options.attributeFilter[0], 'data-theme');
themeMutation.callback([{attributeName: 'data-theme'}]);
themed.cleanup();
assert.equal(themeMutation.disconnected, true);
assert.equal(themed.animationFrames.size, 0);

const switchingDuringTurn = mount();
switchingDuringTurn.dispatch('wheel');
switchingDuringTurn.window.scrollY = 300;
switchingDuringTurn.mutationObservers[0].callback([{attributeName: 'data-theme'}]);
switchingDuringTurn.flushFrames();
assert.equal(switchingDuringTurn.scrollCalls.length, 1, 'A visual theme mutation must not cancel or replace the current turn');
switchingDuringTurn.window.scrollY = 840;
switchingDuringTurn.dispatch('scrollend');
assert.equal(switchingDuringTurn.dispatch('wheel').prevented, false);
switchingDuringTurn.cleanup();

for (const supportsScrollEnd of [true, false]) {
  for (const withPointerEvents of [true, false]) {
    const toggled = mount({supportsScrollEnd});
    const themeButton = new toggled.Element('button');
    toggled.document.activeElement = themeButton;
    for (const [theme, offset, destination] of [['dark', 620, 840], ['light', 200, 0], ['dark', 600, 840]]) {
      toggled.dispatch('pointerdown', {target: themeButton});
      toggled.dispatch('pointerup', {target: themeButton});
      toggled.mutationObservers[0].callback([{attributeName: 'data-theme'}]);
      toggled.flushFrames();
      toggled.flushFrames();
      toggled.flushTimers();
      assert.equal(toggled.dispatch('keydown', {target: themeButton, key: ' '}).prevented, false, 'Keep theme button keyboard activation native');
      const before = toggled.scrollCalls.length;
      if (withPointerEvents) toggled.dispatch('pointerdown');
      toggled.window.scrollY = offset;
      toggled.dispatch('scroll');
      if (withPointerEvents) {
        toggled.dispatch('scrollend');
        toggled.flushTimers();
        assert.equal(toggled.scrollCalls.length, before, 'Do not settle while dragging');
        toggled.dispatch('pointerup');
      }
      if (supportsScrollEnd) toggled.dispatch('scrollend');
      else toggled.flushTimers();
      assert.equal(toggled.scrollCalls.length, before + 1, `${theme}: retained theme button focus must not disable scrollbar settling`);
      assert.equal(toggled.scrollCalls.at(-1).top, destination);
      assert.equal(toggled.document.activeElement, themeButton, 'Do not forcibly blur the theme button');
      toggled.dispatch('scrollend');
    }
    toggled.cleanup();
  }
}

for (const kind of ['input', 'textarea', 'select', '[contenteditable="true"]', '[role="dialog"]', '.navbar-sidebar']) {
  const protectedFocus = mount();
  const focused = new protectedFocus.Element(kind);
  const button = new protectedFocus.Element('button');
  button.parentElement = focused;
  protectedFocus.document.activeElement = kind === '[role="dialog"]' || kind === '.navbar-sidebar' ? button : focused;
  protectedFocus.window.scrollY = 620;
  protectedFocus.dispatch('scrollend');
  assert.equal(protectedFocus.scrollCalls.length, 0, `Preserve focus protection for ${kind}`);
  protectedFocus.cleanup();
}

for (const options of [{width: 390}, {width: 768}, {height: 600}, {reduced: true}, {contentHeight: 1000}]) {
  const state = mount(options);
  assert.equal(state.section.dataset.paging, 'natural', JSON.stringify(options));
  assert.equal(state.dispatch('wheel').prevented, false);
  assert.equal(state.dispatch('keydown', {key: 'PageDown'}).prevented, false);
  state.cleanup();
}

const changing = mount();
changing.dispatch('wheel');
const preference = [...changing.media.values()][0];
preference.matches = true;
preference.change();
assert.equal(changing.section.dataset.paging, 'natural');
assert.equal(changing.dispatch('wheel').prevented, false);
changing.cleanup();

for (const [offset, expected] of [[180, 0], [630, 840]]) {
  const dragging = mount();
  dragging.dispatch('pointerdown');
  dragging.window.scrollY = offset;
  dragging.dispatch('scroll');
  dragging.dispatch('scrollend');
  dragging.flushTimers();
  assert.equal(dragging.scrollCalls.length, 0, 'Never snap while holding the scrollbar');
  dragging.dispatch('pointerup');
  dragging.flushTimers();
  assert.equal(dragging.scrollCalls.at(-1).top, expected);
  dragging.dispatch('scrollend');
  assert.equal(dragging.scrollCalls.length, 1, 'Do not recursively settle a completed turn');
  dragging.cleanup();
  assert.equal(dragging.timers.size, 0);
}

for (const event of ['scrollend', 'scroll']) {
  const directScroll = mount({supportsScrollEnd: event === 'scrollend'});
  directScroll.window.scrollY = 620;
  directScroll.dispatch(event);
  if (event === 'scroll') directScroll.flushTimers();
  assert.equal(directScroll.scrollCalls.at(-1).top, 840);
  directScroll.cleanup();
}

const nativeDrag = mount();
nativeDrag.window.scrollY = 620;
nativeDrag.dispatch('scroll');
nativeDrag.flushTimers();
assert.equal(nativeDrag.scrollCalls.length, 0, 'Wait for native scrollend when scrollbar pointer events are not delivered');
nativeDrag.dispatch('scrollend');
assert.equal(nativeDrag.scrollCalls.at(-1).top, 840);
nativeDrag.cleanup();

const belowLanding = mount();
belowLanding.window.scrollY = 900;
belowLanding.dispatch('scrollend');
assert.equal(belowLanding.scrollCalls.length, 0);
belowLanding.cleanup();

const interrupted = mount();
interrupted.dispatch('wheel');
interrupted.window.scrollY = 300;
interrupted.dispatch('pointerdown');
assert.equal(interrupted.scrollCalls.at(-1).behavior, 'instant');
interrupted.window.scrollY = 600;
interrupted.dispatch('pointerup');
interrupted.flushTimers();
assert.equal(interrupted.scrollCalls.at(-1).top, 840);
interrupted.cleanup();

for (const options of [{width:390}, {reduced:true}]) {
  const naturalScroll = mount(options);
  naturalScroll.window.scrollY = 300;
  naturalScroll.dispatch('scrollend');
  naturalScroll.dispatch('pointerup');
  naturalScroll.flushTimers();
  assert.equal(naturalScroll.scrollCalls.length, 0);
  naturalScroll.cleanup();
}

const focusedLink = mount();
focusedLink.document.activeElement = new focusedLink.Element('a');
focusedLink.window.scrollY = 200;
focusedLink.dispatch('scrollend');
assert.equal(focusedLink.scrollCalls.length, 0);
focusedLink.cleanup();
console.log('Paging checks passed: repeated theme switches with retained button focus, protected controls, theme geometry, drag/release, direct scroll, exact sticky boundary, immediate continuation, reverse, keyboard, opt-outs and cleanup.');
