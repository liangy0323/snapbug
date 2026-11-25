# SnapBug 核心接口设计文档

> **协议与风格**：RESTful JSON API + SSE（AI 流式输出 & 通知推送）  
> **接口前缀**：`/api`（沿用 `ly-fullstack` 约定，健康检查路径为 `GET /api/health`）  
> **关联文档**：[技术选型](./tech-stack.md) · [产品需求文档](./prd.md) · [数据库设计](./database.md)

---

## 1. 通用约定

### 1.1 身份鉴权

- 除登录接口外，所有接口需携带请求头：`Authorization: Bearer <accessToken>`。
- 角色守卫：
  - `/admin/**` 仅允许 `role === 'ADMIN'` 访问；
  - 其余业务接口面向 `role === 'MEMBER'`（普通成员工作台）。
- 权限越界或 Token 过期：
  - 未登录 / Token 失效 → HTTP `401`（前端拦截器自动清缓存跳登录页）；
  - 无权访问（如非项目成员访问某 Bug、超管/普通成员跨区访问）→ HTTP `403`。

### 1.2 统一响应格式

**成功响应（HTTP 200 / 201）：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

**分页列表响应：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [],
    "total": 42,
    "page": 1,
    "pageSize": 20
  }
}
```

**错误响应（HTTP 4xx / 5xx）：**

```json
{
  "code": 40001,
  "message": "账号已存在",
  "details": []
}
```

---

## 2. 认证与个人信息

| 方法    | 路径               | 权限   | 说明                                                             |
| ------- | ------------------ | ------ | ---------------------------------------------------------------- |
| `POST`  | `/auth/login`      | Public | 账号/邮箱 + 密码登录，返回 `accessToken` 与用户信息（含 `role`） |
| `GET`   | `/me`              | 登录   | 获取当前登录用户信息（含 `lastProjectId` 与头像签名 URL）        |
| `PATCH` | `/me`              | 登录   | 修改个人昵称、岗位标签、头像 Key                                 |
| `PATCH` | `/me/password`     | 登录   | 修改个人密码（需校验旧密码）                                     |
| `GET`   | `/users/directory` | MEMBER | 获取全团队启用中的普通成员列表（供提 Bug / 转派选择指派人）      |

**登录示例 `POST /auth/login`：**

- Request：`{ "account": "linmo@snapbug.dev", "password": "******", "rememberMe": true }`
- Response：`{ "accessToken": "eyJ...", "user": { "id": 2, "account": "linmo@snapbug.dev", "name": "林默", "jobTitle": "前端开发", "role": "MEMBER", "avatarColor": "#1b74ff", "lastProjectId": 1 } }`

---

## 3. 超级管理员 · 成员管理

> 所有接口均需 `role === 'ADMIN'`。

| 方法    | 路径                              | 说明                                                                          |
| ------- | --------------------------------- | ----------------------------------------------------------------------------- |
| `GET`   | `/admin/users`                    | 分页查询成员列表，支持 `?keyword=&status=ACTIVE\|DISABLED&page=1&pageSize=20` |
| `POST`  | `/admin/users`                    | 单个新增成员（`account`, `name`, `password`, `jobTitle?`）                    |
| `PATCH` | `/admin/users/:id`                | 编辑成员姓名、岗位标签、启用/禁用状态                                         |
| `POST`  | `/admin/users/:id/reset-password` | 重置指定成员密码（`{ "newPassword": "..." }`）                                |
| `GET`   | `/admin/users/import-template`    | 下载标准 `.xlsx` 批量导入模板文件流                                           |
| `POST`  | `/admin/users/import`             | Excel 批量导入成员（`multipart/form-data`，仅内存流式解析不落盘）             |

**Excel 导入响应 `POST /admin/users/import`：**

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "totalRows": 20,
    "successCount": 18,
    "failedCount": 2,
    "failures": [
      { "row": 5, "account": "linmo@snapbug.dev", "reason": "登录账号已存在" },
      { "row": 12, "account": "", "reason": "登录账号不能为空" }
    ]
  }
}
```

---

## 4. 云对象存储直传（OSS / COS 解耦）

> 所有图片、视频均采用**前端直传云存储**，不上传至应用服务器磁盘。

| 方法   | 路径                    | 权限 | 说明                                                                                        |
| ------ | ----------------------- | ---- | ------------------------------------------------------------------------------------------- |
| `POST` | `/storage/upload-sign`  | 登录 | 申请直传预签名 PUT URL（校验场景、MIME 与大小上限，由后端强制生成带用户前缀的 `objectKey`） |
| `POST` | `/storage/preview-urls` | 登录 | 批量将私有桶 `objectKeys` 换取短期签名预览 URL（按场景校验所有者/权限，禁止跨权预览）       |

**对象命名空间与权限归属约定（首版 0 额外关系表）：**

- 所有 `objectKey` 必须由后端按上传场景与当前登录用户 ID 生成，前端不可自定义路径：
  - `bug_attachment`：`bugs/u{uploaderId}/{yyyy}/{mm}/{uuid}.{ext}`（图片 ≤ 10MB / 视频 ≤ 50MB）
  - `note_image`：`notes/u{userId}/{yyyy}/{mm}/{uuid}.{ext}`（图片 ≤ 10MB）
  - `avatar`：`avatars/u{userId}/{uuid}.{ext}`（图片 ≤ 2MB）
- **绑定校验**：`POST /bugs` 绑定附件、`PATCH /me` 绑定头像时，后端强制校验 `objectKey` 匹配对应场景前缀且 `u{uid}` 等于当前登录人，且 `bug_attachments.object_key` 唯一不可重复绑定。
- **预览签发鉴权**：
  - **Bug 附件**：随 `GET /bugs/:id`（已校验项目成员权限）直接返回短期签名 `previewUrl`，不允许通过通用 `/storage/preview-urls` 绕过项目权限换链；
  - **笔记图片**：Markdown 中保存稳定引用（如 `snapbug-oss://notes/u{uid}/...`），展示时通过 `/storage/preview-urls` 或 `GET /notes/:id` 换取短期签名 URL，后端强制校验 `uid === currentUser.id`；
  - **头像**：`avatars/u{uid}/...` 允许任意已登录成员换取短期签名 URL。

**申请直传签名 `POST /storage/upload-sign`：**

- Request：
  ```json
  {
    "scene": "bug_attachment",
    "fileName": "error-screenshot.png",
    "mimeType": "image/png",
    "fileSize": 428190
  }
  ```
- Response：
  ```json
  {
    "uploadUrl": "https://bucket.oss-cn-hangzhou.aliyuncs.com/bugs/u2/2026/11/uuid.png?...",
    "method": "PUT",
    "headers": { "Content-Type": "image/png" },
    "objectKey": "bugs/u2/2026/11/uuid.png",
    "previewUrl": "https://bucket.oss-cn-hangzhou.aliyuncs.com/bugs/u2/2026/11/uuid.png?Expires=..."
  }
  ```

---

## 5. 项目管理（极简）

| 方法    | 路径            | 权限               | 说明                                                                                                         |
| ------- | --------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `GET`   | `/projects`     | MEMBER             | 获取「我参与的所有项目」列表（附带成员数、未闭环 Bug 数）                                                    |
| `POST`  | `/projects`     | MEMBER             | 新建项目（`{ "name": "电商后台", "description?": "..." }`），自动将创建人写入 `project_members`（`CREATOR`） |
| `PATCH` | `/projects/:id` | MEMBER（需已加入） | 修改项目名称或简介                                                                                           |

---

## 6. Bug 追踪（核心模块）

| 方法    | 路径                    | 权限                 | 说明                                                 |
| ------- | ----------------------- | -------------------- | ---------------------------------------------------- |
| `GET`   | `/bugs`                 | MEMBER               | 查询 Bug 列表（多维筛选 + 分页）                     |
| `POST`  | `/bugs`                 | MEMBER               | 快速提交 Bug（含附件绑定 + 隐式授权 + 通知 + 日志）  |
| `GET`   | `/bugs/:id`             | MEMBER（需项目成员） | 获取 Bug 详情（含签名附件预览 URL + 完整活动时间线） |
| `PATCH` | `/bugs/:id`             | MEMBER（需项目成员） | 更新标题、描述、优先级                               |
| `PATCH` | `/bugs/:id/status`      | MEMBER（需项目成员） | 切换状态（含「待验证自动回指提单人」联动逻辑）       |
| `PATCH` | `/bugs/:id/assignee`    | MEMBER（需项目成员） | 转派给任意团队成员（含隐式授权 + 通知 + 日志）       |
| `POST`  | `/bugs/:id/comments`    | MEMBER（需项目成员） | 添加处理评论（写 `COMMENT` 活动 + 推送通知）         |
| `POST`  | `/bugs/:id/add-to-plan` | MEMBER（需项目成员） | 一键将此 Bug 加入当前用户的今日工作计划              |

### 6.1 关键接口细节

**1. 列表查询 `GET /bugs`**

- Query 参数：
  - `scope`：`mine`（指派给我的，默认） | `created`（我提交的） | `all`（团队全部，限我参与项目内）
  - `projectId`：可选，不传则聚合所有已参与项目
  - `status`：可选，`OPEN | PROGRESS | VERIFY | CLOSED | IGNORED`
  - `keyword`：可选，模糊匹配 `code` 或 `title`
  - `page` / `pageSize`：分页参数

**2. 新建 Bug `POST /bugs`**

- Request：
  ```json
  {
    "projectId": 1,
    "title": "订单导出未选择时间范围时接口返回 500",
    "description": "【问题描述】...",
    "assigneeId": 2,
    "priority": "P0",
    "aiOptimized": true,
    "attachments": [
      {
        "type": "IMAGE",
        "objectKey": "bugs/2026/11/uuid.png",
        "fileName": "500.png",
        "mimeType": "image/png",
        "fileSize": 428190
      }
    ]
  }
  ```
- 后端事务内执行（`prisma.$transaction`）：
  1. 校验当前用户属于 `projectId`，且 `assigneeId` 为启用中的普通成员；校验所有 `attachments[].objectKey` 符合 `bugs/u{currentUser.id}/...` 前缀；
  2. 通过 PostgreSQL 序列 `SELECT nextval('bug_code_seq')` 生成唯一递增 `code`（如 `BUG-105`），创建 `bugs` 与 `bug_attachments`；
  3. **隐式授权**：`project_members` 对 `(projectId, assigneeId)` 执行 `upsert`（不存在则以 `ASSIGNED` 插入）；
  4. 更新当前用户的 `last_project_id = projectId`；
  5. 写入 `bug_activities`（`type = CREATED`）；
  6. 若 `assigneeId !== currentUser.id`，在同一事务内创建 `notifications`（`BUG_ASSIGNED`）。
- **事务提交（commit）成功后**：若产生了通知记录，再向在线接收人推送 SSE 事件（禁止在事务未提交前推送）。

**3. 状态流转 `PATCH /bugs/:id/status`**

- Request：`{ "status": "VERIFY" }`
- 后端事务内核心联动逻辑：
  - `STATUS_CHANGED` 活动固定 `meta` 契约：`{ "fromStatus": "...", "toStatus": "...", "autoAssignedTo"?: number }`；
  - 当目标状态为 `VERIFY`：
    - 记录 `resolverId = currentUser.id`；若 `resolvedAt` 为空则首次写入 `now()`；
    - 若 `bug.creatorId !== bug.assigneeId`，**自动将 `assigneeId` 切回 `bug.creatorId`**；
    - 写入 `STATUS_CHANGED` 活动与 `BUG_VERIFY_READY` 站内通知；
  - 当目标状态为 `CLOSED`：
    - 记录 `closedAt = now()`；若 `resolverId` 为空则补写 `currentUser.id`，若 `resolvedAt` 为空则补写 `now()`；
  - **统一关闭时间清理规则**：只要目标状态不是 `CLOSED`（包括 `CLOSED → OPEN / PROGRESS / VERIFY / IGNORED`），一律将 `closedAt` 置为 `null`；
  - **事务提交成功后**再推送 SSE 通知（转派 `PATCH /bugs/:id/assignee` 与评论 `POST /bugs/:id/comments` 遵循同样的“同事务入库 + 提交后推 SSE”约束）。

---

## 7. 工作台统计（Dashboard）

| 方法  | 路径                 | 权限   | 说明                                                |
| ----- | -------------------- | ------ | --------------------------------------------------- |
| `GET` | `/dashboard/summary` | MEMBER | 工作台聚合数据（支持可选 `?projectId=` 筛选单项目） |

**返回数据结构：**

```json
{
  "stats": {
    "total": 42,
    "weekClosedDelta": 6,
    "statusCounts": {
      "OPEN": 8,
      "PROGRESS": 6,
      "VERIFY": 5,
      "CLOSED": 20,
      "IGNORED": 3
    },
    "assignedToMe": { "total": 12, "open": 4 },
    "createdByMe": { "total": 9, "closed": 6 },
    "aiOptimized": { "count": 28, "rate": 67 }
  },
  "trend7d": {
    "weekCreated": 18,
    "weekClosed": 24,
    "avgResponseHours": 1.4,
    "closeRate": 88,
    "daily": [{ "date": "2026-11-19", "created": 3, "closed": 2 }]
  },
  "recentNotes": [],
  "recentAssignedBugs": []
}
```

---

## 8. 站内消息通知

| 方法    | 路径                      | 权限   | 说明                                                                          |
| ------- | ------------------------- | ------ | ----------------------------------------------------------------------------- |
| `GET`   | `/notifications`          | MEMBER | 获取通知列表与未读总数（`?page=1&pageSize=20`）                               |
| `PATCH` | `/notifications/:id/read` | MEMBER | 标记单条通知为已读                                                            |
| `PATCH` | `/notifications/read-all` | MEMBER | 全部标为已读                                                                  |
| `GET`   | `/notifications/stream`   | MEMBER | SSE 实时推送流（有新通知时下发未读数与新消息体，前端亦支持自动重连/降级轮询） |

---

## 9. 个人笔记（纯私有）

> 所有接口自动校验 `note.userId === currentUser.id`。

| 方法     | 路径         | 权限   | 说明                                                           |
| -------- | ------------ | ------ | -------------------------------------------------------------- |
| `GET`    | `/notes`     | MEMBER | 获取本人笔记列表（按 `updatedAt` 倒序，支持 `?keyword=` 搜索） |
| `POST`   | `/notes`     | MEMBER | 新建笔记                                                       |
| `GET`    | `/notes/:id` | MEMBER | 获取单篇笔记详情                                               |
| `PATCH`  | `/notes/:id` | MEMBER | 更新标题与 Markdown 正文（供编辑器防抖自动保存）               |
| `DELETE` | `/notes/:id` | MEMBER | 删除笔记                                                       |

---

## 10. 工作计划（按日期）

> 所有接口自动校验 `plan.userId === currentUser.id`。

| 方法     | 路径         | 权限   | 说明                                                                                                       |
| -------- | ------------ | ------ | ---------------------------------------------------------------------------------------------------------- |
| `GET`    | `/plans`     | MEMBER | 按日期区间查询计划（`?startDate=2026-11-22&endDate=2026-11-28`，同时返回每日有无计划标记供周日历渲染圆点） |
| `POST`   | `/plans`     | MEMBER | 新增计划（`planDate`, `planTime?`, `content`, `remark?`, `bugId?`；传入 `bugId` 时校验项目成员权限）       |
| `PATCH`  | `/plans/:id` | MEMBER | 修改计划内容、时间点、`bugId` 或切换 `isDone` 状态（变更 `bugId` 时同样校验项目成员权限）                  |
| `DELETE` | `/plans/:id` | MEMBER | 删除计划                                                                                                   |

---

## 11. 工作汇报（月报 / 周报）

| 方法  | 路径             | 权限   | 说明                                 |
| ----- | ---------------- | ------ | ------------------------------------ |
| `GET` | `/reports/draft` | MEMBER | 生成周期汇报数据与基础 Markdown 草稿 |

- **Query 参数**：
  - `type`：`monthly`（**默认月报**） | `weekly`（周报）
  - `anchorDate`：可选 `YYYY-MM-DD`，默认今天（用于计算当月/上月或当周/上周区间）
- **统计口径**：
  - 时间范围：`[periodStart, periodEnd]`；
  - 已完成计划：`plans` 中 `userId = me`、`planDate` 落在周期内且 `isDone = true`；
  - 待推进计划：`plans` 中 `userId = me`、`planDate` 落在周期内且 `isDone = false`；
  - Bug 修复与跟进：以 `bug_activities` 历史状态事件为准，查询周期内 `actorId = me` 且 `type = STATUS_CHANGED` 且 `meta->>'toStatus' IN ('VERIFY', 'CLOSED')` 的记录（按 `bugId` 去重），并补充当前仍指派给本人处理中的 `PROGRESS` Bug（避免重开覆盖 `resolverId` 导致历史周报/月报漏单；工作台近 7 日每日关闭趋势同理以 `bug_activities` 中 `toStatus = 'CLOSED'` 事件按天去重统计）。

---

## 12. AI 提效接口（流式 SSE）

> 后端统一读取 `.env` 中的 OpenAI 兼容配置（`AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`）。前端使用 `fetch` + `ReadableStream` 发起 `POST` 请求携带 `Authorization` Header 接收 SSE 数据帧。

| 方法   | 路径                 | 权限   | 说明                                                                                               |
| ------ | -------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| `POST` | `/ai/optimize-bug`   | MEMBER | 口语化 Bug 描述 → 流式输出标准结构（`【问题描述】【复现步骤】【预期结果】【实际结果】`）及推荐标题 |
| `POST` | `/ai/summarize-note` | MEMBER | 传入笔记标题与正文 → 流式提炼核心要点与待办结论                                                    |
| `POST` | `/ai/polish-report`  | MEMBER | 传入汇报类型（`monthly`/`weekly`）与原始草稿 → 流式润色成正式汇报文档                              |

**SSE 统一事件格式：**

```text
event: title
data: {"title":"订单导出未选择时间范围时接口返回 500 报错"}

event: delta
data: {"text":"【问题描述】\n订单列表页未选择起止时间..."}

event: done
data: {"usage":{"totalTokens":320}}
```

- 若发生模型调用超时或配置缺失，下发 `event: error` 并附带友好错误提示，前端保持原文不丢失。

### 12.1 预留扩展接口规划（暂不首期开发，字段已就绪）

| 方法    | 路径                         | 说明                                                                                              |
| ------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `POST`  | `/ai/similar-bugs`           | 提单前基于当前 `projectId` 做 PG 关键词/错误码召回 + AI 精排解释，返回相似未关闭/已关闭旧单及线索 |
| `PATCH` | `/bugs/:id/checklist`        | 更新 `bugs.verifyChecklist` 中各项检查状态（`pending` / `passed` / `failed`）                     |
| `POST`  | `/ai/optimize-bug`（扩展）   | 流式末尾可选追加 `event: follow_up`，输出 1 条非阻塞的关键缺失复现追问                            |
| `POST`  | `/ai/summarize-bug-timeline` | （V2）按需汇总长时间线 Bug 的已确认现象、已排除原因、下一步验证项及原活动 ID 锚点                 |
