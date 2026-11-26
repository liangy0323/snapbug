# SnapBug UI 与视觉设计规范（Design System）

> **文档定位**：SnapBug 前端视觉与交互唯一规范真相源。指导全部基础组件与业务页面的视觉一致性，确保在**零第三方 UI 框架**前提下，保持清爽、轻盈、高信息密度的现代研发工作台体验。
>
> **代码落点**：`apps/web/src/assets/styles/`（Token 与主题）、`apps/web/src/components/base/`（基础组件）、`apps/web/src/feedback/`（全局反馈）。

---

## 1. 设计理念与视觉基因

SnapBug 的视觉语言围绕 **「轻盈白蓝 · 去噪提效」** 展开，克制使用重边框与高饱和色块：

1. **三层空间层次**：浅灰画布（`#f5f6f8`）承载纯白卡片（`#ffffff` + 极轻漫反射阴影），冰蓝浅底（`#f2f7ff` / `#eef5ff`）承托强调内容与快捷入口，避免传统后台满屏 `1px` 黑灰网格线的压迫感。
2. **克制的单主色聚焦**：全站仅用品牌蓝（`#1b74ff`）表达当前激活态、主操作与重点引导（左侧实心蓝选中条、主按钮、左竖条色标）；红/橙/绿严格收敛于缺陷优先级、状态流转与图表语义。
3. **特征视觉元素**：
   - **实心纯蓝导航选中条**：侧边栏当前项采用实心蓝底 + 白色文字 + 轻蓝弥散投影（`--shadow-primary`）。
   - **冰蓝左竖条条目**：个人笔记、工作计划项、登录卖点条、抽屉正文描述统一采用「冰蓝底 + 左侧 `2.5px~3px` 语义色竖条」，形成高频识别特征。
   - **无硬边框白卡片**：卡片不加外描边，依靠画布对比度与 `--shadow-card` 建立边界；内部模块使用极淡分割线 `--color-border-hairline`（`#eff1f5`）轻量区隔。
4. **零框架、稳定内核**：不引入第三方 UI 框架，交互状态机借鉴 Element Plus 稳定实现（z-index 递增栈、引用计数滚动锁、Esc 逐层关闭、遮罩同目标点击防误关），视觉 100% 自主可控。

---

## 2. 品牌标识规范

- **标准组合**：`SnapBug` + 右下角 `7px × 7px` 实心品牌蓝圆点 + 浅灰斜杠 `/` + 场景副标题（成员端 `R&D Workspace` / 超管端 `Admin Console`）。
- **文字样式**：`22px`、`font-weight: 800`、`letter-spacing: -0.6px`、主文字色 `#14181f`。
- **禁止**：不在顶栏放置复杂大尺寸图形 Logo 或多余装饰标语，保证顶栏视觉轻盈。

---

## 3. Design Token 与色彩体系

所有颜色、圆角、阴影、字号、过渡与层级均沉淀在 `apps/web/src/assets/styles/modules/tokens.scss` 与 `theme.scss`（`html[data-theme='light']` / `html[data-theme='dark']`）。**组件内禁止硬编码色值**，必须消费语义变量。

### 3.1 亮 / 暗双主题切换机制

- **首屏防闪烁**：`apps/web/index.html` 在渲染前同步读取 `localStorage('SNAPBUG_THEME')`，未设置时跟随系统 `prefers-color-scheme`，直接写入 `document.documentElement.dataset.theme`；
- **状态管理**：通过 `apps/web/src/composables/use-theme.ts`（`useTheme()`）提供 `theme`、`isDark`、`setTheme`、`toggleTheme`，切换时仅变更根节点 `data-theme`；
- **暗色层次原则**：亮色靠「浅灰画布 + 白卡片轻阴影」分层；暗色采用**纯中性深炭灰**（避免蓝灰底叠加品牌蓝导致整体发蓝），靠「三层亮度阶梯 + 极细描边 `--color-card-border`（`rgba(255, 255, 255, 0.08)`）」分层：画布 `#121213` → 卡片/侧栏/顶栏 `#1b1b1d` → 浮层/弹窗/抽屉 `#242427`，同时声明 `color-scheme: light / dark` 使原生控件与滚动条自动适配。

### 3.2 品牌与强调色

| 语义变量                | 亮色值                     | 暗色值                     | 使用场景                                                  |
| ----------------------- | -------------------------- | -------------------------- | --------------------------------------------------------- |
| `--color-primary`       | `#1b74ff`                  | `#3b82f6`                  | 主按钮、侧边栏激活条、聚焦边框、左竖条色标、图表主曲线    |
| `--color-primary-hover` | `#0e62e6`                  | `#2563eb`                  | 主按钮悬停态                                              |
| `--color-primary-tint`  | `#f2f7ff`                  | `rgba(59, 130, 246, 0.12)` | 冰蓝底（表格行悬停、笔记条、计划项、抽屉正文、AI 提示条） |
| `--color-primary-tile`  | `#eef5ff`                  | `rgba(59, 130, 246, 0.16)` | 快捷磁贴底色、蓝色标签底色、处理中状态底色                |
| `--color-primary-line`  | `#d6e6ff`                  | `rgba(59, 130, 246, 0.32)` | 浅蓝柔和边框（软主按钮、聚焦外描边参考）                  |
| `--color-primary-focus` | `rgba(27, 116, 255, 0.12)` | `rgba(59, 130, 246, 0.24)` | 输入框 / 下拉触发器 `focus-ring` 光晕                     |

### 3.3 中性色（背景、边框、四级文字）

| 语义变量                  | 亮色值                   | 暗色值                      | 使用场景                                        |
| ------------------------- | ------------------------ | --------------------------- | ----------------------------------------------- |
| `--color-bg-canvas`       | `#f5f6f8`                | `#121213`                   | 页面主画布底色、禁用态底色、标签灰底            |
| `--color-bg-surface`      | `#ffffff`                | `#1b1b1d`                   | 卡片、顶栏、侧边栏、输入框表面                  |
| `--color-bg-elevated`     | `#ffffff`                | `#242427`                   | 弹窗、抽屉、确认框、下拉浮层、轻提示等高层表面  |
| `--color-bg-subtle`       | `#fafbfc`                | `#161618`                   | 表头底色、弹窗/抽屉底部操作栏底色、次级浮层头部 |
| `--color-bg-hover`        | `#fafcff`                | `rgba(255, 255, 255, 0.04)` | 未读通知、柔和容器悬停底色                      |
| `--color-bg-mask`         | `rgba(15, 23, 42, 0.36)` | `rgba(0, 0, 0, 0.65)`       | 弹窗与确认框遮罩                                |
| `--color-bg-mask-light`   | `rgba(15, 23, 42, 0.22)` | `rgba(0, 0, 0, 0.45)`       | 右侧抽屉轻遮罩（保持背后列表可读）              |
| `--color-card-border`     | `transparent`            | `rgba(255, 255, 255, 0.08)` | 卡片/弹层外描边（亮色透明、暗色极细提亮边界）   |
| `--color-border-hairline` | `#eff1f5`                | `rgba(255, 255, 255, 0.08)` | 顶栏/侧边栏边界、表格行线、弹窗头尾分割线       |
| `--color-border-soft`     | `#e6e9ef`                | `rgba(255, 255, 255, 0.14)` | 输入框、次级按钮、下拉触发器默认边框            |
| `--color-border-strong`   | `#cbd5e1`                | `rgba(255, 255, 255, 0.24)` | 复选框边框、细滚动条滑块                        |
| `--color-text-primary`    | `#14181f`                | `#f0f0f2`                   | 一级标题、正文主内容、按钮主文案                |
| `--color-text-secondary`  | `#4e5969`                | `#a8a8b0`                   | 二级正文、表单标签、抽屉描述、次要说明          |
| `--color-text-muted`      | `#86909c`                | `#7a7a82`                   | 辅助元数据、时间戳、Bug 编号、图标默认色        |
| `--color-text-subtle`     | `#b2b9c4`                | `#56565e`                   | 占位符（placeholder）、侧栏分组标题、禁用文字   |
| `--color-text-inverse`    | `#ffffff`                | `#ffffff`                   | 实心彩底按钮、激活导航项、头像文字              |

### 3.4 语义色与代码高亮色

| 语义         | 亮色（主色 / 浅底）                              | 暗色（主色 / 浅底）                              | 使用场景                                                     |
| ------------ | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------ |
| 危险 / 紧急  | `#f53f3f` / `#ffece8`                            | `#ef4444` / `rgba(245, 63, 63, 0.16)`            | `P0` 优先级、`待处理` 状态、危险删除按钮、错误提示、未读红点 |
| 警告 / 待检  | `#ff7d00` / `#fff3e0`                            | `#ff9a2e` / `rgba(255, 125, 0, 0.16)`            | `P1` 优先级、`待验证` 状态、警告提示与确认框                 |
| 成功 / 完成  | `#00b42a` / `#e8ffea`                            | `#23c343` / `rgba(0, 180, 42, 0.16)`             | `已关闭` 状态、已完成计划项、成功轻提示                      |
| 趋势辅色     | `#2dd4bf`                                        | `#2dd4bf`                                        | 近 7 日已关闭曲线、状态分布辅助色                            |
| 忽略 / 停用  | `#86909c` / `#f5f6f8`                            | `#7a7a82` / `#121213`                            | `已忽略` 状态、已禁用成员标签                                |
| 代码块与高亮 | `--color-code-bg` `#f6f8fa` + GitHub Light token | `--color-code-bg` `#141416` + 中性暗底高亮 token | `BaseMarkdownPreview` 行内代码与 `highlight.js` 语法着色     |

### 3.5 圆角、阴影、动效与层级

| 分类     | Token               | 值                                    | 适用对象                                                     |
| -------- | ------------------- | ------------------------------------- | ------------------------------------------------------------ |
| **圆角** | `--radius-sm`       | `4px`                                 | 按钮、小号下拉、状态胶囊、标签、侧栏项、笔记条目             |
|          | `--radius-md`       | `6px`                                 | 常规输入框、常规下拉、弹窗表单控件、计划条、Bug 卡片         |
|          | `--radius-lg`       | `8px`                                 | 通用白卡片、快捷磁贴、弹窗、下拉浮层、轻提示                 |
|          | `--radius-xl`       | `12px`                                | 特殊大展示容器                                               |
|          | `--radius-full`     | `9999px`                              | 头像、状态圆点、计数徽标、滚动条滑块                         |
| **阴影** | `--shadow-card`     | `0 1px 4px rgba(15, 23, 42, 0.025)`   | 常规白色业务卡片                                             |
|          | `--shadow-popover`  | `0 10px 30px rgba(15, 23, 42, 0.1)`   | 弹窗、确认框、下拉菜单、悬浮通知栏、轻提示                   |
|          | `--shadow-drawer`   | `-8px 0 32px rgba(15, 23, 42, 0.1)`   | 右侧滑出抽屉                                                 |
|          | `--shadow-primary`  | `0 3px 10px rgba(27, 116, 255, 0.24)` | 侧边栏实心蓝激活项                                           |
| **动效** | `--transition-fast` | `0.14s ease`                          | 悬停变色、边框切换、下拉浮层淡入                             |
|          | `--transition-base` | `0.2s ease`                           | 弹窗缩放淡入、轻提示位移重排、进度条宽度过渡                 |
|          | 抽屉滑入            | `0.24s cubic-bezier(0.16, 1, 0.3, 1)` | `BaseDrawer` 抽屉位移                                        |
| **层级** | `--z-base`          | `100`                                 | 顶栏与页内悬浮菜单（顶栏 `z-index: 40`，悬浮下拉 `90`）      |
|          | `--z-overlay-start` | `2000`                                | 全局弹层基线，由 `useZIndex()` 单调递增分配，严禁写死 `9999` |

---

## 4. 字体与排版规范

### 4.1 字体栈

```scss
--font-family-sans:
  -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Inter', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
--font-family-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

- 常规界面与正文使用 `--font-family-sans`；
- Bug 编号（`BUG-104`）、快捷键提示、代码片段使用 `--font-family-mono`；
- 工作台大数字、统计指标、进度计数统一启用 `font-variant-numeric: tabular-nums`，确保数字刷新不跳动。

### 4.2 字号阶梯

| Token              | 尺寸                     | 行高建议            | 使用场景                                           |
| ------------------ | ------------------------ | ------------------- | -------------------------------------------------- |
| KPI 大数字         | `32px` / `22px` / `20px` | `1.2`               | 工作台核心统计与趋势指标（`font-weight: 700`）     |
| `--font-size-lg`   | `17px`                   | `1.45`              | 抽屉详情标题、登录页副级标题                       |
| `--font-size-md`   | `15px`                   | `1.4`               | 卡片标题、弹窗/确认框标题（`font-weight: 600`）    |
| `--font-size-base` | `14px`                   | `1.5`（控件内 `1`） | 默认正文、标准按钮、标准下拉触发器、常规输入框     |
| `--font-size-sm`   | `13px`                   | `1.6 ~ 1.75`        | 列表行文案、描述正文、轻提示内容、弹窗说明         |
| `--font-size-xs`   | `12px`                   | `1.4`（控件内 `1`） | 表头、辅助时间、小号下拉、状态胶囊、标签与筛选文案 |

### 4.3 按钮与单行控件垂直居中约定（Windows 适配）

为消除 Windows 微软雅黑字体度量不对称及奇数像素舍入造成的“文字偏下”观感，所有固定高度的单行交互控件（按钮、下拉触发器、胶囊标签）必须遵守：

1. 显式声明 `line-height: 1;`、`white-space: nowrap;`、`vertical-align: middle;`；
2. 优先使用**偶数像素字号**搭配**偶数像素内容区高度**（例如 `height: 32px` 减 `2px` border 得 `30px` 内容高，配 `14px` 或 `12px` 字号；`height: 36px` 配 `14px`；`height: 26px` 胶囊配 `12px`）。

---

## 5. 布局与空间规范

### 5.1 间距基准

- 全站采用 **`4px` 基准网格**，常用间距阶梯：`6px` / `8px` / `10px` / `12px` / `14px` / `16px` / `20px` / `22px`。
- 卡片之间统一 `gap: 16px`；卡片内部标准内边距 `padding: 20px 22px`；表单字段上下间距 `14px ~ 18px`。

### 5.2 三类页面壳层

| 壳层             | 适用页面                                  | 关键尺寸与结构                                                                                                                                    |
| ---------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **登录全屏壳**   | `/login`                                  | 左右双栏 `100vh`：左侧 `48%` 浅蓝渐变（`#f3f8ff → #eaf2ff`）展示品牌与 3 条白底蓝边能力卡片；右侧纯白居中登录表单（宽 `370px`）                   |
| **成员工作台壳** | `/dashboard`、`/bugs`、`/notes`、`/plans` | 顶栏高 `56px`（纯白 + 底部分割线）+ 左侧导航宽 `212px`（纯白 + 右侧分割线）+ 右侧浅灰画布 `padding: 18px 20px 36px` 独立纵向滚动                  |
| **超管极简壳**   | `/admin/users`                            | 保留同款 `56px` 纯白顶栏（显示 `SnapBug. / Admin Console` + 右侧超管菜单），**不显示研发侧边栏**，画布居中呈现成员管理单页（最大内容宽 `1200px`） |

### 5.3 核心业务页布局模板

- **工作台（Bento 双栏）**：`grid-template-columns: 1fr 310px; gap: 16px`；左栏上排为「状态环形统计（`1.08fr`）+ 今日周日历时间轴（`1fr`）」，中排为 6 列浅蓝快捷磁贴，下排为近 7 日双曲线趋势图；右栏依次为问候与团队卡片、冰蓝竖条近期笔记、待处理 Bug 快捷列表。
- **Bug 追踪**：白色主卡片承载顶部工具栏（项目下拉 + 视角 Tabs + 搜索 + 状态筛选 + 列表/卡片分段切换 + 主操作按钮），下方支持 **7 列 Grid Table** 与 **`minmax(310px, 1fr)` 左竖条色标卡片网格**无缝切换。
- **个人笔记**：双栏全高布局 `grid-template-columns: 280px 1fr; height: calc(100vh - 94px)`，左侧笔记检索与列表，右侧 Markdown 编辑 / 预览画布。
- **工作计划**：居中单栏聚焦流 `max-width: 900px`，顶部日期切换与进度条，下方按「未完成（冰蓝底蓝竖条）/ 已完成（灰底绿竖条）」展示任务流。

---

## 6. 核心组件与交互规范

### 6.1 已验收的 12 大基础积木（Stage 1 底座）

| 能力                                            | 引入方式                                            | 核心规范与典型场景                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **按钮** `<base-button>`                        | 自动扫描（`components/base/base-button`）           | 5 种变体（`default` / `primary` / `soft` / `danger` / `ghost`）、3 档尺寸（`sm` / `md` / `lg`）、前置图标与 `loading` 异步防连点态，内置 `line-height: 1` 居中规范                                                                                                                                                             |
| **输入框** `<base-input>`                       | 自动扫描（`components/base/base-input`）            | 支持单行（`text` / `password` / `search` / `email` / `number`）与多行 `textarea`，支持 `clearable`、`showPassword` 明文切换、`showWordLimit`、`prefixIcon`，自动联动父级 `<base-form-item>` 校验与错误态红框                                                                                                                   |
| **表单校验** `<base-form>` / `<base-form-item>` | 自动扫描（`components/base/base-form*`）            | 复刻 Element Plus `ElForm` 注入协议与零依赖 TypeScript 校验引擎：支持 `top` / `left` / `right` 标签布局、必填星号、`min`/`max`/`pattern`/同步异步 `validator`、`blur`/`change` 触发，暴露 `validate()` / `validateField()` / `resetFields()` / `clearValidate()`，与 `<base-input>`、`<base-select>`、`<base-upload>` 无缝联动 |
| **下拉选择** `<base-select>`                    | 自动扫描（`components/base/base-select`）           | 常规 `md`（`36px`）用于弹窗表单，紧凑 `sm`（`32px`）用于工具栏筛选，`variant="pill"`（`26px`）用于列表/抽屉内彩色状态直接切换；支持 `filterable`、`clearable`、`#selected`/`#option` 插槽，下拉面板 Teleport 至 `body` 且自动向上翻转，支持表单校验联动                                                                        |
| **弹窗** `<base-dialog>`                        | 自动扫描（`components/base/base-dialog`）           | 默认宽 `560px`（汇报/导入等宽弹窗可用 `640px`），自带 `useZIndex` + `useScrollLock` + `useEscapeStack` + 遮罩拖拽防误关；用于快速提 Bug、新建项目、工作汇报、成员新增/导入、修改密码                                                                                                                                           |
| **抽屉** `<base-drawer>`                        | 自动扫描（`components/base/base-drawer`）           | 默认右侧滑出 `direction="rtl"`、`size="520"`，使用浅遮罩 `--color-bg-mask-light`；用于 Bug 详情查看、属性快改与活动/评论时间线                                                                                                                                                                                                 |
| **图片预览** `<base-image-preview>`             | 自动扫描（`components/base/base-image-preview`）    | 复刻 Element Plus `ElImageViewer` 交互：深色毛玻璃灯箱、多图左右切换、滚轮/快捷键缩放（`25% ~ 500%`）、拖拽平移、90° 左右旋转、原始/适应尺寸切换与 Esc 关闭；用于 Bug 截图附件与 Markdown 内嵌图放大查看                                                                                                                       |
| **统一上传** `<base-upload>`                    | 自动扫描（`components/base/base-upload`）           | 统一承载图片、视频与普通文件上传，支持拖拽、点击与 `Ctrl+V` 粘贴截图；通过 `valueType`（`'file' \| 'base64'`）控制 `v-model` 绑定值，内置图片灯箱与视频播放弹窗、体积/数量/格式校验与 Object URL 自动回收                                                                                                                      |
| **Markdown 预览** `<base-markdown-preview>`     | 自动扫描（`components/base/base-markdown-preview`） | 基于 `markdown-it-ts`（禁用原生 HTML 防 XSS）+ `highlight.js` 按需注册语言；代码块带语言栏与一键复制按钮，样式收敛在 `assets/styles/modules/markdown.scss`（零 `:deep()`）并自动适配亮/暗双主题，点击文档内图片自动联动 `<base-image-preview>`                                                                                 |
| **分页** `<base-pagination>`                    | 自动扫描（`components/base/base-pagination`）       | 展示总条数 + 上一页 + 智能省略号页码 + 下一页，支撑 Bug 列表与超管成员列表分页                                                                                                                                                                                                                                                 |
| **空态** `<base-empty>`                         | 自动扫描（`components/base/base-empty`）            | 统一图标 + 主副文案 + `#action` 插槽，支持 `compact` 紧凑态，覆盖列表空筛选、无笔记、无计划与无通知                                                                                                                                                                                                                            |
| **轻提示 / 确认框** `message` / `confirm`       | `import { message, confirm } from '@/feedback'`     | `message` 顶部居中堆叠重排 + 同文案分组；`confirm` 返回 `Promise<boolean>` + 危险变体 + `beforeConfirm` 异步防连点 loading                                                                                                                                                                                                     |

> 辅以通用基础件：`<base-icon>`（按需登记 Lucide 图标，统一 `stroke-width: 2`）与 `<base-circle-loading>`（按钮/异步区轻量加载态）。

### 6.2 常用轻量控件规格（按 BEM 复用，无需过度抽象）

- **按钮（`height: 32px`，`padding: 0 14px`，`radius: 4px`，`14px`，`line-height: 1`）**：
  - 主按钮（Primary）：实心 `--color-primary` + 白字（每个页面/弹窗视觉焦点最多 1 个主按钮）；
  - 软强调按钮（Soft）：`--color-primary-tint` 底 + `--color-primary-line` 边框 + 蓝字（用于 AI 优化、AI 提炼、AI 润色等特色动作）；
  - 次级按钮（Default）：纯白底 + `--color-border-soft` 边框，Hover 切主色；
  - 危险按钮（Danger）：浅红底 `--color-danger-bg` + 红边框红字（确认弹框主危险操作用实心 `--color-danger`）。
- **Outline 蓝线框 Tabs**：`height: 30px`、`padding: 0 14px`、`radius: 4px`；未激活灰边框灰字，激活态仅切换为蓝色边框 + 蓝色加粗文字（纯白底，不堆砌重色块），用于 Bug 视角切换（指派给我 / 我提交的 / 全部）与月报/周报切换。
- **分段视图切换（View Toggle）**：浅灰底容器（`--color-bg-canvas`，`padding: 2px`）内嵌白色激活滑块 + 极轻投影，用于列表/卡片视图与 Markdown 编辑/预览切换。
- **单行输入框**：表单常规高 `36px`（登录页 `40px`），工具栏搜索框高 `32px`，聚焦统一调用 `@include focus-ring`。
- **顶栏 Hover 悬浮面板**：通知铃铛（宽 `356px`）与用户头像（宽 `210px`）采用无缝 Hover 触发 + 向上 `4px` 微动淡入，避免多余点击。

### 6.3 快捷键与高频反馈原则

- 全局快捷键 **`C`** 在非输入焦点状态下直接呼出「快速提 Bug」弹窗；
- 所有弹层均支持 **`Esc` 逐层关闭**（如在抽屉内打开确认框，按一次 `Esc` 仅关闭确认框，不误关抽屉）；
- 状态切至「待验证」触发自动回指提单人时，必须给出明确的 `message` 反馈文案，让隐式流转完全透明。

---

## 7. 业务语义映射与可视化规范

### 7.1 Bug 五态色彩规范

| 枚举值     | 中文文案 | `BaseSelect` `tone` | 背景色    | 文字/圆点色 |
| ---------- | -------- | ------------------- | --------- | ----------- |
| `OPEN`     | 待处理   | `danger`            | `#ffece8` | `#f53f3f`   |
| `PROGRESS` | 处理中   | `primary`           | `#eef5ff` | `#1b74ff`   |
| `VERIFY`   | 待验证   | `warning`           | `#fff3e0` | `#ff7d00`   |
| `CLOSED`   | 已关闭   | `success`           | `#e8ffea` | `#00b42a`   |
| `IGNORED`  | 已忽略   | `muted`             | `#f5f6f8` | `#86909c`   |

### 7.2 Bug 优先级规范

| 枚举值 | 展示文案 | 色值                          | 卡片左竖条与淡底            |
| ------ | -------- | ----------------------------- | --------------------------- |
| `P0`   | P0 紧急  | `--color-danger` (`#f53f3f`)  | 红竖条 + `#fffafa` 极淡红底 |
| `P1`   | P1 重要  | `--color-warning` (`#ff7d00`) | 橙竖条 + `#fffdf9` 极淡橙底 |
| `P2`   | P2 一般  | `--color-primary` (`#1b74ff`) | 蓝竖条 + `#fafcff` 极淡蓝底 |

### 7.3 ECharts 6 图表规范（`@repo/charts`）

- **状态分布环形图**：主色顺序严格对齐状态语义（待处理 `#f53f3f`、处理中 `#1b74ff`、待验证 `#ff7d00`、已关闭 `#00b42a`、已忽略 `#86909c`），关闭厚重默认图例，采用右侧自定义 2×2/2×3 对齐图例 + `tabular-nums` 数值。
- **近 7 日双曲线趋势图**：新增 Bug 用品牌蓝 `#1b74ff`（配 `15% → 0%` 浅蓝面积渐变），已关闭 Bug 用薄荷绿 `#2dd4bf`（配浅绿面积渐变）；网格线使用极淡 `#eff1f5` 虚线，隐藏坐标轴硬线。
- **生命周期铁律**：图表实例由页面/子组件持有，监听容器尺寸变化做 `resize()`，必须在 `onBeforeUnmount` 中解绑监听并调用 `chart.dispose()`。

### 7.4 空态与加载态

- **空态**：简洁居中提示（图标 + 一句明确引导文案 + 必要时一个动作按钮），上下留白 `48px 20px`，禁止堆砌花哨大插画；
- **异步加载**：按钮局部 loading 使用 `<base-circle-loading :size="14" color="currentColor" />`（或 `<base-button :loading="true">`）并同步 `disabled` 防连点；列表/抽屉首屏加载展示轻量居中加载态。

---

## 8. 前端 UI 工程硬性约束

开发所有静态与动态页面时必须同步遵守以下红线（由 ESLint + `scripts/check-architecture.mjs` 强校验）：

1. **严禁样式穿透**：禁止出现 `:deep()`、`::v-deep`、`/deep/`、`>>>`。
2. **SCSS 组织与 BEM**：
   - 组件样式 `> 50` 行必须拆至同目录 `index.scss`（`<style lang="scss" src="./index.scss" scoped>`）；
   - 严格 BEM 命名：页面 Block 用 `.page-<name>`，基础组件用 `.base-<name>`，业务组件用领域前缀（如 `.bug-drawer`、`.plan-item`），禁止 Element 嵌套 Element（`__a__b`）与无前缀裸类名。
3. **类型集中管理**：除组件私有 `Props` / `Emits` 外，所有前端类型统一定义在 `apps/web/src/types/modules/` 并经 `apps/web/src/types/index.ts` 导出；跨端实体与枚举统一引用 `@repo/shared/types`。
4. **组件与反馈边界**：
   - `components/base/` 严禁导入 `api` / `navigation` / `router` / `stores` / `views`；
   - `feedback/` 仅允许通过 `@/feedback` 导入；
   - 页面私有子组件留在 `views/<page>/components/`，仅当被 2 个及以上页面复用时才提升至 `components/business/`。
5. **资源清理与防呆**：所有 `window`/`document` 监听、定时器、ECharts 实例、SSE 连接必须在 `onBeforeUnmount` 或 `onScopeDispose` 中清理；网络异常与空数据必须有温和兜底。
