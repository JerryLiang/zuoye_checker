# homeworks 云函数 AI 配置

该云函数支持三类图片识别调用方式：

1. 腾讯云 OCR `GeneralHandwritingOCR`
2. OpenAI-compatible Chat Completions
3. 阿里百炼 Coding Plan / Anthropic-compatible Messages

默认代码仍保留 DeepSeek 文本模型兜底，但 DeepSeek 官方 `https://api.deepseek.com` 当前不适合直接做图片识别：`image_url` 会报 `deserialize JSON body`，`text_base64` 会把图片 base64 当普通文本处理并产生 60 万+ `prompt_tokens`。

## 方案 A：腾讯云 OCR GeneralHandwritingOCR（推荐先试）

用于中文手写作业识别，不走大模型视觉接口，直接调用腾讯云 OCR：

```text
HOMEWORK_AI_PROVIDER=tencent_ocr
TENCENT_SECRET_ID=你的腾讯云 SecretId
TENCENT_SECRET_KEY=你的腾讯云 SecretKey
TENCENT_OCR_REGION=ap-guangzhou
```

可选：只输出手写体、过滤印刷体：

```text
TENCENT_OCR_SCENE=only_hw
```

接口信息：

```text
Action=GeneralHandwritingOCR
Version=2018-11-19
Endpoint=https://ocr.tencentcloudapi.com
```

代码会把 OCR 返回的 `TextDetections[].DetectedText` 按行合并成 `raw_text`，并生成 `recognized_items`，前端返回结构保持不变。

注意：腾讯云密钥只配置到云函数环境变量，不要写进代码或提交到 GitHub。

## 方案 B：阿里百炼 Coding Plan

用于避开 `/chat/completions`，改走 Anthropic-compatible Messages：

```text
HOMEWORK_AI_PROVIDER=code_plan
HOMEWORK_AI_BASE_URL=https://coding.dashscope.aliyuncs.com/apps/anthropic
HOMEWORK_AI_MODEL=qwen3-vl-flash
HOMEWORK_AI_API_KEY=你的 Coding Plan API Key
```

如果你仍填旧的 OpenAI Coding Plan base URL：

```text
HOMEWORK_AI_BASE_URL=https://coding.dashscope.aliyuncs.com/v1
```

代码会在 `HOMEWORK_AI_PROVIDER=code_plan` 时自动改打：

```text
https://coding.dashscope.aliyuncs.com/apps/anthropic/v1/messages
```

如果使用国际站 Coding Plan，可把 base URL 改成：

```text
HOMEWORK_AI_BASE_URL=https://coding-intl.dashscope.aliyuncs.com/apps/anthropic
```

也兼容环境变量名：

```text
BAILIAN_CODING_PLAN_API_KEY=你的 Coding Plan API Key
```

推荐先试视觉模型：

```text
qwen3-vl-flash
qwen3-vl-plus
qwen-vl-plus
qwen-vl-max
```

不建议优先用 `qwen3.6-plus` 做作业图片 OCR；如果要识图，应优先用 VL 模型。

## 方案 C：OpenAI-compatible 视觉接口

适用于普通 DashScope / OpenAI-compatible 视觉接口：

```text
HOMEWORK_AI_PROVIDER=openai_chat
HOMEWORK_AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
HOMEWORK_AI_MODEL=qwen3-vl-flash
HOMEWORK_AI_IMAGE_FORMAT=openai_image_url
HOMEWORK_AI_API_KEY=你的 API Key
```

代码会请求：

```text
/chat/completions
```

图片会按 OpenAI `image_url` content part 发送。

## 微信云开发配置

在微信开发者工具中：

1. 云开发
2. 云函数
3. 选择 `homeworks`
4. 配置环境变量
5. 重新上传并部署 `homeworks` 云函数

不要把 API Key 写进代码或提交到 GitHub。
