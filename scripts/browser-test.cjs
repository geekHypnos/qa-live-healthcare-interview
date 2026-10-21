const { chromium } = require('../web/qa-web/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const base = process.env.WEB_BASE_URL || 'http://127.0.0.1:15173';
const output = path.resolve(process.env.OUTPUT_DIR || 'artifacts/browser');
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chromium',
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  console.log('Browser version: ' + browser.version());
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const goto = route => page.goto(base + route, { waitUntil: 'domcontentloaded' });
  const heading = name => page.getByRole('heading', { name, exact: true });
  const ok = label => console.log('PASS browser ' + label);
  async function patientLogin(user = 'patient001', password = 'Patient123!') {
    await page.getByPlaceholder('请输入患者用户名').fill(user);
    await page.getByPlaceholder('请输入密码', { exact: true }).fill(password);
    await page.getByRole('button', { name: /^登\s*录$/ }).click();
  }
  async function logoutThroughSameSession() {
    // 测试专用请求模拟另一标签页退出，同一 context 的 Cookie 随之更新。
    const csrf = await (await context.request.get(base + '/api/auth/csrf')).json();
    const response = await context.request.post(base + '/api/auth/logout', { headers: { [csrf.headerName]: csrf.token } });
    assert.equal(response.status(), 200);
  }
  async function submitModal(text) {
    await page.getByRole('button', { name: /提交问题/ }).click();
    await page.getByPlaceholder('请详细描述您的症状或问题...').fill(text);
  }
  const confirm = () => page.getByRole('dialog').getByRole('button', { name: /^(?:确\s*定|OK)$/ }).click();
  try {
    await goto('/');
    await heading('专业在线医疗问诊平台').waitFor();
    await page.locator('.room-card').nth(3).waitFor();
    await page.screenshot({ path: path.join(output, 'home-zh.png'), fullPage: true });
    await page.getByLabel('Language / 语言').selectOption('en-US');
    await heading('Professional online medical consultations').waitFor();
    await page.getByRole('heading', {name:'Dr. Zhang Wei',exact:true}).waitFor();
    assert.equal(await page.locator('.room-card').count(), 4);
    const english = (await page.locator('body').innerText()).replace('中文', '');
    assert.ok(!/[\u3400-\u9fff]/.test(english), 'homepage still contains untranslated Chinese');
    await page.screenshot({ path: path.join(output, 'home-en.png'), fullPage: true });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await heading('Professional online medical consultations').waitFor();
    ok('homepage complete translation and refresh memory');

    await goto('/doctors');
    await heading('医生团队').waitFor();
    await page.locator('.doctor-card').nth(4).waitFor();
    assert.equal(await page.getByLabel('Language / 语言').count(), 0);
    await page.screenshot({ path: path.join(output, 'doctors.png'), fullPage: true });
    ok('five MySQL doctors and Chinese-only secondary page');

    await page.route('**/api/doctors', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"测试服务故障"}' }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('测试服务故障').waitFor();
    await page.unroute('**/api/doctors');
    await page.getByRole('button', { name: /^重\s*试$/ }).click();
    await page.locator('.doctor-card').nth(4).waitFor();
    ok('doctor failure has real retry and no JSON fallback');
    await page.route('**/api/doctors', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('暂无医生资料', { exact: true }).waitFor();
    await page.unroute('**/api/doctors');
    ok('empty doctors state differs from network failure');

    await goto('/consultation/dr-zhang-wei');
    await heading('患者账号登录').waitFor();
    assert.equal(await page.getByText('患者身份验证', { exact: true }).count(), 0);
    await patientLogin('patient001', 'wrong');
    await page.getByText('用户名或密码错误', { exact: true }).waitFor();
    await patientLogin();
    await heading('赵明 的问诊').waitFor();
    await page.getByText('当前诊室: 张伟医生 - 心内科').waitFor();
    const question = '浏览器验收正常提问';
    await submitModal(question); await confirm();
    await page.locator('.questions-section').getByText(question, { exact: false }).waitFor();
    ok('direct doctor route, password error and successful patient consultation');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await heading('赵明 的问诊').waitFor();
    ok('patient session survives refresh');

    await submitModal('网络失败不应写入的问题');
    await page.route('**/api/auth/me', route => route.abort());
    await confirm();
    await page.getByText('网络连接失败，请检查服务后重试', { exact: true }).waitFor();
    assert.equal(await page.locator('.questions-section').getByText('网络失败不应写入的问题').count(), 0);
    assert.equal(await page.getByRole('dialog').count(), 1);
    await page.unroute('**/api/auth/me');
    await page.getByRole('dialog').getByRole('button', { name: /^(?:取\s*消|Cancel)$/ }).click();
    ok('identity network failure blocks write and preserves draft');

    await submitModal('过期会话不应写入的问题');
    await logoutThroughSameSession();
    await confirm();
    await heading('患者账号登录').waitFor();
    await page.getByRole('dialog').waitFor({state:'hidden'});
    await patientLogin();
    await heading('赵明 的问诊').waitFor();
    assert.equal(await page.locator('.questions-section').getByText('过期会话不应写入的问题').count(), 0);
    ok('stale patient tab cannot submit after server logout');
    await page.getByRole('button', { name: '切换用户' }).click();
    await heading('患者账号登录').waitFor();
    await patientLogin('patient002');
    await heading('孙丽 的问诊').waitFor();
    ok('patient switch uses original distinct IDs');

    await page.locator('.nav-menu').getByText('首页', {exact:true}).click();
    await heading('Professional online medical consultations').waitFor();
    await logoutThroughSameSession();
    await page.locator('.nav-menu').getByText('Consultation', {exact:true}).click();
    await heading('患者账号登录').waitFor();
    ok('SPA protected-route entry revalidates expired server identity');
    await patientLogin();
    await heading('赵明 的问诊').waitFor();
    await logoutThroughSameSession();
    await Promise.all([
      page.waitForResponse(r=>r.url().endsWith('/api/auth/me')),
      page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange'))),
    ]);
    await heading('患者账号登录').waitFor();
    ok('visibility-restoration handler clears expired identity');

    await goto('/doctor/login');
    await page.getByPlaceholder('请输入用户名', { exact: true }).fill('dr-zhang-wei');
    await page.getByPlaceholder('请输入密码', { exact: true }).fill('123456');
    await page.getByRole('button', { name: /^登\s*录$/ }).click();
    await heading('张伟医生的诊室').waitFor();
    await page.screenshot({ path: path.join(output, 'doctor-room.png'), fullPage: true });
    await goto('/doctor/room/dr-li-na');
    await page.waitForURL('**/doctor/login');
    ok('doctor backend login and wrong-room route rejection');
    await goto('/doctor/room/dr-zhang-wei');
    await heading('张伟医生的诊室').waitFor();
    await page.getByRole('button', { name: '文字回复' }).first().click();
    await page.getByPlaceholder('请输入您的专业建议和回复...').fill('浏览器验收医生正常回复');
    await confirm();
    await page.getByText('回复成功',{exact:true}).waitFor();
    await page.reload({waitUntil:'domcontentloaded'});
    await heading('张伟医生的诊室').waitFor();
    ok('doctor can reply after backend session validation and restore session on refresh');
    await page.getByRole('button', { name: '文字回复' }).first().click();
    await page.getByPlaceholder('请输入您的专业建议和回复...').fill('过期医生回复不得写入');
    await logoutThroughSameSession();
    await confirm();
    await page.waitForURL('**/doctor/login');
    ok('stale doctor tab cannot reply after server logout');

    await goto('/consultation');
    await heading('患者账号登录').waitFor();
    await patientLogin('dr-zhang-wei', '123456');
    await page.getByText('请使用患者账号登录', {exact:true}).waitFor();
    assert.equal((await context.request.get(base + '/api/auth/me')).status(), 401);
    await goto('/doctor/login');
    await page.getByPlaceholder('请输入用户名', {exact:true}).fill('patient001');
    await page.getByPlaceholder('请输入密码', {exact:true}).fill('Patient123!');
    await page.getByRole('button', {name:/^登\s*录$/}).click();
    await page.getByText('请使用医生账号登录', {exact:true}).waitFor();
    assert.equal((await context.request.get(base + '/api/auth/me')).status(), 401);
    ok('wrong-role login rejected in both entry points and server identity cleared');

    async function doctorLogin() {
      await page.getByPlaceholder('请输入用户名', {exact:true}).fill('dr-zhang-wei');
      await page.getByPlaceholder('请输入密码', {exact:true}).fill('123456');
      await page.getByRole('button', {name:/^登\s*录$/}).click();
      await heading('张伟医生的诊室').waitFor();
    }
    await doctorLogin();
    const pendingBefore = await page.locator('.question-card').count();
    await page.getByRole('button', {name:/标记已解答/}).first().click();
    await page.getByText('已标记为已解答', {exact:true}).waitFor();
    assert.equal(await page.locator('.question-card').count(), pendingBefore - 1);
    await logoutThroughSameSession();
    await page.getByRole('button', {name:/标记已解答/}).first().click();
    await page.waitForURL('**/doctor/login');
    await doctorLogin();
    assert.equal(await page.locator('.question-card').count(), pendingBefore - 1);
    ok('mark answered writes once when authenticated and never after session expiry');

    await goto('/');
    await page.setViewportSize({ width: 390, height: 844 });
    await heading('Professional online medical consultations').waitFor();
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(dimensions.scroll <= dimensions.width + 1, JSON.stringify(dimensions));
    await page.screenshot({ path: path.join(output, 'home-mobile.png'), fullPage: true });
    ok('English mobile layout without horizontal overflow');
    assert.deepEqual(errors, [], 'unexpected JavaScript errors');
    console.log('All browser checks passed.');
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    console.error((await page.locator('body').innerText()).slice(0, 3500));
    throw error;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
