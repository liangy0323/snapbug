# SnapBug 技术选型文档

## 1. 选型总览

项目采用**全栈 TypeScript + pnpm Monorepo** 架构，兼顾开发效率、类型安全与轻量部署。

| 层级                   | 技术选型                                                                      | 说明                                                                               |
| ---------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **包管理与工程化**     | **pnpm + Monorepo** (`pnpm-workspace`)                                        | 统一管理前后端与共享类型包，减少重复定义                                           |
| **前端框架**           | **Vue 3 + TypeScript**                                                        | `<script setup>` 组合式 API，强类型约束                                            |
| **前端构建与路由状态** | **Rsbuild + Vue Router + Pinia**                                              | 基于 Rspack 的 Rust 构建工具，开发与生产构建极速且产物行为一致                     |
| **前端样式与 UI**      | **Sass + `@lucide/vue`（UI 组件库待定，脚手架暂不集成）**                     | 1:1 复刻 `ly-rsbuild-spa` 纯净底座，待确认 UI 方案后再按需接入                     |
| **前端图表**           | **ECharts 6**（`packages/charts`）                                            | 无框架按需注册与公共类型包，服务工作台状态环形图与趋势双曲线图                     |
| **后端框架**           | **NestJS 11 + Fastify 5** (`@nestjs/platform-fastify`)                        | 1:1 复刻 `ly-fullstack/apps/admin-api` 模块化结构                                  |
| **数据库**             | **PostgreSQL 17**                                                             | 稳定可靠的开源关系型数据库，原生支持 JSONB 与复杂聚合                              |
| **ORM 与迁移**         | **Prisma 7** (`packages/database` + `@prisma/adapter-pg`)                     | 独立服务端数据库真相源包，严禁前端依赖                                             |
| **参数校验与共享类型** | **DTO：`class-validator` + `class-transformer`；跨端类型：`packages/shared`** | 服务端仅从 `@repo/shared/types` 导入纯类型，保持单向清晰边界                       |
| **身份鉴权**           | **JWT** (`@nestjs/jwt`) + `bcryptjs`                                          | 无状态认证，纯 JS 加密跨平台零编译坑                                               |
| **单元测试与质量门禁** | **Rstest + ESLint 10 + Prettier + Husky + Commitlint + Turborepo**            | 与 `ly-fullstack` / `ly-rsbuild-spa` 保持一致的全仓质量闭环                        |
| **文件/图片上传**      | **云对象存储直传（阿里云 OSS / 腾讯云 COS，具体厂商待定）**                   | 文件**不落应用服务器磁盘**，后端签发预签名 URL / 临时凭证（STS），由前端直传云存储 |
| **AI 能力接入**        | **OpenAI 兼容协议 SDK** + SSE 流式输出                                        | 通过环境变量自由切换 DeepSeek / 通义千问 / OpenAI 等兼容模型                       |
| **容器化部署**         | **Docker + Docker Compose**                                                   | 支持开发与生产环境一键编排（PostgreSQL / API / Web Nginx）                         |

---

## 2. Monorepo 目录规划

```text
snapbug/
├── apps/
│   ├── web/                # 前端应用（Vue 3 + TypeScript + Rsbuild，零 UI 框架底座）
│   └── api/                # 后端服务（NestJS 11 + Fastify 5）
├── packages/
│   ├── database/           # Prisma 7 Schema、迁移、Seed 与 Client（仅服务端）
│   ├── shared/             # 跨端共享类型（./types）与无 UI 框架通用工具（./utils）
│   └── charts/             # ECharts 6 无框架按需注册包（仅前端）
├── scripts/                # setup / dev / check-architecture / verify-setup
├── docs/                   # 项目文档（背景、技术选型、原型设计、数据库、接口等）
├── compose.yaml            # 本地 PostgreSQL 17 编排
├── workspace.config.json   # 应用注册表与端口真相源
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Monorepo 核心收益**：

- Bug 状态（`open` / `progress` / `verify` / `closed`）、优先级（`p0` / `p1` / `p2`）、接口请求与响应 DTO 定义在 `packages/shared` 中，前后端同步感知变更，避免字段对齐出错。

---

## 3. 关键技术方案约定

### 3.1 对象存储与文件上传（无服务器落盘）

- **核心原则**：截图、头像、附件等文件**绝不上传至应用服务器本地磁盘**，全部托管至云对象存储。
- **接入方式（客户端直传）**：
  1. 前端选择/粘贴图片后，先向后端请求上传凭证（预签名 PUT URL 或临时 STS Token），后端校验登录态、文件类型与大小限制。
  2. 前端携带凭证直接将文件上传至阿里云 OSS 或腾讯云 COS。
  3. 上传成功后，前端将对象 Key / 访问 URL 随业务表单提交至后端入库。
- **厂商解耦设计**：后端封装统一的 `StorageService` / `StorageProvider` 接口（如 `getUploadSignature()`、`getAccessUrl()`、`deleteObject()`），通过环境变量配置驱动，待确认使用阿里云 OSS 或腾讯云 COS 后直接接入对应 SDK 实现，不影响业务层代码。

### 3.2 后端服务（NestJS + Fastify + PostgreSQL）

- **Fastify 适配**：使用 `@nestjs/platform-fastify`，统一配置 CORS、Helmet 安全头、全局异常过滤器与统一响应格式。
- **数据库设计**：PostgreSQL 存储核心业务数据（用户、Bug、评论/处理记录、通知、个人笔记、工作计划、附件元数据等），通过 Prisma 管理迁移与索引。
- **AI 模块**：抽象独立的 `AiModule`，基于 OpenAI 兼容协议封装「Bug 描述结构化优化」「笔记要点提炼」「周报润色」等能力，支持流式输出与提示词集中维护。

### 3.3 前端应用（Vue 3 + TypeScript）

- **类型安全**：严格开启 TypeScript `strict` 模式，HTTP 客户端（如 Axios / ofetch）统一封装拦截器处理 Token 注入、401 登录跳转与错误提示。
- **交互体验**：依托 Pinia 维护当前用户、筛选状态、视图模式（列表/卡片）与未读通知状态；保证双视图切换与抽屉操作状态一致。

---

## 4. 待定与后续细化项

- [ ] **云对象存储厂商确认**：最终选用**阿里云 OSS** 还是**腾讯云 COS**（以及是否开启私有桶 + 签名访问）。
- [ ] **前端组件库最终确认**：原型细化阶段根据交互复杂度确认是否采用 Naive UI（或替换为 Element Plus / Arco Design / 纯 Tailwind 定制）。
- [ ] **实时通知机制**：站内通知采用轻量轮询、SSE 还是 WebSocket（结合后续原型需求确定）。
