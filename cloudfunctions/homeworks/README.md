# homeworks 云函数 AI 配置

该云函数使用 OpenAI-compatible Chat Completions 接口做作业图片识别。

默认配置：

- `HOMEWORK_AI_BASE_URL`: `https://coding.dashscope.aliyuncs.com/v1`
- `HOMEWORK_AI_MODEL`: `qwen3.6-plus`
- `HOMEWORK_AI_API_KEY`: 从云函数环境变量读取

也兼容使用 `DASHSCOPE_API_KEY` 作为 API Key 环境变量名。

## 微信云开发配置

在微信开发者工具中：

1. 云开发
2. 云函数
3. 选择 `homeworks`
4. 配置环境变量：
   - `HOMEWORK_AI_API_KEY`: 阿里 DashScope API Key
   - `HOMEWORK_AI_BASE_URL`: `https://coding.dashscope.aliyuncs.com/v1`
   - `HOMEWORK_AI_MODEL`: `qwen3.6-plus`
5. 重新上传并部署 `homeworks` 云函数

不要把 API Key 写进代码或提交到 GitHub。
