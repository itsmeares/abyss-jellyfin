import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const entrypoint = await readFile(new URL('../abyss-v12.css', import.meta.url), 'utf8');
const modern = await readFile(new URL('../styles/abyss-jf12.css', import.meta.url), 'utf8');
const offsetAppBar = await readFile(new URL('../styles/abyss-jf12-offset-appbar.css', import.meta.url), 'utf8');
const navigation = await readFile(new URL('../styles/abyss-jf12-nav.css', import.meta.url), 'utf8');

test('Jellyfin 12 entrypoint keeps the legacy base and adds only compatibility bridges', () => {
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

test('portal surfaces are gated to the modern AppLayout, including the video route', () => {
  assert.match(modern, /html:has\(#reactRoot \.MuiAppBar-root\) \.MuiPaper-root\.MuiMenu-paper/);
  assert.match(modern, /html:has\(#reactRoot \.MuiAppBar-root\) \.MuiDrawer-paper/);
});

test('video OSD stays transparent and styles controls rather than inventing a toolbar card', () => {
  const osdToolbar = modern.match(/#reactRoot \.skinHeader\.osdHeader > \.MuiToolbar-root\s*\{([^}]*)\}/s)?.[1] || '';
  assert.match(modern, /\.skinHeader\.osdHeader:has\(> \.MuiToolbar-root\)/);
  assert.match(osdToolbar, /background:\s*transparent !important/);
  assert.match(osdToolbar, /box-shadow:\s*none !important/);
  assert.match(osdToolbar, /border:\s*0 !important/);
  assert.doesNotMatch(osdToolbar, /border-radius:\s*18px/);
});

test('OffsetAppBar guard changes geometry only, not Abyss visual spacing', () => {
  assert.match(offsetAppBar, /gap:\s*0/);
  assert.match(offsetAppBar, /padding:\s*0 !important/);
  assert.match(offsetAppBar, /> \.MuiToolbar-root\s*\{\s*margin:\s*0;/s);
  assert.doesNotMatch(offsetAppBar, /margin:\s*0 12px/);
  assert.doesNotMatch(offsetAppBar, /padding-top:/);
  assert.doesNotMatch(offsetAppBar, /margin-top:\s*[1-9]/);
});

test('desktop Auto navigation reuses Jellyfin native legacy controls', () => {
  assert.match(navigation, /:has\(> \.mainDrawer\):has\(> \.skinHeader\):has\(> \.mainDrawerHandle\)/);
  assert.match(navigation, /\.headerLeft > \.headerButton:not\(\.hide\)/);
  assert.match(navigation, /\.mainDrawerHandle/);
  assert.doesNotMatch(navigation, /abyss-modern-drawer/);
  assert.doesNotMatch(navigation, /data-abyss-modern/);
});

test('desktop Auto navigation uses only the real legacy centre tab strip', () => {
  assert.match(navigation, /\.headerTabs\.sectionTabs \.emby-tab-button/);
  assert.match(navigation, /\.headerTabs\.sectionTabs:has\(\.emby-tab-button\)/);
  assert.match(navigation, /> \.MuiToolbar-root:first-child > \.MuiStack-root\s*\{[^}]*display:\s*none !important/s);

  assert.doesNotMatch(navigation, /Fallback centre navigation/i);
  assert.doesNotMatch(navigation, /content:\s*["']Home["']/);
  assert.doesNotMatch(navigation, /html:not\(:has\(#reactRoot \.headerTabs\.sectionTabs \.emby-tab-button\)\)/);
});

test('Jellyfin remains the source of truth for legacy back and home visibility', () => {
  const forcedHiddenRules = navigation.match(/[^{}]+\{[^{}]*display:\s*none !important;[^{}]*\}/gs) || [];

  assert.equal(
    forcedHiddenRules.some(rule => rule.includes('.headerBackButton')),
    false,
    'compatibility CSS must not force-hide Jellyfin legacy back button'
  );
  assert.equal(
    forcedHiddenRules.some(rule => rule.includes('.headerHomeButton')),
    false,
    'compatibility CSS must not force-hide Jellyfin legacy home button'
  );
});

test('modern shell maps to Abyss surfaces instead of inventing new cards', () => {
  const firstToolbar = modern.match(/#reactRoot \.MuiAppBar-root:has\(> \.MuiToolbar-root\) > \.MuiToolbar-root\s*\{([^}]*)\}/s)?.[1] || '';
  assert.match(firstToolbar, /background:\s*transparent !important/);
  assert.match(firstToolbar, /border:\s*0 !important/);
  assert.match(firstToolbar, /border-radius:\s*0 !important/);
  assert.match(firstToolbar, /box-shadow:\s*none !important/);

  assert.match(modern, /\.MuiDrawer-paper\s*\{[^}]*margin:\s*24px[^}]*border-radius:\s*32px[^}]*rgba\(var\(--abyss-glass-tint\), 0\.69\)[^}]*0 4px 30px rgba\(0, 0, 0, 0\.1\)/s);
  assert.match(modern, /\.MuiPaper-root\.MuiDialog-paper\s*\{[^}]*border-radius:\s*24px/s);
  assert.match(modern, /\.MuiSnackbarContent-root,[\s\S]*?\.MuiAlert-root\s*\{[^}]*border-radius:\s*24px/s);

  assert.doesNotMatch(modern, /rgba\(var\(--abyss-accent\), 0\.14\)/);
  assert.doesNotMatch(modern, /0 16px 50px/);
  assert.doesNotMatch(modern, /\.MuiTooltip-tooltip/);
  assert.doesNotMatch(modern, /transform:\s*scale\(0\.9[47]\)/);
});

test('modern drawer maps directly to Abyss navMenuOption styling', () => {
  assert.match(modern, /\.MuiDrawer-paper \.MuiListItemButton-root\s*\{[^}]*padding:\s*0\.5em 0\.9em[^}]*border-radius:\s*12px/s);
  assert.match(modern, /\.MuiDrawer-paper \.MuiListItemIcon-root\s*\{[^}]*padding:\s*10px[^}]*border-radius:\s*50px[^}]*background:\s*#cccccf69/s);
  assert.match(modern, /\.MuiDrawer-paper \.MuiListItemText-primary\s*\{[^}]*font-size:\s*large[^}]*font-weight:\s*500/s);
  assert.match(modern, /\.MuiDrawer-paper \.MuiListItemButton-root\.Mui-selected\s*\{[^}]*background:\s*transparent !important[^}]*color:\s*rgb\(var\(--abyss-accent\)\)/s);
  assert.match(modern, /\.MuiDrawer-paper \.MuiListItemButton-root:hover,[\s\S]*?background:\s*rgb\(var\(--abyss-accent\)\) !important;[\s\S]*?color:\s*#121212 !important/s);
});

test('modern tabs map directly to Abyss emby-tabs styling', () => {
  assert.match(modern, /\.MuiTabs-scroller\s*\{[^}]*padding:\s*5px 2\.5px[^}]*border-radius:\s*50px[^}]*rgba\(var\(--abyss-glass-tint\), 0\.9\)[^}]*0 4px 30px rgba\(0, 0, 0, 0\.1\)/s);
  assert.match(modern, /\.MuiTabs-indicator\s*\{\s*display:\s*none;/s);
  assert.match(modern, /\.MuiTab-root\s*\{[^}]*margin:\s*0 2\.5px[^}]*padding:\s*0\.5em 1\.5em[^}]*border-radius:\s*50px/s);
  assert.match(modern, /\.MuiTab-root\.Mui-selected\s*\{[^}]*background:\s*rgb\(var\(--abyss-accent\)\) !important[^}]*color:\s*#121212 !important/s);
});

test('modern icon and form states reuse Abyss values', () => {
  assert.match(modern, /\.MuiIconButton-root:hover[\s\S]*?background-color:\s*rgba\(0, 0, 0, 0\.4\) !important;[\s\S]*?color:\s*rgb\(var\(--abyss-accent\)\) !important;/);
  assert.match(modern, /\.MuiOutlinedInput-root\.Mui-focused \.MuiOutlinedInput-notchedOutline\s*\{[^}]*rgba\(var\(--abyss-accent\), 0\.4\)/s);
  assert.match(modern, /\.MuiSwitch-switchBase\.Mui-checked \+ \.MuiSwitch-track\s*\{[^}]*opacity:\s*0\.5/s);
});

test('bridge keeps responsive handling without duplicating base reduced-motion policy', () => {
  assert.match(modern, /@media \(max-width: 899px\)/);
  assert.match(modern, /@media \(max-width: 416px\)/);
  assert.match(navigation, /@media \(min-width: 900px\)/);
  assert.doesNotMatch(modern, /prefers-reduced-motion/);
});
