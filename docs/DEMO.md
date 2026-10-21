# 演示说明

## 最新交付

- [下载新版视频](https://github.com/geekHypnos/qa-live-healthcare-interview/releases/download/interview-demo-20261021-3b5681f/interview-demo-3b5681f.webm) / [Release 附件页](https://github.com/geekHypnos/qa-live-healthcare-interview/releases/tag/interview-demo-20261021-3b5681f)。
- 对应代码：`3b5681f042fda8f31ae52c246278fc3608b811c9`；验收 runId：`20261021-final-3b5681f`。Release 标签指向该代码提交，不是 main；其后只更新交付文档和证据。
- 时长 108.60 秒，1440×900，25 fps，VP8，9.10 MiB。
- SHA-256：`7631c5aed81de199033c263924ca9020fbe623c287d8f31292d359f6974797d4`，已与 GitHub 附件摘要核对，匿名 HEAD 返回 200。
- 本地原始文件：`artifacts/demo-3b5681f/interview-demo.webm`；[核验元数据](evidence/final-3b5681f/video-verification.json)。全量解码通过，抽查首页双语、数据库、登录、回复、审计和文档关键帧。

录像使用真实浏览器操作。字幕只解释步骤，不修改业务结果；异常回归展示 20261021-final-3b5681f 的真实测试证据，没有伪造后端故障。问答仍为前端模拟数据，视频明确说明刷新限制。时长按实际内容和可读性记录，没有为凑时长加无关页面。

视频与后续报告的关系：本片不展示随后新增的 npm ci 独立验收（c4c5e54），也不展示后续测试用例文档修订；这些是相同业务代码的补充交付。当前代码与录像代码的差异核对及线上链接检查见 [最终交付审核](TEST_REPORT.md)。

### 视频关键帧索引

下列为逐帧抽查确认的定位点，不是每一步的起止边界。原脚本 demo-timeline.json 记录的是操作墙钟时间，与编码视频存在偏差，不直接当作视频播放时间。

| 时间 | 内容 |
| --- | --- |
| 00:02 | 首页中文与右上角语言选择 |
| 00:16 | English 首页 |
| 00:25 | 英文医生与统计 |
| 00:37 | phpMyAdmin 连接 MySQL |
| 00:40 | doctors 表实际记录 |
| 00:43 | 数据库修改映射医生页面 |
| 00:56 | 患者正确登录 |
| 01:05 | 患者提交问题成功 |
| 01:19 | 切换患者账号 |
| 01:24 | 医生登录 |
| 01:28 | 实际回复文本及待回答/已回答数量变化 |
| 01:35 | 绑定代码与运行标识的测试结果 |
| 01:40 | 完整审计 0 及生命周期结果 |
| 01:43 | PRD 模板等交付文档入口 |
| 01:47 | 提示词记录入口 |

## 重录

按 README 配置数据库并启动独立 JAR 副本和 Vite。使用 Java 17，保持代码工作区干净，执行 API_TEST 中的完整采集命令，再以相同 RUN_ID 和 EVIDENCE_DIR 运行 scripts/record-demo.cjs。录制前核对代码、锁文件、清单、全部命令退出码及日志摘要；失败日志不能用来生成“全部通过”画面。旧视频保留，新录像分目录输出。

## 历史视频

[首轮视频](https://github.com/geekHypnos/qa-live-healthcare-interview/releases/download/interview-demo-20261021/interview-demo.webm) 对应 `47a27f8`，1 分 53 秒。仅供历史对照，旧测试数字不是本轮结果，未删除或覆盖旧附件。

## 代码与报告

[PR #1](https://github.com/geekHypnos/qa-live-healthcare-interview/pull/1)：codex/healthcare-interview → 本人 Fork main，保持打开、不合并。完整结果见 [TEST_REPORT](TEST_REPORT.md)，提示词见 [prompts](prompts.md)。
