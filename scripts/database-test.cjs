const { chromium } = require('../web/qa-web/node_modules/playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.WEB_BASE_URL || 'http://127.0.0.1:15173';
const output = path.resolve(process.env.OUTPUT_DIR || 'artifacts/database');
const root = path.resolve(__dirname, '..');
const sql = input => execFileSync('docker', ['compose','exec','-T','mysql','sh','-c',
  'MYSQL_PWD="$MYSQL_PASSWORD" mysql --default-character-set=utf8mb4 -N -B -u"$MYSQL_USER" "$MYSQL_DATABASE"'],
  { cwd:root,input,encoding:'utf8' }).trim();
const counts = () => sql('SELECT (SELECT COUNT(*) FROM doctors),(SELECT COUNT(*) FROM patients),(SELECT COUNT(*) FROM accounts);');
const quote = s => "'" + s.replaceAll("'", "''") + "'";
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const before = counts();
  assert.equal(before,'5\t5\t10');
  sql(fs.readFileSync(path.join(root,'database/init.sql'),'utf8'));
  assert.equal(counts(),before);
  console.log('PASS database repeated initialization preserves 5 doctors, 5 patients, 10 accounts');
  const original=sql("SELECT experience FROM doctors WHERE id='doc001';");
  const changed='数据库验收资料更新';
  const browser=await chromium.launch({headless:true,channel:'chromium',...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:960}});
  try{
    sql('UPDATE doctors SET experience='+quote(changed)+" WHERE id='doc001';");
    const response=await context.request.get(base+'/api/doctors');
    assert.equal(response.status(),200);
    assert.equal((await response.json())[0].experience,changed);
    const page=await context.newPage();
    await page.goto(base+'/doctors',{waitUntil:'domcontentloaded'});
    await page.getByText(changed,{exact:true}).waitFor();
    await page.screenshot({path:path.join(output,'mysql-to-page.png'),fullPage:true});
    console.log('PASS database SQL change is visible through API and actual doctors page');
  }finally{
    sql('UPDATE doctors SET experience='+quote(original)+" WHERE id='doc001';");
    await browser.close();
  }
  assert.equal(sql("SELECT experience FROM doctors WHERE id='doc001';"),original);
  console.log('PASS database demo modification restored');
  execFileSync('docker',['compose','restart','mysql'],{cwd:root,stdio:'pipe'});
  let ready=false;
  for(let i=0;i<40;i++){
    try{if(sql('SELECT 1;')==='1'){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,1000));
  }
  assert.ok(ready,'MySQL restart did not become ready');
  assert.equal(counts(),before);
  assert.equal(sql("SELECT name FROM doctors WHERE id='doc001';"),'张伟医生');
  console.log('PASS database restart preserves rows and Chinese encoding without deleting volume');
})().catch(e=>{console.error(e);process.exitCode=1});
