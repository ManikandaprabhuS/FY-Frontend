import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isResourceId, isEmptyResourceResponse, resourcePath, resourceResponseKey, reportMissingResource, subscribeToMissingResources, ResourceNotFoundError } from '../src/utils/resource-not-found.ts';

const id = '11111111-1111-4111-8111-111111111111';
test('malformed, undefined, encoded, injected and long IDs never load a resource page', () => {
  assert.equal(isResourceId(id),true);
  for (const value of [undefined,'undefined','abc123xyz','%3Cscript%3E','<script>alert(1)</script>','x'.repeat(5000),'../orders','%E0%A4%A']) assert.equal(isResourceId(value),false);
});
for (const [root,key] of [['/products/public','product'],['/products','product'],['/users','user'],['/orders','order'],['/appointments','appointment'],['/employees','employee']]) {
  test(`${root} recognizes missing/empty details without treating valid data as 404`, () => {
    const path = `${root}/${id}`;
    assert.equal(resourceResponseKey(path),key);
    for (const body of [undefined,null,{}, {data:{[key]:null}}, {data:{[key]:{}}}]) assert.equal(isEmptyResourceResponse(path,body),true);
    assert.equal(isEmptyResourceResponse(path,{data:{[key]:{id}}}),false);
    assert.equal(isEmptyResourceResponse(path,{[key]:{id}}),false);
  });
}
test('empty collections and phone lookup are not misclassified as missing details', () => {
  for (const path of ['/products/public?page=1','/products','/users','/users/lookup/phone','/orders','/coupons']) {
    assert.equal(resourceResponseKey(path),undefined);
    assert.equal(isEmptyResourceResponse(path,{data:{products:[]}}),false);
  }
});
test('failure subscriptions are scoped to the requested endpoint and clean up on leave', () => {
  let count = 0;
  const path = `/products/public/${id}`;
  const unsubscribe = subscribeToMissingResources(failed => { if (failed === path) count++; });
  reportMissingResource(`/users/${id}`);
  assert.equal(count,0);
  reportMissingResource(`https://example.com/api/v1${path}?secret=not-rendered`);
  assert.equal(count,1);
  unsubscribe(); reportMissingResource(path); assert.equal(count,1);
  assert.equal(resourcePath(`/api/v1${path}?token=value`),path);
});
test('not-found errors contain no URL or raw input', () => {
  const error = new ResourceNotFoundError();
  assert.equal(error.status,404);
  assert.equal(error.message,'Requested resource was not found');
});
test('404 preserves copy with positive spacing, responsive image and viewport centering', () => {
  const source = readFileSync(new URL('../src/pages/errors/RouteErrorPage.tsx',import.meta.url),'utf8');
  assert.ok(source.includes('Oops! This frame doesn&apos;t exist.'));
  assert.ok(source.includes('items-center justify-center'));
  assert.ok(source.includes('min-h-svh'));
  assert.ok(source.includes('h-auto max-w-full'));
  assert.ok(source.includes('mt-6 w-full'));
  assert.ok(!source.includes('-mt-'));
});
test('route guards cover customer/admin details and admin catch-all remains inside ProtectedRoute', () => {
  const source = readFileSync(new URL('../src/routes/index.tsx',import.meta.url),'utf8');
  for (const root of ['/products/public','/products','/users','/appointments']) assert.ok(source.includes(`apiRoot="${root}"`));
  assert.ok(source.includes("path: '/admin',element: <ProtectedRoute />"));
  assert.ok(source.includes('element: <NotFoundRoute />'));
  assert.ok(!source.includes('homePath="/admin/overview"'));
  assert.ok(source.includes('errorElement: <RouterErrorBoundary />'));
  assert.ok(source.includes("{path: '*', element: <RouteErrorPage />"));
  assert.ok(readFileSync(new URL('../public/_redirects',import.meta.url),'utf8').includes('/* /index.html 200'));
});
