# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

---

## 关于本文件

这是一份**个人编码 DNA**，记录编程思想与核心原则。
具体编码规范见 `.rules/`，项目规划与设计见 `docs/`。

---

## 一、编程思想

### 1. 先思考，再动手

**不要假设。不要隐藏困惑。暴露权衡。**

- 动手前，明确说出你的假设。不确定就问。
- 存在多种理解时，全部列出 — 不要默默选一个。
- 有更简单的方案就说出来。该推回时推回。
- 遇到不清楚的，停下来。说出什么让你困惑。问。

### 2. 简洁至上

**最少的代码解决问题。不做投机。**

- 不加需求之外的功能。
- 单次使用的代码不做抽象。
- 没人要求的“灵活性”和“可配置性”不加。
- 不为不可能发生的场景写错误处理。
- 200 行能用 50 行实现，重写。

### 3. 外科手术式修改

**只动必须动的。只清理自己的痕迹。**

- 不“顺手改进”相邻的代码、注释或格式。
- 不重构没坏的东西。
- 匹配已有风格，即使你会用不同的写法。
- **检验标准：每一行改动都应该直接追溯到用户的需求。**

### 4. 目标驱动执行

**定义成功标准。循环验证直到达成。**

---

## 二、核心原则

### 架构决策框架

1. **正确性** > 性能 > 优雅
2. **可读性** > 可复用性 > 灵活性
3. **显式** > 隐式 > 魔法
4. **组合** > 继承 > 混入

### 编码信条

- **组件薄、逻辑厚** — 视图层只负责渲染和交互，业务逻辑抽到 composables/helper
- **barrel 导出统一** — 普通模块目录都有 `index.ts` 聚合导出
- **类型安全链** — 类型定义一次，全链路共享，不在多处重复定义
- **注释解释 WHY，不解释 WHAT** — 代码自解释的部分不写注释
- **能推断的不标注** — TypeScript 类型标注只在推断不出时才写

### 什么是绝对不妥协的

- 不使用 `any`（后端 DTO 场景除外）
- 不在组件内写业务逻辑超过 20 行 — 超过就抽 composable/helper
- 不在一个文件里定义多个组件
- 不用 Options API（Vue 3 项目）

### 编码完成自查

1. **内存泄漏** — 事件监听是否在 `onUnmounted` 清除？定时器/订阅/图表实例/SSE 是否销毁？
2. **容错处理** — 网络异常是否有兜底？空数据/null 是否有防御？用户快速操作（连点、切页面）是否有保护？异步竞态是否处理？

详见 `.rules/code-review.md` 完整自查清单。

---

## 三、技术栈与硬性架构边界

| 领域     | 选型                           | 备注                                                        |
| -------- | ------------------------------ | ----------------------------------------------------------- |
| 仓库形态 | pnpm workspace + Turborepo     | `apps/*` + `packages/*` monorepo                            |
| 包管理   | pnpm 11.x                      | Node.js >= 22，根目录通过 `packageManager` 固定             |
| 前端应用 | Rsbuild 2 + Vue 3 + TypeScript | `apps/web`，本地端口 8081；不预集成 UI 框架，按确认方案接入 |
| 后端服务 | NestJS 11 + Fastify 5          | `apps/api`，本地端口 3000；全局路由前缀 `/api`              |
| 数据库   | PostgreSQL 17 + Prisma 7       | `packages/database` 是 Schema、迁移和 Client 唯一真相源     |
| 跨端共享 | TypeScript 手动维护            | `packages/shared`，统一存放共享类型与无 UI 框架通用工具     |
| 图表能力 | ECharts 6                      | `packages/charts`，按需注册无框架图表能力与公共类型         |
| 语言     | TypeScript 6.0.2               | 避免 `vue-tsc` 与 TypeScript 7 不兼容                       |
| 质量     | ESLint 10 + Prettier + Husky   | lint-staged + commitlint                                    |
| 状态管理 | Pinia                          | 搭配 `pinia-plugin-persistedstate`                          |
| 测试     | Rstest                         | `@rstest/core`，单元测试就近或按应用测试目录组织            |

### 硬性架构边界

- **apps 不能被 packages 反向依赖**：依赖方向只能是 `apps → packages`；`packages/*` 不得 import 任何 app 内代码。
- **服务端只使用 shared 类型入口**：`apps/api` 只能从 `@repo/shared/types` 导入共享类型，不得依赖 `@repo/shared` 根入口或 `@repo/shared/utils` 中的浏览器工具。
- **charts 不承载业务组件**：`packages/charts` 只维护 ECharts 注册、初始化和公共类型；具体图表配置、数据转换、Vue 组件与页面交互留在 `apps/web` 内。
- **database 是服务端专用包**：`packages/database` 统一维护 Prisma Schema、migration、生成 Client 和数据库类型；不得依赖 NestJS，也不得被 `apps/web` 导入。
- **Prisma 类型不得直通前端**：`packages/database/generated/prisma` 只在服务端消费；跨端传输的类型必须显式映射为 `packages/shared/src/types` 中的安全类型，再被前端引用。
- **应用注册表是本地运行真相源**：应用分类、路径、包名、本地端口与健康检查统一维护在 `workspace.config.json`；应用源码不得另设冲突的本地默认端口。
- **对象存储不落应用服务器磁盘**：所有图片与视频附件通过云对象存储（阿里云 OSS / 腾讯云 COS）客户端直传。

---

## 四、规范索引

具体编码规范拆分在 `.rules/` 目录，开发文档在 `docs/` 目录（`background.md`、`tech-stack.md`、`prd.md`、`database.md`、`api.md`、`local-plan.md`）。

---

## 五、完成任务前的最小验证

从仓库根目录执行：

```bash
pnpm check:architecture # 架构边界检查
pnpm typecheck          # 全仓类型检查
pnpm lint               # ESLint
pnpm format:check       # Prettier 格式检查
pnpm test               # Rstest 单元测试
pnpm build              # 构建全部产物
```

一次性执行全部检查：`pnpm check`。失败必须如实报告，禁止用脚本吞掉失败码。
