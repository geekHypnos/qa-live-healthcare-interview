const assert = require('node:assert/strict');
const {assertReply}=require('./reply-assertions.cjs');
const bounded=p=>Promise.race([p,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('expected intercepted request did not start')),10000);timer.unref();})]);
// 每组故障注入使用独立上下文，不影响真实后端验收和主演示会话。
module.exports = async function regressions(browser, base) {
  for (const role of ['PATIENT', 'DOCTOR']) {
    const context = await browser.newContext();
    const page = await context.newPage(); page.setDefaultTimeout(5000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const doctors = await (await context.request.get(base + '/api/doctors')).json();
    const identity = role === 'PATIENT'
      ? {role, accountId:'acc-patient001',profile:{id:'patient001',name:'赵明'}}
      : {role, accountId:'acc-doc001',profile:doctors[0]};
    let mode='ok', release, started, failDoctors=false;
    await page.route('**/api/auth/me', async route => {
      if(mode==='delay'){started();await new Promise(resolve=>release=resolve);}
      if(mode==='network')return route.abort();
      if(mode==='500'||mode==='401')return route.fulfill({status:Number(mode),json:{message:'回归注入故障'}});
      return route.fulfill({json:identity});
    });
    await page.route('**/api/doctors',route=>route.fulfill({status:failDoctors?500:200,json:failDoctors?{message:'回归医生加载失败'}:doctors}));
    const url=role==='PATIENT'?'/consultation/dr-zhang-wei':'/doctor/room/dr-zhang-wei';
    const input=()=>page.getByPlaceholder(role==='PATIENT'?'请详细描述您的症状或问题...':'请输入您的专业建议和回复...');
    const dialog=()=>page.getByRole('dialog');
    const confirm=()=>dialog().getByRole('button',{name:/^(?:确\s*定|OK)$/});
    const cancel=()=>dialog().getByRole('button',{name:/^(?:取\s*消|Cancel)$/});
    const open=async(fill=true)=>{
      await page.getByRole('button',{name:role==='PATIENT'?/提交问题/:'文字回复'}).first().click();
      if(fill)await input().fill('回归原始文本');
    };
    const data=()=>page.evaluate(async()=>JSON.parse(JSON.stringify((await import('/src/store/index.ts')).store.state.questions)));
    try {
      await page.goto(base+url);
      await page.getByRole('heading',{name:role==='PATIENT'?'赵明 的问诊':'张伟医生的诊室',exact:true}).waitFor();
      if(role==='PATIENT')await page.getByText('当前诊室: 张伟医生 - 心内科').waitFor();
      await open();const before=await data();
      mode='delay';const waiting=new Promise(resolve=>started=resolve);
      await confirm().click();await bounded(waiting);
      assert.equal(await input().isDisabled(),true,'pending input must be disabled');
      assert.equal(await cancel().isDisabled(),true,'pending cancel must be disabled');
      assert.equal(await dialog().locator('.ant-modal-close').count(),0);
      await page.keyboard.press('Escape');await page.mouse.click(5,5);
      assert.equal(await dialog().isVisible(),true);
      assert.equal(await input().inputValue(),'回归原始文本');
      mode='ok';release();await dialog().waitFor({state:'hidden'});
      const after=await data();
      if(role==='PATIENT'){assert.equal(after.length,before.length+1);assert.equal(after.at(-1).question,'回归原始文本');}
      else {assertReply(before,after,before.find(q=>q.doctorId===identity.profile.id&&q.status==='pending').id,'回归原始文本');assert.equal(await page.locator('.question-card').count(),after.filter(q=>q.doctorId===identity.profile.id&&q.status==='pending').length);}
      console.log('PASS browser '+role+' pending submission locks controls and writes original payload once');

      for(const failure of ['network','500']){
        mode='ok';await page.goto(base+url);await open();const original=await data();
        mode=failure;await confirm().click();await page.getByText(failure==='network'?'网络连接失败，请检查服务后重试':'回归注入故障',{exact:true}).waitFor();
        // 等待真正恢复可编辑，不以固定延迟猜测请求已结束。
        await page.waitForFunction(()=>!document.querySelector('.ant-modal textarea')?.disabled);
        assert.equal(await input().inputValue(),'回归原始文本');assert.equal(await cancel().isEnabled(),true);
        assert.equal(await confirm().isEnabled(),true);assert.deepEqual(await data(),original);
        mode='ok';await confirm().click();await dialog().waitFor({state:'hidden'});
        const retried=await data();
        if(role==='PATIENT'){assert.equal(retried.length,original.length+1);assert.equal(retried.at(-1).question,'回归原始文本');assert.equal(retried.at(-1).patientId,'patient001');assert.equal(retried.at(-1).doctorId,'doc001');}
        else assertReply(original,retried,original.find(q=>q.doctorId===identity.profile.id&&q.status==='pending').id,'回归原始文本');
        await page.goto(base+url);await open();mode=failure;await confirm().click();
        await page.waitForFunction(()=>!document.querySelector('.ant-modal textarea')?.disabled);
        await cancel().click();await dialog().waitFor({state:'hidden'});mode='ok';
      }
      console.log('PASS browser '+role+' network and 5xx unlock retry/cancel without losing draft or duplicating writes');
      await page.goto(base+url);await open();const unchanged=await data();
      mode='delay';const expired=new Promise(resolve=>started=resolve);await confirm().click();await bounded(expired);mode='401';release();
      await dialog().waitFor({state:'hidden'});assert.deepEqual(await data(),unchanged);
      assert.equal(await page.getByText(role==='PATIENT'?'问题提交成功':'回复成功',{exact:true}).count(),0);
      if(role==='DOCTOR')await page.waitForURL('**/doctor/login');else await page.getByRole('heading',{name:'患者账号登录'}).waitFor();
      mode='ok';await page.goto(base+url);await open(false);assert.equal(await input().inputValue(),'');
      await cancel().click(); // 新弹窗可关闭，旧身份清理不留下锁定状态。
      console.log('PASS browser '+role+' delayed unauthorized response closes locked modal without writing');
      if(role==='DOCTOR'){
        await page.goto(base+url);await open();
        await input().fill('仅用于空操作负向对照');
        const targetBefore=await data();
        const targetId=targetBefore.find(q=>q.doctorId===identity.profile.id&&q.status==='pending').id;
        await page.evaluate(async()=>{(await import('/src/store/index.ts')).store.answerQuestion=()=>{};});
        await confirm().click();await page.getByText('回复成功',{exact:true}).waitFor();
        const snapshot=await data();
        assert.throws(()=>assertReply(targetBefore,snapshot,targetId,'仅用于空操作负向对照'));
        console.log('PASS browser negative control detects missing reply despite success toast');
      }
      if(role==='PATIENT'){
        failDoctors=true;await page.goto(base+url);await page.getByText('回归医生加载失败',{exact:true}).waitFor();
        failDoctors=false;await page.getByRole('button',{name:/重\s*试/}).click();await page.getByText('当前诊室: 张伟医生 - 心内科').waitFor();
        await page.unroute('**/api/doctors');await page.route('**/api/doctors',r=>r.fulfill({json:[]}));await page.goto(base+url);
        await page.getByText('暂无可用医生',{exact:true}).first().waitFor();assert.equal(await page.getByText('回归医生加载失败').count(),0);
        await page.unroute('**/api/doctors');
        let releaseDoctors,observeDoctors;const waitingDoctors=new Promise(resolve=>observeDoctors=resolve);
        await page.route('**/api/doctors',async r=>{observeDoctors();await new Promise(resolve=>releaseDoctors=resolve);await r.fulfill({json:doctors})});
        await page.goto(base+url);await bounded(waitingDoctors);
        await page.getByText('正在加载医生',{exact:true}).waitFor();
        assert.equal(await page.getByRole('button',{name:/提交问题/}).isDisabled(),true);
        releaseDoctors();await page.getByText('当前诊室: 张伟医生 - 心内科').waitFor();
        await page.unroute('**/api/doctors');
        await page.route('**/api/doctors',r=>r.fulfill({status:failDoctors?500:200,json:failDoctors?{message:'回归医生加载失败'}:doctors}));
        await open();failDoctors=true;
        await page.evaluate(async()=>{await (await import('/src/store/index.ts')).store.loadDoctors().catch(()=>{});});
        assert.equal(await input().inputValue(),'回归原始文本');
        failDoctors=false;await page.evaluate(async()=>{await (await import('/src/store/index.ts')).store.loadDoctors();});
        assert.equal(await input().inputValue(),'回归原始文本');await cancel().click();
        await page.goto(base+'/consultation/not-a-doctor');await page.getByText('该诊室不存在或尚未开放',{exact:true}).waitFor();
        assert.equal(await page.getByText('当前诊室: 张伟医生 - 心内科').count(),0);
        console.log('PASS browser consultation doctor loading/error/empty/retry preserves draft and invalid route never selects another doctor');
      }
      assert.deepEqual(errors,[],'regression context JavaScript errors');
    } finally { if(release)release();await context.close(); }
  }
};
