import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('footer uses the smaller lossless asset without changing its layout or lazy loading', () => {
  const component = readFileSync(new URL('../src/features/customer/components/Footer.tsx', import.meta.url), 'utf8');
  const original = readFileSync(new URL('../src/assets/footer-craftsmanship.png', import.meta.url));
  const optimized = readFileSync(new URL('../src/assets/footer-craftsmanship.webp', import.meta.url));
  assert.match(component, /import footerCraftsmanship from '\.\.\/\.\.\/\.\.\/assets\/footer-craftsmanship\.webp'/);
  assert.match(component, /loading="lazy"/);
  assert.match(component, /block h-\[150px\] w-full object-cover object-bottom sm:h-\[190px\] md:h-\[220px\] lg:h-auto/);
  assert.match(component, /FrameYaad handcrafted framing process illustration/);
  assert.equal(optimized.toString('ascii', 0, 4), 'RIFF');
  assert.equal(optimized.toString('ascii', 8, 12), 'WEBP');
  assert(optimized.length < original.length * 0.6);
});
