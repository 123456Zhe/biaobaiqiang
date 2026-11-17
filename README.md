# 白墙 · 校园表白墙

网页端投稿 + 展示，微信公众号被动回复（投稿 / 查进度 / 看精选）。管理后台支持敏感词过滤 + AI 审核 + 人工复审。另有 Expo App 端（`android-app/`，与网页端共用公开接口）。

## 快速开始（本地）

```bash
npm install --registry=https://registry.npmjs.org
npx prisma db push
npm run dev
```

打开 http://localhost:3000

- 投稿：`/submit`
- 管理：`/admin`，本地开发默认密码 `admin123`（生产环境必须在 `.env` 里设置 `ADMIN_PASSWORD` / `SESSION_SECRET` 强随机值，否则服务拒绝启动）
- 公众号入口：`/api/wechat`（GET 验签，POST 处理消息）

## 部署（Docker，香港云服务器）

```bash
cp .env.example .env
# 编辑 .env，设置 ADMIN_PASSWORD / SESSION_SECRET / WECHAT_TOKEN / PUBLIC_SITE_URL
# 其中 ADMIN_PASSWORD 与 SESSION_SECRET 必填强随机值：缺失、为空或为公开
# 示例值时，服务启动校验会直接报错退出，不会带着默认密钥上线
docker compose up -d --build
```

数据持久化：Docker 卷 `biaobaiqiang_data`（SQLite）和 `biaobaiqiang_uploads`（用户上传的图片）。建议每日 `sqlite3 .backup` 备份。

生产部署务必把应用放在反向代理（Caddy）之后、不要把 3000 端口直接暴露在公网：限流依赖代理注入的 `X-Real-IP` / `X-Forwarded-For` 末跳，直连时请求头可被客户端伪造。

## 微信公众号接入

1. 公众平台 → 设置与开发 → 基本配置 → 服务器配置
2. URL：`https://你的域名/api/wechat`
3. Token：与 `.env` 中 `WECHAT_TOKEN` 一致
4. 消息加解密方式：明文
5. 提交后微信会带签名 GET `/api/wechat`，验签通过即保存成功

自定义菜单（后台手动配，不能调 API）：
- 逛一逛 → 跳转 `https://你的域名/`
- 我要投稿 → 跳转 `https://你的域名/submit`

## 能力边界（个人订阅号）

- 公众号「被动回复」+「事件推送」+「后台手动菜单」 ✅
- 网页授权 / 模板消息 / 客服消息 / 菜单 API ❌（需企业认证）

## 目录

```
src/
  app/
    api/
      posts/                 # 列表 / 提交
      posts/[id]/            # 单条详情
      posts/[id]/like/       # 帖子点赞
      posts/[id]/comments/   # 发评论
      posts/mine/            # 我的投稿（App 端）
      comments/[id]/         # 删评论
      comments/[id]/like/    # 评论点赞
      notifications/         # 通知列表 / 标已读
      notifications/stream/  # 通知 SSE 推送
      push/subscribe/        # 浏览器推送订阅
      uploads/[name]/        # 图片直出
      admin/                 # 管理 API（鉴权/审核/评论/词库/统计/公告）
      wechat/                # 公众号入口
    page.tsx                 # 首页瀑布流
    submit/                  # 投稿页
    post/[id]/               # 详情页
    mine/                    # 我的投稿页
    notifications/           # 通知页
    admin/                   # 管理后台（含登录页）
  lib/
    db.ts prisma 单例
    dfa.ts   敏感词匹配
    auth.ts  管理员会话（启动校验密钥配置）
    ratelimit.ts 频率限制 + 客户端 IP 提取
    seed.ts  初始化词库
    tags.ts  投稿标签
    format.ts  JSON 数组解析等
    ai-moderation.ts  AI 文本/图片审核
    notifications.ts  站内通知 + 离线推送触发
    push.ts  Web Push 发送
    post-dto.ts  公开接口投稿字段白名单
    wechat/  公众号工具与处理
  proxy.ts   公开接口 CORS（仅 posts / uploads）
  components/  PostCard.tsx / NotificationBell.tsx / PushToggle.tsx
prisma/schema.prisma
words/default.json  初始敏感词
android-app/  Expo App 端
```

## 设计意图

- 视觉：暖朱砂 + 宣纸白，宋体标题，黑体正文，避开常见紫蓝渐变
- 主页瀑布流：CSS columns 方案轻量；卡片入场 stagger 20ms
- 审核流程：敏感词命中即拒；AI 审核通过（approved）直接发布，存疑/接口异常（uncertain/error）进 pending 等人工复审，拒绝（rejected）直接打回；后台可通过/拒绝/删除/置顶
- 反滥用：网页端投稿/点赞/评论各按 IP 限流，10 分钟最多 3 次（IP 取自可信代理注入的 X-Real-IP 或 X-Forwarded-For 末跳）；上传类型白名单 + 5MB 上限

## 安全

- 管理员密钥在 `.env`，生产必须配强随机值；缺失、为空或为公开示例值时服务拒绝启动
- 公开接口只返回展示所需字段，不返回 openId、visitorId 等内部标识
- 公众号回调验签 `sha1(token, timestamp, nonce)`
- 访客推送缺 visitorId 时不发送（fail-closed，不广播）；取消推送订阅须校验归属
