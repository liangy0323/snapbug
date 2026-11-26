import { useTheme } from '@/composables/use-theme';
import { message } from '@/feedback';
import { useAuthStore } from '@/stores';

import { buildGrainPalette, readPrimaryColorHex } from '../components/grain-gradient/palette';

import type { FormInstance, FormRules, LoginFormModel } from '@/types';

/**
 * 登录页表单状态、提交编排与动态背景配色联动
 */
export const useLogin = () => {
  const authStore = useAuthStore();
  const route = useRoute();
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

  const resolveGradientColors = (): string[] => {
    const fallback = isDark.value ? '#3b82f6' : '#1b74ff';
    return buildGrainPalette(readPrimaryColorHex(fallback), isDark.value);
  };

  const gradientColors = ref<string[]>(resolveGradientColors());

  const syncGradientColors = (): void => {
    gradientColors.value = resolveGradientColors();
  };

  watch(isDark, () => {
    nextTick(syncGradientColors);
  });

  let themeObserver: MutationObserver | null = null;
  onMounted(() => {
    syncGradientColors();
    themeObserver = new MutationObserver(syncGradientColors);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style', 'class'],
    });
  });

  onBeforeUnmount(() => {
    themeObserver?.disconnect();
    themeObserver = null;
  });

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
    gradientColors,
    form,
    rules,
    rememberAccount,
    isSubmitting,
    handleSubmit,
  };
};
