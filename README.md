# Baymax（大白）3D 动画生成器（纯静态）

一个无需 npm / 无需打包工具的 Three.js 静态项目，通过基础几何体搭建“超像大白”的 3D 角色，支持动作切换、配色预设、手机触控旋转缩放与 PNG 截图。

## 项目结构

- `index.html`：页面结构与控制面板
- `style.css`：布局与响应式样式
- `main.js`：Three.js 场景、Baymax 建模、状态机动作、UI 与截图逻辑

## 本地运行

在项目根目录执行：

```bash
python -m http.server 8000
```

浏览器访问：

- `http://localhost:8000`

## GitHub Pages 部署（Deploy from branch）

1. 推送代码到 GitHub 仓库 `main` 分支。
2. 打开仓库 `Settings` → `Pages`。
3. Source 选择 `Deploy from a branch`。
4. Branch 选择 `main`，Folder 选择 `/ (root)`。
5. 保存后等待页面发布。

## 报错排查（含本项目已修复项）

### 报错 1（核心致命）

```text
Uncaught TypeError: Failed to resolve module specifier "three". Relative references must start with either "/", "./", or "../".  (index):1
```

处理方式：
- 确保入口仅为 `<script type="module" src="./main.js"></script>`。
- 使用 CDN ESM 导入（本项目使用 jsDelivr `three@0.160.0`）。
- 全局搜索并清理裸导入：`from "three"`、`from "three/..."`。
- 若引用 examples 模块（例如 OrbitControls）且其内部依赖 `three`，确保 importmap 在 module script 前声明。

### 报错 2（非致命）

```text
Failed to load resource: the server responded with a status of 404 () /favicon.ico
```

处理方式：
- 在 `index.html` 添加存在的 favicon 路径。
- 本项目使用内联 data URL favicon，避免 404。

## 常见问题

1. **手机端无法旋转/缩放**
   - 请通过 `http://` 访问，不要直接用 `file://` 打开。
   - 确认浏览器未禁用手势，OrbitControls 已支持单指旋转与双指缩放。

2. **截图没有下载**
   - 某些移动端浏览器会拦截自动下载，请改用桌面浏览器或检查下载权限。
