const {test}=require('node:test'),assert=require('node:assert/strict');
const {recordDemo}=require('../record-demo.cjs');
for(const failure of ['read','steps','restore','context','newContext','none'])test('record cleanup '+failure,async()=>{
 const events=[];const deps={launch:async()=>({newContext:async()=>{if(failure==='newContext')throw Error('newContext');return {close:async()=>{events.push('context');if(failure==='context')throw Error('context')}}},close:async()=>events.push('browser')}),sql:input=>{if(input.startsWith('SELECT')){if(failure==='read')throw Error('read');return 'original'}events.push('restore');if(failure==='restore')throw Error('restore')},runSteps:async()=>{if(failure==='steps')throw Error('steps');return 'video'},publish:async()=>events.push('publish'),skipEvidence:true};
 if(failure==='none')await recordDemo(deps);else await assert.rejects(recordDemo(deps));
 assert.ok(events.includes('browser'));if(failure!=='newContext')assert.ok(events.includes('context'));
 assert.equal(events.includes('publish'),failure==='none');
});

test('recording refuses dirty source before browser launch with unchanged HEAD',async t=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'qa-record-git-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const git=(...a)=>execFileSync('git',a,{cwd:root,stdio:'pipe'});
 git('init');git('config','user.name','Test');git('config','user.email','test@example.invalid');fs.writeFileSync(path.join(root,'source.txt'),'old');git('add','.');git('commit','-m','initial');const head=git('rev-parse','HEAD').toString();
 let launches=0;fs.writeFileSync(path.join(root,'source.txt'),'uncommitted');
 await assert.rejects(recordDemo({root,launch:async()=>{launches++;throw Error('launched')}}),/工作区不干净/);
 assert.equal(launches,0);assert.equal(git('rev-parse','HEAD').toString(),head);
});
