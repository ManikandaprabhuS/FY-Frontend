import test from 'node:test';
import assert from 'node:assert/strict';
import { discountPercent, getVariantPricing, getLowestVariantPricing, variantForColor } from '../src/features/customer/utils/product-pricing.ts';

for (const [original, selling, expected] of [[500,449,10],[550,450,18],[790,690,13],[1149,999,13],[1400,1200,14]]) {
  test(`${original} -> ${selling} = ${expected}% OFF`, () => {
    assert.equal(discountPercent(original, selling), expected);
    assert.equal(getVariantPricing({ mrp: original, price: selling }).discount, expected);
    assert.equal(getVariantPricing({ mrp: original, price: original, offerPrice: selling }).discount, expected);
  });
}
test('invalid or non-discounted prices never create negative, NaN or 100% badges', () => {
  for (const [original, selling] of [[undefined,449],[null,449],['',449],[0,449],[-1,449],[449,449],[400,449],[NaN,449],[Infinity,449],[500,NaN],[500,Infinity],[500,0],[500,-1],[1000,0.01]]) assert.equal(discountPercent(original,selling),0);
  assert.equal(getVariantPricing({ price: 449 }).discount, 0);
  assert.equal(getVariantPricing({ price: NaN }).currentPrice, 0);
});
test('raw backend and normalized frontend fields resolve the same selling price', () => {
  assert.deepEqual(getVariantPricing({ mrp:'550', price:'450' }), getVariantPricing({ mrp:550, price:550, offerPrice:450 }));
  assert.equal(getVariantPricing({ price:550, offerPrice:450 }).discount,18);
  assert.equal(getVariantPricing({ mrp:0, price:550, offerPrice:450 }).discount,0);
});
test('catalog uses one active variant for original, selling, discount and add-to-bag selection', () => {
  const low = { id:'low', mrp:550, price:550, offerPrice:450 };
  const result = getLowestVariantPricing([{ id:'high', mrp:1400, price:1400, offerPrice:1200 }, { id:'inactive', mrp:500, price:1, isActive:false }, low]);
  assert.equal(result.variant,low);
  assert.equal(result.currentPrice,450);
  assert.equal(result.originalPrice,550);
  assert.equal(result.discount,18);
});
test('color selection updates the actual variant while retaining size where available', () => {
  const black = { id:'black', color:'Black', frameSize:'8x10', mountType:'NONE', glassType:'NONE', mrp:500, price:500, offerPrice:449 };
  const white = { ...black, id:'white', color:'White', mrp:790, price:790, offerPrice:690 };
  const selected = variantForColor([black,{ ...white,id:'white-large',frameSize:'12x10' },white],black,' white ');
  assert.equal(selected.id,'white');
  assert.deepEqual(getVariantPricing(selected),{ currentPrice:690, originalPrice:790, discount:13 });
  assert.equal(variantForColor([black],black,'decorative finish'),black);
});
