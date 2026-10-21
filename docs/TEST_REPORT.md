# 测试报告

状态：环境检查进行中，业务功能尚未验收。以下只记录已执行项目，不将计划中的用例记为通过。

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

## 功能和交付状态

接口测试、浏览器验收、数据库验收、完整构建、正式视频、远程分支与 PR 尚未完成。后续依据 `API_TEST.md` 执行并补充真实结果。
