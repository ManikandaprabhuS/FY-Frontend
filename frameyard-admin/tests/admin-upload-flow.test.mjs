import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';

const original = await readFile(new URL('../src/components/ui/OptionalImageUpload.tsx', import.meta.url), 'utf8');
const code = original
  .replace("import { useRef, useState } from 'react';", 'const { useRef, useState } = globalThis.__uploadHooks;')
  .replace("import { uploadProductImages } from '../../services/product.service';", 'const uploadProductImages = files => globalThis.__uploadRequest(files);')
  .replace("import { showSuccess, showWarning, showApiError } from '../../utils/toast';", 'const showSuccess = message => globalThis.__uploadNotices.push(["success", message]); const showWarning = message => globalThis.__uploadNotices.push(["warning", message]); const showApiError = (error, message) => globalThis.__uploadNotices.push(["error", message]);')
  .replace("import { FormStatus } from './FormAction';", 'const FormStatus = () => null;');
const output = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
function setup(request) {
  globalThis.__uploadNotices = [];
  globalThis.__uploadRequest = request;
  globalThis.__uploadHooks = { useState: initial => [initial, () => {}], useRef: initial => ({ current: initial }) };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output.outputText)(createRequire(import.meta.url), mod, mod.exports);
  const busy = []; const changed = [];
  const tree = mod.exports.default({ label: 'Black frame image', busy: false, onBusyChange: value => busy.push(value), onChange: value => changed.push(value) });
  const input = tree.props.children.find(child => child?.type === 'input');
  return { busy, changed, select: file => input.props.onChange({ currentTarget: { files: [file], value: 'chosen.png' } }) };
}
const file = { type: 'image/png', size: 1024 };
test('color/variant upload succeeds, clears busy status and shows one success', async () => {
  const form = setup(async () => ['https://example.com/frame.png']);
  await form.select(file);
  assert.deepEqual(form.busy, [true, false]);
  assert.deepEqual(form.changed, ['https://example.com/frame.png']);
  assert.deepEqual(globalThis.__uploadNotices, [['success', 'Black frame image uploaded']]);
});
test('failed or timed-out upload clears busy state and shows one error', async () => {
  const form = setup(async () => { throw Object.assign(new Error('Timeout'), { isAxiosError: true, code: 'ECONNABORTED' }); });
  await form.select(file);
  assert.deepEqual(form.busy, [true, false]);
  assert.deepEqual(form.changed, []);
  assert.equal(globalThis.__uploadNotices.length, 1);
  assert.equal(globalThis.__uploadNotices[0][0], 'error');
});
test('concurrent uploads are blocked and invalid files never start an upload', async () => {
  let finish; let calls = 0;
  const form = setup(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const pending = form.select(file);
  await form.select(file);
  assert.equal(calls, 1);
  finish(['https://example.com/frame.png']); await pending;
  const invalid = setup(async () => { throw new Error('must not call'); });
  await invalid.select({ type: 'image/png', size: 0 });
  assert.deepEqual(invalid.busy, []);
  assert.equal(globalThis.__uploadNotices[0][0], 'warning');
});
