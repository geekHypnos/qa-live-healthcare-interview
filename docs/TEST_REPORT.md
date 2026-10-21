# 测试报告

逐项场景、前置条件、操作步骤、预期/实际结果及原仓库需求对应关系见 [正式测试用例](TEST_CASES.md)。该文档整理已有验收证据，不代表重新执行测试。

## 最新验收：依赖修复与新版演示（2026-10-21）

本节是当前交付结果；文末旧报告仅作历史记录，不代表当前依赖版本或测试数量。

- 已验收代码：`3b5681f042fda8f31ae52c246278fc3608b811c9`；运行标识：`20261021-final-3b5681f`。
- [版本及命令清单](evidence/final-3b5681f/run-manifest.json) 记录实际命令、退出码、锁文件与日志摘要；全部命令成功，采集前后工作区干净。录制入口再次校验相同版本。
- [新视频](https://github.com/geekHypnos/qa-live-healthcare-interview/releases/download/interview-demo-20261021-3b5681f/interview-demo-3b5681f.webm) / [Release](https://github.com/geekHypnos/qa-live-healthcare-interview/releases/tag/interview-demo-20261021-3b5681f)；[现有 PR #1](https://github.com/geekHypnos/qa-live-healthcare-interview/pull/1)，仍指向本人 Fork main，不合并。

### 环境与结果

保持 Vue 3 / TypeScript / Ant Design Vue、Spring Boot 3.5.7 / Java 17、MySQL 8.4 / phpMyAdmin。Node 26.8.1；构建链 Vite 6.4.4、插件 5.2.4、esbuild 0.25.12。Maven 显式 JAVA_HOME=Java17；运行的是 artifacts/runtime/service.jar 副本，后续打包不覆盖存活进程文件。

| 验证 | 实际结果 | 证据 |
| --- | --- | --- |
| 后端单元及 package | 14 项通过，失败/跳过 0 | [单元与构建](evidence/final-3b5681f/unit-results.log) |
| 前端单元 | 18 项通过，失败/跳过 0 | 同上 |
| 采集/证据/录像/超时包装/回复断言测试 | 35 项通过，失败/跳过 0，不混入前端数量 | 同上 |
| TypeScript 与生产构建 | 通过，保留原大包警告 | 同上 |
| 五个接口真实 curl | 48 次通过 | [接口](evidence/final-3b5681f/curl-results.log) |
| 浏览器 | 25 组通过，含独立故障注入及负向对照，检查 pageerror | [浏览器](evidence/final-3b5681f/browser-results.log) |
| 数据库 | 4 项通过：幂等、修改映射页面、恢复、保留卷重启 | [数据库](evidence/final-3b5681f/database-results.log) |
| 自然超时 | 独立 1 分钟配置，真实空闲 65 秒后 401 | [超时](evidence/final-3b5681f/timeout-results.log) |
| 服务重启 | 旧会话失效，医生 API 重连 MySQL | [重启](evidence/final-3b5681f/restart-results.log) |
| 完整依赖审计 | 从 3 个受影响包（1 high、2 moderate）降为 0 | [升级前](evidence/final-3b5681f/audit-before.json) / [最终](evidence/final-3b5681f/audit-results.json) |
| 录像 | 108.60 秒，1440×900，VP8/25 fps，全量解码与关键帧检查 | [核验](evidence/final-3b5681f/video-verification.json) |

### 本轮修复与有效性检查

1. 等待会话检查时，患者/医生弹窗锁定输入、关闭和取消，提交使用快照；不会取消后写入空内容。网络及 5xx 后恢复编辑/取消/重试，401 仍强制清理旧草稿。
2. 业务验证异常不再误清登录；身份变化或明确 401 阻止旧操作，不清理新账号。
3. 问诊页补齐医生加载中、失败重试、空列表；保留草稿，错误链接不静默选中其他医生。
4. 回复断言绑定目标问题 ID、原文本、状态与列表数量，其他记录必须不变；空操作、错误目标和错误文本均有负向检测。
5. SQL 读取/恢复、页面步骤与浏览器关闭失败均进入独立资源清理；失败不发布录像。
6. 采集器验证真实子进程失败、信号、目录覆盖；Git 检查覆盖暂存/未暂存/未跟踪代码；录制拒绝旧 SHA、锁摘要、runId、缺失或被改写日志，以及空跑/数量不一致的测试。

### 失败记录与真实限制

新增业务错误身份保留、待提交控件锁定测试先失败后修复。回复负向对照在旧 Vite HMR 状态下没有命中同一个模块，重启全新进程后重新验证；没有以此删断言。Maven 初次选用 Java26 导致 Mockito 错误，明确 JAVA_HOME=17 后重跑成功。

首轮冻结运行 `20261021-final-885f03d` 期间补充了空跑/数量不一致的证据反例，结束时被 Git 门槛拒绝。该运行 completed=false，未用于视频或最终报告；本节结果来自新提交下从头完成的独立运行，没有复制旧日志。

问答仍是前端模拟数据，不保证刷新持久化；自然超时验证的是独立 1 分钟配置而非等待正式 30 分钟。外部头像依赖网络。保留构建体积提示，不新增拆包重构；审计归零不等于不存在未知漏洞。提示词记录见 prompts.md；发送视频和 PR 给面试方仍由用户沿原渠道完成。

---

# 历史验收记录（旧版本，以下数字与旧视频不作为当前结果）


状态：本机功能验收通过，演示视频已录制并检查。视频已上传 [GitHub Release](https://github.com/geekHypnos/qa-live-healthcare-interview/releases/tag/interview-demo-20261021)，附件名称、大小与 SHA-256 已核对；[PR #1](https://github.com/geekHypnos/qa-live-healthcare-interview/pull/1) 已创建，指向本人 Fork 的 main，未合并。

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
node scripts/session-restart-test.cjs
```

本机因旧 Playwright 浏览器缓存缺文件，指定了已验证的 Chromium 路径；交付脚本也支持先执行 `npx playwright install chromium` 使用匹配版本。不把本机的临时缓存路径作为用户必须遵守的部署条件。

## 实际结果

| 验证项 | 结果 | 证据 |
| --- | --- | --- |
| 后端完整测试和 JAR 打包 | 14 项测试通过，失败 0，跳过 0，BUILD SUCCESS | [单元测试结果](evidence/unit-results.txt) |
| 前端单元测试 | 12 项通过，包括 4 项会话竞态回归 | [单元测试结果](evidence/unit-results.txt) |
| TypeScript 和生产构建 | 通过 | vue-tsc 与 Vite build；保留体积警告 |
| 真实 MySQL 接口 | 48 次 curl 请求及字段断言通过，覆盖全部 5 个接口 | [接口结果](evidence/curl-results.txt) |
| 浏览器回归 | 17 组场景通过，未观察到 pageerror | [浏览器结果](evidence/browser-results.txt) |
| 数据库 | 4 项验证通过 | [数据库结果](evidence/database-results.txt) |
| 自然会话超时 | 独立实例配置 1 分钟，空闲 65 秒后 me 返回 401 | [生命周期结果](evidence/session-lifecycle.txt) |
| Java 服务重启 | 独立实例重启后旧会话为 401，医生 API 重连 MySQL 成功 | 同上 |
| 演示视频 | WebM VP8，1440×900，25 fps，1 分 53 秒，约 9.6 MiB | 完整解码和代表帧检查通过，链接见 DEMO |

Maven 结果为 `QaServiceUserApplicationTests` 1 项和 `InterviewApiTest` 13 项。计划中的医生与认证测试合并在 InterviewApiTest，共用 H2 测试夹具；这没有替代后续真实 MySQL 的 curl、SQL 和页面验收。前端覆盖网络错误、HTTP 错误、CSRF 刷新、语言键、身份不匹配，以及退出后旧响应、新登录被旧 401 覆盖、同身份恢复误取消提交三个竞态。

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

## 第二轮逐项审核

日期：2026 年 10 月 21 日。本轮重新执行了上表的测试、构建、真实接口、浏览器、数据库、自然超时和服务重启。原始 README 面试要求与上游内容一致，未通过修改题目降低验收标准。

| 仓库要求 | 对照结果 |
| --- | --- |
| 自己的 Fork、特性分支、推送并向 main 提 PR | geekHypnos 的 Fork；codex/healthcare-interview → main；沿用 PR #1，不合并 |
| 首页右上角下拉、中英文动态切换、资源在 src/locales | 已实现；完整首页、刷新记忆和窄屏有真实浏览器证据，非首页仍为中文 |
| MySQL、Compose、phpMyAdmin、用户服务医生 API、前后端联调 | 已实现；SQL 修改→接口→页面、幂等导入、保留卷重启均通过；phpMyAdmin 操作见视频 |
| 患者用户名密码、PRD 模板、按模板生成 PRD 并指导实现 | 文档、提交顺序及 prompts 可追溯；账号经后端校验，不再自动开户 |
| 涉及的全部接口使用 curl、API_TEST 和实际报告 | 五个接口全部覆盖，本轮 48 次真实请求及额外字段/Cookie 断言通过 |
| 代码注释和文档 | 非显然的会话、空值、规范化、CSRF 和测试隔离均有说明；文档保留实际限制 |
| 视频完整展示需求 | 首轮真实视频仍覆盖全部需求流程；匿名 HEAD 返回 200，文件 SHA-256 已核对；时间索引见 DEMO |
| /docs 模板、PRD、设计、API_TEST、测试报告、prompts | 文件齐全，补充本轮指令、失败复现和修复结果；不把 AI 阶段任务冒充用户原话 |
| AI Coding 过程、一日内完成、联系面试方 | 本轮仍由 AI 生成修改，开发与复核日期均为同一天；实际发送视频及 PR 由用户沿原沟通渠道完成，未冒称已代发 |

### 本轮发现与处理

1. **已修复：退出失败可能留下永久加载状态。** 会话恢复尚未完成时，退出增加认证版本，旧恢复响应因此被正确丢弃；但退出遇到网络错误时无人结束 loading。新增失败测试后，在退出 finally 中只结束当前版本的加载状态，保留可重试身份，不信任旧响应。
2. **已修复：用户名长度验证时机与 PRD 不一致。** 合法的 64 字符账号加首尾空格，原先在 trim 前被 Size 拒绝。输入记录构造时先规范账号，再进行校验；密码不裁剪。该测试由 400 转为 200。
3. **已修复：可选患者资料 NULL 导致 500。** 数据库允许生日、电话、性别为空，但 Map.of 不接受 null。现在可选资料统一输出空字符串，未新增 DTO 或通用转换层。该测试由 500 转为 200。
4. **已修复：录制脚本耦合旧测试数量。** 写死 37 次会拒绝当前完整的 48 次结果，已改为读取完整通过标记及实际数量。现有录像未修改；本轮没有重新录制，不声称完成了第二轮录制或逐帧检查。
5. **已补覆盖：** 后端增加失败账号切换清理旧会话、登录更新会话 ID、数据库故障的脱敏错误；curl 增加 null/超长密码、首尾空白、失败切换、真实 Cookie 属性与 ID 变化；前端增加语言默认值、恢复、存储禁用和未知资料保留；浏览器增加双向错误角色登录和医生标记的正常/过期操作。
6. **已补可复现性：** 服务重启从一次性操作补为 session-restart-test.cjs，在独立端口自动启动、重启和停止测试进程，验证旧会话失效与 MySQL 重连。本次真实执行通过。

新增回归先失败后修复。另临时反转修复条件确认测试能捕获该缺陷，恢复后 12 项前端测试全部通过。新增浏览器定位最初因按钮含图标的可访问名称而超时；改为匹配真实名称后完整重跑，业务断言未删除。[回归摘要](evidence/regression-results.txt) 记录了失败与修复，不公开 Cookie 或 token。

### 范围与剩余测试边界

未发现需要阻塞交付的需求遗漏，也没有必要增加架构层。继续保留现有 Vue store、轻量翻译、JDBC 与 Spring Security；不引入 JWT、Redis、通用仓储、权限后台或新的测试框架。医生认证兼容是迁移数据后保持原功能所需，CSRF 与 Cookie 检查是会话登录的配套，不是扩展题目。

以下不是“全部测试已覆盖”：可见性恢复仍为真实浏览器中的 DOM 事件测试，未做操作系统切换窗口认证；不覆盖所有浏览器、无障碍、负载和渗透场景；3 项开发构建依赖审计发现仍在。问答持久化、注册、找回密码不在题目范围，本轮没有扩大实现。正式 30 分钟超时以配置及独立 1 分钟自然超时验证，不虚报等待过 30 分钟。
