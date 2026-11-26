import { expect, test } from '@rstest/core';

import { matchesTrigger, validateFieldRules } from '@/components/base/base-form/form-context';

import type { FormRuleItem } from '@/types';

test('validateFieldRules 校验必填、长度、正则与同步/异步自定义规则', async () => {
  const rules: FormRuleItem[] = [
    { required: true, message: '标题不能为空' },
    { min: 4, max: 10, message: '标题长度需在 4~10 之间' },
    { pattern: /^BUG-/, message: '必须以 BUG- 开头' },
    {
      validator: async (value) => {
        await Promise.resolve();
        return value === 'BUG-999' ? '该编号已被占用' : true;
      },
    },
  ];

  expect(await validateFieldRules('   ', rules, {}, '标题')).toBe('标题不能为空');
  expect(await validateFieldRules('BUG', rules, {}, '标题')).toBe('标题长度需在 4~10 之间');
  expect(await validateFieldRules('TASK-101', rules, {}, '标题')).toBe('必须以 BUG- 开头');
  expect(await validateFieldRules('BUG-999', rules, {}, '标题')).toBe('该编号已被占用');
  expect(await validateFieldRules('BUG-104', rules, {}, '标题')).toBe('');
});

test('matchesTrigger 正确匹配 blur 与 change 触发时机', () => {
  expect(matchesTrigger({ required: true }, 'blur')).toBe(true);
  expect(matchesTrigger({ required: true, trigger: 'blur' }, 'blur')).toBe(true);
  expect(matchesTrigger({ required: true, trigger: 'blur' }, 'change')).toBe(false);
  expect(matchesTrigger({ required: true, trigger: ['blur', 'change'] }, 'change')).toBe(true);
});
