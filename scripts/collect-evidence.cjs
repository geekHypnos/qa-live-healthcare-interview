const fs=require('node:fs/promises'),sync=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawn,execFileSync}=require('node:child_process');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
function assertCleanSource(root){
  // 忽略产物按仓库规则处理；暂存变更、未提交源码和未跟踪脚本都不能混入验收。
  if(git(root,'status','--porcelain','--untracked-files=all'))throw Error('工作区不干净，先提交源码及文档再验收');
}
function version(root){return {codeSha:git(root,'rev-parse','HEAD'),lockfileSha256:digest(sync.readFileSync(path.join(root,'web/qa-web/package-lock.json')))};}
const command=(id,file,cmd,args)=>({id,file,cmd,args});
function commands(){return [
 command('backend','unit-results.log','mvn',[...(process.env.MAVEN_REPO_LOCAL?['-Dmaven.repo.local='+process.env.MAVEN_REPO_LOCAL]:[]),'-f','server/qa-service-user/pom.xml','package']),
 command('frontend','unit-results.log','npm',['test','--prefix','web/qa-web']),
 command('scripts','unit-results.log','node',['--test',...sync.readdirSync(path.join(__dirname,'tests')).filter(f=>f.endsWith('.test.cjs')).map(f=>'scripts/tests/'+f)]),
 command('build','unit-results.log','npm',['run','build','--prefix','web/qa-web']),
 command('curl','curl-results.log','bash',['scripts/api-test.sh']),
 command('browser','browser-results.log','node',['scripts/browser-test.cjs']),
 command('database','database-results.log','node',['scripts/database-test.cjs']),
 command('timeout','timeout-results.log','node',['scripts/session-timeout-run.cjs']),
 command('restart','restart-results.log','node',['scripts/session-restart-test.cjs']),
 command('audit','audit-results.json','npm',['audit','--prefix','web/qa-web','--json']),
 command('dependencies','dependencies.log','npm',['ls','--prefix','web/qa-web','vite','@vitejs/plugin-vue','esbuild']),
];}
function execute(item,root,env){return new Promise(resolve=>{
  let output='',error;const child=spawn(item.cmd,item.args,{cwd:root,env,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
  child.on('error',e=>error=e.message);
  child.on('close',(exitCode,signal)=>resolve({exitCode,signal,error,output}));
});}
function redact(text){return text.replace(/Using generated security password:.*$/gm,'[generated credential omitted]');}
async function collect({root,dir,runId,commands:items=commands(),env=process.env}){
  assertCleanSource(root);const initial=version(root);
  await fs.mkdir(path.dirname(dir),{recursive:true});await fs.mkdir(dir); // 不覆盖已有运行。
  const manifest={...initial,runId,startedAt:new Date().toISOString(),node:process.version,completed:false,commands:[]};
  try{
    for(const item of items){
      const startedAt=new Date().toISOString();const result=await execute(item,root,{...env,OUTPUT_DIR:path.join(dir,'browser')});
      // 后端只发布真实测试/构建汇总，避免把启动日志里的临时凭据带入交付。
      const publishText=item.id==='backend'?result.output.split('\n').filter(line=>/Tests run:|BUILD SUCCESS|BUILD FAILURE|Total time:/.test(line)).join('\n')+'\n':redact(result.output);
      await fs.appendFile(path.join(dir,item.file),publishText);
      manifest.commands.push({id:item.id,file:item.file,command:[item.cmd,...item.args],startedAt,endedAt:new Date().toISOString(),exitCode:result.exitCode,signal:result.signal,error:result.error});
      console.log(`${item.id}: ${result.exitCode===0&&!result.signal&&!result.error?'PASS':'FAIL'}`);
      if(result.exitCode!==0||result.signal||result.error)throw Error('验收命令失败: '+item.id);
    }
    assertCleanSource(root);if(JSON.stringify(version(root))!==JSON.stringify(initial))throw Error('验收期间代码版本改变');
    manifest.completed=true;
  }catch(error){manifest.error=error.message;throw error;}
  finally{
    for(const item of manifest.commands)item.sha256=digest(await fs.readFile(path.join(dir,item.file)));
    manifest.endedAt=new Date().toISOString();await fs.writeFile(path.join(dir,'run-manifest.json'),JSON.stringify(manifest,null,2));
  }
  return manifest;
}
module.exports={collect,assertCleanSource,version,digest,commands};
if(require.main===module){const root=path.resolve(__dirname,'..'),runId=process.env.RUN_ID||new Date().toISOString().replace(/[:.]/g,'-');collect({root,dir:path.join(root,'artifacts/evidence',runId),runId}).then(()=>console.log('Evidence run: '+runId)).catch(e=>{console.error(e.message);process.exitCode=1;});}
