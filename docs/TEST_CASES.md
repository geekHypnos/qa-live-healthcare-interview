# 测试用例与需求追踪

## 1. 文档基线

- 需求来源：[原仓库 README](https://github.com/ups216/qa-live-healthcare-interview#readme)。下文 R/T/D/P 编号为本项目追踪编号，不是上游原有编号。
- 测试代码版本：`3b5681f042fda8f31ae52c246278fc3608b811c9`。
- 实际运行：`20261021-final-3b5681f`，2026-10-21 14:14:07–14:16:15（Asia/Shanghai）。[清单](evidence/final-3b5681f/run-manifest.json)记录 11 条命令，全部退出码为 0。
- 本文整理日期：2026-10-21。实际结果取自上述运行、同版视频及交付核查；本次文档整理没有重跑业务测试。代码冻结后的提交仅涉及文档与证据。
- 下表是业务场景归并，不是测试框架计数：后端 14 项、前端 18 项、脚本 35 项、curl 48 次请求、浏览器 25 组、数据库 4 项分别统计，不能相加成一个“用例总数”。curl 中包含多次取得 CSRF token。

## 2. 需求对应关系

| 编号 | 原仓库要求摘要 | 对应用例 |
| --- | --- | --- |
| R1 | 首页右上角中文/English 下拉、动态切换，资源置于 src/locales，非首页不要求翻译 | I18N-01～06 |
| R2 | 医生资料迁入 MySQL；Compose 启动 MySQL/phpMyAdmin；用户服务医生列表 API；前后端联调 | DB-01～08 |
| R3 | 患者用户名密码登录；提供 PRD 模板，按模板编写 PRD 并指导开发 | AUTH-01～10、DEL-01 |
| T1 | 使用 curl 测试涉及的全部接口 | AUTH-01～10、DB-02、下方接口矩阵 |
| T2 | API_TEST.md 描述测试流程，生成测试报告 | DEL-01 |
| D1 | 完成代码，录制完整展示需求的视频 | DEL-02；R1～R3 的功能用例 |
| D2 | docs 中提供模板、PRD、设计（如需）、API_TEST、报告 | DEL-01 |
| D3 | docs/prompts.md 记录全过程提示词 | DEL-03 |
| P1 | 本人 Fork 特性分支，推送并创建指向 main 的 PR | DEL-04 |
| P2 | 联系面试方，发送视频及 PR；一天内完成面试流程 | DEL-05 |
| P3 | 代码、测试、文档全部通过 AI Coding 提示词完成，可手工调整 AI 产物 | DEL-03 |
| X1 | 后续修复计划：竞态、异常恢复、有效写入断言、依赖归零、证据/录像可靠性 | REG-01～08、OPS-01 |

R1～R3 为原题功能范围。REG/OPS 是为保证这些功能和交付可靠性增加的回归，不声称原题要求问答持久化、注册、密码找回、JWT 或 Redis。

## 3. 公共前置条件与执行方式

### 环境 E1（功能与真实接口）

按 [README](../README.md) 准备 `.env`、数据库初始数据和服务。实际验收使用 Java 17、Node 26.8.1、MySQL 8.4.11、phpMyAdmin 5.2.3、Vite 6.4.4、Playwright 1.56.1 与 Chromium 151。前端 `127.0.0.1:15173`，后端 `127.0.0.1:18080`，phpMyAdmin `127.0.0.1:18081`。

运行 JAR 使用 `artifacts/runtime/service.jar` 独立副本；停止原进程后才能更换该文件，不覆盖存活进程使用的副本。患者：`patient001 / Patient123!`、`patient002 / Patient123!`；医生：`dr-zhang-wei / 123456`。这些为项目公开演示账号。数据库密码从本机配置读取，不写入本用例。

### 环境 E2（单元、脚本及故障注入）

已有 npm 安装与 Java/Maven 环境。单元测试使用隔离对象；采集器测试使用临时目录、临时 Git 仓库和微型子进程，不执行实际数据库写操作。浏览器回归组在独立 context 中模拟 me 身份及医生响应，并注入延迟、网络错误或 500/401；旧浏览器流程另有真实后端正常业务验证；故障注入不能冒充真实后端故障。

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v17)  # macOS；其他系统配置对应 JAVA_HOME
mvn -f server/qa-service-user/pom.xml package
npm test --prefix web/qa-web
node --test scripts/tests/*.test.cjs
npm run build --prefix web/qa-web
bash scripts/api-test.sh
node scripts/browser-test.cjs
node scripts/database-test.cjs
node scripts/session-timeout-run.cjs
node scripts/session-restart-test.cjs
```

浏览器可用 `BROWSER_EXECUTABLE` 指定现有兼容 Chromium。完整版本绑定采集见 [API_TEST](API_TEST.md)；必须提交代码并通过 Git 干净检查，使用新的 runId，禁止将本表的“通过”当作新一次运行结果。

### 证据与状态说明

- **通过**：下列明确指向的自动断言、实际录像或交付核查支持该结论；三种验证方式在用例中区分。
- **待用户完成/无法独立认定**：不计为自动化通过。
- [单元/构建日志](evidence/final-3b5681f/unit-results.log)、[浏览器日志](evidence/final-3b5681f/browser-results.log)、[curl 日志](evidence/final-3b5681f/curl-results.log)、[数据库日志](evidence/final-3b5681f/database-results.log)均由清单摘要绑定。
- 脚本日志中的 `fail: FAIL`、`missing: FAIL`、`signal: FAIL` 是受控负向子进程结果；对应测试断言正确拒绝后标记通过，不是忽略实际验收失败。数据库重启期间的两次连接失败是就绪探测，最终恢复成功。

## 4. 功能测试用例

### I18N-01 首页切换英文

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R1 |
| 验证方式 | 真实浏览器 |
| 前置条件 | E1；首页默认中文 |
| 操作步骤 | 1. 打开首页，检查右上角语言选择<br>2. 选择 English<br>3. 检查正文、导航、医生介绍和页脚 |
| 预期结果 | 英文动态显示；除语言选项“中文”外首页无遗漏的中文文案 |
| 实际结果 | 通过；浏览器检查完整页面文本，录像展示切换 |
| 对应证据 | [浏览器日志](evidence/final-3b5681f/browser-results.log)：homepage complete translation；[视频与关键帧索引](DEMO.md) 00:16、00:25 |

### I18N-02 恢复中文

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R1 |
| 验证方式 | 单元 + 真实录像 |
| 前置条件 | E1/E2；语言已设为英文 |
| 操作步骤 | 1. 调用语言切换或在下拉框选择中文<br>2. 检查首页文字与 html lang |
| 预期结果 | 首页恢复中文，语言设置同步更新 |
| 实际结果 | 通过；单元验证 Home→首页及存储/lang；录像中切回中文后继续医生页面 |
| 对应证据 | [单元日志](evidence/final-3b5681f/unit-results.log)：saved English restores and language changes；[视频与关键帧索引](DEMO.md) |

### I18N-03 刷新保留语言

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R1（补充体验） |
| 验证方式 | 真实浏览器 |
| 前置条件 | E1；已选择 English |
| 操作步骤 | 1. 刷新首页<br>2. 检查英文标题是否保留（现有脚本未单独断言刷新后的下拉选中值） |
| 预期结果 | 仍为英文，无需重新选择 |
| 实际结果 | 通过 |
| 对应证据 | [浏览器日志](evidence/final-3b5681f/browser-results.log)：homepage complete translation and refresh memory |

### I18N-04 语言资源目录与键一致

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R1 |
| 验证方式 | 源码核查 + 单元 |
| 前置条件 | E2 |
| 操作步骤 | 1. 检查 src/locales 中中英资源<br>2. 运行 locales.test.mjs 比较键集合和非空翻译 |
| 预期结果 | 资源位于规定目录；两套键一致，关键翻译正确 |
| 实际结果 | 通过 |
| 对应证据 | [单元日志](evidence/final-3b5681f/unit-results.log)：homepage locales have matching keys；[资源目录](../web/qa-web/src/locales) |

### I18N-05 无效偏好和存储失败

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R1（异常回归） |
| 验证方式 | 单元 |
| 前置条件 | E2；可注入 localStorage 行为 |
| 操作步骤 | 1. 分别设置缺失、未知语言值<br>2. 模拟读取/写入存储抛错<br>3. 切换语言并查询未知医生文案 |
| 预期结果 | 缺失/未知设置默认中文；存储异常不阻止切换，未知数据库文本保留 |
| 实际结果 | 通过 |
| 对应证据 | [单元日志](evidence/final-3b5681f/unit-results.log)：missing or unsupported saved locale；blocked storage |

### I18N-06 窄屏英文首页

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R1（布局回归） |
| 验证方式 | 真实浏览器 |
| 前置条件 | E1；英文首页 |
| 操作步骤 | 1. 设置视口 390×844<br>2. 比较 document scrollWidth 与 clientWidth |
| 预期结果 | 无明显横向溢出（允许 1px 舍入差） |
| 实际结果 | 通过 |
| 对应证据 | [浏览器日志](evidence/final-3b5681f/browser-results.log)：English mobile layout without horizontal overflow |

### DB-01 Compose 与 phpMyAdmin

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R2 |
| 验证方式 | 环境核查 + 真实录像 |
| 前置条件 | E1；Docker 可用 |
| 操作步骤 | 1. 启动本项目 Compose<br>2. 确认 MySQL 健康、phpMyAdmin 可访问<br>3. 登录并打开 doctors 表 |
| 预期结果 | 连接同一项目数据库，可查看医生记录 |
| 实际结果 | 通过；录像可见 MySQL 8.4.11、数据库及 5 条医生记录 |
| 对应证据 | [视频与关键帧索引](DEMO.md) 00:37、00:40；[Compose](../docker-compose.yml) |

### DB-02 医生列表接口契约

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R2、T1 |
| 验证方式 | 真实 curl |
| 前置条件 | E1；数据库含基线医生数据 |
| 操作步骤 | 1. GET /api/doctors<br>2. 检查状态码、数量、ID、中文姓名、科室、specialties、isActive<br>3. 检查响应无 password/passwordHash |
| 预期结果 | 200；5 条基线医生；字段类型正确，无密码泄露 |
| 实际结果 | 通过 |
| 对应证据 | [curl 日志](evidence/final-3b5681f/curl-results.log)：01 doctors；[字段断言](../scripts/api-test.sh) |

### DB-03 医生页面读取后端

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R2 |
| 验证方式 | 真实浏览器 |
| 前置条件 | E1 |
| 操作步骤 | 1. 打开 /doctors<br>2. 等待 5 张医生卡片<br>3. 检查非首页保持中文且没有首页语言菜单 |
| 预期结果 | 显示后端医生资料；无需翻译其他页面 |
| 实际结果 | 通过 |
| 对应证据 | [浏览器日志](evidence/final-3b5681f/browser-results.log)：five MySQL doctors and Chinese-only secondary page |

### DB-04 数据库修改回显

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R2 |
| 验证方式 | 真实 SQL + API + 浏览器 |
| 前置条件 | E1；记录 doc001 原经验值 |
| 操作步骤 | 1. 修改 doc001 experience 为验收文本<br>2. 请求医生 API<br>3. 打开医生页面确认同一文本 |
| 预期结果 | 接口及页面均反映真实数据库修改，而非旧 JSON 回退 |
| 实际结果 | 通过 |
| 对应证据 | [数据库日志](evidence/final-3b5681f/database-results.log)：SQL change is visible through API and actual doctors page；[视频与关键帧索引](DEMO.md) 00:43 |

### DB-05 恢复修改和初始化幂等

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R2（数据安全回归） |
| 验证方式 | 真实 SQL |
| 前置条件 | E1；数据库已有演示记录 |
| 操作步骤 | 1. 重复执行 database/init.sql<br>2. 比较医生/患者/账号数量<br>3. 在修改验证结束后恢复 doc001 原值并读取 |
| 预期结果 | 数量保持 5/5/10，不重复插入；临时修改被恢复 |
| 实际结果 | 通过；数据库测试读取并恢复修改前原值，随后断言相等；此日志不是录制结束后的独立 SQL 证据 |
| 对应证据 | [数据库日志](evidence/final-3b5681f/database-results.log)：repeated initialization；demo modification restored；[报告](TEST_REPORT.md) |

### DB-06 保留数据卷重启

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R2（生命周期回归） |
| 验证方式 | 真实数据库重启 |
| 前置条件 | E1；禁止 down -v |
| 操作步骤 | 1. 记录数量和中文医生姓名<br>2. 只重启本项目 MySQL 容器<br>3. 等待就绪后再次查询 |
| 预期结果 | 数据量不变，中文姓名正确，不删除卷 |
| 实际结果 | 通过；就绪探测曾短暂失败，最终恢复并断言通过 |
| 对应证据 | [数据库日志](evidence/final-3b5681f/database-results.log)：restart preserves rows and Chinese encoding |

### DB-07 医生加载失败与重试

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R2、X1 |
| 验证方式 | 浏览器故障注入 |
| 前置条件 | E1/E2；独立 context |
| 操作步骤 | 1. 拦截医生请求返回 500<br>2. 分别检查医生页和问诊页错误状态<br>3. 移除故障后重试<br>4. 在问诊草稿存在时重载失败再恢复 |
| 预期结果 | 错误可见、可以重试；问诊加载中提交按钮禁用；恢复同一医生且草稿不丢失 |
| 实际结果 | 通过 |
| 对应证据 | [浏览器日志](evidence/final-3b5681f/browser-results.log)：doctor failure has real retry；consultation doctor loading/error/empty/retry；[回归脚本](../scripts/browser-regressions.cjs) |

### DB-08 医生空列表与无效链接

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R2、X1 |
| 验证方式 | 浏览器故障注入 |
| 前置条件 | E1/E2 |
| 操作步骤 | 1. 拦截医生接口返回 200 + []<br>2. 打开医生页/问诊页<br>3. 恢复正常列表，进入不存在的医生链接 |
| 预期结果 | 空列表不显示网络故障；无效诊室明确提示，不自动选另一医生 |
| 实际结果 | 通过 |
| 对应证据 | [浏览器日志](evidence/final-3b5681f/browser-results.log)：empty doctors state differs；invalid route never selects another doctor |

### AUTH-01 患者正常登录

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3、T1 |
| 验证方式 | 真实 curl + 浏览器 |
| 前置条件 | E1；未登录 |
| 操作步骤 | 1. 获取 CSRF token<br>2. 使用首尾带空格的 patient001、正确密码及伪造 role=DOCTOR 登录<br>3. GET /api/auth/me；打开患者问诊页 |
| 预期结果 | 登录 200，用户名空白规范化；仍为 PATIENT，不能靠请求 role 提权；资料 ID=patient001，响应 profile 无 password；页面显示赵明 |
| 实际结果 | 通过 |
| 对应证据 | [curl 日志](evidence/final-3b5681f/curl-results.log)：29 patient_login、30 patient_me；[浏览器日志](evidence/final-3b5681f/browser-results.log)：successful patient consultation |

### AUTH-02 错误密码和不存在账号

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3、T1 |
| 验证方式 | 真实 curl + 浏览器 |
| 前置条件 | E1 |
| 操作步骤 | 1. 分别输入错误密码和不存在账号<br>2. 获取有效 CSRF 后调用登录<br>3. 检查页面错误提示 |
| 预期结果 | 两种情况均 401、code=INVALID_CREDENTIALS；页面错误密码提示可见（未比较两种响应的完整正文或耗时） |
| 实际结果 | 通过 |
| 对应证据 | [curl 日志](evidence/final-3b5681f/curl-results.log)：09 wrong_password、11 unknown_account；[浏览器日志](evidence/final-3b5681f/browser-results.log)：password error |

### AUTH-03 登录输入边界

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3、T1 |
| 验证方式 | 真实 curl + 后端测试 |
| 前置条件 | E1；每次使用当前 CSRF token |
| 操作步骤 | 1. 分别提交空值、null body/字段<br>2. 提交超长用户名/密码及 BCrypt 长度边界<br>3. 提交非法 JSON、数字/布尔类型字段 |
| 预期结果 | 返回 400，不以类型强转接受非法输入 |
| 实际结果 | 通过 |
| 对应证据 | [curl 日志](evidence/final-3b5681f/curl-results.log)：13～27 对应输入请求（穿插 csrf 请求）；[单元日志](evidence/final-3b5681f/unit-results.log) 后端 14 项 |

### AUTH-04 会话刷新恢复

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3 |
| 验证方式 | 真实浏览器 |
| 前置条件 | E1；患者或医生已登录 |
| 操作步骤 | 1. 刷新当前受保护页面<br>2. 观察身份和登录状态 |
| 预期结果 | 恢复当前服务器会话；不把模拟问题持久化作为验收条件 |
| 实际结果 | 通过；患者、医生均覆盖 |
| 对应证据 | [浏览器日志](evidence/final-3b5681f/browser-results.log)：patient session survives refresh；doctor ... restore session on refresh |

### AUTH-05 切换患者及失败切换

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3、T1 |
| 验证方式 | 真实 curl + 浏览器 |
| 前置条件 | E1；patient001 已登录 |
| 操作步骤 | 1. 切换到 patient002<br>2. 检查身份和页面资料<br>3. 尝试错误凭据切换，再访问 me |
| 预期结果 | 成功时为 patient002/孙丽；失败切换不继续信任原身份 |
| 实际结果 | 通过 |
| 对应证据 | [curl 日志](evidence/final-3b5681f/curl-results.log)：33～39；[浏览器日志](evidence/final-3b5681f/browser-results.log)：patient switch uses original distinct IDs |

### AUTH-06 匿名、退出与旧会话

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3、T1 |
| 验证方式 | 真实 curl + 浏览器 |
| 前置条件 | E1 |
| 操作步骤 | 1. 匿名访问 me<br>2. 患者和医生分别登录后退出<br>3. 再次访问 me；让旧标签页尝试提问、回复和标记已回答<br>4. 检查 SPA 受保护路由跳转；手动 dispatch visibilitychange 事件检查身份校验处理器<br>5. 对照有效会话下标记已回答仅写入一次 |
| 预期结果 | 匿名及退出后均 401；旧标签页不得提交/回复/标记；路由进入及可见性事件处理器清理过期身份（未测试操作系统窗口切换）；有效身份标记仅写一次 |
| 实际结果 | 通过 |
| 对应证据 | [curl 日志](evidence/final-3b5681f/curl-results.log)：02、41～42、47～48；[浏览器日志](evidence/final-3b5681f/browser-results.log)：stale patient/doctor、mark answered、SPA protected-route、visibility-restoration |

### AUTH-07 角色与诊室限制

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3（兼容回归） |
| 验证方式 | 真实浏览器 |
| 前置条件 | E1；患者和医生演示账号存在 |
| 操作步骤 | 1. 医生账号从患者入口登录，反向再试<br>2. 医生进入其他医生的诊室链接 |
| 预期结果 | 入口拒绝错误角色并清理服务端身份；错误诊室回到登录入口 |
| 实际结果 | 通过 |
| 对应证据 | [浏览器日志](evidence/final-3b5681f/browser-results.log)：wrong-role login rejected in both entry points；wrong-room route rejection |

### AUTH-08 CSRF 与 Cookie

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3、T1 |
| 验证方式 | 真实 curl |
| 前置条件 | E1；使用测试专用 Cookie jar |
| 操作步骤 | 1. 缺失/错误 token 调用登录及退出<br>2. 正确登录后尝试复用旧 token<br>3. 检查登录后会话 ID 更新与 Cookie 属性 |
| 预期结果 | 缺失/错误/旧 token 为 403；登录更新会话 ID；HttpOnly、SameSite=Lax 存在 |
| 实际结果 | 通过；Cookie/token 不写入公开证据 |
| 对应证据 | [curl 日志](evidence/final-3b5681f/curl-results.log)：03～08、31；[Cookie 断言](../scripts/api-test.sh) |

### AUTH-09 自然超时

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3（生命周期回归） |
| 验证方式 | 真实等待 |
| 前置条件 | E1；独立测试端口未占用，固定运行 JAR |
| 操作步骤 | 1. 以 SESSION_TIMEOUT=1m 启动独立实例<br>2. 登录后无请求空闲 65 秒<br>3. 请求 me，结束后关闭自身实例 |
| 预期结果 | me 返回 401，主演示 30 分钟配置不变 |
| 实际结果 | 通过；不是对正式 30 分钟超时的实等验证。包装器另有端口占用、启动/就绪/测试失败与正常退出的清理单元验证 |
| 对应证据 | [自然超时日志](evidence/final-3b5681f/timeout-results.log)；[单元日志](evidence/final-3b5681f/unit-results.log)：timeout wrapper port/start/ready/test/none |

### AUTH-10 服务重启失效

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3、R2（生命周期回归） |
| 验证方式 | 真实服务重启 |
| 前置条件 | E1；独立重启端口未占用 |
| 操作步骤 | 1. 启动副本并登录保存 Cookie<br>2. 停止并重新启动独立实例<br>3. 用旧 Cookie 请求 me，再请求医生接口 |
| 预期结果 | 旧会话为 401；医生列表成功重连 MySQL |
| 实际结果 | 通过 |
| 对应证据 | [重启日志](evidence/final-3b5681f/restart-results.log) |

## 5. 缺陷与交付可靠性回归

### REG-01 延迟提交锁定

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3、X1 |
| 验证方式 | 独立浏览器故障注入 |
| 前置条件 | E1/E2；患者/医生分别打开提问/回复弹窗 |
| 操作步骤 | 1. 填写非空原文，延迟 me 响应<br>2. 确认提交后检查输入、取消、关闭、Esc、遮罩<br>3. 释放成功响应，核对写入 |
| 预期结果 | 等待期间不可编辑/关闭；只写一次原内容，无空问题或意外退出 |
| 实际结果 | 通过，患者和医生均执行 |
| 对应证据 | [浏览器日志](evidence/final-3b5681f/browser-results.log)：PATIENT/DOCTOR pending submission locks controls |

### REG-02 失败后恢复与重试

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3、X1 |
| 验证方式 | 独立浏览器故障注入 |
| 前置条件 | E1/E2；已有草稿 |
| 操作步骤 | 1. 分别使 me 网络失败、返回 500<br>2. 检查 loading 结束、草稿与数据不变<br>3. 恢复服务并重试；另一个分支检查取消可关闭 |
| 预期结果 | 恢复编辑/取消/提交；原草稿保留；重试写入目标及文本正确且仅一次 |
| 实际结果 | 通过；患者新增记录核对 patientId/doctorId，医生核对目标问题 |
| 对应证据 | [浏览器日志](evidence/final-3b5681f/browser-results.log)：network and 5xx unlock retry/cancel |

### REG-03 锁定弹窗遇到 401

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3、X1 |
| 验证方式 | 独立浏览器故障注入 |
| 前置条件 | E1/E2；已提交且 me 被延迟 |
| 操作步骤 | 1. 释放延迟响应为 401<br>2. 检查弹窗、身份和数据<br>3. 重新进入并打开新弹窗 |
| 预期结果 | 强制关闭不受取消锁阻挡；不写入、无成功提示、旧草稿清空 |
| 实际结果 | 通过，双方均覆盖 |
| 对应证据 | [浏览器日志](evidence/final-3b5681f/browser-results.log)：delayed unauthorized response closes locked modal |

### REG-04 业务异常及身份竞态

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3、X1 |
| 验证方式 | 单元 |
| 前置条件 | E2；隔离 store 和可控会话 Promise |
| 操作步骤 | 1. 会话成功后令 action 抛普通 Error<br>2. 分别注入 401、网络/500、身份不匹配<br>3. 待响应期间登录新账号再释放旧响应 |
| 预期结果 | 业务异常保留身份；认证失效阻止旧写入；旧响应不能清掉新身份 |
| 实际结果 | 通过 |
| 对应证据 | [单元日志](evidence/final-3b5681f/unit-results.log)：business failure preserves verified identity；action session failure；pending action cannot clear a newer login |

### REG-05 回复真实目标与状态

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3（原流程兼容）、X1 |
| 验证方式 | 真实浏览器 + 断言单元 |
| 前置条件 | E1/E2；医生有待回复问题 |
| 操作步骤 | 1. 记录点击目标 ID、问题快照和状态数量<br>2. 填写回复并提交<br>3. 检查该 ID 的文本、状态、其他记录和列表计数 |
| 预期结果 | 目标由 pending→answered；待回复减一/已回复加一；其他问题不变 |
| 实际结果 | 通过；刷新只验证会话，不要求模拟问答持久化 |
| 对应证据 | [浏览器日志](evidence/final-3b5681f/browser-results.log)：doctor can reply；[单元日志](evidence/final-3b5681f/unit-results.log)：reply assertion accepts only target change；[实际回复帧](evidence/final-3b5681f/doctor-reply.png) |

### REG-06 成功提示不能代替写入

| 字段 | 内容 |
| --- | --- |
| 关联需求 | X1 |
| 验证方式 | 负向对照 |
| 前置条件 | E1/E2；运行前端及医生 API，独立浏览器上下文模拟 me 身份 |
| 操作步骤 | 1. 仅在浏览器内存将 answerQuestion 替换为空操作<br>2. 输入唯一文本并提交，即使出现成功提示仍检查目标写入<br>3. 另以单元数据模拟写到其他问题/错误文本 |
| 预期结果 | 同一业务断言识别空写入、错误目标和错误文本；结束销毁上下文 |
| 实际结果 | 通过：预期的断言失败被捕获，说明检测有效；不是错误地接受未写入 |
| 对应证据 | [浏览器日志](evidence/final-3b5681f/browser-results.log)：negative control detects missing reply；[单元日志](evidence/final-3b5681f/unit-results.log)：reply assertion catches no write, wrong target and wrong retry text |

### REG-07 录像失败清理

| 字段 | 内容 |
| --- | --- |
| 关联需求 | D1、X1 |
| 验证方式 | 脚本单元故障注入 |
| 前置条件 | E2；注入 SQL、浏览器及文件发布依赖 |
| 操作步骤 | 1. 分别让初读 SQL、步骤、恢复 SQL、context.close、新建 context 失败<br>2. 观察每项清理尝试和发布调用<br>3. 执行正常分支对照 |
| 预期结果 | 已创建资源均尝试清理；恢复失败不跳过 browser.close；失败不发布，正常才发布 |
| 实际结果 | 通过；单元模拟资源不等同于实际录像文件，实际视频另见 DEL-02 |
| 对应证据 | [单元日志](evidence/final-3b5681f/unit-results.log)：record cleanup read/steps/restore/context/newContext/none |

### REG-08 证据采集与版本门槛

| 字段 | 内容 |
| --- | --- |
| 关联需求 | T2、D1、X1 |
| 验证方式 | 真实微型子进程 + 临时 Git 仓库 + 证据夹具 |
| 前置条件 | E2；不污染实际源码 |
| 操作步骤 | 1. 运行退出非零、启动失败、信号终止和正常子进程<br>2. 测试重复目录、运行中源码变更及未提交/暂存/未跟踪文件<br>3. 篡改清单版本、runId、日志摘要或删除日志<br>4. 注入 audit 非零、测试失败/空跑/通过数不一致 |
| 预期结果 | 不能生成或使用成功证据；Git 检查在采集前后及录制入口执行；干净完整证据可通过 |
| 实际结果 | 通过；另一个首轮真实运行因中途源码变更被拒绝，未用于交付 |
| 对应证据 | [单元日志](evidence/final-3b5681f/unit-results.log)：collector、Git guard、reject 系列、recording refuses dirty source；[最终清单](evidence/final-3b5681f/run-manifest.json) |

### OPS-01 干净安装、构建与审计

| 字段 | 内容 |
| --- | --- |
| 关联需求 | X1 |
| 验证方式 | npm/Maven 实际命令 |
| 前置条件 | E1/E2；固定 Vite/插件版本与锁文件 |
| 操作步骤 | 1. 执行 npm ci，检查依赖树<br>2. 执行前后端测试、vue-tsc/build<br>3. 执行完整 npm audit --json |
| 预期结果 | 可重装，无非法依赖；测试与构建成功；全量漏洞数为 0 |
| 实际结果 | 构建、测试、指定依赖树与当次完整 audit 通过，audit 从 3 个受影响包降为 0，保留大包警告。npm ci 仅有前期过程记录，不在最终 11 条命令内，缺少该步骤独立原始日志，不能称为同次采集通过 |
| 对应证据 | [单元日志](evidence/final-3b5681f/unit-results.log)；[依赖树](evidence/final-3b5681f/dependencies.log)；[完整审计](evidence/final-3b5681f/audit-results.json)；[升级前审计](evidence/final-3b5681f/audit-before.json)；[安装过程记录](prompts.md)（非原始安装日志） |

## 6. 文档与交付核查（不计入自动测试数量）

### DEL-01 必需文档完整

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3、T2、D2 |
| 验证方式 | 文件及内容核查 |
| 前置条件 | 代码分支可访问 |
| 操作步骤 | 1. 检查 PRD 模板及登录 PRD<br>2. 对照模板八个章节及 PRD 开发拆分，检查设计、API_TEST 和 TEST_REPORT<br>3. 核对报告关联实际执行证据而非示例结果 |
| 预期结果 | 规定文档齐全，PRD 按模板组织，测试步骤与真实结果可追溯 |
| 实际结果 | 已核查通过 |
| 对应证据 | [模板](PRD_TEMPLATE.md)、[PRD](PRD_LOGIN.md)、[设计](DESIGN.md)、[接口步骤](API_TEST.md)、[报告](TEST_REPORT.md) |

### DEL-02 视频完整且版本一致

| 字段 | 内容 |
| --- | --- |
| 关联需求 | D1 |
| 验证方式 | 真实录制 + 解码/关键帧/附件核验 |
| 前置条件 | 完整验收通过；源码干净；证据版本一致 |
| 操作步骤 | 1. 录制首页双语、MySQL/phpMyAdmin、患者登录、医生回复及结果<br>2. 全量解码、抽查关键帧并核对版本<br>3. 上传版本化 Release，核对 SHA-256 和匿名访问 |
| 预期结果 | 视频展示所做需求；可播放、下载，附件与本地一致；旧视频保留 |
| 实际结果 | 通过：108.6 秒、2715 帧、1440×900、VP8，匿名 HEAD 200；实际索引见 DEMO |
| 对应证据 | [视频与关键帧索引](DEMO.md)；[核验元数据](evidence/final-3b5681f/video-verification.json) |

### DEL-03 AI 提示词过程记录

| 字段 | 内容 |
| --- | --- |
| 关联需求 | R3、T2、D3、P3 |
| 验证方式 | 过程记录核查 |
| 前置条件 | docs/prompts.md 和提交记录可访问 |
| 操作步骤 | 1. 核对代码、测试、文档的 AI Coding 指令与阶段结果<br>2. 核对按模板写 PRD、按 PRD 开发、按 API_TEST 测试并生成报告的过程记录<br>3. 区分旧轮次、失败运行和最终通过运行 |
| 预期结果 | 全过程应通过 AI Coding 提示词完成，允许调整生成产物；保留对应记录，不把尚未执行的工作写成完成 |
| 实际结果 | 现有记录可追踪上述阶段；记录齐备程度和“全部内容均经 AI、历史提示词绝无遗漏”不能仅由仓库及自动化测试独立证明，不标为已完全证实 |
| 对应证据 | [提示词](prompts.md)；[提交历史](https://github.com/geekHypnos/qa-live-healthcare-interview/commits/codex/healthcare-interview/) |

### DEL-04 Fork 分支与现有 PR

| 字段 | 内容 |
| --- | --- |
| 关联需求 | P1 |
| 验证方式 | Git/GitHub 状态核查 |
| 前置条件 | 本人 Fork 与特性分支存在 |
| 操作步骤 | 1. 核对分支 codex/healthcare-interview<br>2. 核对 PR head、base=main、open 且未合并<br>3. 核对视频标签指向已验收代码，后续仅文档变更 |
| 预期结果 | 在本人 Fork 向 main 提 PR，链接可访问，视频不指向无关代码 |
| 实际结果 | 已交付并核查；本次仅文档更新仍沿用 PR #1 |
| 对应证据 | [PR #1](https://github.com/geekHypnos/qa-live-healthcare-interview/pull/1)；[版本化 Release](https://github.com/geekHypnos/qa-live-healthcare-interview/releases/tag/interview-demo-20261021-3b5681f) |

### DEL-05 发送面试方及时间要求

| 字段 | 内容 |
| --- | --- |
| 关联需求 | P2 |
| 验证方式 | 用户外部确认 |
| 前置条件 | 视频和 PR 链接已交付用户 |
| 操作步骤 | 1. 沿原面试沟通渠道发送视频和 PR<br>2. 确认对方收到并结合任务起始时间核对一天期限 |
| 预期结果 | 面试方收到材料；符合其约定的截止时间 |
| 实际结果 | 待用户完成/确认；本地开发与验收日期为 2026-10-21，但不能据此证明已发送或满足面试方计时起点 |
| 对应证据 | [视频与关键帧索引](DEMO.md) 和 PR 提供可发送链接；无面试方收件证据 |

## 7. 接口全覆盖追踪

| 接口 | 对应用例 | curl 证据及其他验证边界 |
| --- | --- | --- |
| GET /api/doctors | DB-02、DB-04 | 01 doctors；数据库另验证修改后的响应 |
| GET /api/auth/csrf | AUTH-01、AUTH-08 | 05 等多次 csrf；断言 token 与 headerName |
| POST /api/auth/login | AUTH-01～03、05、07～08 | curl：错误/正确登录、参数边界、忽略伪造角色、切换、CSRF；AUTH-07 的错误入口拒绝是浏览器行为，不是通用 login API 拒绝角色 |
| GET /api/auth/me | AUTH-01、04～06、09～10 | 匿名 401、登录身份、失败切换/退出后 401；生命周期另测 |
| POST /api/auth/logout | AUTH-06、08 | 缺失/错误 CSRF、患者/医生退出及旧身份失效 |

详细 HTTP 请求、字段及 Cookie 断言以 [api-test.sh](../scripts/api-test.sh) 和 [API_TEST.md](API_TEST.md) 为准。所有上述接口已覆盖；客户端语言切换无需额外服务端接口。

## 8. 覆盖边界与重测规则

原题功能、文档、分支和交付要求均已列入追踪；功能需求有对应实现核查和测试，交付文件与视频另有核查。但流程全部通过 AI 的独立证明、历史提示词绝对完整性及面试方收件/期限仍有确认边界，不应概括为“原仓库全部要求已验证通过”。这里的“需求覆盖”不等于全部代码行/分支 100% 覆盖，也不等于全浏览器兼容、负载或生产安全认证。

问答维持原前端模拟数据，刷新持久化不是本题新增要求。自然超时使用独立 1 分钟配置；标准配置仍为 30 分钟。外部头像需要网络，构建大包提示保留。phpMyAdmin 通过真实录制检查，不计入单元测试数量。

应用、依赖、配置或测试/录制脚本改变后，应重新冻结代码并完整采集；仅补充本用例文档和导航链接不使现有业务测试结果成为“新执行”。正式运行的清单及日志保持原样，不为配合文档修改时间、数量或摘要。

## 9. 本轮文档复核（2026-10-21）

对照上游 README、实际脚本断言与冻结日志，修正了以下表述；没有重跑应用测试或改动证据：

- 增补 P3，明确 AI Coding 过程要求及其可证明范围；DEL-01 明确模板章节与开发拆分核对。
- 区分 curl 的伪造角色校验和浏览器入口角色拒绝；补齐已有用户名规范化、公开资料无密码断言。
- 将错误凭据结论收窄到已断言的状态码/错误码；可见性明确为合成 DOM 事件，刷新仅断言英文标题。
- DB-05 不再把数据库测试恢复断言称为录像后的 SQL 核查；DB-07 仅声称已断言的加载中禁用，不扩大为失败态按钮断言。
- OPS-01 明确 npm ci 无同次独立日志；最终审计归零是该次采集结果，不是对未来漏洞状态的保证。
- 明确回归组使用模拟身份，不等同于真实登录；补列已有超时包装器清理单元覆盖。

38 项场景的必填字段、相对链接及最终清单 11 条命令的日志 SHA-256 已复核。源码/测试脚本仍与验收提交一致；新增文档不改变原运行的时间、通过数和摘要。上述“过程证据不足”项保留为限制，不虚填通过，也不通过新增框架或无关用例扩大范围。
