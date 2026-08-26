import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const entrypoint = await readFile(new URL('../abyss-v12.css', import.meta.url), 'utf8');
const modern = await readFile(new URL('../styles/abyss-jf12.css', import.meta.url), 'utf8');

test('Jellyfin 12 entrypoint keeps the legacy base and adds the modern bridge', () => {
  assert.match(entrypoint, /@import url\('\.\/abyss\.css'\);/);
  assert.match(entrypoint, /@import url\('\.\/styles\/abyss-jf12\.css'\);/);
});

test('modern bridge targets stable Jellyfin MUI primitives', () => {
  for (const selector of [
    '.MuiAppBar-root',
    '.MuiToolbar-root',
    '.MuiButton-root',
    '.MuiIconButton-root',
    '.MuiDrawer-paper',
    '.MuiMenuItem-root',
    '.MuiDialog-paper',
    '.MuiChip-root',
    '.MuiTabs-root',
    '.MuiFilledInput-root'
  ]) {
    assert.match(modern, new RegExp(selector.replaceAll('.', '\\.') ));
  }
});

test('modern bridge never depends on generated Emotion class hashes', () => {
  assert.doesNotMatch(modern, /\.css-[A-Za-z0-9_-]+/);
});

test('main app-bar styling requires a real direct toolbar child', () => {
  assert.match(modern, /\.MuiAppBar-root:has\(> \.MuiToolbar-root\)/);
  assert.doesNotMatch(modern, /#reactRoot\s+\.MuiAppBar-root\s*\{/);
});

test('portal surfaces are gated to the Jellyfin 12 modern shell', () => {
  assert.match(modern, /html:has\(#reactRoot \.MuiAppBar-root > \.MuiToolbar-root\) \.MuiPaper-root\.MuiMenu-paper/);
  assert.match(modern, /html:has\(#reactRoot \.MuiAppBar-root > \.MuiToolbar-root\) \.MuiDrawer-paper/);
});

test('video OSD gets an explicit modern-toolbar bridge', () => {
  assert.match(modern, /\.skinHeader\.osdHeader:has\(> \.MuiToolbar-root\)/);
  assert.match(modern, /\.skinHeader\.osdHeader > \.MuiToolbar-root/);
});

test('bridge keeps responsive and reduced-motion handling', () => {
  assert.match(modern, /@media \(max-width: 899px\)/);
  assert.match(modern, /@media \(max-width: 599px\)/);
  assert.match(modern, /@media \(prefers-reduced-motion: reduce\)/);
});
