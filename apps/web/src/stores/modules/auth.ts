import type { AuthUser } from '@/types';

const STATIC_USERS_BY_ACCOUNT: Record<string, { password: string; user: AuthUser }> = {
  linmo: {
    password: '123456',
    user: {
      id: 2,
      account: 'linmo',
      name: '林默',
      role: 'MEMBER',
      status: 'ACTIVE',
      title: '前端开发',
      avatarColor: '#1b74ff',
    },
  },
  chenyuan: {
    password: '123456',
    user: {
      id: 3,
      account: 'chenyuan',
      name: '陈远',
      role: 'MEMBER',
      status: 'ACTIVE',
      title: '后端开发',
      avatarColor: '#0ea5e9',
    },
  },
  suqing: {
    password: '123456',
    user: {
      id: 4,
      account: 'suqing',
      name: '苏晴',
      role: 'MEMBER',
      status: 'ACTIVE',
      title: '测试工程师',
      avatarColor: '#10b981',
    },
  },
  admin: {
    password: 'admin123',
    user: {
      id: 1,
      account: 'admin',
      name: '系统超管',
      role: 'ADMIN',
      status: 'ACTIVE',
      title: '超级管理员',
      avatarColor: '#722ed1',
    },
  },
};

export const useAuthStore = defineStore(
  'auth',
  () => {
    const token = ref('');
    const currentUser = ref<AuthUser | null>(null);
    const rememberedAccount = ref('');

    const isAuthenticated = computed(() => Boolean(token.value && currentUser.value));
    const isAdmin = computed(() => currentUser.value?.role === 'ADMIN');

    /**
     * 静态阶段登录校验（后续替换为真实 POST /api/auth/login）
     */
    const login = async (
      account: string,
      password: string,
      remember: boolean,
    ): Promise<{ ok: boolean; message?: string; user?: AuthUser }> => {
      const normalizedAccount = account.trim().toLowerCase();
      await new Promise((resolve) => setTimeout(resolve, 240));

      const matched = STATIC_USERS_BY_ACCOUNT[normalizedAccount];
      if (!matched || matched.password !== password) {
        return { ok: false, message: '账号或密码错误，请核对后重试' };
      }

      token.value = `snapbug_token_${matched.user.id}_${Date.now()}`;
      currentUser.value = { ...matched.user };
      rememberedAccount.value = remember ? account.trim() : '';
      return { ok: true, user: matched.user };
    };

    /**
     * 更新当前用户个人资料
     */
    const updateProfile = (payload: { name: string; title: string }): void => {
      if (!currentUser.value) {
        return;
      }
      currentUser.value = {
        ...currentUser.value,
        name: payload.name.trim(),
        title: payload.title.trim(),
      };
    };

    /**
     * 退出登录并清空当前会话
     */
    const logout = (): void => {
      token.value = '';
      currentUser.value = null;
    };

    return {
      token,
      currentUser,
      rememberedAccount,
      isAuthenticated,
      isAdmin,
      login,
      updateProfile,
      logout,
    };
  },
  {
    persist: {
      key: 'APP_PINIA_AUTH',
      pick: ['token', 'currentUser', 'rememberedAccount'],
    },
  },
);
