/**
 * 扩展 SnapBug API 可读取的 Node.js 环境变量
 */
declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * 当前服务运行环境，用于选择对应的环境变量文件
     */
    readonly APP_ENV?: 'development' | 'test' | 'production';

    /**
     * PostgreSQL 连接串，由 Prisma Client 读取
     */
    readonly DATABASE_URL?: string;

    /**
     * 允许跨域访问 API 的前端来源列表，多个地址使用英文逗号分隔
     */
    readonly CORS_ORIGINS?: string;

    /**
     * Access Token 签名密钥
     */
    readonly JWT_SECRET?: string;

    /**
     * Access Token 有效期，例如 7d
     */
    readonly JWT_EXPIRES_IN?: string;

    /**
     * 本地启动器或部署平台注入的服务监听端口
     */
    readonly PORT?: string;

    /**
     * OpenAI 兼容协议接口地址
     */
    readonly AI_BASE_URL?: string;

    /**
     * AI 模型访问密钥
     */
    readonly AI_API_KEY?: string;

    /**
     * 默认调用的 AI 模型名称
     */
    readonly AI_MODEL?: string;

    /**
     * 云对象存储厂商标识（aliyun-oss / tencent-cos）
     */
    readonly STORAGE_PROVIDER?: string;
  }
}
