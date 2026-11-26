<template>
  <base-dialog v-model="visible" title="账号与安全设置" :width="460" destroy-on-close>
    <div class="profile-dialog">
      <div class="profile-dialog__tabs">
        <button
          type="button"
          class="profile-dialog__tab"
          :class="{ 'profile-dialog__tab--active': activeTab === 'profile' }"
          @click="activeTab = 'profile'"
        >
          个人资料
        </button>
        <button
          type="button"
          class="profile-dialog__tab"
          :class="{ 'profile-dialog__tab--active': activeTab === 'password' }"
          @click="activeTab = 'password'"
        >
          修改密码
        </button>
      </div>

      <base-form
        v-if="activeTab === 'profile'"
        ref="profileFormRef"
        :model="profileForm"
        :rules="profileRules"
        @submit="handleSaveProfile"
      >
        <base-form-item label="登录账号">
          <base-input :model-value="currentUser?.account || ''" disabled />
        </base-form-item>
        <base-form-item label="姓名" prop="name">
          <base-input v-model="profileForm.name" clearable />
        </base-form-item>
        <base-form-item label="岗位说明" prop="title">
          <base-input v-model="profileForm.title" clearable />
        </base-form-item>
      </base-form>

      <base-form v-else ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" @submit="handleSavePassword">
        <base-form-item label="当前密码" prop="oldPassword">
          <base-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入当前密码" />
        </base-form-item>
        <base-form-item label="新密码" prop="newPassword">
          <base-input v-model="passwordForm.newPassword" type="password" show-password placeholder="至少 6 位字符" />
        </base-form-item>
        <base-form-item label="确认新密码" prop="confirmPassword">
          <base-input
            v-model="passwordForm.confirmPassword"
            type="password"
            show-password
            placeholder="再次输入新密码"
          />
        </base-form-item>
      </base-form>
    </div>

    <template #footer="{ close }">
      <base-button @click="close">取消</base-button>
      <base-button variant="primary" @click="activeTab === 'profile' ? handleSaveProfile() : handleSavePassword()">
        保存更改
      </base-button>
    </template>
  </base-dialog>
</template>

<script setup lang="ts">
import { message } from '@/feedback';
import { useAuthStore, useWorkspaceStore } from '@/stores';

import type { FormInstance, FormRules } from '@/types';

const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();
const { currentUser } = storeToRefs(authStore);
const { profileDialogVisible: visible } = storeToRefs(workspaceStore);

const activeTab = ref<'profile' | 'password'>('profile');
const profileFormRef = useTemplateRef<FormInstance | null>('profileFormRef');
const passwordFormRef = useTemplateRef<FormInstance | null>('passwordFormRef');

const profileForm = reactive({ name: '', title: '' });
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' });

const profileRules: FormRules<typeof profileForm> = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
};

const passwordRules: FormRules<typeof passwordForm> = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码不少于 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      trigger: 'blur',
      validator: (value) => (value === passwordForm.newPassword ? true : '两次输入的新密码不一致'),
    },
  ],
};

watch(visible, (opened) => {
  if (opened) {
    activeTab.value = 'profile';
    profileForm.name = currentUser.value?.name || '';
    profileForm.title = currentUser.value?.title || '';
    passwordForm.oldPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
  }
});

const handleSaveProfile = async (): Promise<void> => {
  const valid = await profileFormRef.value?.validate();
  if (!valid) {
    return;
  }
  authStore.updateProfile(profileForm);
  visible.value = false;
  message.success('个人资料已更新');
};

const handleSavePassword = async (): Promise<void> => {
  const valid = await passwordFormRef.value?.validate();
  if (!valid) {
    return;
  }
  visible.value = false;
  message.success('登录密码修改成功');
};
</script>

<style lang="scss" scoped>
.profile-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__tabs {
    display: inline-flex;
    gap: 8px;
  }

  &__tab {
    height: 30px;
    padding: 0 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border-soft);
    background-color: var(--color-bg-surface);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    line-height: 1;
    cursor: pointer;

    &--active {
      border-color: var(--color-primary);
      color: var(--color-primary);
      font-weight: 600;
    }
  }
}
</style>
