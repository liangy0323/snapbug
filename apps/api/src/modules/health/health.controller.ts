import { Controller, Get } from '@nestjs/common';
import type { HealthStatus } from '@repo/shared/types';

import { HEALTH_SERVICE_NAME } from '../../constants';

/**
 * 健康检查控制器
 *
 * 只暴露服务存活状态，不访问数据库，也不承载业务鉴权逻辑。
 */
@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthStatus {
    return {
      status: 'ok',
      service: HEALTH_SERVICE_NAME,
      timestamp: new Date().toISOString(),
    };
  }
}
