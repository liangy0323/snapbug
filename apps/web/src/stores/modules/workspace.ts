import { useAuthStore } from './auth';

import type { BugPriority, BugStatus, ReportType } from '@repo/shared/types';
import type {
  BugActivityItem,
  BugAttachmentItem,
  BugItem,
  NoteItem,
  NotificationItem,
  PlanItem,
  ProjectItem,
  TeamMember,
  WorkReportDraft,
} from '@/types';

const formatDateIso = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftDateIso = (offsetDays: number): string => {
  const target = new Date();
  target.setDate(target.getDate() + offsetDays);
  return formatDateIso(target);
};

const formatDateTimeShort = (date = new Date()): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
};

const buildInlineBugShot = (title: string, badge: string, accent: string): string => {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="880" height="480" viewBox="0 0 880 480">',
    '<rect width="880" height="480" rx="14" fill="#eef5ff" />',
    '<rect x="36" y="36" width="808" height="408" rx="10" fill="#ffffff" />',
    `<rect x="36" y="36" width="6" height="408" rx="3" fill="${accent}" />`,
    `<text x="72" y="92" font-family="sans-serif" font-size="22" font-weight="700" fill="#14181f">${title}</text>`,
    `<rect x="72" y="114" width="132" height="28" rx="6" fill="${accent}" fill-opacity="0.14" />`,
    `<text x="86" y="133" font-family="monospace" font-size="13" font-weight="700" fill="${accent}">${badge}</text>`,
    '<rect x="72" y="168" width="736" height="236" rx="8" fill="#f5f6f8" />',
    '<text x="96" y="214" font-family="monospace" font-size="14" fill="#4e5969">POST /api/orders/export 500 Internal Server Error</text>',
    '<text x="96" y="246" font-family="monospace" font-size="13" fill="#86909c">RangeError: startDate is undefined when querying order_records</text>',
    '</svg>',
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const STATUS_LABEL_MAP: Record<BugStatus, string> = {
  OPEN: '待处理',
  PROGRESS: '处理中',
  VERIFY: '待验证',
  CLOSED: '已关闭',
  IGNORED: '已忽略',
};

const PRIORITY_LABEL_MAP: Record<BugPriority, string> = {
  P0: 'P0 紧急',
  P1: 'P1 重要',
  P2: 'P2 一般',
};

const AVATAR_COLORS = ['#1b74ff', '#0ea5e9', '#10b981', '#f59e0b', '#722ed1', '#ec4899'];

/**
 * 工作台全局静态业务状态（1:1 对齐 docs/api.md 契约，后续无缝切换真实接口）
 */
export const useWorkspaceStore = defineStore('workspace', () => {
  const authStore = useAuthStore();

  const today = shiftDateIso(0);
  const todayRef = ref(today);
  const yesterday = shiftDateIso(-1);
  const tomorrow = shiftDateIso(1);

  let nextBugSeq = 109;
  let nextId = 500;

  /**
   * 全局协作弹层状态（供顶栏、工作台、列表、计划页统一唤起）
   */
  const createBugDialogVisible = ref(false);
  const activeBugId = ref<number | null>(null);
  const workReportDialogVisible = ref(false);
  const profileDialogVisible = ref(false);
  const lastSelectedProjectId = ref<number>(1);

  /**
   * 成员档案（含普通成员 + 超管成员管理数据源）
   */
  const members = ref<TeamMember[]>([
    {
      id: 2,
      account: 'linmo',
      name: '林默',
      role: 'MEMBER',
      status: 'ACTIVE',
      title: '前端开发',
      avatarColor: '#1b74ff',
      createdAt: '2026-09-12',
    },
    {
      id: 3,
      account: 'chenyuan',
      name: '陈远',
      role: 'MEMBER',
      status: 'ACTIVE',
      title: '后端开发',
      avatarColor: '#0ea5e9',
      createdAt: '2026-09-14',
    },
    {
      id: 4,
      account: 'suqing',
      name: '苏晴',
      role: 'MEMBER',
      status: 'ACTIVE',
      title: '测试工程师',
      avatarColor: '#10b981',
      createdAt: '2026-09-18',
    },
    {
      id: 5,
      account: 'zhouyi',
      name: '周亦',
      role: 'MEMBER',
      status: 'ACTIVE',
      title: '全栈开发',
      avatarColor: '#f59e0b',
      createdAt: '2026-10-03',
    },
    {
      id: 6,
      account: 'shenlan',
      name: '沈岚',
      role: 'MEMBER',
      status: 'ACTIVE',
      title: '产品设计',
      avatarColor: '#ec4899',
      createdAt: '2026-10-15',
    },
    {
      id: 7,
      account: 'zhangkai',
      name: '张凯',
      role: 'MEMBER',
      status: 'DISABLED',
      title: '外包前端',
      avatarColor: '#64748b',
      createdAt: '2026-08-22',
    },
  ]);

  /**
   * 项目列表
   */
  const projects = ref<ProjectItem[]>([
    {
      id: 1,
      name: '电商后台管理系统',
      description: '订单履约、售后退款与财务导出核心中台',
      creatorId: 2,
      memberIds: [2, 3, 4, 5],
      createdAt: '2026-09-20',
    },
    {
      id: 2,
      name: '移动端 H5 商城',
      description: 'C 端微商城、拼团营销与支付收银台',
      creatorId: 4,
      memberIds: [2, 4, 6],
      createdAt: '2026-10-02',
    },
    {
      id: 3,
      name: 'AI 工作流服务',
      description: 'SSE 流式润色、日志摘要与向量召回服务',
      creatorId: 3,
      memberIds: [2, 3, 4],
      createdAt: '2026-10-28',
    },
  ]);

  /**
   * Bug 列表
   */
  const bugs = ref<BugItem[]>([
    {
      id: 101,
      code: 'BUG-104',
      projectId: 1,
      title: '订单导出未选择时间范围时接口返回 500 报错',
      description:
        '【问题描述】\n订单列表页未选择起止时间直接点击「导出 Excel」，后端返回 HTTP 500。\n\n【复现步骤】\n1. 进入订单管理列表页；\n2. 保持起止日期为空，点击右上角「导出」按钮；\n3. 接口超时约 30s 后提示 500。\n\n【预期结果】\n默认按近 30 天导出或前端校验提示先选择时间范围。',
      aiOptimized: true,
      priority: 'P0',
      status: 'OPEN',
      creatorId: 4,
      assigneeId: 2,
      attachments: [
        {
          id: 1,
          type: 'IMAGE',
          name: 'export-500-console.png',
          url: buildInlineBugShot('BUG-104 订单导出接口 500 截图', 'HTTP 500', '#f53f3f'),
          size: 184320,
        },
      ],
      createdAt: `${today} 09:40`,
      updatedAt: `${today} 10:15`,
    },
    {
      id: 102,
      code: 'BUG-105',
      projectId: 2,
      title: 'iOS Safari 下商品详情底部购买栏被安全区遮挡',
      description:
        '在 iPhone 15 Pro Safari 浏览器打开商品详情页，底部固定操作栏未适配 env(safe-area-inset-bottom)，立即购买按钮贴底难以点击。',
      aiOptimized: false,
      priority: 'P1',
      status: 'PROGRESS',
      creatorId: 4,
      assigneeId: 2,
      attachments: [],
      createdAt: `${yesterday} 16:20`,
      updatedAt: `${today} 09:10`,
    },
    {
      id: 103,
      code: 'BUG-106',
      projectId: 3,
      title: 'SSE 流式润色在弱网断连后未释放重连定时器',
      description: '当 AI 润色接口在传输中途断开时，前端未清理 EventSource 与重试定时器，反复点击会叠加多个并发连接。',
      aiOptimized: true,
      priority: 'P0',
      status: 'VERIFY',
      creatorId: 4,
      assigneeId: 4,
      resolverId: 2,
      resolvedAt: `${today} 11:05`,
      attachments: [],
      createdAt: `${yesterday} 11:10`,
      updatedAt: `${today} 11:05`,
    },
    {
      id: 104,
      code: 'BUG-107',
      projectId: 1,
      title: '售后退款审核列表切换分页后筛选条件被重置',
      description: '筛选「待审核」状态后切到第 2 页，请求未携带 status 参数，列表退回全部数据。',
      aiOptimized: false,
      priority: 'P1',
      status: 'OPEN',
      creatorId: 4,
      assigneeId: 3,
      attachments: [],
      createdAt: `${yesterday} 14:40`,
      updatedAt: `${yesterday} 14:40`,
    },
    {
      id: 105,
      code: 'BUG-108',
      projectId: 1,
      title: '批量发货导入模板表头多一个空格导致首列解析失败',
      description: '上传包含尾部空格表头的 xlsx 文件时，后端未做 header trim，导致订单号列全部报空。',
      aiOptimized: true,
      priority: 'P2',
      status: 'CLOSED',
      creatorId: 2,
      assigneeId: 3,
      resolverId: 3,
      resolvedAt: `${shiftDateIso(-2)} 15:30`,
      closedAt: `${yesterday} 17:45`,
      attachments: [],
      createdAt: `${shiftDateIso(-3)} 10:15`,
      updatedAt: `${yesterday} 17:45`,
    },
    {
      id: 106,
      code: 'BUG-103',
      projectId: 2,
      title: '优惠券领取弹窗在超小屏下关闭按钮偏右 4px',
      description: '320px 历史旧机型样式轻微偏移，当前业务不再兼容 iPhone SE 1 代，经产品确认标记忽略。',
      aiOptimized: false,
      priority: 'P2',
      status: 'IGNORED',
      creatorId: 6,
      assigneeId: 2,
      attachments: [],
      createdAt: `${shiftDateIso(-4)} 13:20`,
      updatedAt: `${shiftDateIso(-3)} 18:00`,
    },
    {
      id: 107,
      code: 'BUG-102',
      projectId: 3,
      title: '周报汇总接口跨月边界少统计最后一天关闭的缺陷',
      description:
        '按 UTC 零点截断导致东八区最后 8 小时关闭的缺陷落到下月统计中，已改为按 Asia/Shanghai 自然日边界聚合。',
      aiOptimized: false,
      priority: 'P1',
      status: 'CLOSED',
      creatorId: 4,
      assigneeId: 3,
      resolverId: 3,
      resolvedAt: `${shiftDateIso(-3)} 14:00`,
      closedAt: `${shiftDateIso(-2)} 10:20`,
      attachments: [],
      createdAt: `${shiftDateIso(-5)} 09:30`,
      updatedAt: `${shiftDateIso(-2)} 10:20`,
    },
    {
      id: 108,
      code: 'BUG-101',
      projectId: 1,
      title: '暗黑模式下确认弹框底部操作栏色块割裂',
      description: '已统一调整弹窗/抽屉/确认框 footer 与主体同色，暗黑模式下层次清爽。',
      aiOptimized: false,
      priority: 'P2',
      status: 'CLOSED',
      creatorId: 2,
      assigneeId: 2,
      resolverId: 2,
      resolvedAt: `${shiftDateIso(-4)} 17:10`,
      closedAt: `${shiftDateIso(-4)} 17:30`,
      attachments: [],
      createdAt: `${shiftDateIso(-5)} 15:00`,
      updatedAt: `${shiftDateIso(-4)} 17:30`,
    },
  ]);

  /**
   * 活动与评论融合时间线
   */
  const activities = ref<BugActivityItem[]>([
    {
      id: 1,
      bugId: 101,
      type: 'CREATED',
      actorId: 4,
      content: '创建了缺陷并指派给 林默',
      createdAt: `${today} 09:40`,
    },
    {
      id: 2,
      bugId: 101,
      type: 'COMMENT',
      actorId: 3,
      content: '排查到导出查询缺少默认时间范围，建议前端加校验同时后端兜底近 30 天。',
      createdAt: `${today} 10:15`,
    },
    {
      id: 3,
      bugId: 102,
      type: 'CREATED',
      actorId: 4,
      content: '创建了缺陷并指派给 林默',
      createdAt: `${yesterday} 16:20`,
    },
    {
      id: 4,
      bugId: 102,
      type: 'STATUS_CHANGED',
      actorId: 2,
      content: '将状态由「待处理」变更为「处理中」',
      createdAt: `${today} 09:10`,
    },
    {
      id: 5,
      bugId: 103,
      type: 'STATUS_CHANGED',
      actorId: 2,
      content: '将状态由「处理中」变更为「待验证」，系统已自动回指给提单人 苏晴 验收',
      createdAt: `${today} 11:05`,
    },
  ]);

  /**
   * 站内通知
   */
  const notifications = ref<NotificationItem[]>([
    {
      id: 1,
      type: 'BUG_ASSIGNED',
      recipientId: 2,
      bugId: 101,
      bugCode: 'BUG-104',
      title: '苏晴 将 BUG-104 指派给了你',
      summary: '订单导出未选择时间范围时接口返回 500 报错',
      isRead: false,
      createdAt: '25 分钟前',
    },
    {
      id: 2,
      type: 'BUG_COMMENTED',
      recipientId: 2,
      bugId: 101,
      bugCode: 'BUG-104',
      title: '陈远 评论了 BUG-104',
      summary: '建议前端加校验同时后端兜底近 30 天',
      isRead: false,
      createdAt: '10 分钟前',
    },
    {
      id: 3,
      type: 'BUG_VERIFY_READY',
      recipientId: 4,
      bugId: 103,
      bugCode: 'BUG-106',
      title: '林默 已修复 BUG-106，等待你验收',
      summary: 'SSE 流式润色在弱网断连后未释放重连定时器',
      isRead: false,
      createdAt: '刚刚',
    },
  ]);

  /**
   * 个人私有 Markdown 笔记
   */
  const notes = ref<NoteItem[]>([
    {
      id: 1,
      ownerId: 2,
      title: 'NestJS + Fastify 导出超时排查笔记',
      content: `# NestJS + Fastify 导出超时排查笔记

> **结论**：订单导出接口在未传入起止时间时触发了全表扫描，导致网关 30s 超时返回 500。

## 修复要点

- 前端在提交导出前默认回填近 30 天时间范围
- 服务端 DTO 补齐 \`@IsDateString()\` 校验与默认时间兜底
- 为 \`orders(project_id, created_at DESC)\` 增加复合索引

\`\`\`typescript
export const resolveExportRange = (start?: string, end?: string) => {
  const endDate = end ? new Date(end) : new Date();
  const startDate = start ? new Date(start) : new Date(endDate.getTime() - 30 * 86400 * 1000);
  return { startDate, endDate };
};
\`\`\`
`,
      updatedAt: `${today} 10:30`,
    },
    {
      id: 2,
      ownerId: 2,
      title: 'Vue 3 零框架自研弹层栈设计备忘',
      content: `# 零第三方 UI 框架弹层治理清单

1. **层级栈**：通过 \`useZIndex()\` 从 \`2000\` 单调递增，避免抽屉与确认框互遮。
2. **滚动锁**：引用计数锁 \`useScrollLock\`，多层弹层关闭最后一层时才恢复滚动。
3. **防误关**：遮罩绑定 \`useSameTarget\`，输入框拖选文字到遮罩松手绝不误关。
4. **Esc 逐层关闭**：全局 \`useEscapeStack\` 只响应栈顶激活层。
`,
      updatedAt: `${yesterday} 19:20`,
    },
    {
      id: 3,
      ownerId: 2,
      title: 'PostgreSQL 17 + Prisma 7 迁移实践',
      content: `# Prisma 7 + pg Adapter 要点

\`\`\`sql
CREATE SEQUENCE "bug_code_seq" START WITH 101;
\`\`\`

- 所有历史报表指标从 \`bug_activities\` 的 \`STATUS_CHANGED\` 事件聚合
- 附件统一走 OSS/COS 客户端直传，绝不落应用服务器磁盘
`,
      updatedAt: `${shiftDateIso(-2)} 14:15`,
    },
  ]);

  /**
   * 个人按日工作计划
   */
  const plans = ref<PlanItem[]>([
    {
      id: 1,
      ownerId: 2,
      planDate: today,
      timeSlot: '09:30',
      title: '定位并修复订单导出 500 报错',
      completed: false,
      bugId: 101,
      bugCode: 'BUG-104',
    },
    {
      id: 2,
      ownerId: 2,
      planDate: today,
      timeSlot: '11:00',
      title: '适配 iOS Safari 底部安全区样式',
      completed: false,
      bugId: 102,
      bugCode: 'BUG-105',
    },
    {
      id: 3,
      ownerId: 2,
      planDate: today,
      timeSlot: '14:30',
      title: '完成 SSE 断连定时器清理并提测验收',
      completed: true,
      bugId: 103,
      bugCode: 'BUG-106',
    },
    {
      id: 4,
      ownerId: 2,
      planDate: today,
      timeSlot: '17:30',
      title: '整理本周 Bug 复盘与月报草稿',
      completed: false,
    },
    {
      id: 5,
      ownerId: 2,
      planDate: tomorrow,
      timeSlot: '10:00',
      title: '联调对象存储直传签名与上传组件',
      completed: false,
    },
    {
      id: 6,
      ownerId: 2,
      planDate: yesterday,
      timeSlot: '15:00',
      title: '封装 BaseForm 与 BaseUpload 基础积木',
      completed: true,
    },
  ]);

  const currentUserId = computed<number>(() => authStore.currentUser?.id ?? 2);

  const activeMembers = computed<TeamMember[]>(() => members.value.filter((item) => item.status === 'ACTIVE'));

  const visibleNotifications = computed<NotificationItem[]>(() => {
    const mine = notifications.value.filter((item) => item.recipientId === currentUserId.value);
    return mine.length > 0 ? mine : notifications.value;
  });

  const unreadNotificationCount = computed<number>(() => {
    return visibleNotifications.value.filter((item) => !item.isRead).length;
  });

  const activeBug = computed<BugItem | null>(() => {
    if (activeBugId.value === null) {
      return null;
    }
    return bugs.value.find((item) => item.id === activeBugId.value) ?? null;
  });

  const getMemberById = (userId: number): TeamMember | undefined => {
    return members.value.find((item) => item.id === userId);
  };

  const getProjectById = (projectId: number): ProjectItem | undefined => {
    return projects.value.find((item) => item.id === projectId);
  };

  const getActivitiesByBugId = (bugId: number): BugActivityItem[] => {
    return activities.value.filter((item) => item.bugId === bugId);
  };

  const openCreateBugDialog = (presetProjectId?: number): void => {
    if (presetProjectId) {
      lastSelectedProjectId.value = presetProjectId;
    }
    createBugDialogVisible.value = true;
  };

  const openBugDetail = (bugId: number): void => {
    activeBugId.value = bugId;
  };

  const closeBugDetail = (): void => {
    activeBugId.value = null;
  };

  const openWorkReportDialog = (): void => {
    workReportDialogVisible.value = true;
  };

  const openProfileDialog = (): void => {
    profileDialogVisible.value = true;
  };

  /**
   * 隐式项目授权：指派 Bug 给成员时自动加入项目成员
   */
  const ensureProjectMember = (projectId: number, userId: number): void => {
    const project = projects.value.find((item) => item.id === projectId);
    if (project && !project.memberIds.includes(userId)) {
      project.memberIds.push(userId);
    }
  };

  /**
   * 新建项目
   */
  const createProject = (payload: { name: string; description: string }): ProjectItem => {
    const project: ProjectItem = {
      id: nextId++,
      name: payload.name.trim(),
      description: payload.description.trim(),
      creatorId: currentUserId.value,
      memberIds: [currentUserId.value],
      createdAt: formatDateIso(new Date()),
    };
    projects.value.unshift(project);
    lastSelectedProjectId.value = project.id;
    return project;
  };

  /**
   * 快速提交 Bug（含自动生成 BUG-xxx 编号、隐式授权、活动日志与通知）
   */
  const createBug = (payload: {
    projectId: number;
    title: string;
    description: string;
    originalDescription?: string;
    aiOptimized?: boolean;
    priority: BugPriority;
    assigneeId: number;
    attachments?: BugAttachmentItem[];
  }): BugItem => {
    const code = `BUG-${nextBugSeq++}`;
    const nowText = formatDateTimeShort();
    const bug: BugItem = {
      id: nextId++,
      code,
      projectId: payload.projectId,
      title: payload.title.trim(),
      description: payload.description.trim(),
      originalDescription: payload.originalDescription,
      aiOptimized: Boolean(payload.aiOptimized),
      priority: payload.priority,
      status: 'OPEN',
      creatorId: currentUserId.value,
      assigneeId: payload.assigneeId,
      attachments: payload.attachments ?? [],
      createdAt: nowText,
      updatedAt: nowText,
    };

    bugs.value.unshift(bug);
    lastSelectedProjectId.value = payload.projectId;
    ensureProjectMember(payload.projectId, payload.assigneeId);

    const assignee = getMemberById(payload.assigneeId);
    activities.value.push({
      id: nextId++,
      bugId: bug.id,
      type: 'CREATED',
      actorId: currentUserId.value,
      content: `创建了缺陷并指派给 ${assignee?.name ?? '成员'}`,
      createdAt: nowText,
    });

    if (payload.assigneeId !== currentUserId.value) {
      const actorName = authStore.currentUser?.name ?? '成员';
      notifications.value.unshift({
        id: nextId++,
        type: 'BUG_ASSIGNED',
        recipientId: payload.assigneeId,
        bugId: bug.id,
        bugCode: bug.code,
        title: `${actorName} 将 ${bug.code} 指派给了你`,
        summary: bug.title,
        isRead: false,
        createdAt: '刚刚',
      });
    }

    return bug;
  };

  /**
   * 变更 Bug 状态（切至 VERIFY 自动回指提单人；离开 CLOSED 清空 closedAt）
   */
  const updateBugStatus = (bugId: number, nextStatus: BugStatus): { autoReassignedTo?: string } => {
    const bug = bugs.value.find((item) => item.id === bugId);
    if (!bug || bug.status === nextStatus) {
      return {};
    }

    const prevStatus = bug.status;
    const nowText = formatDateTimeShort();
    bug.status = nextStatus;
    bug.updatedAt = nowText;

    if (prevStatus === 'CLOSED' && nextStatus !== 'CLOSED') {
      bug.closedAt = null;
    }

    let autoReassignedTo: string | undefined;
    if (nextStatus === 'VERIFY') {
      bug.resolverId = currentUserId.value;
      bug.resolvedAt = nowText;
      if (bug.assigneeId !== bug.creatorId) {
        bug.assigneeId = bug.creatorId;
        ensureProjectMember(bug.projectId, bug.creatorId);
        autoReassignedTo = getMemberById(bug.creatorId)?.name ?? '提单人';
      }
      const actorName = authStore.currentUser?.name ?? '成员';
      notifications.value.unshift({
        id: nextId++,
        type: 'BUG_VERIFY_READY',
        recipientId: bug.creatorId,
        bugId: bug.id,
        bugCode: bug.code,
        title: `${actorName} 已修复 ${bug.code}，等待你验收`,
        summary: bug.title,
        isRead: false,
        createdAt: '刚刚',
      });
    } else if (nextStatus === 'CLOSED') {
      bug.closedAt = nowText;
    }

    activities.value.push({
      id: nextId++,
      bugId: bug.id,
      type: 'STATUS_CHANGED',
      actorId: currentUserId.value,
      content: autoReassignedTo
        ? `将状态由「${STATUS_LABEL_MAP[prevStatus]}」变更为「${STATUS_LABEL_MAP[nextStatus]}」，已自动回指提单人 ${autoReassignedTo} 验收`
        : `将状态由「${STATUS_LABEL_MAP[prevStatus]}」变更为「${STATUS_LABEL_MAP[nextStatus]}」`,
      createdAt: nowText,
    });

    return { autoReassignedTo };
  };

  /**
   * 转派 Bug（自动将新指派人加入项目成员）
   */
  const updateBugAssignee = (bugId: number, assigneeId: number): void => {
    const bug = bugs.value.find((item) => item.id === bugId);
    if (!bug || bug.assigneeId === assigneeId) {
      return;
    }

    const nowText = formatDateTimeShort();
    bug.assigneeId = assigneeId;
    bug.updatedAt = nowText;
    ensureProjectMember(bug.projectId, assigneeId);

    const target = getMemberById(assigneeId);
    activities.value.push({
      id: nextId++,
      bugId: bug.id,
      type: 'ASSIGNEE_CHANGED',
      actorId: currentUserId.value,
      content: `将指派人变更为 ${target?.name ?? '成员'}`,
      createdAt: nowText,
    });
  };

  /**
   * 调整 Bug 优先级
   */
  const updateBugPriority = (bugId: number, priority: BugPriority): void => {
    const bug = bugs.value.find((item) => item.id === bugId);
    if (!bug || bug.priority === priority) {
      return;
    }

    const nowText = formatDateTimeShort();
    bug.priority = priority;
    bug.updatedAt = nowText;

    activities.value.push({
      id: nextId++,
      bugId: bug.id,
      type: 'PRIORITY_CHANGED',
      actorId: currentUserId.value,
      content: `将优先级调整为 ${PRIORITY_LABEL_MAP[priority]}`,
      createdAt: nowText,
    });
  };

  /**
   * 发表 Bug 评论
   */
  const addBugComment = (bugId: number, content: string): void => {
    const trimmed = content.trim();
    const bug = bugs.value.find((item) => item.id === bugId);
    if (!bug || !trimmed) {
      return;
    }

    const nowText = formatDateTimeShort();
    bug.updatedAt = nowText;
    activities.value.push({
      id: nextId++,
      bugId: bug.id,
      type: 'COMMENT',
      actorId: currentUserId.value,
      content: trimmed,
      createdAt: nowText,
    });
  };

  /**
   * 标记单条或全部通知已读
   */
  const markNotificationRead = (id: number): void => {
    const item = notifications.value.find((n) => n.id === id);
    if (item) {
      item.isRead = true;
    }
  };

  const markAllNotificationsRead = (): void => {
    visibleNotifications.value.forEach((item) => {
      item.isRead = true;
    });
  };

  /**
   * 个人笔记 CRUD
   */
  const createNote = (): NoteItem => {
    const note: NoteItem = {
      id: nextId++,
      ownerId: currentUserId.value,
      title: '未命名技术笔记',
      content: '# 未命名技术笔记\n\n在这里记录排查过程、命令片段或架构决策...\n',
      updatedAt: formatDateTimeShort(),
    };
    notes.value.unshift(note);
    return note;
  };

  const updateNote = (id: number, payload: { title: string; content: string }): void => {
    const target = notes.value.find((item) => item.id === id);
    if (!target) {
      return;
    }
    target.title = payload.title;
    target.content = payload.content;
    target.updatedAt = formatDateTimeShort();
  };

  const deleteNote = (id: number): void => {
    notes.value = notes.value.filter((item) => item.id !== id);
  };

  /**
   * 工作计划 CRUD + 从 Bug 一键加入今日计划
   */
  const addPlan = (payload: {
    planDate: string;
    title: string;
    timeSlot?: string;
    bugId?: number | null;
    bugCode?: string | null;
  }): PlanItem => {
    const item: PlanItem = {
      id: nextId++,
      ownerId: currentUserId.value,
      planDate: payload.planDate,
      timeSlot: payload.timeSlot || formatDateTimeShort().slice(6),
      title: payload.title.trim(),
      completed: false,
      bugId: payload.bugId ?? null,
      bugCode: payload.bugCode ?? null,
    };
    plans.value.unshift(item);
    return item;
  };

  const addBugToTodayPlan = (bug: BugItem): { existed: boolean } => {
    const existed = plans.value.some((item) => item.planDate === today && item.bugId === bug.id);
    if (existed) {
      return { existed: true };
    }
    addPlan({
      planDate: today,
      title: `处理 ${bug.code}：${bug.title}`,
      bugId: bug.id,
      bugCode: bug.code,
    });
    return { existed: false };
  };

  const togglePlanCompleted = (id: number): void => {
    const target = plans.value.find((item) => item.id === id);
    if (target) {
      target.completed = !target.completed;
    }
  };

  const deletePlan = (id: number): void => {
    plans.value = plans.value.filter((item) => item.id !== id);
  };

  /**
   * 汇总生成月报/周报草稿
   */
  const buildWorkReportDraft = (type: ReportType, offset = 0): WorkReportDraft => {
    const now = new Date();
    let periodLabel: string;
    if (type === 'monthly') {
      const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      periodLabel = `${target.getFullYear()} 年 ${target.getMonth() + 1} 月工作月报`;
    } else {
      periodLabel = offset === 0 ? '本周研发工作周报' : '上周研发工作周报';
    }

    const resolvedBugs = bugs.value.filter((item) => item.status === 'VERIFY' || item.status === 'CLOSED');
    const closedBugs = bugs.value.filter((item) => item.status === 'CLOSED');
    const donePlans = plans.value.filter((item) => item.completed);

    const lines = [
      `# ${periodLabel}`,
      '',
      '## 一、核心交付概览',
      `- 推进解决缺陷 **${resolvedBugs.length}** 项，其中已完成验收闭环 **${closedBugs.length}** 项`,
      `- 完成既定研发计划 **${donePlans.length}** 项，沉淀技术排查笔记 **${notes.value.length}** 篇`,
      '',
      '## 二、重点 Bug 处理清单',
      ...resolvedBugs.slice(0, 5).map((b) => `- \`${b.code}\` **${b.title}**（${STATUS_LABEL_MAP[b.status]}）`),
      '',
      '## 三、已完成计划与沉淀',
      ...donePlans.slice(0, 4).map((p) => `- [${p.planDate}] ${p.title}`),
      '',
      '## 四、下阶段关注重点',
      ...bugs.value
        .filter((b) => b.status === 'OPEN' || b.status === 'PROGRESS')
        .slice(0, 3)
        .map((b) => `- 跟进 \`${b.code}\`（${PRIORITY_LABEL_MAP[b.priority]}）：${b.title}`),
    ];

    return {
      type,
      periodLabel,
      resolvedCount: resolvedBugs.length,
      closedCount: closedBugs.length,
      planDoneCount: donePlans.length,
      noteCount: notes.value.length,
      markdown: lines.join('\n'),
    };
  };

  /**
   * 超管成员管理 CRUD
   */
  const addMember = (payload: { account: string; name: string; title: string }): { ok: boolean; message?: string } => {
    const account = payload.account.trim().toLowerCase();
    if (members.value.some((item) => item.account.toLowerCase() === account)) {
      return { ok: false, message: `账号 ${account} 已存在` };
    }
    members.value.unshift({
      id: nextId++,
      account,
      name: payload.name.trim(),
      role: 'MEMBER',
      status: 'ACTIVE',
      title: payload.title.trim() || '研发工程师',
      avatarColor: AVATAR_COLORS[members.value.length % AVATAR_COLORS.length] ?? '#1b74ff',
      createdAt: formatDateIso(new Date()),
    });
    return { ok: true };
  };

  const updateMember = (id: number, payload: { name: string; title: string }): void => {
    const target = members.value.find((item) => item.id === id);
    if (target) {
      target.name = payload.name.trim();
      target.title = payload.title.trim();
    }
  };

  const toggleMemberStatus = (id: number): void => {
    const target = members.value.find((item) => item.id === id);
    if (target) {
      target.status = target.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    }
  };

  return {
    today: todayRef,
    members,
    activeMembers,
    projects,
    bugs,
    activities,
    notifications,
    visibleNotifications,
    unreadNotificationCount,
    notes,
    plans,
    createBugDialogVisible,
    activeBugId,
    activeBug,
    workReportDialogVisible,
    profileDialogVisible,
    lastSelectedProjectId,
    getMemberById,
    getProjectById,
    getActivitiesByBugId,
    openCreateBugDialog,
    openBugDetail,
    closeBugDetail,
    openWorkReportDialog,
    openProfileDialog,
    createProject,
    createBug,
    updateBugStatus,
    updateBugAssignee,
    updateBugPriority,
    addBugComment,
    markNotificationRead,
    markAllNotificationsRead,
    createNote,
    updateNote,
    deleteNote,
    addPlan,
    addBugToTodayPlan,
    togglePlanCompleted,
    deletePlan,
    buildWorkReportDraft,
    addMember,
    updateMember,
    toggleMemberStatus,
  };
});
