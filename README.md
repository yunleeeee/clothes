# MORI · 衣间

一个极简的个人虚拟衣柜网站。左侧是衣柜，中央是二次元人物，右上角可以上传自己的衣服。界面只保留这三项核心交互。

## 本地运行

需要 Node.js 22 或以上版本。

```bash
git clone https://github.com/yunleeeee/clothes.git
cd clothes
npm start
```

然后打开 [http://127.0.0.1:3000](http://127.0.0.1:3000)。

如果已经克隆过仓库，先 `git pull`，再 `npm start`。运行单元测试：`npm test`。

## 三项功能

1. **人物预览**：中央是一位原创绘制的 2D 二次元风格人物，衣服采用 SVG 服装图层绘制。
2. **衣柜**：选择衣物后，人物同步更换对应服装；有简单的分类与删除。
3. **添加衣服**：支持 JPG、PNG、WebP，最大 8 MB。用户指定分类、款式，自动估计衣服颜色，也可以手动调整。照片仅保存在当前浏览器 IndexedDB。

初次打开会包含 6 件可删除的演示衣物。默认穿搭会自动选取衣柜里的部分衣服。

## 男性角色与服装贴合

默认人物现在是原创的成年男性二次元时装角色：短碎发、收窄的眼型、明显的颈肩结构、修长腿型。图形采用 **一套共用身体锚点** 绘制肩、腰、臀和脚踝，服装依照这些锚点画出袖口、领口、裤裆、裤脚、衣领及外套袖子，而不是单纯覆盖独立的衣服贴纸。

- 默认演示衣柜改为男性单品，包括白色圆领 T 恤、绿色衬衫、深灰牛仔裤、休闲短裤、深色外套和运动鞋。
- 已经保存到当前浏览器的演示单品会更新到新配色和名称；用户自己上传的照片不会被覆盖。
- 各类衣服仍使用颜色和预设版型进行**风格化贴合**，不是对上传图片做人体解析或 AI 换装。需要照片材质真实保留时，应另接衣服分割、服装关键点定位或专门虚拟试衣模型。
- 原创 SVG 从现代时装角色的插画审美中获得灵感。没有从网上复制受版权保护的动漫人物。

参考实现思路：[Anime Character Creator](https://github.com/rhedak/anime-character-creator)（MIT）所介绍的参数化 SVG 及骨架定位概念，仅借鉴思路，没有包含其源代码。

## 照片与试衣能力的边界

当前为**插画式换装 MVP**：上传照片用于衣柜展示，小人身上根据分类、版型和主色生成相应形状。**不是**真实服饰照片贴图、精准人体测量或照片级虚拟试衣。

原有代码中人物的身材比例参数仍由内部渲染器支持，但为保持极简，界面不再展示身材滑块、发色编辑区、穿搭收藏和随机搭配。

## 可选学校 DeepSeek API

项目保留可选的 `/api/analyze`。如果学校的 API 使用 OpenAI 兼容 Chat Completions 协议，并且使用的模型**支持图片输入**，可以通过「添加衣服」弹窗中的「AI 识别」填入推荐名称、分类与颜色。若学校的 DeepSeek 仅支持文字，这个功能不会正常运行，但手动添加照常可用。

```bash
cp .env.example .env.local
# 将学校的 API URL、Key 和实际视觉模型 ID 填入 .env.local
npm start
```

**不要**将 `.env.local`、API Key 或用户照片提交至 GitHub。已配置的 GitHub Actions Secrets 只适用于 Actions 任务，不会自动传给你本地手动执行的 `npm start`。对上身照使用「AI 识别」前，会要求确认发送图片。应用默认只绑定本机 `127.0.0.1`。

## 设计方向

界面借鉴极简时装品牌的设计原则：限定配色、足够的留白、将衣物视为商品摄影而非图标堆砌。所有 UI、人物 SVG 和默认衣物插画均为原创代码，不直接复制第三方素材。

灵感资料：
- [Toteme / minimalist brand examples (Shopify)](https://www.shopify.com/blog/minimalist-website-examples)
- [Norse Projects editorial design](https://opendesign.cc/en/sites/norse-projects)

## 项目文件

- `index.html`：双栏界面与添加衣物弹窗
- `styles.css`：简洁的编辑式视觉风格与响应式布局
- `src/app.js`：衣柜与上传交互
- `src/avatar.js`：原创人物与服装 SVG
- `src/wardrobe.js`：分类和数据处理
- `src/storage.js`：IndexedDB / 本地设置
- `server/index.mjs`：本地 HTTP 服务及可选 DeepSeek API
- `tests/`：自动化测试

GitHub Actions 保留了之前配置的 macOS Runner 与 DeepSeek 连通性检查工作流，同时运行网页单元测试。
