import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import toast, { useToasterStore } from 'react-hot-toast';
import { showSuccess, showError, showWarning, showApiError, showValidationWarning, toastOptions } from '../src/utils/toast.ts';

beforeEach(() => toast.remove());
afterEach(() => toast.remove());
const currentToasts = () => {
  let result = [];
  function Probe() { result = useToasterStore(toastOptions).toasts; return null; }
  renderToStaticMarkup(createElement(Probe));
  return result;
};
const apiFailure = (status, code) => ({ isAxiosError: true, response: { status, data: { error: { code } } } });
const colors = { success: '#166534', error: '#991b1b', warning: '#92400e' };
for (const [kind, show, icon, duration] of [['success',showSuccess,'#16a34a',3500],['error',showError,'#dc2626',4500],['warning',showWarning,'#d97706',4500]]) {
  test(`${kind} uses bold readable text, a matching icon and shared duration`, () => {
    show('Original message text');
    const item = currentToasts()[0];
    assert.equal(item.message,'Original message text');
    assert.equal(item.style.fontWeight,700);
    assert.equal(item.style.color,colors[kind]);
    assert.equal(item.icon.props.color,icon);
    assert.equal(item.duration,duration);
    assert.equal(item.position,undefined); // Toaster retains the existing top-right position.
  });
}
test('same message/type deduplicates and explicit IDs preserve error replacement', () => {
  const first = showWarning('Please login to continue to checkout');
  assert.equal(showWarning('Please login to continue to checkout'),first);
  assert.equal(currentToasts().length,1);
  toast.remove();
  const id = showSuccess('Notification removed');
  showError('Failed to delete notification',{ id });
  assert.equal(currentToasts().length,1);
  assert.equal(currentToasts()[0].style.color,colors.error);
});
for (const [label,status,code,kind] of [
  ['customer wrong credentials',401,'INVALID_CREDENTIALS','error'],
  ['signup validation',400,'VALIDATION_ERROR','warning'],
  ['signup duplicate',409,'ACCOUNT_ALREADY_EXISTS','warning'],
  ['forgot password wrong OTP',400,'INVALID_RECOVERY_OTP','warning'],
  ['forgot password expired OTP',410,'INVALID_RECOVERY_OTP','warning'],
  ['forgot password attempt limit',429,'OTP_ATTEMPTS_EXCEEDED','warning'],
  ['forgot password email outage',502,'PASSWORD_RESET_DELIVERY_FAILED','error'],
  ['cart invalid coupon',400,'INVALID_PROMO_CODE','warning'],
  ['employee save failure',500,'INTERNAL_SERVER_ERROR','error'],
  ['admin unauthorized',403,'FORBIDDEN','error'],
  ['color/variant invalid image',415,'INVALID_FILE_CONTENT','warning'],
  ['product oversized upload',413,'FILE_TOO_LARGE','warning'],
]) {
  test(`${label} maps to ${kind}`, () => {
    showApiError(apiFailure(status,code),'Keep this message');
    assert.equal(currentToasts()[0].style.color,colors[kind]);
    assert.equal(currentToasts()[0].message,'Keep this message');
  });
}
test('network failures are red and form required-field messages are amber', () => {
  showApiError({ isAxiosError:true },'Unable to connect');
  assert.equal(currentToasts()[0].style.color,colors.error);
  toast.remove();
  showValidationWarning({ name:{ message:'Full name is required' } });
  assert.equal(currentToasts()[0].message,'Full name is required');
  assert.equal(currentToasts()[0].style.color,colors.warning);
});
test('all three text/background pairs meet AA contrast, including on a dark surrounding page', () => {
  const luminance = hex => {
    const rgb = hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value,16)/255).map(value => value <= 0.04045 ? value/12.92 : ((value+0.055)/1.055)**2.4);
    return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
  };
  for (const show of [showSuccess,showError,showWarning]) {
    toast.remove(); show('Readable message');
    const { color, background } = currentToasts()[0].style;
    const a = luminance(color), b = luminance(background);
    assert.ok((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05) >= 4.5);
  }
});
