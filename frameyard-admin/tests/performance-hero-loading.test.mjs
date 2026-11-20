import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('initial Home image preload is route-scoped and runs before React mounts', () => {
  const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
  assert.match(main, /import \{ preload \} from 'react-dom'/);
  assert.match(main, /import heroPalm from '\.\/assets\/hero-palm\.webp'/);
  assert.match(main, /if \(window\.location\.pathname === '\/'\) \{\s*preload\(heroPalm, \{ as: 'image', fetchPriority: 'high' \}\)/);
  assert(main.indexOf('preload(heroPalm') < main.indexOf('createRoot(document'));
});

test('the existing hero plant keeps its asset and styling with a high-priority hint', () => {
  const hero = readFileSync(new URL('../src/features/customer/components/HeroSection.tsx', import.meta.url), 'utf8');
  assert.match(hero, /<img className="fy-wall__plant" src=\{HERO_PLANT\} alt="" aria-hidden="true" decoding="async" fetchPriority="high" draggable=\{false\} \/>/);
});
