# Crybaby（哭娃）3D 动画生成器

一个纯静态网页项目（无 npm / 无构建工具），使用 Three.js（CDN ESM）搭建可爱的 Crybaby 3D 形象，支持换肤、动作播放、截图导出和移动端触控旋转缩放。

## 项目结构

- `index.html`：页面结构与控制面板
- `style.css`：布局与响应式样式
- `main.js`：Three.js 场景、Crybaby 角色构建、动画状态机、UI 交互

## 截图（占位）

> 可在项目运行后截图替换下方占位。

- 桌面端效果：`docs/screenshot-desktop.png`（占位）
- 手机端效果：`docs/screenshot-mobile.png`（占位）

## 本地运行

在项目根目录执行：

```bash
python -m http.server 8000
```

浏览器访问：

- `http://localhost:8000`

## GitHub Pages 部署（Deploy from branch）

1. 推送代码到 GitHub 仓库 `main` 分支。
2. 进入仓库：`Settings` → `Pages`。
3. `Build and deployment` 里选择：`Deploy from a branch`。
4. Branch 选择 `main`，Folder 选择 `/ (root)`，保存。
5. 等待发布完成后访问生成的 Pages 链接。

## 常见问题

1. **手机端无法缩放或旋转**
   - 确认是通过 `http://` 正常打开页面，而不是文件直开（`file://`）。
   - 检查浏览器是否禁用了触摸手势；页面已启用 OrbitControls 的触摸旋转/缩放。

2. **截图按钮点击后没有下载**
   - 某些移动浏览器会拦截自动下载，请尝试长按保存或换到桌面浏览器。
   - 检查浏览器下载权限设置，允许当前站点下载文件。

3. **GitHub Pages 页面空白**
   - 确认 `index.html` 位于仓库根目录。
   - 确认资源路径使用相对路径（本项目已使用 `./main.js` / `./style.css`）。
   - 首次发布可能需要几分钟生效。

4. **控制台报错 `Failed to resolve module specifier 'three'`**
   - 说明 Three.js 的 CDN import 没有改全。
   - 全局搜索 `from "three"` / `from "three/..."`，确保通过 CDN URL 或 importmap 正确映射后再发布。
