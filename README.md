# MORI · 衣间（MVP）

一款偏日系手账风格的私人穿搭网站：二次元 SVG 小人、可以调整的身材比例、图片衣橱、手动换装和搭配收藏。**原创实现**，参考了若干公开项目的产品思路，没有复制其代码或素材。

## 当前可以做什么

- 直接点击虚拟衣橱中的衣服，让小人穿上。上下装、裙装、外套、鞋子和配饰分别分层绘制。
- 调节肩宽、腰围、臀围和腿长的相对比例，改变发色、肤色和发型。
- 上传衣物单品照片或上身照，选择分类和服装版型，加入本地私人衣橱。
- 本地读取衣服图片的大致颜色，可以手动校正；小人以相应颜色的**风格化 SVG 服饰**展示。
- 随机搭配、收藏搭配、删除衣物和搜索筛选。
- 可选：通过本地后端调用学校 DeepSeek **支持视觉输入的模型**，识别单件衣物名称、分类、款式和颜色。

## 如何在 Mac 上启动

要求 Node.js 22 或更高版本，不需要安装额外的 npm 依赖。

~~~bash
git clone https://github.com/yunleeeee/clothes.git
cd clothes
npm start
~~~

浏览器打开 **http://127.0.0.1:3000**。停止服务按 Control+C。

开发时可使用 \`npm run dev\`；运行单元测试用 \`npm test\`。首页自带 6 件可以删除的示例衣服。

> **安全提示：** 目前仅绑定 127.0.0.1，供本机个人使用；没有登录、用户账户或云端照片存储，不适合直接暴露在公网。

## 可选：连接学校 DeepSeek 识别服装图片

1. 确认学校提供的是 **OpenAI Chat Completions 兼容 API**，且模型明确支持图片输入。普通的文本推理模型可能无法识别图片。
2. 在项目根目录将 \`.env.example\` 复制为 \`.env.local\`，填入实际 \`DEEPSEEK_BASE_URL\`、\`DEEPSEEK_API_KEY\`、\`DEEPSEEK_MODEL\`。
3. 重新运行 \`npm start\`，上传衣服后点击「AI 识别」按钮。

\`DEEPSEEK_BASE_URL\` 是 API 基础地址（例如以 \`/v1\` 结尾），不是聊天网站首页。后端会调用 \`/chat/completions\`。学校接口若使用不同协议，需要适配 \`server/index.mjs\`。

**注意：** GitHub Actions Secrets 仅在工作流运行时可用，不会自动注入你 Mac 手动运行的 \`npm start\` 进程。因此本地网页使用 AI 识别时需要独立配置 \`.env.local\`；此文件已被 \`.gitignore\` 排除。不要将 API Key 上传至前端或仓库。

## 图片隐私和功能边界

- 衣服照片默认经过浏览器压缩后保存在**当前浏览器的 IndexedDB**，不会自动上传 GitHub 或你的服务器。清除浏览器站点数据会删除这些衣橱图片。
- 点击「AI 识别」才会把**选中的图片**从浏览器发送到本机后端，再由后端发给学校模型。上身照可能包含人脸，上传前会再次确认。
- 目前不是虚拟试衣 AI：对于单品照片或上身照，系统保存原照片作为衣橱卡片，并以分类、颜色和版型绘制小人的相应服装，而不是把真实照片无损抠图后贴到小人上。
- 如果学校模型不支持视觉输入，仍可完全不使用 AI，手动录入衣服。
- 浏览器本地存储没有云备份，也没有多设备同步。

## 项目结构

~~~text
index.html                 首页和上传表单
styles.css                 页面主题和响应式布局
src/app.js                 交互、衣橱管理、上传和照片压缩
src/avatar.js              原创 SVG 二次元人物和服装图层
src/storage.js             IndexedDB 和偏好设置
src/wardrobe.js            服装分类、搭配逻辑、数据校验
server/index.mjs           仅本地开放的 HTTP / AI API
tests/                     Node 原生测试
.github/workflows/         GitHub CI + 之前的 Runner / DeepSeek 连通性测试
~~~

## 后续规划

1. 衣物背景去除、服装轮廓检测、把提取的纹理映射到对应 SVG 图层。
2. 自己的体型参考图或测量数据驱动更精准的比例；需用户确认，不推断人体敏感数据。
3. 更完整的版型、鞋帽、层叠和四季服装分类。
4. 更高级别的视觉试衣可接入专门的虚拟试衣/图像生成模型；普通文本 DeepSeek 不能完成真实换装图生成。
5. 在隔离环境中接入 GitHub Actions + macOS Runner，执行浏览器测试并把结果交给学校 DeepSeek 审查。

## 开源项目参考

以下仅借鉴产品概念与公开的架构说明：

- [LifeCloset](https://github.com/nutan654/Closet) — SVG 虚拟换装、服装图层、图片处理管线。
- [Silhouette Style Studio](https://github.com/Jody2905/silhouette-style-studio) — 人物比例调整与可换装的 SVG 形象。
- [Libre Closet](https://github.com/Lazztech/Libre-Closet) — 数字衣橱、服装上传与搭配管理。

没有复制它们的代码、插画或依赖授权不明的素材。
