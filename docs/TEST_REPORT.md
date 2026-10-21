# 测试报告

状态：本机功能验收通过，演示视频已录制并检查。视频已上传 [GitHub Release](https://github.com/geekHypnos/qa-live-healthcare-interview/releases/tag/interview-demo-20261021)，附件名称、大小与 SHA-256 已核对；PR 信息在创建后补充。

## 环境检查

检查日期：2026 年 10 月 21 日，Asia/Shanghai。

| 项目 | 实际结果 |
| --- | --- |
| Docker Desktop | 已启动，Docker Server 29.3.1；访问 socket 需要沙箱外执行权限 |
| Docker Compose | v5.1.1 |
| Java | 显式设置 JAVA_HOME 后，Maven 使用 Microsoft OpenJDK 17.0.19 |
| Maven | 3.9.16 |
| Node 和 npm | Node 26.8.1，npm 11.19.0 |
| Fork | 已创建 `geekHypnos/qa-live-healthcare-interview`，HEAD 与上游基线一致 |
| 推送权限 | `git push --dry-run origin HEAD:refs/heads/codex/healthcare-interview` 成功，未推送提交 |
| 录制 | Playwright 1.62.1 成功录制 1.2 秒 WebM；沙箱内 Chromium 系统通信被拒绝，授权后成功 |

初次启动 Docker 和 Chromium 在沙箱内失败，使用必要的沙箱外执行授权解决，未关闭系统安全配置。端口 8080 和 5173 的监听检查未发现占用。环境烟测文件保存在本机临时目录，不提交录屏或 Cookie。

## 测试环境和命令

实际环境为 macOS arm64，Spring Boot 3.5.7、Java 17.0.19、Maven 3.9.16、MySQL 8.4.11、phpMyAdmin 5.2.3。前端为 Vue 3.5.44、TypeScript 5.6.2、Vite 5.4.21；浏览器脚本使用 Playwright 1.56.1 和已有 Chromium 151.0.7922.34。

```bash
JAVA_HOME=$(/usr/libexec/java_home -v17) mvn -f server/qa-service-user/pom.xml -Dmaven.repo.local=/private/tmp/qa-m2 package
npm test --prefix web/qa-web
npm run build --prefix web/qa-web
bash scripts/api-test.sh
BROWSER_EXECUTABLE=/path/to/installed/chromium node scripts/browser-test.cjs
BROWSER_EXECUTABLE=/path/to/installed/chromium node scripts/database-test.cjs
bash scripts/session-timeout-test.sh
```

本机因旧 Playwright 浏览器缓存缺文件，指定了已验证的 Chromium 路径；交付脚本也支持先执行 `npx playwright install chromium` 使用匹配版本。不把本机的临时缓存路径作为用户必须遵守的部署条件。

## 实际结果

| 验证项 | 结果 | 证据 |
| --- | --- | --- |
| 后端完整测试和 JAR 打包 | 9 项测试通过，失败 0，跳过 0，BUILD SUCCESS | Maven Surefire 报告及下方汇总 |
| 前端单元测试 | 8 项通过，包括 3 项会话竞态回归 | Node test runner 实际输出 |
| TypeScript 和生产构建 | 通过 | vue-tsc 与 Vite build；保留体积警告 |
| 真实 MySQL 接口 | 37 次 curl 请求及字段断言通过，覆盖全部 5 个接口 | [接口结果](evidence/curl-results.txt) |
| 浏览器回归 | 15 组场景通过，未观察到 pageerror | [浏览器结果](evidence/browser-results.txt) |
| 数据库 | 4 项验证通过 | [数据库结果](evidence/database-results.txt) |
| 自然会话超时 | 独立实例配置 1 分钟，空闲 65 秒后 me 返回 401 | [生命周期结果](evidence/session-lifecycle.txt) |
| Java 服务重启 | 独立实例重启后旧会话为 401，医生 API 重连 MySQL 成功 | 同上 |
| 演示视频 | WebM VP8，1440×900，25 fps，1 分 53 秒，约 9.6 MiB | 完整解码和代表帧检查通过，链接见 DEMO |

Maven 结果为 `QaServiceUserApplicationTests` 1 项和 `InterviewApiTest` 8 项。计划中的医生与认证测试合并在 InterviewApiTest，共用 H2 测试夹具；这没有替代后续真实 MySQL 的 curl、SQL 和页面验收。前端覆盖网络错误、HTTP 错误、CSRF 刷新、语言键、身份不匹配，以及退出后旧响应、新登录被旧 401 覆盖、同身份恢复误取消提交三个竞态。

浏览器验证了完整首页翻译及刷新记忆、其他页中文、5 位医生、接口失败重试、空列表、直接医生链接、错误及正确患者登录、提问、刷新、切换患者、SPA 进入与可见性恢复校验、医生登录及错诊室拒绝、正常回复、旧标签页失效后禁止写入，以及 390px 英文布局无横向溢出。可见性回调用例通过触发对应 DOM 事件验证处理器，不将其描述为跨操作系统的窗口管理测试。

数据库验证包括 seed 重复执行后仍为 5 位医生、5 位患者、10 个账号；临时修改资料后 SQL、API 和页面一致；修改恢复；保留命名卷重启后数量及中文内容正确。重启期间两次连接探测失败属于等待就绪的预期重试，日志原样保留。

页面证据：[英文首页](evidence/home-en.png)、[窄屏英文首页](evidence/home-mobile.png)、[数据库修改映射到页面](evidence/mysql-to-page.png)。

## 发现和修复

1. 初始化文件虽为 UTF-8，但导入连接没有明确字符集，中文资料出现乱码。为接口补充中文姓名和科室断言后复现，SQL 加入 SET NAMES utf8mb4，并修复本轮新建的演示数据；curl 与浏览器随后通过。
2. Jackson 默认把数字和布尔值转换为登录字符串。保留输入类型失败测试，显式拒绝转换，后端全部通过。
3. 独立审查发现退出后的旧恢复响应、同身份恢复误取消提交、SPA 进入不校验。新增 3 项先失败的单元回归，使用认证版本及稳定身份键修复，并加入路由检查。审查者复核通过，重新运行 8 项前端测试全部通过。
4. 浏览器测试最初因组件图标、两字按钮空格、默认 OK/Cancel 和弹窗关闭动画定位失败；调整测试以匹配真实可访问界面，没有删除业务断言。
5. 录像内容完整写入后，关闭浏览器再调用远程 saveAs 失败。完整原始录像仍在，保留相同视频内容重命名为交付文件；脚本改为关闭前取得路径、关闭后本地重命名。视频全量解码和代表帧检查通过，未用截图轮播替代录制。

## 仍保留的限制

- 问题和回复仍为原项目前端模拟数据，刷新后新增内容不保证保留；不作为服务端持久化、隔离的真实医疗记录交付。
- 自然超时测试使用独立 1 分钟配置，不声称等待过正式 30 分钟；正常实例保持 30 分钟配置。
- 原项目及新增开发依赖审计最初为 12 项，兼容范围更新后仍有 3 项开发构建链审计结果（1 high、2 moderate，涉及 Vite/esbuild 及插件依赖）。完整消除需要不兼容的工具链升级，本次未使用 force。绑定本机并不等同于漏洞已消除，不将开发服务公开部署；正式上线前需另行升级并复测。
- Vite 保留原有大包体积警告，构建未失败，未降低告警阈值掩盖问题。
- 外部医生头像仍沿用原图片地址，需要网络。验证和录制时实际加载成功。
- 当前工作属于一次面试作业验证，不宣称完成全部浏览器、无障碍或生产安全认证。

## 文档和过程

PRD 模板、按模板生成的登录 PRD、功能代码、API_TEST 与测试报告按先后提交。提示词及修复过程见 prompts。没有跳过失败测试、把未执行项写成通过，或由用户手工代写功能代码。最终远程交付信息见 DEMO 和 PR。
