import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const filename = new URL('../src/components/ui/FormAction.tsx', import.meta.url);
const source = await readFile(filename, 'utf8');
const notices = [];
globalThis.__formWarning = message => notices.push(message);
const output = ts.transpileModule(source.replace("import { showWarning } from '../../utils/toast';", 'const showWarning = message => globalThis.__formWarning(message);'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
const mod = { exports: {} };
new Function('require', 'module', 'exports', output.outputText)(createRequire(import.meta.url), mod, mod.exports);
const { default: FormAction, FormStatus } = mod.exports;
test('incomplete action stays grey and announces exactly one warning without advancing', () => {
  notices.length = 0; let actions = 0; let focused = 0; let prevented = 0;
  const input = { disabled: false, value: '  ', focus: () => focused++ };
  const button = FormAction({ issue: 'Complete the required fields.', children: 'Next', onClick: () => actions++ });
  assert.equal(button.props['aria-disabled'], true);
  assert.equal(button.props.disabled, false);
  assert.match(button.props.className, /opacity-50/);
  button.props.onClick({ preventDefault: () => prevented++, currentTarget: { closest: () => ({ querySelectorAll: () => [input] }) } });
  assert.equal(actions, 0); assert.equal(prevented, 1); assert.equal(focused, 1);
  assert.deepEqual(notices, ['Complete the required fields.']);
});
test('valid action enables immediately and calls the existing handler', () => {
  let calls = 0;
  const button = FormAction({ issue: null, children: 'Next', onClick: () => calls++ });
  assert.equal(button.props['aria-disabled'], false);
  assert.doesNotMatch(button.props.className, /opacity-50/);
  button.props.onClick({});
  assert.equal(calls, 1);
});
test('busy action is genuinely disabled and cannot submit', () => {
  let calls = 0;
  const button = FormAction({ busy: true, children: 'Save', onClick: () => calls++ });
  assert.equal(button.props.disabled, true);
  assert.equal(button.props['aria-busy'], true);
  button.props.onClick({});
  assert.equal(calls, 0);
});
test('upload/save status is bold, polite and disappears when finished', () => {
  const images = renderToStaticMarkup(createElement(FormStatus, { busy: true, images: true }));
  assert.match(images, /Please wait, your images are being uploaded/);
  assert.match(images, /font-bold/); assert.match(images, /animate-spin/);
  assert.match(images, /aria-live="polite"/);
  assert.match(renderToStaticMarkup(createElement(FormStatus, { busy: true })), /details are being saved/);
  assert.equal(renderToStaticMarkup(createElement(FormStatus, { busy: false })), '');
});
test('active admin forms use live guarded actions and have no duplicated summary error bar', async () => {
  for (const path of ['products/ProductDetailsPage.tsx']) {
    const code = await readFile(new URL('../src/pages/' + path, import.meta.url), 'utf8');
    assert.match(code, /FormAction/); assert.match(code, /FormStatus/);
    assert.doesNotMatch(code, /\{(?:wizardError|imageError|error) && <p/);
    assert.match(code, /finally/);
  }
});
