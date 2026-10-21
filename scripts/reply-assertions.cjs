const assert=require('node:assert/strict');
// 页面和负向对照复用同一业务断言，避免只验证任意一条相同文本。
function assertReply(before,after,id,text){
 const original=before.find(q=>q.id===id),reply=after.find(q=>q.id===id);
 assert.ok(original);assert.equal(original.status,'pending');assert.ok(reply);
 assert.equal(reply.answer,text);assert.equal(reply.status,'answered');
 assert.equal(after.length,before.length);
 assert.deepEqual(after.filter(q=>q.id!==id),before.filter(q=>q.id!==id),'其他问题不能被改写');
 for(const status of ['pending','answered']){
  const count=list=>list.filter(q=>q.doctorId===original.doctorId&&q.status===status).length;
  assert.equal(count(after),count(before)+(status==='pending'?-1:1));
 }
}
module.exports={assertReply};
