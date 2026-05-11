# homeworks 云函数 AI 配置

该云函数使用 OpenAI-compatible Chat Completions 接口做作业图片识别。

默认配置：

- `HOMEWORK_AI_BASE_URL`: `https://coding.dashscope.aliyuncs.com/v1`
- `HOMEWORK_AI_MODEL`: `qwen3.6-plus`
- `HOMEWORK_AI_API_KEY`: 从云函数环境变量读取

也兼容使用 `DASHSCOPE_API_KEY` 作为 API Key 环境变量名。

图片识别要求模型接口真正支持视觉输入。官方 `https://api.deepseek.com` 的 `deepseek-v4-flash` 在当前测试中会把图片 base64 当普通文本处理（可见 60 万+ `prompt_tokens`），不是可靠 OCR/视觉输入；因此不要默认用 `text_base64` 方式烧 token。若要测试某个 OpenAI-compatible 视觉接口，可设置：

- `HOMEWORK_AI_IMAGE_FORMAT=openai_image_url`

如果接口只支持文本模型，应接入专门 OCR 服务后再把 OCR 文本交给大模型结构化。

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
