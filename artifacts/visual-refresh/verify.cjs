const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const baseUrl = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:3000';
const output = path.join(__dirname, process.env.VISUAL_ROUND || 'final');
const routes = [
  ['home', '/'],
  ['docs', '/docs/intro'],
  ['install', '/docs/install'],
  ['workflow', '/docs/first_workflow'],
  ['theory', '/docs/theory/anima'],
];
const viewports = [['mobile', 390, 844], ['standard', 1440, 900], ['wide', 3440, 1440]];
const report = {captures: [], interactions: [], issues: [], browserErrors: []};

async function switchTheme(page, theme) {
  if (await page.locator('html').getAttribute('data-theme') !== theme) {
    const toggle = page.locator('.navbar button[class*="toggleButton"]').first();
    if (!await toggle.isVisible()) {
      const original = page.viewportSize();
      await page.setViewportSize({width: 1440, height: 900});
      await toggle.click();
      await page.setViewportSize(original);
    } else {
      await toggle.click();
    }
  }
  await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
  await page.waitForTimeout(220);
  await page.mouse.move(0, 0);
}

function contrast(foreground, background) {
  function luminance(color) {
    const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(channel => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }
  const light = luminance(foreground);
  const dark = luminance(background);
  return Number(((Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05)).toFixed(2));
}

async function run() {
  await fs.mkdir(output, {recursive: true});
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  const page = await browser.newPage();
  page.on('pageerror', error => report.browserErrors.push(error.message));
  try {
    for (const theme of ['light', 'dark']) {
      for (const [size, width, height] of viewports) {
        await page.setViewportSize({width, height});
        for (const [name, route] of routes) {
          const response = await page.goto(baseUrl + route, {waitUntil: 'networkidle'});
          assert.equal(response.status(), 200);
          await switchTheme(page, theme);
          await page.locator('img').evaluateAll(images => images.forEach(image => {image.loading = 'eager';}));
          await page.waitForFunction(() => [...document.images].every(image => image.complete), undefined, {timeout: 15000});
          const metrics = await page.evaluate(() => {
            const heading = document.querySelector('h1');
            const bounds = heading.getBoundingClientRect();
            const brokenImages = [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src);
            const offenders = [...document.querySelectorAll('main *, header *, .navbar *')].filter(element => {
              if (element.closest('[aria-hidden="true"], .navbar-sidebar, pre, table, [class*="tableContainer"], [class*="scopeList"], svg')) return false;
              const style = getComputedStyle(element);
              const rectangle = element.getBoundingClientRect();
              return style.display !== 'none' && rectangle.width > 0 && (rectangle.right > innerWidth + 2 || rectangle.left < -2);
            }).slice(0, 10).map(element => `${element.tagName}.${element.className}`);
            return {
              viewport: innerWidth,
              scrollWidth: document.documentElement.scrollWidth,
              heading: heading.innerText,
              headingInside: bounds.left >= 0 && bounds.right <= innerWidth,
              theme: document.documentElement.dataset.theme,
              brokenImages,
              offenders,
            };
          });
          const filename = `${name}-${theme}-${size}.png`;
          await page.screenshot({path: path.join(output, filename), fullPage: true});
          if (name === 'home' || name === 'docs') {
            await page.screenshot({path: path.join(output, `${name}-${theme}-${size}-viewport.png`)});
          }
          report.captures.push({filename, ...metrics});
          if (metrics.scrollWidth > width || !metrics.headingInside || metrics.offenders.length || metrics.brokenImages.length) {
            report.issues.push({filename, metrics});
          }
          console.log(filename, metrics.scrollWidth === width ? 'no overflow' : 'OVERFLOW');
        }
      }
      await page.setViewportSize({width: 1440, height: 900});
      await page.goto(baseUrl, {waitUntil: 'networkidle'});
      await switchTheme(page, theme);
      await page.reload({waitUntil: 'networkidle'});
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
      const primary = page.locator('a[class*="primaryAction"]');
      const colors = await primary.evaluate(element => ({color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor}));
      const primaryContrast = contrast(colors.color, colors.background);
      assert.ok(primaryContrast >= 4.5, `Primary contrast: ${primaryContrast}`);
      await page.keyboard.press('Tab');
      await primary.focus();
      assert.equal(await primary.evaluate(element => getComputedStyle(element).outlineStyle), 'solid');
      await primary.hover();
      await page.waitForTimeout(200);
      const hovered = await primary.evaluate(element => ({color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor}));
      assert.ok(contrast(hovered.color, hovered.background) >= 4.5);
      await primary.click();
      await page.waitForURL('**/docs/intro');
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
      const toc = page.locator('.table-of-contents__link').first();
      await toc.click();
      assert.ok(new URL(page.url()).hash);
      const sortButton = page.locator('th button').first();
      if (await sortButton.count()) {
        await sortButton.scrollIntoViewIfNeeded();
        const original = await sortButton.locator('..').getAttribute('aria-sort');
        await sortButton.click();
        const sorted = await sortButton.locator('..').getAttribute('aria-sort');
        assert.notEqual(original, sorted);
      }
      await page.setViewportSize({width: 390, height: 844});
      await page.goto(baseUrl + '/docs/intro', {waitUntil: 'networkidle'});
      await page.locator('.navbar__toggle').click();
      await page.waitForTimeout(250);
      assert.ok(await page.locator('.navbar-sidebar').isVisible());
      await page.screenshot({path: path.join(output, `menu-${theme}-mobile.png`)});
      await page.locator('.navbar-sidebar a[href="/docs/install"]').click();
      await page.waitForURL('**/docs/install');
      await page.waitForTimeout(250);
      assert.equal(await page.locator('.navbar__toggle').getAttribute('aria-expanded'), 'false');
      report.interactions.push({theme, primaryContrast, hoverContrast: contrast(hovered.color, hovered.background), themePersistence: true, keyboardFocus: true, primaryNavigation: true, toc: true, sortableTable: true, mobileMenuNavigation: true});
    }
    for (const width of [320, 768, 1024]) {
      await page.setViewportSize({width, height: 900});
      for (const route of ['/', '/docs/intro']) {
        await page.goto(baseUrl + route, {waitUntil: 'networkidle'});
        for (const theme of ['light', 'dark']) {
          await switchTheme(page, theme);
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          if (scrollWidth > width) report.issues.push({route, theme, width, scrollWidth});
          if (route === '/') {
            const clippedNodes = await page.evaluate(() => {
              const board = document.querySelector('[class*="workflowBoard"]').getBoundingClientRect();
              return [...document.querySelectorAll('[class*="workflowNode_"]')].filter(element => {
                const rectangle = element.getBoundingClientRect();
                return rectangle.left < board.left || rectangle.right > board.right || rectangle.top < board.top || rectangle.bottom > board.bottom;
              }).map(element => element.innerText);
            });
            assert.equal(clippedNodes.length, 0, JSON.stringify({width, theme, clippedNodes}));
          }
        }
      }
    }
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto(baseUrl, {waitUntil: 'networkidle'});
    assert.equal(await page.locator('a[class*="primaryAction"]').evaluate(element => getComputedStyle(element).transitionDuration), '0s');
    await page.emulateMedia({forcedColors: 'active'});
    assert.equal(await page.locator('[class*="backgroundArt"]').first().evaluate(element => getComputedStyle(element).display), 'none');
    await page.screenshot({path: path.join(output, 'home-forced-colors.png')});
    report.interactions.push({reducedMotion: true, forcedColors: true});
  } finally {
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
  assert.equal(report.issues.length, 0, JSON.stringify(report.issues));
  assert.equal(report.browserErrors.length, 0, JSON.stringify(report.browserErrors));
  console.log('Visual and interaction checks passed');
}

run().catch(error => {console.error(error); process.exitCode = 1;});
