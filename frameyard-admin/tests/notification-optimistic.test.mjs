import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/store/notificationStore.ts', import.meta.url), 'utf8');
function setup() {
  const calls = { success: [], error: [], reads: 0, all: 0, list: 0 };
  let read = async id => ({ notification: { id, read: true }, unreadCount: 1 });
  let all = async () => 0;
  let list = async () => ({ notifications: [], summary: { unreadCount: 0 } });
  const service = {
    toggleRead: id => { calls.reads++; return read(id); },
    markAllRead: () => { calls.all++; return all(); },
    listPage: () => { calls.list++; return list(); },
  };
  const mod = { exports: {} };
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'module', 'exports', output)(name => name.includes('notification.service') ? { notificationService: service } : name.includes('utils/toast') ? { showSuccess: (text, options) => { calls.success.push({ text, options }); return options?.id; }, showError: (text, options) => calls.error.push({ text, options }) } : require(name), mod, mod.exports);
  const store = mod.exports.useNotificationStore;
  store.getState().ingestPage([{ id: 'a', read: false }, { id: 'b', read: false }], 2);
  return { store, calls, read: fn => { read = fn; }, all: fn => { all = fn; }, list: fn => { list = fn; } };
}
function deferred() { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; }
test('one read is visible immediately, deduplicates clicks, and never refetches the list', async () => {
  const x=setup(), pending=deferred(); x.read(() => pending.promise);
  const action=x.store.getState().toggleNotificationRead('a');
  assert.equal(x.store.getState().notifications[0].read,true); assert.equal(x.store.getState().unreadCount,1);
  await x.store.getState().toggleNotificationRead('a');
  assert.equal(x.calls.reads,1); assert.equal(x.calls.success.length,1);
  pending.resolve({ notification: { id:'a',read:true }, unreadCount:1 }); await action;
  assert.equal(x.calls.list,0);
});
test('failed read rolls back and exposes a user-initiated retry', async () => {
  const x=setup(); x.read(async()=>{throw Error('offline');});
  await x.store.getState().toggleNotificationRead('a');
  assert.equal(x.store.getState().notifications[0].read,false); assert.equal(x.store.getState().unreadCount,2);
  assert.equal(typeof x.calls.error[0].options.retry,'function');
  assert.equal(x.calls.error[0].options.id,x.calls.success[0].options.id);
  x.read(async()=>({notification:{id:'a',read:true},unreadCount:1}));
  x.calls.error[0].options.retry(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(x.store.getState().unreadCount,1);
});
test('mark all is immediate and one request, with complete rollback on failure', async () => {
  const x=setup(), pending=deferred(); x.all(()=>pending.promise);
  const action=x.store.getState().markAllAsRead();
  assert.equal(x.store.getState().unreadCount,0); assert.ok(x.store.getState().notifications.every(n=>n.read));
  pending.reject(Error('failed')); await action;
  assert.equal(x.calls.all,1); assert.equal(x.calls.list,0); assert.equal(x.store.getState().unreadCount,2);
  assert.ok(x.store.getState().notifications.every(n=>!n.read));
});
test('a slow poll cannot undo a newer optimistic read',async()=>{
  const x=setup(), pending=deferred();x.list(()=>pending.promise);
  const poll=x.store.getState().fetchNotifications(true);
  await x.store.getState().toggleNotificationRead('a');
  pending.resolve({notifications:[{id:'a',read:false},{id:'b',read:false}],summary:{unreadCount:2}});await poll;
  assert.equal(x.store.getState().notifications.find(n=>n.id==='a').read,true);assert.equal(x.store.getState().unreadCount,1);
});
test('already-read clicks succeed quietly without a request or duplicate toast',async()=>{
  const x=setup();await x.store.getState().toggleNotificationRead('a');await x.store.getState().toggleNotificationRead('a');
  assert.equal(x.calls.reads,1);assert.equal(x.calls.success.length,1);
});
test('page and bell use shared optimistic state, not a post-read refetch',()=>{
  const page=readFileSync(new URL('../src/pages/notifications/NotificationsPage.tsx',import.meta.url),'utf8');
  assert.match(page,/useNotificationStore\.getState\(\)\.markAllAsRead/);assert.match(page,/useNotificationStore\.getState\(\)\.toggleNotificationRead/);
  const service=readFileSync(new URL('../src/services/notification.service.ts',import.meta.url),'utf8');
  assert.doesNotMatch(service,/return notificationService.getNotifications/);
});

test('optimistic updates show the staff reader immediately and accept the server first-reader identity', async () => {
  const x=setup(), pending=deferred();x.read(()=>pending.promise);
  const reader={id:'staff',name:'Employee One',email:'employee@example.com',role:'EMPLOYEE'};
  const action=x.store.getState().toggleNotificationRead('a',reader);
  assert.equal(x.store.getState().notifications[0].readBy.name,'Employee One');
  pending.resolve({notification:{id:'a',read:true,readBy:{...reader,name:'First Admin',role:'ADMIN'}},unreadCount:1});await action;
  assert.equal(x.store.getState().notifications[0].readBy.name,'First Admin');
});
test('out-of-order concurrent read responses cannot resurrect an unread badge',async()=>{
  const x=setup(),a=deferred(),b=deferred();x.read(id=>id==='a'?a.promise:b.promise);
  const first=x.store.getState().toggleNotificationRead('a'),second=x.store.getState().toggleNotificationRead('b');
  b.resolve({notification:{id:'b',read:true},unreadCount:0});await second;
  a.resolve({notification:{id:'a',read:true},unreadCount:1});await first;
  assert.equal(x.store.getState().unreadCount,0);
});
