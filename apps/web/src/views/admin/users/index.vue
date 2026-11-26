<template>
  <div class="admin-users-page">
    <header class="admin-users__header">
      <div>
        <h1 class="admin-users__title">团队成员管理</h1>
        <p class="admin-users__subtitle">
          统一维护研发成员登录账号、启用状态与批量导入。所有成员在工作台拥有平等的跨项目协作权限。
        </p>
      </div>

      <div class="admin-users__kpis">
        <div class="admin-kpi">
          <span class="admin-kpi__label">总成员数</span>
          <strong class="admin-kpi__value">{{ totalMembersCount }}</strong>
        </div>
        <div class="admin-kpi">
          <span class="admin-kpi__label">启用中</span>
          <strong class="admin-kpi__value admin-kpi__value--success">{{ activeMembersCount }}</strong>
        </div>
        <div class="admin-kpi">
          <span class="admin-kpi__label">已禁用</span>
          <strong class="admin-kpi__value admin-kpi__value--muted">{{ disabledMembersCount }}</strong>
        </div>
      </div>
    </header>

    <section class="admin-users__card">
      <div class="admin-users__toolbar">
        <div class="admin-users__filters">
          <div class="admin-users__search">
            <base-input
              v-model="keyword"
              size="sm"
              prefix-icon="Search"
              clearable
              placeholder="搜索姓名、登录账号或岗位..."
            />
          </div>
          <div class="admin-users__status-select">
            <base-select v-model="statusFilter" size="sm" clearable placeholder="全部状态" :options="STATUS_OPTIONS" />
          </div>
        </div>

        <div class="admin-users__actions">
          <base-button size="sm" icon="FileSpreadsheet" @click="openImportDialog">Excel 批量导入</base-button>
          <base-button variant="primary" size="sm" icon="Plus" @click="openCreateMember">新增成员</base-button>
        </div>
      </div>

      <div v-if="pagedMembers.length > 0" class="admin-users__table-wrap">
        <table class="admin-users-table">
          <thead>
            <tr>
              <th>成员</th>
              <th>登录账号</th>
              <th>岗位</th>
              <th>账号状态</th>
              <th>创建时间</th>
              <th class="admin-users-table__ops-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in pagedMembers" :key="member.id">
              <td>
                <div class="admin-member-cell">
                  <span class="admin-member-cell__avatar" :style="{ backgroundColor: member.avatarColor }">
                    {{ member.name.slice(0, 1) }}
                  </span>
                  <span class="admin-member-cell__name">{{ member.name }}</span>
                </div>
              </td>
              <td>
                <span class="admin-users-table__account">{{ member.account }}</span>
              </td>
              <td>
                <span class="admin-users-table__title">{{ member.title }}</span>
              </td>
              <td>
                <span
                  class="admin-status-pill"
                  :class="member.status === 'ACTIVE' ? 'admin-status-pill--active' : 'admin-status-pill--disabled'"
                >
                  <span class="admin-status-pill__dot" />
                  {{ member.status === 'ACTIVE' ? '启用中' : '已禁用' }}
                </span>
              </td>
              <td class="admin-users-table__date">{{ member.createdAt }}</td>
              <td class="admin-users-table__ops-col">
                <div class="admin-users-table__ops">
                  <base-button size="sm" variant="ghost" @click="openEditMember(member)">编辑</base-button>
                  <base-button size="sm" variant="ghost" @click="openResetPassword(member)">重置密码</base-button>
                  <base-button
                    size="sm"
                    :variant="member.status === 'ACTIVE' ? 'ghost' : 'soft'"
                    @click="handleToggleStatus(member)"
                  >
                    {{ member.status === 'ACTIVE' ? '禁用' : '启用' }}
                  </base-button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <base-empty v-else title="暂无符合条件的成员" description="尝试清除筛选条件，或点击右上角新增 / 批量导入成员" />

      <div v-if="filteredMembers.length > pageSize" class="admin-users__pagination">
        <base-pagination v-model:current-page="currentPage" :total="filteredMembers.length" :page-size="pageSize" />
      </div>
    </section>

    <base-dialog v-model="memberDialogVisible" :title="isEditing ? '编辑成员资料' : '新增研发成员'" width="460px">
      <base-form ref="memberFormRef" :model="memberForm" :rules="memberRules">
        <base-form-item label="登录账号" prop="account" required>
          <base-input
            v-model="memberForm.account"
            :disabled="isEditing"
            placeholder="例如：wanghao（字母/数字/下划线）"
          />
        </base-form-item>
        <base-form-item label="成员姓名" prop="name" required>
          <base-input v-model="memberForm.name" placeholder="请输入真实姓名" />
        </base-form-item>
        <base-form-item label="岗位职责" prop="title" required>
          <base-input v-model="memberForm.title" placeholder="例如：后端开发 / 测试工程师" />
        </base-form-item>
        <base-form-item v-if="!isEditing" label="初始密码" prop="password" required>
          <base-input v-model="memberForm.password" type="password" show-password placeholder="至少 6 位初始密码" />
        </base-form-item>
      </base-form>

      <template #footer>
        <base-button @click="memberDialogVisible = false">取消</base-button>
        <base-button variant="primary" @click="handleSubmitMember">
          {{ isEditing ? '保存修改' : '确认创建' }}
        </base-button>
      </template>
    </base-dialog>

    <base-dialog v-model="resetDialogVisible" title="重置登录密码" width="420px">
      <p v-if="resetTargetMember" class="admin-reset-tip">
        正在为 <strong>{{ resetTargetMember.name }}</strong
        >（<code>{{ resetTargetMember.account }}</code
        >）设置新密码。
      </p>
      <base-form ref="resetFormRef" :model="resetForm" :rules="resetRules">
        <base-form-item label="新密码" prop="newPassword" required>
          <base-input
            v-model="resetForm.newPassword"
            type="password"
            show-password
            placeholder="请输入 6~32 位新密码"
          />
        </base-form-item>
        <base-form-item label="确认新密码" prop="confirmPassword" required>
          <base-input
            v-model="resetForm.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入新密码"
          />
        </base-form-item>
      </base-form>

      <template #footer>
        <base-button @click="resetDialogVisible = false">取消</base-button>
        <base-button variant="primary" @click="handleSubmitReset">确认重置</base-button>
      </template>
    </base-dialog>

    <base-dialog v-model="importDialogVisible" title="Excel 批量导入成员" width="640px">
      <div class="admin-import">
        <div class="admin-import__tip">
          <span>支持 .xlsx / .xls / .csv 表格，首行表头需包含 account、name、title、password。</span>
          <base-button size="sm" variant="soft" icon="Download" @click="handleDownloadTemplate">下载模板</base-button>
        </div>

        <base-upload
          v-model="importFile"
          media-type="file"
          value-type="file"
          accept=".xlsx,.xls,.csv"
          :multiple="false"
          tip="点击选择或拖拽成员表格到此处，系统将自动校验账号冲突与必填项"
        />

        <div v-if="importPreviewRows.length > 0" class="admin-import__preview">
          <div class="admin-import__summary">
            <span>共解析 {{ importPreviewRows.length }} 条记录</span>
            <span class="admin-import__badge admin-import__badge--valid">可导入 {{ validImportRows.length }} 条</span>
            <span v-if="invalidImportRows.length > 0" class="admin-import__badge admin-import__badge--error">
              异常 {{ invalidImportRows.length }} 条
            </span>
          </div>

          <div class="admin-import__table-wrap">
            <table class="admin-import-table">
              <thead>
                <tr>
                  <th>行号</th>
                  <th>账号</th>
                  <th>姓名</th>
                  <th>岗位</th>
                  <th>校验状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in importPreviewRows" :key="row.rowNum">
                  <td class="admin-import-table__num">#{{ row.rowNum }}</td>
                  <td class="admin-import-table__mono">{{ row.account || '-' }}</td>
                  <td>{{ row.name || '-' }}</td>
                  <td>{{ row.title }}</td>
                  <td>
                    <span v-if="row.valid" class="admin-import-table__ok">校验通过</span>
                    <span v-else class="admin-import-table__err">{{ row.error }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <template #footer>
        <base-button @click="importDialogVisible = false">取消</base-button>
        <base-button
          variant="primary"
          :disabled="validImportRows.length === 0 || importParsing"
          :loading="importParsing"
          @click="handleConfirmImport"
        >
          导入有效成员（{{ validImportRows.length }}）
        </base-button>
      </template>
    </base-dialog>
  </div>
</template>

<script setup lang="ts">
import { useAdminUsers } from './composables/use-admin-users';

const {
  STATUS_OPTIONS,
  keyword,
  statusFilter,
  currentPage,
  pageSize,
  totalMembersCount,
  activeMembersCount,
  disabledMembersCount,
  filteredMembers,
  pagedMembers,
  memberDialogVisible,
  isEditing,
  memberFormRef,
  memberForm,
  memberRules,
  resetDialogVisible,
  resetTargetMember,
  resetFormRef,
  resetForm,
  resetRules,
  importDialogVisible,
  importFile,
  importPreviewRows,
  importParsing,
  validImportRows,
  invalidImportRows,
  openCreateMember,
  openEditMember,
  handleSubmitMember,
  openResetPassword,
  handleSubmitReset,
  handleToggleStatus,
  openImportDialog,
  handleDownloadTemplate,
  handleConfirmImport,
} = useAdminUsers();
</script>

<style scoped lang="scss" src="./index.scss"></style>
