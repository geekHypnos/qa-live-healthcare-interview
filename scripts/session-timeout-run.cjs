const {spawn}=require('node:child_process'),{once}=require('node:events'),net=require('node:net'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.TIMEOUT_TEST_PORT||18082);
async function checkPort(){await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(port,'127.0.0.1',()=>server.close(resolve));});}
function start(){const child=spawn(process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin/java'):'java',['-Xmx192m','-jar',process.env.TEST_JAR||'artifacts/runtime/service.jar'],{cwd:root,env:{...process.env,SERVER_PORT:String(port),SESSION_TIMEOUT:'1m'},stdio:'ignore'});child.on('error',e=>child.startError=e);return child;}
async function ready(child){for(let n=0;n<40;n++){if(child.startError)throw child.startError;if(child.exitCode!==null)throw Error('超时测试实例启动失败');try{if((await fetch(`http://127.0.0.1:${port}/actuator/health`,{signal:AbortSignal.timeout(1000)})).ok)return;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('超时测试实例未就绪');}
async function test(){const child=spawn('bash',['scripts/session-timeout-test.sh'],{cwd:root,env:{...process.env,TIMEOUT_API_URL:`http://127.0.0.1:${port}`},stdio:'inherit'});const [code,signal]=await once(child,'exit');if(code!==0||signal)throw Error('自然超时验收失败');}
async function stop(child){if(child.exitCode!==null||child.signalCode!==null)return;const exited=once(child,'exit');child.kill('SIGTERM');const timer=setTimeout(()=>child.kill('SIGKILL'),5000);try{await exited;}finally{clearTimeout(timer);}}
async function runTimeout(deps={checkPort,start,ready,test,stop}){let child;await deps.checkPort();try{child=await deps.start();await deps.ready(child);await deps.test();}finally{if(child)await deps.stop(child);}}
module.exports={runTimeout};
if(require.main===module)runTimeout().catch(e=>{console.error(e.message);process.exitCode=1});
