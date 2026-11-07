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

1. **人物预览**：中央是原创生成的精细日系男性立绘，基础衣物支持区域颜色预览。
2. **衣柜**：选择衣物后，人物同步更换对应服装；有简单的分类与删除。
3. **添加衣服**：支持 JPG、PNG、WebP，最大 8 MB。用户指定分类、款式，自动估计衣服颜色，也可以手动调整。照片仅保存在当前浏览器 IndexedDB。

初次打开会包含 6 件可删除的演示衣物。默认穿搭会自动选取衣柜里的部分衣服。

## 人物立绘（更新）

中央人物现已改为**原创生成的日系动漫男性全身立绘**，并作为实际图像资源放在 `assets/mori-anime-boy.jpg`。不再把大量简陋 SVG 轮廓作为默认人物。当前人物风格为成年男性、黑色层次短发、自然的面部五官、白色基础 T 恤、深色长裤和运动鞋。

- 衣柜、上传衣物和人物展示三个主要界面保持不变。
- 为了让衣物和人物匹配，当前先对立绘中预先标注的**上衣、长裤和鞋子的区域进行颜色映射**，保留原始绘画的明暗、褶皱和轮廓。
- 这是**颜色预览**，不是全功能换装。切换衬衫、短裤、外套等版型目前无法生成与真实物品完全对应的新轮廓；选择这些单品不会获得照片级效果。为了保持视觉品质，本版优先保证默认立绘的完整性。
- 人物由图像生成创建，不是直接下载或复制某部日漫的受版权保护角色。
- 原来参数化 SVG 人物保留在 `src/avatar.js`，仅作为图像加载失败时的回退实现。


## 照片与试衣能力的边界

当前为**插画式换装 MVP**：上传照片用于衣柜展示，小人身上当前仅在已标注的上衣、长裤、鞋子区域显示相应颜色；不会重建版型。**不是**真实服饰照片贴图、精准人体测量或照片级虚拟试衣。

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
- `assets/mori-anime-boy.jpg`：原创男性立绘
- `src/model.js`：衣物区域颜色预览
- `src/avatar.js`：低保真 SVG 备用人物
- `src/wardrobe.js`：分类和数据处理
- `src/storage.js`：IndexedDB / 本地设置
- `server/index.mjs`：本地 HTTP 服务及可选 DeepSeek API
- `tests/`：自动化测试

GitHub Actions 保留了之前配置的 macOS Runner 与 DeepSeek 连通性检查工作流，同时运行网页单元测试。
