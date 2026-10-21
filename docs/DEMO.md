# 演示说明

先按根目录 README 启动数据库、用户服务和前端。患者使用 patient001 或 patient002，演示密码为 Patient123!；医生使用 dr-zhang-wei，演示密码为 123456。

## 演示内容

依次展示首页中文、英文正文与医生介绍、页脚、刷新保留语言；医生页面与 phpMyAdmin 中的真实记录；数据库资料变更生效并恢复；错误密码及正确患者登录；提问、刷新、退出及切换患者；医生登录、回复与退出；实际验收输出。

视频通过 `scripts/record-demo.cjs` 在真实运行界面录制，底部字幕仅解释步骤，不替换界面或业务结果。视频作为附件交付，不进入 Git 源码历史。录制过程的原始索引见 `artifacts/demo-timeline.json`。

## 已交付视频

- [Release 附件页](https://github.com/geekHypnos/qa-live-healthcare-interview/releases/tag/interview-demo-20261021)
- [下载 interview-demo.webm](https://github.com/geekHypnos/qa-live-healthcare-interview/releases/download/interview-demo-20261021/interview-demo.webm)
- 时长 1 分 53 秒，1440×900，25 fps，约 9.6 MiB。完整解码通过，并抽查代表画面。
- SHA-256：`6271fdac43b17ca9116f7bd56157f96127e3b12974b6e40c4bc4d7e1d50df095`，与 GitHub 附件显示一致。

下表是方便观看的近似时间，不是逐帧定位：

| 时间 | 内容 |
| --- | --- |
| 00:00–00:30 | 首页中文、英文正文与页脚、刷新保留语言 |
| 00:30–00:52 | 医生列表、phpMyAdmin、修改数据库资料并恢复 |
| 00:52–01:21 | 患者错误和正确登录、提问、刷新、退出与切换账号 |
| 01:21–01:34 | 医生登录、回复、退出 |
| 01:34–01:53 | 实际接口、浏览器、数据库与超时测试结果 |

Release 标签指向录制时的已验收提交 `47a27f8`；其后的提交仅补充交付链接与记录。

## 重录

需要先实际执行 API、浏览器和数据库验收并保存脱敏日志。设置 EVIDENCE_DIR 指向日志目录，执行：

```bash
EVIDENCE_DIR=/path/to/actual/test-logs node scripts/record-demo.cjs
```

日志文件名为 curl-results.log、browser-results.log、database-results.log 和 timeout-results.log。脚本检查其中确有完整接口与浏览器成功结果；不能用示例通过记录替代实际测试。

输出为 `artifacts/interview-demo.webm`。本机如使用已有兼容 Chromium，可通过 BROWSER_EXECUTABLE 指定路径。SQL 临时修改在 finally 中恢复。演示提问与回复仍是原项目前端模拟数据，刷新恢复的是服务端登录身份，不宣称新增问题被数据库持久化。
