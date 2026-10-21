const { chromium } = require('../web/qa-web/node_modules/playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const output=path.resolve(process.env.OUTPUT_DIR || path.join(root,'artifacts'));
const evidence=path.resolve(process.env.EVIDENCE_DIR || path.join(root,'artifacts/evidence'));
const base=process.env.WEB_BASE_URL || 'http://127.0.0.1:15173';
const admin=process.env.ADMIN_URL || 'http://127.0.0.1:18081';
const sql=input=>execFileSync('docker',['compose','exec','-T','mysql','sh','-c',
  'MYSQL_PWD="$MYSQL_PASSWORD" mysql --default-character-set=utf8mb4 -N -B -u"$MYSQL_USER" "$MYSQL_DATABASE"'],{cwd:root,input,encoding:'utf8'}).trim();
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

const {assertCleanSource,version,digest,commands}=require('./collect-evidence.cjs');
async function loadEvidence(dir, expected){
  const manifest=JSON.parse(await fs.readFile(path.join(dir,'run-manifest.json'),'utf8'));
  assert.equal(manifest.completed,true,'证据运行尚未完成');
  for(const key of ['codeSha','lockfileSha256','runId'])assert.equal(manifest[key],expected[key],'证据版本不匹配: '+key);
  const files=[];
  for(const required of commands()){
    const matches=manifest.commands.filter(c=>c.id===required.id);assert.equal(matches.length,1,'缺少或重复验收命令: '+required.id);
    const entry=matches[0];assert.equal(entry.exitCode,0);assert.ok(!entry.signal&&!entry.error);
    assert.equal(path.basename(entry.file),entry.file,'日志必须在证据目录内');
    const text=await fs.readFile(path.join(dir,entry.file),'utf8');assert.equal(digest(text),entry.sha256,'日志摘要不匹配');
    const markers={backend:/BUILD SUCCESS/,frontend:/[ℹ#] (?:tests|pass) \d+/,scripts:/[ℹ#] (?:tests|pass) \d+/,build:/built in /,curl:/All \d+ curl requests passed\./,browser:/All browser checks passed\./,database:/PASS database restart preserves rows/,timeout:/PASS timeout session naturally expires/,restart:/PASS restart new service reconnects/,dependencies:/vite@6\./};
    if(entry.id==='audit')assert.equal(JSON.parse(text).metadata.vulnerabilities.total,0);
    else assert.match(text,markers[entry.id]);
    if(['frontend','scripts'].includes(entry.id)){assert.ok(!/[ℹ#] (?:fail|cancelled|skipped) [1-9]/.test(text),'单元测试失败或跳过');}
    if(entry.id==='restart')assert.match(text,/PASS restart old authenticated session/);
    if(entry.id==='database')for(const marker of ['repeated initialization','SQL change','demo modification restored'])assert.ok(text.includes(marker));
    if(entry.id==='backend'){assert.ok(!/(?:Failures|Errors|Skipped): [1-9]/.test(text));}
    if(!files.some(f=>f.file===entry.file))files.push({file:entry.file,text});
  }
  return {manifest,files};
}
async function runSteps(context, proof, experience, executeSQL){
  const page=await context.newPage();page.setDefaultTimeout(18000);
  const video=page.video(), timeline=[],start=Date.now();
  const goto=url=>page.goto(url.startsWith('http')?url:base+url,{waitUntil:'domcontentloaded'});
  async function caption(text,hold=3500){
    timeline.push({seconds:Math.round((Date.now()-start)/1000),text});
    // 仅添加录制字幕，不替换页面数据或业务结果。
    await page.evaluate(text=>{
      let el=document.getElementById('recording-caption');
      if(!el){el=document.createElement('div');el.id='recording-caption';el.style.cssText='position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:999999;padding:10px 18px;background:#102033ed;color:white;border-radius:6px;font:16px sans-serif;max-width:90vw;text-align:center;pointer-events:none';document.body.appendChild(el);}
      el.textContent=text;
    },text);
    console.log('VIDEO '+timeline.at(-1).seconds+'s '+text);
    await page.waitForTimeout(hold);
  }
  const confirm=()=>page.getByRole('dialog').getByRole('button',{name:/^(?:确\s*定|OK)$/}).click();
    await goto('/');
    await page.getByRole('heading',{name:'专业在线医疗问诊平台',exact:true}).waitFor();
    await page.locator('.room-card').nth(3).waitFor();
    await caption('1 首页中文界面与右上角语言选择');
    await page.locator('.statistics').scrollIntoViewIfNeeded();await caption('医生统计来自后端加载的 MySQL 资料');
    await page.locator('.active-rooms').scrollIntoViewIfNeeded();await caption('开放诊室保留原有进入问诊的入口');
    await page.getByLabel('Language / 语言').selectOption('en-US');
    await page.locator('.hero').scrollIntoViewIfNeeded();
    await page.getByRole('heading',{name:'Professional online medical consultations',exact:true}).waitFor();
    await caption('2 立即切换 English，无需重新加载页面');
    await page.locator('.active-rooms').scrollIntoViewIfNeeded();await caption('首页医生姓名、职称、科室及专长同步切换英文');
    await page.locator('.footer').scrollIntoViewIfNeeded();await caption('页脚和公共导航同样覆盖首页翻译');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.getByRole('heading',{name:'Professional online medical consultations',exact:true}).waitFor();
    await caption('刷新后保留语言选择');
    await page.getByLabel('Language / 语言').selectOption('zh-CN');
    await goto('/doctors');await page.locator('.doctor-card').nth(4).waitFor();
    await caption('3 医生列表使用后端 API，其他页面维持中文');
    await goto(admin+'/');
    await page.locator('input[name="pma_username"]').fill(process.env.DEMO_DB_USER || 'qa_app');
    await page.locator('input[name="pma_password"]').fill(process.env.DEMO_DB_PASSWORD || 'qa_demo_database_2026');
    await page.locator('#input_go').click();
    await page.getByText('qa_healthcare',{exact:true}).first().waitFor();
    await caption('4 phpMyAdmin 连接同一 MySQL 数据库');
    await goto(admin+'/index.php?route=/sql&db=qa_healthcare&table=doctors');
    await page.getByText('doc001',{exact:true}).first().waitFor();
    await caption('数据库 doctors 表中的资料与页面对应，不包含账号密码');
    executeSQL("UPDATE doctors SET experience='数据库联调演示更新' WHERE id='doc001';");
    await goto('/doctors');await page.getByText('数据库联调演示更新',{exact:true}).waitFor();
    await caption('5 修改数据库资料后，医生页面显示真实更新');
    executeSQL("UPDATE doctors SET experience='"+experience.replaceAll("'","''")+"' WHERE id='doc001';");
    await page.reload({waitUntil:'domcontentloaded'});await page.getByText(experience,{exact:true}).waitFor();
    await caption('演示修改已恢复，未增加医生管理后台');
    await goto('/consultation/dr-zhang-wei');
    await page.getByPlaceholder('请输入患者用户名').fill('patient001');
    await page.getByPlaceholder('请输入密码',{exact:true}).fill('wrong-password');
    await page.getByRole('button',{name:/^登\s*录$/}).click();
    await page.getByText('用户名或密码错误',{exact:true}).waitFor();
    await caption('6 错误密码由服务端拒绝，不再使用姓名生日自动开户',1800);
    await page.getByPlaceholder('请输入密码',{exact:true}).fill('Patient123!');
    await page.getByRole('button',{name:/^登\s*录$/}).click();
    await page.getByRole('heading',{name:'赵明 的问诊',exact:true}).waitFor();
    await caption('7 正确账号登录，保留原患者 ID 与已有问题');
    await page.getByRole('button',{name:/提交问题/}).click();
    await page.getByPlaceholder('请详细描述您的症状或问题...').fill('演示提问：最近运动后有些疲劳，想咨询日常注意事项。');
    await caption('模拟问诊仍沿用原项目流程，提交前检查服务端身份');
    await confirm();await page.getByText('问题提交成功',{exact:true}).waitFor();
    await caption('提问成功，显示在当前患者的问题列表中');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.getByRole('heading',{name:'赵明 的问诊',exact:true}).waitFor();
    await caption('8 刷新恢复登录；问题仍为前端演示数据，不承诺刷新保留');
    await page.getByRole('button',{name:'切换用户'}).click();
    await page.getByRole('heading',{name:'患者账号登录',exact:true}).waitFor();
    await caption('退出已销毁服务端会话并清理前端身份');
    await page.getByPlaceholder('请输入患者用户名').fill('patient002');
    await page.getByPlaceholder('请输入密码',{exact:true}).fill('Patient123!');
    await page.getByRole('button',{name:/^登\s*录$/}).click();
    await page.getByRole('heading',{name:'孙丽 的问诊',exact:true}).waitFor();
    await caption('另一个账号显示自己的患者资料及问题，身份不串号');
    await goto('/doctor/login');
    await page.getByPlaceholder('请输入用户名',{exact:true}).fill('dr-zhang-wei');
    await page.getByPlaceholder('请输入密码',{exact:true}).fill('123456');
    await page.getByRole('button',{name:/^登\s*录$/}).click();
    await page.getByRole('heading',{name:'张伟医生的诊室',exact:true}).waitFor();
    await caption('9 医生登录兼容保留，密码改由后端校验');
    await page.getByRole('button',{name:'文字回复'}).first().click();
    await page.getByPlaceholder('请输入您的专业建议和回复...').fill('演示回复：请结合实际情况就诊，本条只用于验证回复流程。');
    await confirm();await page.getByText('回复成功',{exact:true}).waitFor();
    const reply = await page.evaluate(async()=> (await import('/src/store/index.ts')).store.state.questions.find(q=>q.answer==='演示回复：请结合实际情况就诊，本条只用于验证回复流程。'));
    assert.equal(reply?.status,'answered');
    await page.locator('.answered-section .ant-collapse-header').filter({hasText:reply.patientName+': '+reply.question.substring(0,50)}).click();
    await page.getByText(reply.answer,{exact:false}).waitFor();
    await caption('医生回复的实际文本与已解答状态，仍沿用原项目模拟数据');
    await page.getByRole('button',{name:'退出登录'}).click();
    await page.getByRole('heading',{name:'专业在线医疗问诊平台',exact:true}).waitFor();
    await caption('医生退出后回到首页');

    let report = '<p>CODE_SHA: '+escape(proof.manifest.codeSha)+' | runId: '+escape(proof.manifest.runId)+'</p>';
    report += '<h2>本轮验收汇总</h2><ul>';
    for(const item of proof.manifest.commands){
      const source=proof.files.find(f=>f.file===item.file).text;
      const summary=source.split('\n').filter(line=>/Tests run:|[ℹ#] (tests|pass|fail|skipped) |All .*passed|^PASS |built in/.test(line)).join('\n');
      report += '<li>'+escape(item.id)+'：退出码 '+item.exitCode+'</li>';
      if(item.id==='audit')report += '<li>完整依赖审计：'+JSON.parse(source).metadata.vulnerabilities.total+' 个漏洞</li>';
      else if(item.id!=='dependencies')report += '<pre>'+escape(summary)+'</pre>';
    }
    report += '</ul>';
    for (const entry of proof.files) report += '<h2>'+escape(entry.file)+'</h2><pre>'+escape(entry.text)+'</pre>';
    const reportPath=path.join(output,'recorded-test-results.html');
    await fs.writeFile(reportPath,'<!doctype html><meta charset="utf-8"><title>实际验收结果</title><style>body{font:18px sans-serif;margin:40px;color:#16283a}pre{font:15px monospace;background:#f1f4f7;padding:20px;white-space:pre-wrap}h2{margin-top:32px}</style><h1>实际执行的测试结果</h1><p>下列内容直接读取本轮运行日志，不是预设通过示例。</p>'+report);
    await page.goto('file://'+reportPath);
    await caption('10 当前代码与本轮真实验收结果，包括新增失败恢复回归');
    await page.getByText('完整依赖审计：0 个漏洞',{exact:true}).scrollIntoViewIfNeeded();
    await caption('完整 npm audit 为 0；全部命令退出码来自本轮采集清单');
    const docsPath=path.join(output,'delivery-documents.html');
    let docs='<h1>交付文档和提示词</h1>';
    for(const file of ['PRD_TEMPLATE.md','PRD_LOGIN.md','DESIGN.md','API_TEST.md','prompts.md']){
      const text=await fs.readFile(path.join(root,'docs',file),'utf8');
      docs+='<h2>'+escape(file)+'</h2><pre>'+escape(text.slice(0,1800))+'</pre>';
    }
    await fs.writeFile(docsPath,'<!doctype html><meta charset="utf-8"><style>body{font:20px sans-serif;margin:40px}pre{white-space:pre-wrap}</style>'+docs);
    await page.goto('file://'+docsPath);await caption('11 PRD 模板、PRD、设计和 API 测试步骤均在 docs 目录');
    await page.getByRole('heading',{name:'prompts.md',exact:true}).scrollIntoViewIfNeeded();
    await caption('提示词按阶段记录；正式报告与视频链接在录制后补齐，不预填通过结果');
    await fs.writeFile(path.join(output,'demo-timeline.json'),JSON.stringify(timeline,null,2));
    return await video.path();

}
async function recordDemo(deps={}){
  let proof;
  // 测试仅通过显式注入跳过外部环境；CLI 永远执行版本和干净状态校验。
  if(!deps.skipEvidence){const sourceRoot=deps.root||root;assertCleanSource(sourceRoot);proof=await loadEvidence(evidence,{...version(sourceRoot),runId:process.env.RUN_ID});}
  await fs.mkdir(output,{recursive:true});
  const launch=deps.launch||(()=>chromium.launch({headless:true,channel:'chromium',slowMo:220,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})}));
  const executeSQL=deps.sql||sql, errors=[];let browser,context,experience,recordingPath;
  try{
    browser=await launch();context=await browser.newContext({locale:'zh-CN',viewport:{width:1440,height:900},recordVideo:{dir:output,size:{width:1440,height:900}}});
    experience=executeSQL("SELECT experience FROM doctors WHERE id='doc001';");
    recordingPath=await (deps.runSteps||runSteps)(context,proof,experience,executeSQL);
  }catch(error){errors.push(error);}
  finally{
    // 三项清理独立执行，SQL 恢复异常不能阻止录像结束和浏览器退出。
    if(experience!==undefined)try{executeSQL("UPDATE doctors SET experience='"+experience.replaceAll("'","''")+"' WHERE id='doc001';");}catch(error){errors.push(error);}
    if(context)try{await context.close();}catch(error){errors.push(error);}
    if(browser)try{await browser.close();}catch(error){errors.push(error);}
  }
  if(errors.length)throw new AggregateError(errors,'录制失败: '+errors.map(e=>e.message).join('; '));
  await (deps.publish||((file)=>fs.rename(file,path.join(output,'interview-demo.webm'))))(recordingPath);
  console.log('Saved '+path.join(output,'interview-demo.webm'));
}
module.exports={loadEvidence,recordDemo};
if(require.main===module)recordDemo().catch(e=>{console.error(e);process.exitCode=1});
