import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const entrypoint = await readFile(new URL('../abyss-v12.css', import.meta.url), 'utf8');
const modern = await readFile(new URL('../styles/abyss-jf12.css', import.meta.url), 'utf8');
const offsetAppBar = await readFile(new URL('../styles/abyss-jf12-offset-appbar.css', import.meta.url), 'utf8');
const navigation = await readFile(new URL('../styles/abyss-jf12-nav.css', import.meta.url), 'utf8');

test('Jellyfin 12 entrypoint keeps the legacy base and adds the modern bridges', () => {
  assert.match(entrypoint, /@import url\('\.\/abyss\.css'\);/);
  assert.match(entrypoint, /@import url\('\.\/styles\/abyss-jf12\.css'\);/);
  assert.match(entrypoint, /@import url\('\.\/styles\/abyss-jf12-offset-appbar\.css'\);/);
  assert.match(entrypoint, /@import url\('\.\/styles\/abyss-jf12-nav\.css'\);/);
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
    assert.match(modern, new RegExp(selector.replaceAll('.', '\\.')));
  }
});

test('modern bridges never depend on generated Emotion class hashes', () => {
  assert.doesNotMatch(modern, /\.css-[A-Za-z0-9_-]+/);
  assert.doesNotMatch(offsetAppBar, /\.css-[A-Za-z0-9_-]+/);
  assert.doesNotMatch(navigation, /\.css-[A-Za-z0-9_-]+/);
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

test('OffsetAppBar guard keeps vertical spacing in the observed content box', () => {
  assert.match(offsetAppBar, /gap:\s*8px/);
  assert.match(offsetAppBar, /padding:\s*0 !important/);
  assert.match(offsetAppBar, /margin:\s*0 12px/);
  assert.doesNotMatch(offsetAppBar, /padding-top:/);
  assert.doesNotMatch(offsetAppBar, /margin-top:\s*[1-9]/);
});

test('desktop modern navigation reuses Jellyfin native legacy drawer', () => {
  assert.match(navigation, /:has\(> \.mainDrawer\):has\(> \.skinHeader\):has\(> \.mainDrawerHandle\)/);
  assert.match(navigation, /\.mainDrawerButton:not\(\.hide\)/);
  assert.doesNotMatch(navigation, /abyss-modern-drawer/);
  assert.doesNotMatch(navigation, /data-abyss-modern/);
});

test('desktop modern navigation prefers the real legacy center tab strip', () => {
  assert.match(navigation, /\.headerTabs\.sectionTabs \.emby-tab-button/);
  assert.match(navigation, /\.headerTabs\.sectionTabs:has\(\.emby-tab-button\)/);
  assert.match(navigation, /visibility:\s*hidden !important/);
  assert.match(navigation, /html:not\(:has\(#reactRoot \.headerTabs\.sectionTabs \.emby-tab-button\)\)/);
});

test('fallback center navigation keeps Home and custom links while libraries stay in drawer', () => {
  assert.match(navigation, /target="_blank"/);
  assert.match(navigation, /href\*="\/home\?tab=1"/);
  assert.match(navigation, /:not\(:has\(\.MuiButton-startIcon img\)\)/);
  assert.match(navigation, /content:\s*"Home"/);
});

test('bridge keeps responsive and reduced-motion handling', () => {
  assert.match(modern, /@media \(max-width: 899px\)/);
  assert.match(modern, /@media \(max-width: 599px\)/);
  assert.match(modern, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(navigation, /@media \(min-width: 900px\)/);
});
