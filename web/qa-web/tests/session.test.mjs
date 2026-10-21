import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyBeforeAction } from '../src/api/session.ts';

const patient = {role:'PATIENT',profile:{id:'patient001'}};
test('same identity may perform a simulated action', async()=>{
  let writes=0;
  await verifyBeforeAction(patient,async()=>patient,()=>{writes++});
  assert.equal(writes,1);
});
test('expired, different or unavailable session never writes', async()=>{
  for(const load of [async()=>null,async()=>({role:'PATIENT',profile:{id:'patient002'}}),async()=>({role:'DOCTOR',profile:{id:'doc001'}}),async()=>{throw new Error('network')}]) {
    let writes=0;
    await assert.rejects(()=>verifyBeforeAction(patient,load,()=>{writes++}));
    assert.equal(writes,0);
  }
});
