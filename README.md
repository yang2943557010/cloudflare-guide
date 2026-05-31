# Temu 采集助手 · 操作说明站点

静态站点，可部署到 **Cloudflare Pages**。插件侧栏「操作说明」按钮指向：

`https://temuchaozhu.251800.xyz/`（部署后替换为你的域名）

## 站点结构

```
cloudflare-guide/
├── index.html              # 首页：选择图文 / 视频 + 最近版本
├── guide/
│   ├── article.html        # 图文操作说明（分章节）
│   └── video.html          # 视频教程（B 站嵌入）
├── versions/
│   └── index.html          # 完整历史版本
├── data/
│   └── versions.json       # 版本与视频配置（改这一处即可更新）
├── css/style.css
├── js/app.js
├── assets/guide/           # 图文截图（自行添加）
└── downloads/              # 各版本 zip 安装包（自行添加）
```

## 页面流程

```
首页 index.html
    ├── 图文操作说明 → /guide/article.html
    ├── 视频说明     → /guide/video.html
    └── 历史版本     → /versions/
```

## 部署到 Cloudflare Pages

### 方式一：Git 连接（推荐）

1. 将 `cloudflare-guide` 目录推送到 GitHub 仓库（可单独仓库或子目录）。
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → Create → Pages → Connect to Git。
3. 选择仓库；若站点在子目录，**Build output directory** 填 `cloudflare-guide`。
4. **Framework preset** 选 None；**Build command** 留空。
5. 部署完成后绑定自定义域名，例如 `temuchaozhu.251800.xyz`。

### 方式二：Wrangler CLI

```bash
cd cloudflare-guide
npx wrangler pages deploy . --project-name=temu-guide
```

### 方式三：直接上传

Cloudflare Pages → Upload assets → 选择 `cloudflare-guide` 文件夹内所有文件。

## 日常维护

### 1. 更新版本历史

编辑 `data/versions.json`：

```json
{
  "currentVersion": "9.0.2",
  "releases": [
    {
      "version": "9.0.2",
      "date": "2026-06-01",
      "status": "latest",
      "summary": "一句话摘要",
      "highlights": ["更新点 1", "更新点 2"],
      "hasArticleGuide": true,
      "hasVideoGuide": true
    }
  ]
}
```

`status` 可选：`latest` | `stable` | `archived`

### 2. 添加视频

在 `versions.json` 的 `videos` 中填入 B 站链接：

```json
"intro": {
  "title": "插件安装与首次激活",
  "duration": "约 5 分钟",
  "url": "https://www.bilibili.com/video/BV1xxxxxxxx"
}
```

### 3. 替换图文截图

将图片放入 `assets/guide/`，并在 `guide/article.html` 中把 `.img-placeholder` 换成：

```html
<img src="/assets/guide/01-install.png" alt="安装步骤" />
```

### 4. 提供下载包

将 `v9.0.1.zip` 放到 `downloads/`，用户可在历史版本页点击下载。

## 与插件联动

插件内链接位于 `src/components/SidePanel.js`：

```js
static TEMU_GUIDE_URL = 'https://你的域名/';
```

修改后执行 `npm run build` 并重新加载扩展。

## 本地预览

任意静态服务器即可，例如：

```bash
cd cloudflare-guide
npx serve .
```

访问 http://localhost:3000
