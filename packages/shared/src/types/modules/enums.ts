/**
 * 用户角色
 */
export type UserRole = 'ADMIN' | 'MEMBER';

/**
 * 用户账号状态
 */
export type UserStatus = 'ACTIVE' | 'DISABLED';

/**
 * 项目成员加入来源
 */
export type ProjectJoinType = 'CREATOR' | 'ASSIGNED' | 'MANUAL';

/**
 * Bug 生命周期状态
 */
export type BugStatus = 'OPEN' | 'PROGRESS' | 'VERIFY' | 'CLOSED' | 'IGNORED';

/**
 * Bug 优先级
 */
export type BugPriority = 'P0' | 'P1' | 'P2';

/**
 * Bug 附件媒体类型
 */
export type AttachmentType = 'IMAGE' | 'VIDEO';

/**
 * Bug 活动时间线类型
 */
export type ActivityType = 'CREATED' | 'COMMENT' | 'STATUS_CHANGED' | 'ASSIGNEE_CHANGED' | 'PRIORITY_CHANGED';

/**
 * 站内通知事件类型
 */
export type NotificationType = 'BUG_ASSIGNED' | 'BUG_REASSIGNED' | 'BUG_VERIFY_READY' | 'BUG_COMMENTED';

/**
 * 工作汇报周期类型（默认月报）
 */
export type ReportType = 'monthly' | 'weekly';

/**
 * 对象存储上传业务场景
 */
export type StorageUploadScene = 'bug_attachment' | 'note_image' | 'avatar';
