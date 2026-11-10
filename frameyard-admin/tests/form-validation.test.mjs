import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePerson, validatePhone, validateVariant, validateProductBasics, validateProductFiles } from '../src/utils/form-validation.ts';

const variant = { frameSize: '5x5', mountType: 'NONE', glassType: 'NONE', price: 100, stockQuantity: 0 };

test('person fields reject blanks, markup, long strings and malformed formats', () => {
  assert.equal(validatePerson({ name: 'Example', email: 'test@example.com', phoneNumber: '+91 9876543210' }), null);
  for (const name of ['', '   ', '<script>bad</script>', 'x'.repeat(121)]) assert.ok(validatePerson({ name }));
  assert.ok(validatePerson({ name: 'Example', email: 'not-an-email' }));
  assert.ok(validatePerson({ name: 'Example', password: 'short' }));
  assert.ok(validatePhone('abcdefghij'));
  assert.equal(validatePhone(''), null);
});
test('variants validate price, enum, stock and required text without calculations', () => {
  assert.equal(validateVariant(variant), null);
  for (const price of [0, -1, NaN, Infinity, 10_000_000_000]) assert.ok(validateVariant({ ...variant, price }));
  for (const stockQuantity of [-1, 0.5, 2_147_483_648]) assert.ok(validateVariant({ ...variant, stockQuantity }));
  assert.ok(validateVariant({ ...variant, frameSize: '  ' }));
  assert.ok(validateVariant({ ...variant, glassType: 'unexpected' }));
});
test('product basics enforce lengths and normalized unique colors', () => {
  const product = { name: 'Example frame', brandName: 'FrameYaad', material: 'Wood', description: '', availableColors: ['Black'] };
  assert.equal(validateProductBasics(product), null);
  assert.ok(validateProductBasics({ ...product, availableColors: ['Black', ' black '] }));
  assert.ok(validateProductBasics({ ...product, availableColors: [] }));
  assert.ok(validateProductBasics({ ...product, description: 'x'.repeat(2001) }));
});

test('file inputs reject unsupported, empty and oversized files', () => {
  assert.equal(validateProductFiles([{ type: 'image/png', size: 1024 }]), null);
  for (const file of [{ type: 'text/html', size: 50 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: 11 * 1024 * 1024 }]) assert.ok(validateProductFiles([file]));
});
