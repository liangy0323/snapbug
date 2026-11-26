import { useTheme } from '@/composables/use-theme';
import { message } from '@/feedback';
import { useAuthStore } from '@/stores';

import type { FormInstance, FormRules, LoginFormModel } from '@/types';

/**
 * 登录页表单状态与提交编排
 */
export const useLogin = () => {
  const authStore = useAuthStore();
  const route = useRoute();
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

  const form = reactive<LoginFormModel>({
    account: authStore.rememberedAccount || '',
    password: '',
  });
  const rememberAccount = ref(Boolean(authStore.rememberedAccount));
  const isSubmitting = ref(false);

  const rules: FormRules<LoginFormModel> = {
    account: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
    password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }],
  };

  /**
   * 校验表单并完成登录跳转
   */
  const handleSubmit = async (formRef: FormInstance | null): Promise<void> => {
    if (isSubmitting.value) {
      return;
    }

    const valid = await formRef?.validate();
    if (!valid) {
      return;
    }

    isSubmitting.value = true;
    try {
      const result = await authStore.login(form.account, form.password, rememberAccount.value);
      if (!result.ok || !result.user) {
        message.error(result.message || '登录失败，请重试');
        return;
      }

      message.success(`欢迎回来，${result.user.name}`);

      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '';
      if (result.user.role === 'ADMIN') {
        await router.replace(redirect.startsWith('/admin') ? redirect : '/admin/users');
        return;
      }

      const safeRedirect =
        redirect && !redirect.startsWith('/admin') && redirect !== '/login' ? redirect : '/dashboard';
      await router.replace(safeRedirect);
    } finally {
      isSubmitting.value = false;
    }
  };

  return {
    isDark,
    toggleTheme,
    form,
    rules,
    rememberAccount,
    isSubmitting,
    handleSubmit,
  };
};
