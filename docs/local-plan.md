# SnapBug 工程底座复刻与实施计划（Local Plan）

> **目标**：基于现有参考仓库，1:1 复刻成熟的 `pnpm + Monorepo` 工程底子，完成 SnapBug 的后端与前端骨架搭建；**本阶段先理清架构映射、差异点与待确认项，待确认后再动工，减少返工**。
>
> **参考仓库**：
>
> - Monorepo 底座 & 后端组织：`D:\github-project\ly-fullstack`（特别是根目录、`packages/*`、`scripts/*`、`apps/admin-api`）
> - 前端组织：`D:\github-project\ly-rsbuild-spa`（纯 Rsbuild + Vue 3 SPA，**不集成任何 UI 框架**）
>
> **关联文档**：[background.md](./background.md) · [tech-stack.md](./tech-stack.md) · [prd.md](./prd.md) · [database.md](./database.md) · [api.md](./api.md)

---

## 1. 前端应用命名建议（`apps/web` vs 备选）

`ly-fullstack` 通过 `workspace.config.json` 强制约定：`apps.<kind>.<name>` 的目录为 `apps/<name>`，包名为 `@repo/<name>`。结合 SnapBug 单一主体工作台的产品形态，对比三个候选名：

| 候选目录                   | 包名              | 优点                                                                                                                | 缺点 / 适用前提                                                                   |
| -------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **`apps/web`**（**推荐**） | `@repo/web`       | 最直观、行业通用，与 `apps/api` 形成经典对称；`pnpm dev web` 简短顺手                                               | `workspace.config.json` 中路径键名为 `apps.web.web`（稍有语义重复，但不影响运行） |
| **`apps/app`**             | `@repo/app`       | 若未来打算在 `apps/site` 或 `apps/web` 放对外官网/落地页，主体工作台叫 `app` 边界清晰；命令同样短（`pnpm dev app`） | 单独看目录名不如 `web` 一眼识别是前端                                             |
| **`apps/workspace`**       | `@repo/workspace` | 最贴合 SnapBug“研发工作台”定位，`apps.web.workspace` 无键名重复                                                     | 日常输命令 `pnpm dev workspace` 稍长                                              |

> **建议**：如果当前聚焦研发工作台本身、短期不做独立官网，直接选 **`apps/web`** 最省心；如果确定将来要独立做宣传官网，建议选 **`apps/app`**。下文暂以 `apps/web` 指代，最终按你的确认落盘。

---

## 2. 仓库整体结构规划

1:1 复刻 `ly-fullstack` 的 `pnpm workspace + Turborepo` 架构，按 SnapBug 需求收敛 `apps/` 为两个核心应用（`apps/api` + `apps/web`）：

```text
snapbug/
├── .husky/                        # pre-commit (lint-staged) + commit-msg (commitlint)
├── .rules/                        # 复刻并适配编码规范（移除 Element Plus/后台 RBAC 强绑定）
├── .vscode/                       # 推荐插件与编辑器设置
├── apps/
│   ├── api/                       # [@repo/api] 1:1 复刻 ly-fullstack/apps/admin-api 组织形式
│   └── web/                       # [@repo/web] 1:1 复刻 ly-rsbuild-spa 组织形式（零 UI 框架）
├── packages/
│   ├── database/                  # [@repo/database] Prisma 7 + PostgreSQL 17 唯一真相源（SnapBug 9 张表）
│   ├── shared/                    # [@repo/shared] 跨端类型（./types）与无 UI 框架纯工具（./utils）
│   └── charts/                    # [@repo/charts]（待确认）ECharts 6 无框架注册包，服务工作台图表
├── scripts/
│   ├── workspace-config.mjs       # 读取与校验 workspace.config.json
│   ├── setup.mjs                  # 一键初始化本地 PG / 建库 snapbug / 生成 api .env / migrate & seed
│   ├── dev.mjs                    # 交互/CLI 启动器、端口预检、先构 database、健康检查、dev:stop
│   ├── check-architecture.mjs     # 仓库级架构边界硬检查脚本
│   └── verify-setup.mjs           # 环境校验脚本
├── docs/                          # 项目文档（已就绪）
├── AGENTS.md                      # 复刻并适配 SnapBug 的工程原则与硬性边界
├── compose.yaml                   # 本地 PostgreSQL 17 Alpine 容器编排（库名 snapbug）
├── commitlint.config.mjs
├── eslint.config.js               # ESLint 10 扁平配置（去除 Element Plus 规则）
├── package.json                   # 根脚本与 devDependencies (catalog:)
├── pnpm-workspace.yaml            # apps/* + packages/* + catalog 统一版本目录
├── tsconfig.base.json
├── turbo.json
├── workspace.config.json          # 应用注册表真相源（端口、路径、包名、健康检查）
├── workspace.config.schema.json
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .prettierignore
└── .prettierrc
```

### 相比 `ly-fullstack` 刻意精简剔除的部分

为了契合 SnapBug 轻量定位、避免底座冗余，以下 `ly-fullstack` 的非必需模块**暂不复刻**：

- `apps/admin`、`apps/admin-api`、`apps/api` 三应用结构 → 收敛为 `apps/web` + `apps/api` 两应用；
- `website/`（Rspress 文档站点）；
- `plopfile.mjs` + `scripts/templates/server/` + `scripts/test-server-template.mjs`（多 NestJS 服务生成器，SnapBug 为单后端）；
- `playwright.config.ts` + `.env.e2e*` + `scripts/e2e.mjs`（E2E 测试待业务页面成型后按需接入）；
- `apps/admin-api/assets/captcha-*.jpg` 与 `sharp` 滑块验证码依赖（SnapBug 无需图形验证码）。

---

## 3. 各模块 1:1 复刻与适配细则

### 3.1 根目录与工程脚本（来自 `ly-fullstack`）

1. **`workspace.config.json`**：
   ```json
   {
     "$schema": "./workspace.config.schema.json",
     "schemaVersion": 1,
     "apps": {
       "web": {
         "web": {
           "path": "apps/web",
           "packageName": "@repo/web",
           "localPort": 8081
         }
       },
       "server": {
         "api": {
           "path": "apps/api",
           "packageName": "@repo/api",
           "localPort": 3000,
           "healthPath": "/api/health"
         }
       }
     }
   }
   ```
2. **包管理与依赖版本（`pnpm-workspace.yaml`）**：
   - 沿用 `pnpm@11.x` + `catalog:` 集中锁版本 + `verifyDepsBeforeRun: error` + `allowBuilds` + `overrides`；
   - 清理 `element-plus`、`@rspress/core`、`@playwright/test`、`plop`、`sharp`、`xgplayer` 等无关依赖；
   - 保留前端所需 `@rsbuild/*`、`@rstest/core`、`@rstest/adapter-rsbuild`、`vue`、`vue-router`、`pinia`、`pinia-plugin-persistedstate`、`axios`、`@lucide/vue`、`sass`、`unplugin-auto-import`、`unplugin-vue-components`、`vue-tsc`；
   - 保留后端所需 `@nestjs/*`、`fastify`、`@fastify/helmet`、`@prisma/client`、`@prisma/adapter-pg`、`prisma`、`pg`、`bcryptjs`、`class-validator`、`class-transformer`、`tsx`、`cross-env` 等。
   - 后续接入业务时按需新增：`exceljs`（或 `xlsx`）用于超管 Excel 模板与导入、`openai` 用于 AI 流式接口、选定后的阿里云 OSS / 腾讯云 COS SDK。
3. **根命令（`package.json`）**：
   - `pnpm setup`：启动/复用本地 PG → 建库 `snapbug` → 生成 `apps/api/.env.development`（随机 `JWT_SECRET` + `DATABASE_URL` + `CORS_ORIGINS`）→ 同步 `apps/web/.env.development` 端口 → 执行 `db:migrate` 与 `db:seed`；
   - `pnpm dev` / `pnpm dev all` / `pnpm dev api` / `pnpm dev web` / `pnpm dev:stop`；
   - `pnpm check`：`check:architecture` → `typecheck` → `lint` → `format:check` → `test` → `build`。
4. **架构边界守卫（`scripts/check-architecture.mjs`）**：
   - `packages/*` 不得反向依赖 `apps/*`，且手写目录禁止残留编译产物；
   - `apps/web` 禁止导入 `@repo/database`；
   - `apps/api` 只允许从 `@repo/shared/types` 导入共享类型，禁止导入 `@repo/shared` 根入口或 `@repo/shared/utils`；
   - `apps/web/src/utils/`、`services/`、`components/base/`、`composables/` 沿用清晰的单向依赖边界检查（移除 `el-empty` / `element-plus` 相关规则）。

---

### 3.2 共享包（`packages/`）

#### `packages/database`（`@repo/database`）

- 1:1 复刻 `ly-fullstack/packages/database` 结构：
  - `prisma.config.ts`（Prisma 7 标准配置，由调用环境提供 `DATABASE_URL`，包内不存密钥）；
  - `prisma/schema.prisma`：直接落地 [database.md](./database.md) 定义的 **9 张业务表与枚举**（注意遵循 Prisma 7 `prisma-client` 生成器输出到 `../generated/prisma`，不提交 Git）；
  - `prisma/seed.ts`：幂等初始化默认超管账号 `admin`（默认密码 `admin123`，支持环境变量 `ADMIN_INITIAL_PASSWORD` 覆盖）；
  - `src/index.ts`：只导出 Prisma Client 与数据库类型，不依赖 NestJS。

#### `packages/shared`（`@repo/shared`）

- 1:1 复刻 `ly-fullstack/packages/shared` 结构与导出策略（开发期类型指向 `src`，运行时入口指向 `dist`）：
  - `src/types/modules/`：先建立 `health.ts`、`pagination.ts`、`api-response.ts` 及 SnapBug 共享枚举类型（`UserRole`、`UserStatus`、`BugStatus`、`BugPriority`、`AttachmentType`、`ActivityType`、`NotificationType`）；
  - `src/utils/modules/`：复刻 `base.ts`、`clone.ts`、`storage.ts` 及配套 Rstest 单测（纯无框架工具，仅前端消费）。

#### `packages/charts`（`@repo/charts`，待确认）

- 若确认保留，1:1 复刻 `ly-fullstack/packages/charts`（ECharts 6 无框架按需注册与公共类型），服务于工作台的**状态分布环形图**与**近 7 日缺陷趋势双曲线图**。

---

### 3.3 后端 `apps/api`（1:1 复刻 `ly-fullstack/apps/admin-api`）

完全遵循 `ly-fullstack/apps/admin-api` 的目录、启动流程、配置与测试习惯：

```text
apps/api/
├── src/
│   ├── common/
│   │   ├── decorators/         # @CurrentUser(), @Public(), @RequireRoles()
│   │   ├── guards/             # jwt-auth.guard.ts, roles.guard.ts（及 *.test.ts）
│   │   ├── pipes/              # create-dto-validation-pipe.ts
│   │   └── index.ts
│   ├── constants/
│   │   ├── modules/            # server.ts, auth.ts
│   │   └── index.ts
│   ├── modules/
│   │   ├── app/
│   │   │   └── app.module.ts
│   │   └── health/
│   │       ├── health.controller.ts
│   │       ├── health.controller.test.ts
│   │       └── health.module.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts   # 使用 @prisma/adapter-pg + ConfigService
│   ├── types/
│   │   ├── modules/
│   │   └── index.ts
│   └── main.ts                 # FastifyAdapter + Helmet + GlobalPrefix + CORS + ValidationPipe + ShutdownHooks
├── .env.example                # 包含 DATABASE_URL / CORS_ORIGINS / JWT_* / AI_* / STORAGE_* 模板
├── env.d.ts
├── package.json                # dev 用 tsx watch，build 用 tsc -p tsconfig.build.json，test 用 rstest
├── rstest.config.ts
├── tsconfig.json               # extends ../../tsconfig.base.json, Node16, paths 指向 @repo/database 与 @repo/shared/types
├── tsconfig.build.json
└── tsconfig.test.json
```

> **底座对齐提醒（与此前 `tech-stack.md` 的细微差异）**：
> `ly-fullstack/apps/admin-api` 已验证跑通的技术细节是：**`class-validator` + `class-transformer`**（DTO 校验）、**`bcryptjs`**（无原生编译依赖，Windows 零坑）、**`Rstest`**（测试框架）。建议完全沿用这套成熟配置，开工时同步修订 `docs/tech-stack.md` 保持全仓文档一致。

---

### 3.4 前端 `apps/web`（1:1 复刻 `ly-rsbuild-spa`，**零 UI 框架**）

严格 1:1 复刻 `D:\github-project\ly-rsbuild-spa` 的代码组织与构建体系，**不安装、不配置任何 UI 组件库或 CSS 框架**（无 Element Plus / Naive UI / Tailwind）：

```text
apps/web/
├── build/
│   ├── rsbuild.base.config.ts     # Vue + Sass + AutoImport(vue/vue-router/pinia) + Components(components/base) + version + offline
│   ├── rsbuild.dev.config.ts      # PORT 由 workspace.config.json / dev.mjs 注入
│   ├── rsbuild.prod.config.ts     # splitChunks + cssExtract + gzip + image-compress
│   └── runtime/
│       ├── check.ts
│       ├── env.ts
│       ├── offline.ts
│       ├── version.ts
│       └── offline/
│           ├── register.ts
│           └── sw-template.js
├── public/
│   └── favicon.ico
├── src/
│   ├── bootstrap/
│   │   └── app-update.ts          # 版本更新检测启动装配
│   ├── components/
│   │   └── base/                  # 自动扫描的基础组件：circle-loading/, lucide-icon/
│   ├── env/
│   │   └── index.ts               # 运行时环境读取与归一化
│   ├── layouts/
│   │   └── index.vue              # 基础布局壳
│   ├── router/
│   │   ├── modules/
│   │   │   └── demo.ts            # 初始路由模块（后续替换为 SnapBug 路由）
│   │   └── index.ts
│   ├── utils/
│   │   ├── modules/
│   │   │   ├── base.ts
│   │   │   ├── clone.ts
│   │   │   ├── network.ts
│   │   │   └── storage.ts
│   │   └── index.ts
│   ├── views/
│   │   ├── home/
│   │   │   └── index.vue          # SnapBug 初始占位页
│   │   └── components/
│   │       └── index.vue
│   ├── App.vue
│   └── index.ts                   # 保持 ly-rsbuild-spa 入口约定
├── tests/
│   └── unit/
│       ├── app-version.test.ts
│       ├── env.test.ts
│       └── utils.test.ts
├── .env.example
├── .env.development
├── .env.production
├── env.d.ts
├── index.html                     # title: SnapBug
├── package.json                   # 依赖统一走 catalog:，接入 @repo/shared
├── rstest.config.ts
└── tsconfig.json                  # extends ../../tsconfig.base.json，补充 @repo/shared 路径映射
```

**融入 Monorepo 时的关键适配点**：

1. 删除 `ly-rsbuild-spa` 独立的 `pnpm-workspace.yaml`、`pnpm-lock.yaml`、`.husky`、`.prettierrc`、`.rules`（统一由 SnapBug 根目录管理）；
2. `apps/web/utils/modules/` 与 `packages/shared/src/utils/modules/` 职责避免重复：`base.ts`、`clone.ts`、`storage.ts` 可在 `packages/shared` 沉淀或由 `apps/web/src/utils` 按需透出，保留 `network.ts` 在 `apps/web`；
3. `eslint.config.js` 的 `no-restricted-imports` 仅约束 `vue` / `pinia` / `vue-router` 自动导入（不加入任何 UI 框架限制），并自动读取 `apps/web/auto-imports.d.ts`。

---

## 4. 开工执行步骤与验收标准

确认本计划后，按以下步骤落地 **Phase 1（工程底座搭建）**：

1. **搭建根目录工程骨架**：`package.json`、`pnpm-workspace.yaml`、`turbo.json`、`tsconfig.base.json`、`workspace.config.json`、`workspace.config.schema.json`、`compose.yaml`、`eslint.config.js`、`.prettierrc`、`commitlint.config.mjs`、`.husky/`、`.rules/`、`AGENTS.md`、`scripts/*`。
2. **搭建 `packages/`**：
   - `packages/database`（含 SnapBug 9 张表 `schema.prisma`、`prisma.config.ts`、`seed.ts`）
   - `packages/shared`（基础公共类型、SnapBug 枚举与通用工具 + Rstest 单测）
   - `packages/charts`（若确认保留）
3. **搭建 `apps/api`**：1:1 复刻 `admin-api` 结构，完成 `main.ts`、`app.module.ts`、`prisma/`、`health/`、`common/`、`constants/` 与 `.env.example` + 单元测试。
4. **搭建 `apps/web`**：1:1 复刻 `ly-rsbuild-spa` 结构与 `build/` 配置（零 UI 框架），适配 Monorepo `catalog:` 与 `tsconfig.base.json` + 单元测试。
5. **全仓安装与质量门禁验收**：
   - `pnpm install` 顺利安装无依赖报错；
   - `pnpm check:architecture` 通过；
   - `pnpm typecheck` 通过；
   - `pnpm lint` 与 `pnpm format:check` 通过；
   - `pnpm test` 通过；
   - `pnpm build` 全仓构建通过；
   - 如本机有 PostgreSQL / Docker，可进一步执行 `pnpm setup` 与 `pnpm dev all` 验证联调跑通。

---

## 5. 已确认决策记录

以下 5 项开工前决策已全部确认锁定，作为 Phase 1 底座搭建的唯一执行口径：

1. **前端应用目录名**：`apps/web`（包名 `@repo/web`，端口 `8081`）。
2. **后端全局路由前缀**：`/api`（健康检查 `/api/health`）。
3. **`packages/charts`（ECharts 6）**：本次搭建底座一并复刻，并扩展注册 `PieChart` 与 `LegendComponent` 以完整支持工作台状态环形图与近 7 日双曲线趋势图。
4. **后端校验与工具链**：沿用 `ly-fullstack/apps/admin-api` 成熟方案——`class-validator` + `class-transformer` + `bcryptjs` + `Rstest`（已同步更新 [tech-stack.md](./tech-stack.md)）。
5. **精简范围**：不复刻 `website/`、`plop` 服务生成器、Playwright E2E 与滑块验证码。
