# 白墙 · 校园表白墙

网页端投稿 + 展示，微信公众号被动回复（投稿 / 查进度 / 看精选）。管理后台支持敏感词过滤 + 人工复审。

## 快速开始（本地）

```bash
npm install --registry=https://registry.npmjs.org
npx prisma db push
npm run dev
```

打开 http://localhost:3000

- 投稿：`/submit`
- 管理：`/admin`，默认密码 `admin123`（修改环境变量 `ADMIN_PASSWORD`）
- 公众号入口：`/api/wechat`（GET 验签，POST 处理消息）

## 部署（Docker，香港云服务器）

```bash
cp .env.example .env
# 编辑 .env，设置 ADMIN_PASSWORD / SESSION_SECRET / WECHAT_TOKEN / PUBLIC_SITE_URL
docker compose up -d --build
```

数据持久化：Docker 卷 `biaobaiqiang_data`（SQLite）和 `biaobaiqiang_uploads`（用户上传的图片）。建议每日 `sqlite3 .backup` 备份。

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
      posts/[id]/like/       # 点赞
      admin/                 # 管理 API（鉴权/审核/词库）
      wechat/                # 公众号入口
    page.tsx                 # 首页瀑布流
    submit/                  # 投稿页
    admin/                   # 管理后台
  lib/
    db.ts prisma 单例
    dfa.ts   敏感词匹配
    auth.ts  管理员会话
    ratelimit.ts 频率限制
    seed.ts  初始化词库
    wechat/  公众号工具与处理
  components/PostCard.tsx
prisma/schema.prisma
words/default.json  初始敏感词
```

## 设计意图

- 视觉：暖朱砂 + 宣纸白，宋体标题，黑体正文，避开常见紫蓝渐变
- 主页瀑布流：CSS columns 方案轻量；卡片入场 stagger 20ms
- 审核流程：投稿默认 pending，敏感词命中即拒；后台手动通过/拒绝/删除
- 反滥用：每 IP/openId 10 分钟最多 3 条；上传类型白名单 + 5MB 上限

## 安全

- 管理员密码在 `.env`，生产请改强随机值
- 公众号回调验签 `sha1(token, timestamp, nonce)`
- 不在前端或日志暴露 openId 以外的用户隐私
