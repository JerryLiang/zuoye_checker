# 作业小卫士

微信小程序 —— 智能作业管理与批改助手。家长布置作业，孩子拍照/文字提交，家长审核通过后获得积分奖励。

## 功能概览

- **角色切换**：家长/孩子双角色
- **作业管理**：文字输入或拍照 OCR 识别创建作业
- **AI 图片识别**：支持通义千问 VL、腾讯 OCR、Anthropic 等多种 AI 服务
- **任务打卡**：孩子提交作业，家长审核通过/驳回
- **积分奖励**：完成任务自动获得积分，追踪连续完成天数
- **周报统计**：按周查看任务完成率、平均分、积分汇总

## 技术栈

| 层级    | 技术                                 |
| ------- | ------------------------------------ |
| 前端    | 微信小程序 (TypeScript + WXML/WXSS)  |
| 后端    | 微信云函数 (Node.js + wx-server-sdk) |
| 数据库  | 微信云开发数据库 (NoSQL)             |
| 存储    | 微信云存储                           |
| AI 服务 | 通义千问 VL / 腾讯 OCR / Anthropic   |

## 项目结构

```
├── miniprogram/           # 小程序前端
│   ├── api/               # API 调用层
│   ├── pages/             # 页面 (14个)
│   ├── components/        # 组件
│   ├── utils/             # 工具函数
│   └── app.ts             # 入口文件
├── cloudfunctions/        # 云函数
│   ├── auth-login/        # 登录与家长认证
│   ├── children/          # 学生管理
│   ├── homeworks/         # 作业管理 + AI 识别
│   ├── tasks/             # 任务生命周期
│   ├── rewards/           # 积分奖励
│   ├── reports/           # 周报统计
│   └── file-assets/       # 文件管理
├── backend/               # (未使用) Laravel 脚手架
└── project.config.json    # 小程序项目配置
```

## 快速开始

### 前置条件

- Node.js >= 18
- 微信开发者工具
- 微信云开发环境

### 安装依赖

```bash
# 安装根目录工具链 (ESLint, Prettier, Jest)
npm install

# 安装小程序依赖
cd miniprogram && npm install

# 安装各云函数依赖
cd cloudfunctions/auth-login && npm install
cd cloudfunctions/children && npm install
cd cloudfunctions/homeworks && npm install
cd cloudfunctions/tasks && npm install
cd cloudfunctions/rewards && npm install
cd cloudfunctions/reports && npm install
cd cloudfunctions/file-assets && npm install
```

### 环境配置

1. 复制环境配置模板：

```bash
cp miniprogram/env/config.example.ts miniprogram/env/config.ts
```

2. 编辑 `miniprogram/env/config.ts`，填入你的云开发环境 ID。

3. 云函数环境变量在微信云开发控制台配置，详见 `cloudfunctions/homeworks/README.md`。

### 代码检查与测试

```bash
# 格式检查
npm run format:check

# 自动格式化
npm run format

# ESLint 检查
npm run lint

# ESLint 自动修复
npm run lint:fix

# TypeScript 类型检查
npm run typecheck

# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 一键检查全部
npm run check
```

## 云函数说明

| 函数        | 功能                     | 主要 Action                                        |
| ----------- | ------------------------ | -------------------------------------------------- |
| auth-login  | 登录、家长 PIN 设置/验证 | login, setup_parent_pin, verify_parent_pin         |
| children    | 学生 CRUD                | list, get, create, update, delete                  |
| homeworks   | 作业 CRUD + AI 识别      | list, get, create, update, delete, recognize_image |
| tasks       | 任务生命周期管理         | get, today, submit, review, delete                 |
| rewards     | 积分概览                 | overview                                           |
| reports     | 周报统计                 | weekly                                             |
| file-assets | 文件元数据记录           | create                                             |

## 数据库集合

| 集合              | 说明           |
| ----------------- | -------------- |
| users             | 用户表         |
| children          | 学生表         |
| homework_batches  | 作业批次表     |
| task_items        | 任务项表       |
| task_submissions  | 提交记录表     |
| check_results     | 批改结果表     |
| file_assets       | 文件资产表     |
| reward_accounts   | 积分账户表     |
| reward_records    | 积分记录表     |
| daily_completions | 每日完成情况表 |

## 贡献指南

1. 代码提交前运行 `npm run check` 确保通过所有检查
2. 新增云函数功能需编写对应测试
3. 遵循现有代码风格（Prettier 自动格式化）
