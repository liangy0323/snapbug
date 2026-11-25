import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../../prisma/prisma.module';
import { HealthModule } from '../health/health.module';

const appEnv = process.env.APP_ENV || 'development';

/**
 * 服务端根模块
 *
 * 作为 NestJS 模块装配入口，聚合环境配置、健康检查、数据访问和后续业务模块。
 * 环境配置严格读取当前应用的 `.env.<APP_ENV>`，不回退读取仓库根文件。
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${appEnv}`,
    }),
    HealthModule,
    PrismaModule,
  ],
})
export class AppModule {}
