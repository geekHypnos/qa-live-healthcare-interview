# 演示说明

先按根目录 README 启动数据库、用户服务和前端。患者使用 patient001 或 patient002，演示密码为 Patient123!；医生使用 dr-zhang-wei，演示密码为 123456。

## 演示内容

依次展示首页中文、英文正文与医生介绍、页脚、刷新保留语言；医生页面与 phpMyAdmin 中的真实记录；数据库资料变更生效并恢复；错误密码及正确患者登录；提问、刷新、退出及切换患者；医生登录、回复与退出；实际验收输出。

视频通过 `scripts/record-demo.cjs` 在真实运行界面录制，底部字幕仅解释步骤，不替换界面或业务结果。视频作为附件交付，不进入 Git 源码历史。录制过程的索引由脚本输出 `artifacts/demo-timeline.json`，完成后在这里补入实际链接与时间。

## 重录

需要先实际执行 API、浏览器和数据库验收并保存脱敏日志。设置 EVIDENCE_DIR 指向日志目录，执行：

```bash
EVIDENCE_DIR=/path/to/actual/test-logs node scripts/record-demo.cjs
```

日志文件名为 curl-results.log、browser-results.log、database-results.log 和 timeout-results.log。脚本检查其中确有完整接口与浏览器成功结果；不能用示例通过记录替代实际测试。

输出为 `artifacts/interview-demo.webm`。本机如使用已有兼容 Chromium，可通过 BROWSER_EXECUTABLE 指定路径。SQL 临时修改在 finally 中恢复。演示提问与回复仍是原项目前端模拟数据，刷新恢复的是服务端登录身份，不宣称新增问题被数据库持久化。
