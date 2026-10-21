import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {verifyBeforeAction} from '../src/api/session.ts';
import {ApiError} from '../src/api/client.ts';
const require=createRequire(import.meta.url), ts=require('typescript'), vue=require('vue');
const patient=(id='patient001')=>({role:'PATIENT',accountId:'acc-'+id,profile:{id,name:id}});
function loadStore(){
  const pending=[];
  const authApi={me:()=>new Promise((resolve,reject)=>pending.push({resolve,reject})),logout:async()=>({message:'ok'}),login:async()=>patient('patient002')};
  const source=fs.readFileSync(new URL('../src/store/index.ts',import.meta.url),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  vm.runInNewContext(js,{exports,require(name){
    if(name==='vue')return vue;
    if(name==='../api/auth')return {authApi};
    if(name==='../api/client')return {ApiError};
    if(name==='../api/session')return {verifyBeforeAction};
    if(name.includes('question-list'))return [];
    throw new Error('Unexpected import: '+name);
  }});
  return {store:exports.store,pending};
}
test('old successful restore cannot resurrect logged-out identity',async()=>{
  const {store,pending}=loadStore();store.applyIdentity(patient());
  const restoring=store.restoreSession();await store.logout();
  pending[0].resolve(patient());await restoring;
  assert.equal(store.state.identity,null);
});
test('same-identity restore does not cancel concurrent action',async()=>{
  const {store,pending}=loadStore();store.applyIdentity(patient());let writes=0;
  const action=store.runAsCurrent(()=>{writes++}).then(()=>({ok:true}),e=>({ok:false,error:e}));
  const restoring=store.restoreSession();pending[1].resolve(patient());await restoring;
  pending[0].resolve(patient());const result=await action;
  assert.equal(result.ok,true,result.error?.message);assert.equal(writes,1);
  assert.equal(store.state.identity.profile.id,'patient001');
});
test('old unauthorized restore does not clear a later login',async()=>{
  const {store,pending}=loadStore();const restoring=store.restoreSession();
  await store.login('patient002','test','PATIENT');
  pending[0].reject(new ApiError(401,'expired'));await restoring;
  assert.equal(store.state.identity.profile.id,'patient002');
});
