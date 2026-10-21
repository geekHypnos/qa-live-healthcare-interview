# 面试要求

Fork当前项目到你自己的github账号，并在自己的账号下完成以下操作

## 技术要求

### 分支要求

创建特性分支，自己命名这个分支，在分支内完成以下编码/测试/文档编写过程。并在完成后将分支推送到你自己代码库。

### 需求列表

1. 给web端的首页添加中英文切换能力，在页面右上角添加语言切换下拉菜单，在用户选择 **中文/English** 选项时动态切换页面显示内容到对应语言。中英文语言资源文件需要保存在 `web/qa-web/src/locales` 目录中。只需要处理首页本身，无需处理其他页面。
2. 当前应用的数据全部使用json文件的方式在前端项目中存储，请将医生相关的数据使用mysql数据库存储。具体要求如下：
    - 创建 docker-compose.yml 用于创建mysql数据库，并挂接phpmyadmin作为数据库服务器管理界面
    - 在 qa-service-user 服务中创建可以支持前端 [医生页面](web/qa-web/src/views/Doctors.vue) 显示医生列表所需要的api
    - 完成前后端联调
3. 为问诊用户提供用户名密码登录方式
    - 在 /docs 目录中编写规范的PRD文档模版
    - 指导 AI使用以上模版编写此特性的PRD文档
    - 指导 AI使用此PRD文档完成特性开发，如果需要进行拆分请在PRD文档中提供拆分步骤

### 测试要求

1. 使用 curl 构建对于以上需求中所涉及的所有接口的测试
2. 提供 /docs/API_TEST.md 用于描述以上接口测试流程，并指导AI使用这份文档完成测试并生成测试报告

### 交付物要求

1. 根据需求列表完成的代码，并录制视频，视频中需要完整展示所完成的需求
2. /docs 目录中的 PRD模版，PRD文档，设计文档（如果需要），API_TEST.md以及测试报告文档
3. /docs/prompts.md 中列出在这个过程中你所使用的所有提示词

## 面试流程要求

针对以上 **技术要求** 部分完成对应的代码编写，测试编写和文档编写；以上所有内容需要全部使用AI Coding提示词的方式完成，不得直接编码（可以对AI生成的代码/文档进行手工调整）。完成以上编码后，基于你的分支创建指向main分支的PR，并发送PR链接。

完成以上代码编写过程后，请联系我并发送 视频 和 PR链接。

面试时间要求：面试者需要在1天内完成以上面试流程。

## 本分支的实现和运行

沿用原项目的 Vue 3、TypeScript 和 Spring Boot Java 17。首页右上角支持中文和 English；医生资料、患者及医生账号存入 MySQL；问诊用户改为用户名密码登录，医生登录同步保留。密码不进入公开医生响应，旧姓名生日自动开户和浏览器密码比对已移除。

### 准备和启动

需要 Docker Compose、Java 17、Maven 3.9+ 和支持原生 TypeScript 测试的 Node 22.18+ 或 Node 24+。本轮实际使用 Java 17、Node 26，具体版本和结果见 [测试报告](docs/TEST_REPORT.md)。

在项目根目录执行：

```bash
cp .env.example .env
docker compose up -d --wait
# macOS 明确选择 Java 17，Linux 请使用已配置的 Java 17 JAVA_HOME。
export JAVA_HOME=$(/usr/libexec/java_home -v17)
set -a; . ./.env; set +a
export DB_USER="$MYSQL_USER" DB_PASSWORD="$MYSQL_PASSWORD"
export DB_URL="jdbc:mysql://127.0.0.1:${MYSQL_PORT}/$MYSQL_DATABASE?useUnicode=true&characterEncoding=UTF-8&connectionTimeZone=UTC"
mvn -f server/qa-service-user/pom.xml package
java -jar server/qa-service-user/target/qa-service-user-0.0.1-SNAPSHOT.jar
```

另开终端在项目根目录启动前端：

```bash
npm ci --prefix web/qa-web
npm run dev --prefix web/qa-web
```

访问地址：

- 前端：[http://127.0.0.1:15173](http://127.0.0.1:15173)
- 用户服务：[http://127.0.0.1:18080/api/doctors](http://127.0.0.1:18080/api/doctors)
- phpMyAdmin：[http://127.0.0.1:18081](http://127.0.0.1:18081)，使用 `.env` 的 MYSQL_USER 与 MYSQL_PASSWORD 登录。
- MySQL 本机端口默认 13306。端口冲突时调整 `.env` 和对应连接配置，不需要替换其他项目服务。

### 演示账号

| 身份 | 用户名 | 演示密码 |
| --- | --- | --- |
| 患者 赵明 | patient001 | Patient123! |
| 患者 孙丽 | patient002 | Patient123! |
| 医生 张伟 | dr-zhang-wei | 123456 |

这些只用于本机演示，不是可用于公开部署的凭据。一个浏览器会话只有一个当前身份；同时查看患者与医生请使用两个独立浏览器上下文。

### 验证

```bash
mvn -f server/qa-service-user/pom.xml test
npm test --prefix web/qa-web
npm run build --prefix web/qa-web
bash scripts/api-test.sh
# 浏览器测试依赖首次安装浏览器；磁盘不足且已有兼容 Chromium 时可设置 BROWSER_EXECUTABLE。
(cd web/qa-web && npx playwright install chromium)
node scripts/browser-test.cjs
node scripts/database-test.cjs
node scripts/session-restart-test.cjs
```

数据库验收只修改演示医生经验字段，结束时恢复，并重启本项目 MySQL 容器，不删除数据卷。自然超时测试需另启 `SERVER_PORT=18082 SESSION_TIMEOUT=1m` 的服务，再运行 `bash scripts/session-timeout-test.sh`；正常实例仍为 30 分钟空闲过期。

已有数据库卷不会自动重新导入 seed。如需补充本项目演示数据：

```bash
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" "$MYSQL_DATABASE"' < database/init.sql
```

初始化脚本可重复执行且不覆盖已有修改。停止环境用 `docker compose stop`；不要为了常规重启执行 `down -v`。

### 文档和演示

- [PRD 模板](docs/PRD_TEMPLATE.md) 与 [登录 PRD](docs/PRD_LOGIN.md)
- [设计说明](docs/DESIGN.md) 与 [实施计划](docs/IMPLEMENTATION_PLAN.md)
- [API 测试步骤](docs/API_TEST.md) 与 [实际测试报告](docs/TEST_REPORT.md)
- [提示词记录](docs/prompts.md) 与 [演示说明](docs/DEMO.md)

问题列表、提问和回复仍为原项目的前端演示数据，新增内容刷新后不保证保留，不能作为真实医疗记录系统使用。此次持久化范围是医生资料及账号身份。会话在后端重启后失效，需要重新登录。

本次仅修补原依赖范围内可兼容的更新；原 Vite 5 开发构建链仍有审计项，详见测试报告。开发服务只绑定本机，不作为公开生产服务交付。
