'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }

check('classic JavaScript syntax and deferred local entry points', () => {
  for (const file of fs.readdirSync(ROOT).filter(name => name.endsWith('.js'))) {
    new vm.Script(read(file), { filename: file });
  }
  const html = read('index.html');
  assert(!/<script\b[^>]*type=["']module/.test(html));
  assert(!fs.existsSync(path.join(ROOT, 'core.mjs')));
  for (const tag of html.match(/<script\b[^>]+>/g) || []) {
    assert(/\bdefer\b/.test(tag));
    const src = /src="([^"]+)"/.exec(tag)[1];
    assert(src.startsWith('./'));
    assert(fs.existsSync(path.join(ROOT, src)));
  }
  for (const match of html.matchAll(/href="(\.\/[^"#?]*)"/g)) {
    assert(fs.existsSync(path.join(ROOT, match[1])), match[1]);
  }
  assert(fs.existsSync(path.join(ROOT, '.nojekyll')));
});
check('manifest is portable under a repository subpath', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  for (const key of ['id', 'start_url', 'scope']) assert.equal(manifest[key], './');
  for (const icon of manifest.icons) {
    assert(icon.src.startsWith('./'));
    assert(fs.existsSync(path.join(ROOT, icon.src)));
  }
});
function workerAt(scope) {
  const sandbox = { URL, self: { location: { href: scope + 'sw.js' }, addEventListener() {} } };
  vm.runInNewContext(read('sw.js') + '\nthis.result={CACHE,URLS,SHELL};', sandbox);
  return sandbox.result;
}
check('offline cache contains only existing local app files and is scope-isolated', () => {
  const scope = 'https://example.test/repository/';
  const first = workerAt(scope);
  assert.equal(first.SHELL, scope + 'index.html');
  for (const url of first.URLS) {
    assert(url.startsWith(scope));
    assert(fs.existsSync(path.join(ROOT, url.slice(scope.length))));
    assert(!/README|scripts\/|\.github\//.test(url));
  }
  assert.notEqual(first.CACHE, workerAt('https://example.test/other-repository/').CACHE);
  assert(first.URLS.includes(scope + 'native-bridge.js'));
  assert(first.URLS.includes(scope + 'common-account.js'));
});
function nativeAt(url) {
  const sent = [], results = [];
  const sandbox = {
    location: new URL(url),
    window: { HannunNative: { postMessage: text => sent.push(JSON.parse(text)) }, dispatchEvent: event => results.push(event) },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } }
  };
  vm.runInNewContext(read('native-bridge.js'), sandbox);
  return { api: sandbox.window.HannunNativeWeb, host: sandbox.window.HannunNative, sent, results };
}
check('native file/share/print bridge only posts from the asset-loader origin', () => {
  const native = nativeAt('https://appassets.androidplatform.net/assets/index.html');
  const message = { type: 'downloadText', name: 'backup.json', mime: 'application/json', text: '{"시":"그리움\\n"}' };
  assert(native.api.available());
  assert(native.api.post(message));
  assert.deepEqual(native.sent[0], message);
  native.host.onmessage({ data: JSON.stringify({ type: 'downloadResult', ok: true }) });
  assert.equal(native.results[0].type, 'hannun-native-result');
  assert.equal(native.results[0].detail.ok, true);
  native.host.onmessage({ data: 'invalid json' });
  assert.equal(native.results.length, 1);
  for (const url of ['https://softm.github.io/app/', 'file:///app/index.html', 'https://untrusted.test/']) {
    const web = nativeAt(url);
    assert.equal(web.api.available(), false);
    assert.equal(web.api.post(message), false);
    assert.equal(web.sent.length, 0);
  }
});
function accountAt(url, ua = 'Mozilla/5.0') {
  const siteId = /data-hannun-site="([^"]+)"/.exec(read('index.html'))[1];
  const scripts = [], events = {}, fallback = { hidden: false }, scriptEvents = {};
  const sandbox = {
    location: new URL(url), navigator: { userAgent: ua },
    document: {
      documentElement: { dataset: { hannunSite: siteId } },
      getElementById: () => ({}), querySelector: () => fallback,
      createElement: () => ({ addEventListener: (type, fn) => { scriptEvents[type] = fn; } }),
      head: { appendChild: script => scripts.push(script) }
    },
    window: { addEventListener: (type, fn) => { events[type] = fn; } }
  };
  vm.runInNewContext(read('common-account.js'), sandbox);
  return { siteId, scripts, events, fallback, scriptEvents, policy: sandbox.window.HannunWebPolicy };
}
check('account boot sends no current URL or private share fragment and retains error fallback', () => {
  const account = accountAt('https://softm.github.io/app/#invite=private-answers');
  assert.equal(account.scripts.length, 1);
  const remote = new URL(account.scripts[0].src);
  assert.equal(remote.searchParams.get('site'), account.siteId);
  assert.equal(remote.hash, '');
  assert(!remote.href.includes('private-answers'));
  account.events['softm:account-ready']({ detail: { siteId: 'other' } });
  assert.equal(account.fallback.hidden, false);
  account.events['softm:account-ready']({ detail: { siteId: account.siteId } });
  assert.equal(account.fallback.hidden, true);
  account.scriptEvents.error();
  assert.equal(account.fallback.hidden, false);
  assert.equal(account.policy.webAdFitEnabled, false);
});
check('local preview, native app and AdMob user agent do not load account scripts or web AdFit', () => {
  for (const url of ['http://localhost:8080/', 'file:///app/index.html', 'https://appassets.androidplatform.net/assets/index.html']) {
    assert.equal(accountAt(url).scripts.length, 0);
  }
  const native = accountAt('https://softm.github.io/app/', 'Mozilla/5.0 AdMobNative/1');
  assert.equal(native.scripts.length, 0);
  assert.equal(native.policy.nativeAds, true);
  assert.equal(native.policy.webAdFitEnabled, false);
});
function appContext() {
  const saved = new Map();
  const node = { addEventListener() {}, classList: { add() {}, remove() {} }, focus() {}, setAttribute() {}, style: {} };
  const sandbox = {
    URL, Blob, btoa, atob, crypto: webcrypto, console,
    setTimeout: () => 0, clearTimeout() {},
    location: new URL('https://example.test/subpath/index.html'),
    navigator: { userAgent: 'test' },
    document: { addEventListener() {}, querySelector: selector => selector.startsWith('dialog[') ? null : node, querySelectorAll: () => [] },
    localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) },
    addEventListener() {}, dispatchEvent() {},
    HannunNativeWeb: { available: () => false, post: () => false }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return { sandbox, saved };
}
function instrumentApp(sandbox, exported) {
  // Test-only injection: production app state remains private inside the IIFE.
  const source = read('app.js').replace(/^loadState\(\);$/m, '').replace(/^render\(\);$/m, '');
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, 'window.__qa = ' + exported + ';\n})();'), sandbox);
  return sandbox.__qa;
}

const { sandbox } = appContext();
vm.runInContext(read('core.js'), sandbox);
const core = sandbox.HannunaeCore;
const qa = instrumentApp(sandbox, '{ shareUrl }');
const first = [0,1,2,0,1,2,0,1], second = [0,2,2,1,1,0,0,2];
check('relationship questions/cards and answer comparison survive classic-script conversion', () => {
  assert.equal(core.QUESTIONS.length, 8);
  assert.equal(core.CARDS.length, 32);
  assert.equal(core.CATEGORIES.length, 4);
  assert.equal(core.compareAnswers(first, second).filter(item => item.same).length, 4);
});
check('invitation and return links round-trip without changing their answer data', () => {
  assert.deepEqual(plain(core.parseShareFragment(core.makeShareFragment(first)).first), first);
  const result = core.parseShareFragment(core.makeShareFragment(second, first));
  assert.deepEqual(plain(result.first), first);
  assert.deepEqual(plain(result.second), second);
  assert.throws(() => core.makeShareFragment([0]));
  assert.throws(() => core.parseShareFragment('#invite=broken'));
  const extra = '#invite=' + btoa(JSON.stringify({v:1,t:'invite',a:first,name:'should-not-appear'})).replace(/=/g,'');
  assert.throws(() => core.parseShareFragment(extra));
});
check('web share links preserve the subpath and Android/file links use the public URL', () => {
  const fragment = core.makeShareFragment(first);
  assert.equal(qa.shareUrl(fragment), 'https://example.test/subpath/index.html' + fragment);
  sandbox.location = new URL('https://appassets.androidplatform.net/assets/index.html');
  assert.equal(qa.shareUrl(fragment), 'https://softm.github.io/hannunae-web/' + fragment);
  sandbox.location = new URL('file:///assets/index.html');
  assert.equal(qa.shareUrl(fragment), 'https://softm.github.io/hannunae-web/' + fragment);
});
check('existing v1 backups and unfinished question resume remain compatible', () => {
  const state = {...core.emptyState(), answers:first, favorites:['card-1'], questionIndex:8};
  assert.deepEqual(plain(core.parseBackup(JSON.stringify(core.makeBackup(state)))), plain(core.validateState(state)));
  assert.equal(core.validateState({...core.emptyState(), questionIndex:8}).questionIndex, 0);
  assert.throws(() => core.parseBackup('{"app":"other"}'));
  assert.throws(() => core.validateState({...core.emptyState(), favorites:['bad-id']}));
  assert(read('app.js').includes("'hannunae.maeum.v1'"));
});
console.log(`\n${checks} verification groups passed. No external packages or build required.`);
