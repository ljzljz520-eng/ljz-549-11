# Ajax & Servlet 异步通信演示系统

## 🎒 校园失物服务台（关键词搜索）
首页默认进入「校园失物服务台」，演示一次完整的异步关键词搜索：

- **接口**：`GET /api/lost-found?keyword=关键词`
- 学生输入「雨伞」「校园卡」、拾取地点或中文姓名（如「张伟」），前端通过 Fetch 异步请求并带上 `keyword` 查询参数；Servlet 返回匹配的失物列表 JSON。
- 输入防抖（350ms）后自动搜索，也可回车 / 点击「搜索」立即触发；搜索过程中显示加载动画与骨架卡片。
- 无结果时显示「没有找到与"xxx"相关的失物」并提供「查看全部失物」入口；网络异常时显示错误提示与「重新搜索」按钮。
- **中文不乱码**：前端使用 `encodeURIComponent` 按 UTF-8 对参数做百分号编码（`雨伞` → `%E9%9B%A8%E4%BC%9E`）；后端 `LostFoundServlet` 不依赖容器的默认参数编码，而是自行解析 `request.getQueryString()` 并用 `URLDecoder.decode(value, StandardCharsets.UTF_8)` 解码，配合全局 `EncodingFilter`（UTF-8）双保险。
- 关键词同时匹配物品名称、类别、拾取地点、拾取人姓名与备注（忽略大小写）；不带 `keyword` 时返回全部失物。

## 🛠 技术栈
- **Frontend**: React (Vite) + TailwindCSS + Fetch API
- **Backend**: Java Servlet (Jakarta EE 10) + Jetty (Dev) / Tomcat (Prod) + Gson
- **Infrastructure**: Docker Compose, Multi-stage Builds, Aliyun Mirror

## 🚀 启动指南 (How to Run)
1. 确保 Docker Desktop 已启动。
2. 在根目录执行：
   ```bash
   docker compose up --build
   ```
3. 等待容器启动完成（Backend 需要下载 Maven 依赖，首次启动可能需 2-5 分钟）。

## 🔗 服务地址 (Services)
- **Frontend**: http://localhost:3000
- **Hello 接口**: http://localhost:8080/api/hello
- **失物搜索接口**: http://localhost:8080/api/lost-found?keyword=雨伞 （中文需 URL 编码）

## 🧪 功能验证
1. **失物搜索**: 在失物服务台输入「雨伞」应返回 3 条记录，输入「校园卡」返回 3 条，输入「张伟」按姓名返回 1 条；输入不存在的词显示空结果提示；网络断开/后端未启动时显示可重试的错误提示。中文关键词在请求与响应中均不乱码。
2. **GET 请求**: 切换到「请求演练场」，发送 GET 请求，应返回回显信息。
3. **POST 请求**:
   - 输入任意文本，点击 "发送请求"，应返回带有时间戳的 JSON，且中文不乱码。
   - 输入 `error`，应触发 400 错误并显示红色 Toast。
   - 输入 `server_error`，应触发 500 错误。
4. **加载状态**: 请求期间，结果区域应显示 loading spinner。

## 📁 目录结构
```
backend/       # Java Servlet Backend
frontend/      # React Frontend
_ai-rules/     # 工程规范文件
docker-compose.yml
```

## ⚙️ 镜像与加速配置
- **Maven**: 已配置阿里云镜像源 (`backend/settings.xml`)。
- **NPM**: Dockerfile 中已配置淘宝镜像源。
- **Hot Reload**:
  - 前端：Vite HMR (Save file -> Browser auto updates).
  - 后端：Jetty Scan (Save file -> Jetty auto reloads in ~2s).
