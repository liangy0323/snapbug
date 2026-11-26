import type {
  ActivityType,
  AttachmentType,
  BugPriority,
  BugStatus,
  NotificationType,
  ProjectJoinType,
  ReportType,
  UserRole,
  UserStatus,
} from '@repo/shared/types';

/**
 * 团队成员档案（用于项目成员、指派下拉及超管成员管理）
 */
export interface TeamMember {
  id: number;
  account: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  title: string;
  avatarColor: string;
  createdAt: string;
}

/**
 * 项目实体
 */
export interface ProjectItem {
  id: number;
  name: string;
  description: string;
  creatorId: number;
  memberIds: number[];
  createdAt: string;
}

/**
 * 项目成员关系（用于演示隐式项目授权来源）
 */
export interface ProjectMemberRecord {
  projectId: number;
  userId: number;
  joinedVia: ProjectJoinType;
}

/**
 * Bug 媒体附件
 */
export interface BugAttachmentItem {
  id: number;
  type: AttachmentType;
  name: string;
  url: string;
  size: number;
}

/**
 * Bug 活动与评论时间线条目
 */
export interface BugActivityItem {
  id: number;
  bugId: number;
  type: ActivityType;
  actorId: number;
  content: string;
  createdAt: string;
}

/**
 * Bug 主实体
 */
export interface BugItem {
  id: number;
  code: string;
  projectId: number;
  title: string;
  description: string;
  originalDescription?: string;
  aiOptimized: boolean;
  priority: BugPriority;
  status: BugStatus;
  creatorId: number;
  assigneeId: number;
  resolverId?: number | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  attachments: BugAttachmentItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 站内通知条目
 */
export interface NotificationItem {
  id: number;
  type: NotificationType;
  recipientId: number;
  bugId: number;
  bugCode: string;
  title: string;
  summary: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * 个人私有 Markdown 笔记
 */
export interface NoteItem {
  id: number;
  ownerId: number;
  title: string;
  content: string;
  updatedAt: string;
}

/**
 * 个人按日工作计划条目
 */
export interface PlanItem {
  id: number;
  ownerId: number;
  planDate: string;
  timeSlot: string;
  title: string;
  completed: boolean;
  bugId?: number | null;
  bugCode?: string | null;
}

/**
 * 工作汇报生成结果
 */
export interface WorkReportDraft {
  type: ReportType;
  periodLabel: string;
  resolvedCount: number;
  closedCount: number;
  planDoneCount: number;
  noteCount: number;
  markdown: string;
}

/**
 * 个人笔记编辑器视图模式
 */
export type NoteEditorMode = 'edit' | 'split' | 'preview';

/**
 * 超管新增/编辑成员表单模型
 */
export interface MemberFormModel {
  account: string;
  name: string;
  title: string;
  password: string;
}

/**
 * 超管重置成员密码表单模型
 */
export interface ResetPasswordFormModel {
  newPassword: string;
  confirmPassword: string;
}

/**
 * 成员 Excel 批量导入预检行
 */
export interface MemberImportPreviewRow {
  rowNum: number;
  account: string;
  name: string;
  title: string;
  password: string;
  valid: boolean;
  error?: string;
}
