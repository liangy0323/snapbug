import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

import { PrismaClient, UserRole, UserStatus } from '../generated/prisma/client.js';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * 幂等初始化 SnapBug 默认超级管理员账号
 *
 * 仅在数据库中尚无 role = ADMIN 的用户时创建默认超管，重复执行不会重置已有账号密码。
 */
const main = async (): Promise<void> => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('执行数据库种子脚本需要提供 DATABASE_URL 环境变量。');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
      select: { id: true, account: true },
    });

    if (existingAdmin) {
      console.log(`已存在超级管理员账号（${existingAdmin.account}），跳过初始化。`);
      return;
    }

    const account = process.env.INIT_ADMIN_ACCOUNT?.trim() || 'admin';
    const rawPassword = process.env.INIT_ADMIN_PASSWORD?.trim() || 'admin123';
    const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);

    await prisma.user.create({
      data: {
        account,
        passwordHash,
        name: '超级管理员',
        jobTitle: '系统管理员',
        avatarColor: '#1b74ff',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    console.log(`默认超级管理员账号已创建：${account}`);
  } finally {
    await prisma.$disconnect();
  }
};

void main().catch((error: unknown) => {
  console.error('SnapBug 数据库种子初始化失败：', error);
  process.exitCode = 1;
});
