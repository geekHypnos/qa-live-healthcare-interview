import { test } from 'node:test';
import assert from 'node:assert/strict';
import zh from '../src/locales/zh-CN.ts';
import en from '../src/locales/en-US.ts';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function loadLocale(storage) {
  const document = { documentElement: { lang: '' } };
  const exports = {};
  const source = fs.readFileSync(new URL('../src/locales/index.ts', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(js, {exports, document, localStorage: storage, require(name) {
    if (name === 'vue') return {shallowRef: value => ({value})};
    if (name === './zh-CN') return {default: zh};
    if (name === './en-US') return {default: en};
    throw new Error('Unexpected import: ' + name);
  }});
  return {api: exports, document};
}
test('homepage locales have matching keys and English translations',()=>{
  assert.deepEqual(Object.keys(en).sort(),Object.keys(zh).sort());
  assert.equal(en['首页'],'Home');
  assert.equal(en['张伟医生'],'Dr. Zhang Wei');
  for(const value of Object.values(en)) assert.ok(value.length>0);
});

test('missing or unsupported saved locale defaults to Chinese', () => {
  for (const saved of [null, 'fr-FR']) {
    const {api, document} = loadLocale({getItem: () => saved});
    assert.equal(api.locale.value, 'zh-CN');
    assert.equal(document.documentElement.lang, 'zh-CN');
  }
});
test('saved English restores and language changes update storage and html lang', () => {
  const writes = [];
  const {api, document} = loadLocale({getItem: () => 'en-US', setItem: (...args) => writes.push(args)});
  assert.equal(api.t('首页'), 'Home');
  assert.equal(document.documentElement.lang, 'en-US');
  api.setLocale('zh-CN');
  assert.equal(api.t('首页'), '首页');
  assert.deepEqual(writes, [['qa-locale', 'zh-CN']]);
  assert.equal(document.documentElement.lang, 'zh-CN');
});
test('blocked storage still allows switching and preserves unknown database text', () => {
  const blocked = () => {throw new Error('storage unavailable')};
  const {api} = loadLocale({getItem: blocked, setItem: blocked});
  assert.equal(api.locale.value, 'zh-CN');
  api.setLocale('en-US');
  assert.equal(api.t('首页'), 'Home');
  assert.equal(api.t('数据库新资料'), '数据库新资料');
});
