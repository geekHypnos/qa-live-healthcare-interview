import { test } from 'node:test';
import assert from 'node:assert/strict';
import zh from '../src/locales/zh-CN.ts';
import en from '../src/locales/en-US.ts';
test('homepage locales have matching keys and English translations',()=>{
  assert.deepEqual(Object.keys(en).sort(),Object.keys(zh).sort());
  assert.equal(en['首页'],'Home');
  assert.equal(en['张伟医生'],'Dr. Zhang Wei');
  for(const value of Object.values(en)) assert.ok(value.length>0);
});
