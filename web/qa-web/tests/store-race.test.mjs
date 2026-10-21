import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {verifyBeforeAction,IdentityError} from '../src/api/session.ts';
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
    if(name==='../api/session')return {verifyBeforeAction,IdentityError};
    if(name.includes('question-list'))return [];
    throw new Error('Unexpected import: '+name);
  }});
  return {store:exports.store,pending,authApi};
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

test('failed logout during restore releases loading state without trusting old response',async()=>{
  const {store,pending,authApi}=loadStore();store.applyIdentity(patient());
  const restoring=store.restoreSession();
  authApi.logout=async()=>{throw new ApiError(0,'network')};
  await assert.rejects(()=>store.logout(),/network/);
  pending[0].resolve(patient('patient002'));await restoring;
  assert.equal(store.state.sessionReady,true,'failed logout must not leave a permanent spinner');
  assert.equal(store.state.identity.profile.id,'patient001');
});

test('business failure preserves verified identity',async()=>{
  const {store,pending}=loadStore();store.applyIdentity(patient());
  const result=store.runAsCurrent(()=>{throw new Error('validation failed')});
  pending[0].resolve(patient());await assert.rejects(result,/validation failed/);
  assert.equal(store.state.identity?.profile.id,'patient001');
});
for(const status of [0,500,401])test(`action session failure ${status} has correct identity handling`,async()=>{
  const {store,pending}=loadStore();store.applyIdentity(patient());let writes=0;
  const result=store.runAsCurrent(()=>writes++);pending[0].reject(new ApiError(status,'failure'));
  await assert.rejects(result);assert.equal(writes,0);
  assert.equal(store.state.identity?.profile.id,status===401?undefined:'patient001');
});
test('changed server identity prevents action and clears old identity',async()=>{
  const {store,pending}=loadStore();store.applyIdentity(patient());let writes=0;
  const result=store.runAsCurrent(()=>writes++);pending[0].resolve(patient('patient002'));
  await assert.rejects(result);assert.equal(writes,0);assert.equal(store.state.identity,null);
});
test('pending action cannot clear a newer login',async()=>{
  const {store,pending}=loadStore();store.applyIdentity(patient());let writes=0;
  const result=store.runAsCurrent(()=>writes++);await store.login('patient002','test','PATIENT');
  pending[0].resolve(patient());await assert.rejects(result);
  assert.equal(writes,0);assert.equal(store.state.identity.profile.id,'patient002');
});
