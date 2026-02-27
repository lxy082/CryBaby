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

## 常见问题

1. **控制台报错 `Failed to resolve module specifier 'three'`**
   - 说明代码里仍有裸导入（`from "three"`）。
   - 请全局搜索 `from "three"` 与 `from "three/..."`，统一替换为 CDN URL 导入。

2. **手机端无法旋转/缩放**
   - 请通过 `http://` 访问，不要直接用 `file://` 打开。
   - 确认浏览器未禁用手势，OrbitControls 已支持单指旋转与双指缩放。

3. **截图没有下载**
   - 某些移动端浏览器会拦截自动下载，请改用桌面浏览器或检查下载权限。
