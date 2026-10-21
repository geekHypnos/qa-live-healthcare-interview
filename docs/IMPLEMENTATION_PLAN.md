# 医疗问诊项目实施计划

执行方式：在当前会话逐项实施。依据 `docs/DESIGN.md`，用户已明确要求生成计划后直接执行，无需再等待一次计划确认。

目标：完成首页语言切换、MySQL 医生数据和患者密码登录，交付真实测试报告、视频和 Fork 内指向 main 的 PR。

技术栈：Vue 3、TypeScript、Ant Design Vue、Spring Boot 3.5.7、Java 17、Spring JDBC、Spring Security、MySQL。单实例 Cookie 会话，不引入 Redis、JWT 或新服务。

## 全局约束

- 保留医生和患者 ID，保留原路由及前端模拟问诊边界。
- 原始和追加提示词记入 `docs/prompts.md`，结果不冒充提示词；失败检查如实记录。
- 每个业务增量先编写并运行失败测试，再实现、复测和提交。
- 公开资料不带密码，旧姓名生日入口停用；模拟写操作必须先检查服务端身份。
- 接口、浏览器和数据库验证分开记录。未执行不标记为通过。
- 视频作为附件，不进入 Git；不推送个人配置、Cookie、缓存或数据库卷。

## 重点检查

1. 直接进入医生链接时等待异步资料，不误判医生不存在。
2. 账号在其他标签页切换或退出后，旧页面的下一次操作被阻止。
3. 登录和退出会使旧 CSRF token 失效，客户端重新获取。
4. MySQL 不可用时显示失败，不回退到前端医生 JSON。
5. 英文长文案、窄屏导航、空列表和网络重试不破坏页面。

## 任务 1 环境检查

- [x] 验证 Docker daemon、Compose、Java 17、Maven、Node 和 npm。
- [x] 验证 GitHub 账号和 Fork/推送授权路径，保留上游 remote。
- [x] 使用 Playwright 录制并回读一段真实浏览器短视频，检查可播放。
- [x] 记录权限或工具阻塞，先解决环境，再进入依赖它的开发；不受影响的文档工作可继续。

证据写入 `docs/TEST_REPORT.md` 的环境检查部分，不宣称功能已通过。

## 任务 2 先完成登录需求

- [x] 创建 `docs/PRD_TEMPLATE.md`，包含背景、范围、流程、异常、验收和拆分步骤；提交。
- [x] 根据该模板生成 `docs/PRD_LOGIN.md`，明确患者演示账号、旧入口替换、医生兼容、30 分钟会话和前端问题边界；提交。
- [x] 在 `docs/prompts.md` 记录实际任务指令及上述产物。

## 任务 3 数据库和公开医生接口

文件：根目录 `docker-compose.yml`、`.env.example`、`.gitignore`、`database/init.sql`；用户服务 `pom.xml`、`application.properties`、`doctor/DoctorController.java`、`doctor/DoctorRepository.java`、`doctor/DoctorDto.java`。

- [x] 写 `InterviewApiTest`：字段与原前端一致、specialties 为数组、不含密码；运行并确认失败。
- [x] 建 doctors、patients、accounts 表，初始化原有 ID 与医生资料、患者资料和 BCrypt 演示账号。
- [x] 实现 `GET /api/doctors`，使用参数化 JDBC 查询；处理数据库异常，不泄露堆栈。
- [x] 启动 MySQL 与 phpMyAdmin，执行重复初始化及查询验证；运行测试并提交。

接口输出为 `DoctorDto[]`，字段为原 Doctor 去掉 password 后的资料；后续前端统一消费。

## 任务 4 服务端会话登录

文件：用户服务 `auth/AuthController.java`、`auth/AccountService.java`、`auth/SessionIdentity.java`、`config/SecurityConfig.java`、错误处理及 `InterviewApiTest`。

- [x] 测试未登录 me=401、缺 CSRF=403、参数错误=400、错误凭据=401、正确登录及退出后失效；确认失败。
- [x] 实现 CSRF、login、me、logout 四个接口；账号角色由数据库决定，不接受客户端授予角色。
- [x] 配置 30 分钟会话、HttpOnly、SameSite、会话 ID 更新、必要健康端点；移除任意来源凭据 CORS。
- [x] 检查患者与医生账号、会话切换、错误响应无凭据；完整测试后提交。

身份响应：`{ role: 'PATIENT' | 'DOCTOR', accountId: string, profile: Patient | Doctor }`。CSRF 响应包含 token 与 headerName。

## 任务 5 前端数据与认证接入

文件：`web/qa-web/src/api/client.ts`、`api/auth.ts`、`store/index.ts`、`App.vue`、`views/Doctors.vue`、`views/Consultation.vue`、`views/DoctorLogin.vue`、`views/DoctorRoom.vue`、`vite.config.ts` 及前端测试。

- [x] 写失败测试：医生请求错误可重试；checkSession 返回401、其他账号或网络错误时不执行模拟写操作。
- [x] API 使用 `/api` 和同源 Cookie；Vite 代理到用户服务。公共 store 提供医生加载、会话恢复、登录和退出。
- [x] 删除浏览器医生密码比对和姓名生日自动开户，调整登录表单和角色检查；保持既有问题 ID 关联。
- [x] 路由进入、页面恢复、提交问题/回复/标记前调用 me；身份失败时阻止操作并清理失效状态。
- [x] 类型检查、构建、前端测试和实际浏览器回归后提交。

## 任务 6 首页语言

文件：`src/locales/zh-CN.ts`、`en-US.ts`、`index.ts`、首页及公共页头页脚。

- [x] 写失败测试：中英文资源键一致、默认中文、切换与异常存储处理。
- [x] 首页右上角下拉选择中文/English，翻译首页可见内容和演示医生介绍；其他路由保持中文。
- [x] 保存选择，刷新恢复；检查英文布局与窄屏。构建与测试后提交。

## 任务 7 验收与报告

文件：`docs/API_TEST.md`、`scripts/api-test.sh`、浏览器测试脚本、`docs/TEST_REPORT.md`。

- [x] 先编写 API_TEST，列明 Cookie/CSRF、全部五个接口、请求步骤与断言。
- [x] 依据文档用 curl 执行真实 MySQL 接口测试，错误返回非零；保存脱敏结果。
- [x] 浏览器执行首页翻译、加载错误/重试、患者与医生登录、身份过期和模拟操作回归。
- [x] 数据库执行初始化幂等、资料变更与页面对照、保留卷重启；恢复演示数据。
- [x] 完整运行 Maven 测试、前端测试和生产构建；报告记录日期、版本、命令、通过/失败和限制。检查完整 diff 后提交。

## 任务 8 视频和 PR

- [x] 创建精简的 `docs/DEMO.md` 和 README 运行说明。
- [x] 录制实际界面：语言切换、MySQL/医生资料对应、错误及正确患者登录、问诊、刷新/退出、医生登录、测试结果。
- [ ] 检查视频可播放，上传附件，填入实际时间索引和可访问链接。
- [ ] 更新提示词与报告，检查无个人秘密和未追踪的必要文件，推送 Fork 特性分支。
- [ ] 创建 Fork 内特性分支到 main 的 PR，保持打开，核实 base/head 与附件访问。
- [ ] 交付测试报告、视频本地文件/附件链接和 PR 链接；未完成项单列，不作完成承诺。
