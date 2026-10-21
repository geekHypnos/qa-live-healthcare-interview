# 接口测试流程

## 准备环境

按 README 启动 MySQL、用户服务和前端。后端默认 `http://127.0.0.1:18080`，数据库使用真实 MySQL。演示患者为 `patient001 / Patient123!`，医生为 `dr-zhang-wei / 123456`。这些都是项目自带的演示账号。

自动脚本需要 Bash、curl 和 Node，不需要额外 Python 包。先执行：

```bash
bash scripts/api-test.sh
# 改端口时：API_BASE_URL=http://127.0.0.1:18080 bash scripts/api-test.sh
```

脚本为每次运行创建临时 Cookie jar，结束后删除；每个步骤检查状态码，关键响应另检查字段。任一断言失败即非零退出，不只打印响应后当作通过。

## 手工理解 Cookie 和 CSRF

```bash
BASE=http://127.0.0.1:18080
JAR=$(mktemp)
CSRF=$(curl -fsS -c "$JAR" -b "$JAR" "$BASE/api/auth/csrf")
TOKEN=$(printf '%s' "$CSRF" | node -e 'let s="";for await(const c of process.stdin)s+=c;console.log(JSON.parse(s).token)' --input-type=module)
curl -i -c "$JAR" -b "$JAR" -H 'Content-Type: application/json' \
  -H "X-CSRF-TOKEN: $TOKEN" -d '{"username":"patient001","password":"Patient123!"}' "$BASE/api/auth/login"
curl -i -c "$JAR" -b "$JAR" "$BASE/api/auth/me"
# 登录后旧 CSRF token 已失效；退出前重新获取，不能直接复用上面的 TOKEN。
CSRF=$(curl -fsS -c "$JAR" -b "$JAR" "$BASE/api/auth/csrf")
TOKEN=$(printf '%s' "$CSRF" | node -e 'let s="";for await(const c of process.stdin)s+=c;console.log(JSON.parse(s).token)' --input-type=module)
curl -i -c "$JAR" -b "$JAR" -X POST -H "X-CSRF-TOKEN: $TOKEN" "$BASE/api/auth/logout"
curl -i -b "$JAR" "$BASE/api/auth/me"
rm "$JAR"
```

## 接口用例

| 接口 | 必查结果 |
| --- | --- |
| GET doctors | 列表完整、专长为数组、ID 稳定、没有密码和哈希 |
| GET csrf | 非空 token，headerName 为 X-CSRF-TOKEN |
| POST login | 正确患者和医生、错误密码、未知账号、空值、超长值、类型错误、非法 JSON、CSRF 缺失及错误 |
| GET me | 未登录 401；登录后身份正确；更换账号反映新身份；退出后 401 |
| POST logout | 正常注销 200；缺失或错误 CSRF 403；注销后的会话不可用 |

额外检查：登录成功更新真实 HTTP 会话 ID，Cookie 包含 HttpOnly 与 SameSite=Lax；用户名首尾空白规范化；空请求体、null 字段及密码字符长度边界；失败的账号切换后旧会话失效。登录后旧 CSRF token 不再可用于退出；请求中伪造 role 不会提升患者角色；不同患者使用不同资料 ID；登录成功不返回密码。非法 JSON 和输入测试需先取得有效 CSRF，否则只证明 CSRF 拦截，不能证明参数校验。

## 浏览器和数据库辅助验收

浏览器按 DESIGN 第 8 节验证：首页完整中英文、刷新记忆、其他页面保持中文、直接医生链接、患者登录和退出、医生诊室、会话在另一标签页失效后阻止模拟操作、网络失败不修改数据，以及加载失败重试和窄屏。证据单独记为浏览器验收，不写进 curl 通过数量。

数据库用 `docker compose exec -T mysql` 执行 SQL。记录初始化前后数量、幂等导入、医生资料变更与 API/页面对照，以及不删除卷的数据库重启。演示修改后必须恢复原值。SQL 输出和容器状态属于数据库验收。

服务重启验收可运行 `node scripts/session-restart-test.cjs`，先完成 JAR 打包并配置 Java 17 和数据库环境变量。脚本默认使用独立端口 18084（可设 RESTART_TEST_PORT），只启动和停止自己的进程；验证旧 Cookie 失效及数据库重连，不中断主演示实例。

## 按本文执行并生成报告

交给 AI 的执行任务应明确：依据本流程启动真实环境、运行脚本，保留脱敏命令与输出，再执行浏览器和数据库验收，把实际版本、时间、通过/失败、限制和证据写入 TEST_REPORT。测试失败先复现和修复后重跑，不删除断言、不跳过失败项，也不把环境失败或未执行记为通过。凭据、会话 Cookie 和 CSRF token 不进入公开报告。
