import test from 'node:test';
import assert from 'node:assert/strict';
import { ratioFromFrameSize, selectVariantPhoto, parseStoredCrops, fitPhotoRect, resolvePreviewFrameImage } from '../src/features/customer/components/framePreviewGeometry.ts';
import { getFrameOpening } from '../src/features/customer/components/framePreviewConfig.ts';
import { productOptionImage } from '../src/features/customer/utils/productOptionImage.ts';

for (const [size, expected] of [['5x5', 1], ['8 X 10', 0.8], ['12 X 10', 1.2], ['10x12', 10 / 12], ['10x8', 1.25], ['15x10', 1.5], ['5.5 × 8.5', 5.5 / 8.5]]) {
  test(`${size} retains its fixed ratio inside the photo opening`, () => {
    const ratio = ratioFromFrameSize(size);
    assert.equal(ratio.width / ratio.height, expected);
    const opening = { x: 100, y: 120, width: 220, height: 300 };
    const rect = fitPhotoRect(opening, ratio.width / ratio.height);
    assert.ok(Math.abs(rect.width / rect.height - expected) < 1e-10);
    assert.ok(rect.x >= opening.x && rect.y >= opening.y);
    assert.ok(rect.x + rect.width <= opening.x + opening.width + 1e-10);
    assert.ok(rect.y + rect.height <= opening.y + opening.height + 1e-10);
  });
}
test('missing/malformed size has a stable safe ratio', () => {
  for (const size of [undefined, '', 'Custom', '0x10']) assert.equal(ratioFromFrameSize(size).width / ratioFromFrameSize(size).height, 0.8);
});
test('switching sizes retains the source and restores size-specific crops', () => {
  const crops = { '5x5': 'square-crop' };
  assert.equal(selectVariantPhoto(crops, '8x10', 'original-photo'), 'original-photo');
  assert.equal(selectVariantPhoto(crops, '5x5', 'original-photo'), 'square-crop');
  assert.equal(selectVariantPhoto(crops, '12x10', ''), 'square-crop');
  assert.equal(selectVariantPhoto({}, '8x10', ''), '');
  assert.equal(selectVariantPhoto({ ...crops, '8x10': '' }, '8x10', 'original-photo'), '');
});
test('old saved crops remain readable and malformed storage cannot break preview', () => {
  assert.deepEqual(parseStoredCrops('{"5x5":"photo"}'), { '5x5': 'photo' });
  for (const value of ['null', '[]', 'broken']) assert.deepEqual(parseStoredCrops(value), {});
  assert.deepEqual(parseStoredCrops('{"5x5":12,"8x10":"photo"}'), { '8x10': 'photo' });
});
test('old calibrated frames remain available; unknown new assets are not given guessed openings', () => {
  assert.ok(getFrameOpening('https://example.com/87576780-7b6f-4217-be7a-08a74ddbc510.jpeg'));
  assert.equal(getFrameOpening('https://example.com/new-upload.jpg'), undefined);
});
test('Modern Family Frame uses its measured opening and keeps photo geometry inside it', () => {
  const frame = 'https://example.com/be1cdb03-b694-4d16-b593-c592ad3417f6.jpg';
  const openings = getFrameOpening(frame);
  assert.equal(openings.length, 1);
  assert.equal(openings[0].points.length, 4);
  for (const size of ['5x5', '8 X 10', '12 X 10']) {
    const ratio = ratioFromFrameSize(size);
    const rect = fitPhotoRect({ x: openings[0].x * 1343, y: openings[0].y * 1500, width: openings[0].width * 1343, height: openings[0].height * 1500 }, ratio.width / ratio.height);
    assert.ok(Math.abs(rect.width / rect.height - ratio.width / ratio.height) < 1e-10);
  }
  assert.equal(resolvePreviewFrameImage('unconfigured-color.webp', frame, image => Boolean(getFrameOpening(image))), frame);
  assert.equal(resolvePreviewFrameImage('unconfigured-variant.jpg', frame, image => Boolean(getFrameOpening(image))), frame);
});
test('color and variant display images do not replace a calibrated photo composition', () => {
  const frame = 'https://example.com/87576780-7b6f-4217-be7a-08a74ddbc510.jpeg';
  const product = { images: [{ imageUrl: frame, isPrimary: true, color: null }, { imageUrl: 'color.jpg', color: 'Black' }] };
  const variant = { imageUrl: 'variant.jpg' };
  assert.equal(productOptionImage(product, variant, 'Black', 'color'), 'color.jpg');
  assert.equal(productOptionImage(product, variant, 'Black', 'variant'), 'variant.jpg');
  for (const display of ['color.jpg', 'variant.jpg']) assert.equal(resolvePreviewFrameImage(display, frame, image => Boolean(getFrameOpening(image))), frame);
  assert.equal(productOptionImage(product, {}, 'White', 'variant'), frame);
  assert.equal(resolvePreviewFrameImage('new-variant.jpg', 'new-default.jpg', () => false), 'new-default.jpg');
});
