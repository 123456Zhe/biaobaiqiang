// 服务启动时执行一次（构建期不执行）：校验管理员密钥配置。
// 生产环境下 ADMIN_PASSWORD / SESSION_SECRET 缺失、为空或为公开弱默认值
// 时直接抛错，进程拒绝启动（fail-closed），避免带着默认密钥上线。
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateAdminConfig } = await import("@/lib/auth");
    validateAdminConfig();
  }
}
