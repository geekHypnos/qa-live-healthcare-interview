const {test}=require('node:test'),assert=require('node:assert/strict');
const {assertReply}=require('../reply-assertions.cjs');
const before=[{id:'one',doctorId:'doc',status:'pending',answer:null},{id:'two',doctorId:'doc',status:'pending',answer:null}];
test('reply assertion catches no write, wrong target and wrong retry text',()=>{
 assert.throws(()=>assertReply(before,before,'one','text'));
 assert.throws(()=>assertReply(before,[before[0],{...before[1],status:'answered',answer:'text'}],'one','text'));
 assert.throws(()=>assertReply(before,[{...before[0],status:'answered',answer:'wrong'},before[1]],'one','text'));
});
test('reply assertion accepts only target change and count transition',()=>assertReply(before,[{...before[0],status:'answered',answer:'text'},before[1]],'one','text'));
