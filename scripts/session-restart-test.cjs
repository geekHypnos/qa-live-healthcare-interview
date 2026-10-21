const {spawn} = require('node:child_process');
const {once} = require('node:events');
const path = require('node:path');
const assert = require('node:assert/strict');
const net = require('node:net');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.RESTART_TEST_PORT || 18084);
const base = `http://127.0.0.1:${port}`;
const java = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin/java') : 'java';
let service;

async function start() {
  service = spawn(java, ['-Xmx192m', '-jar', 'server/qa-service-user/target/qa-service-user-0.0.1-SNAPSHOT.jar'], {
    cwd: root, env: {...process.env, SERVER_PORT: String(port)}, stdio: 'ignore',
  });
  let startError;
  service.on('error', error => {startError = error;});
  for (let attempt = 0; attempt < 40; attempt++) {
    if (startError) throw startError;
    if (service.exitCode !== null) throw new Error('测试实例启动失败，请检查 Java 17、JAR 和数据库配置');
    try {
      if ((await fetch(base + '/actuator/health', {signal: AbortSignal.timeout(2000)})).ok) return;
    } catch { /* 启动期间暂时无法连接，继续等待；超过上限则失败。 */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('测试实例未按时就绪');
}
async function stop() {
  if (!service || service.exitCode !== null || service.signalCode !== null) return;
  const exited = once(service, 'exit');
  // 只停止本脚本创建的独立实例，不向主演示服务发送信号。
  service.kill('SIGTERM');
  const timer = setTimeout(() => service.kill('SIGKILL'), 10000);
  try { await exited; } finally { clearTimeout(timer); }
}
(async () => {
  // 不接管已有端口，防止把其他服务误当作测试实例。
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
  try {
    await start();
    const csrfResponse = await fetch(base + '/api/auth/csrf');
    assert.equal(csrfResponse.status, 200);
    const csrf = await csrfResponse.json();
    const cookie = csrfResponse.headers.getSetCookie().find(value => value.startsWith('JSESSIONID=')).split(';')[0];
    const login = await fetch(base + '/api/auth/login', {method:'POST',
      headers:{Cookie:cookie, 'Content-Type':'application/json', [csrf.headerName]:csrf.token},
      body:JSON.stringify({username:'patient001',password:'Patient123!'})});
    assert.equal(login.status, 200);
    const session = login.headers.getSetCookie().find(value => value.startsWith('JSESSIONID=')).split(';')[0];
    assert.equal((await fetch(base + '/api/auth/me', {headers:{Cookie:session}})).status, 200);
    await stop();
    await start();
    assert.equal((await fetch(base + '/api/auth/me', {headers:{Cookie:session}})).status, 401);
    console.log('PASS restart old authenticated session becomes unauthorized after service restart');
    const doctors = await fetch(base + '/api/doctors');
    assert.equal(doctors.status, 200);
    assert.equal((await doctors.json()).length, 5);
    console.log('PASS restart new service reconnects to MySQL and returns five doctors');
  } finally { await stop(); }
})().catch(error => {console.error(error.message); process.exitCode = 1;});
