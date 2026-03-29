# 猫咪自拍助手

前置摄像头 + 动态红点 + 鸟叫声，吸引猫咪看向镜头并完成自拍。

## 功能

- **动态红点**：64px 发光红点，模拟激光笔的不规则移动，吸引猫咪注意力
- **鸟叫声**：合成鸟叫 WAV 音频，随机间隔播放，进一步吸引猫咪
- **连拍**：一键连拍 12 张（200ms 间隔），带闪光效果
- **声控拍照**：说"拍照"或"拍"自动触发连拍（Web Speech API）
- **本地相册**：浏览、预览、批量保存、删除照片
- **设置面板**：可调节背景明暗、红点速度、鸟叫频率
- **PWA 离线可用**：安装到手机后完全离线运行，不需要网络

## 工程结构

```
cat-selfie/
├── index.html              # 主页面，所有 UI 结构
├── css/
│   └── style.css           # 全局样式（红点、工具栏、设置面板、相册等）
├── js/
│   ├── dot.js              # DotController（红点动画）+ BirdSound（鸟叫合成）
│   ├── gallery.js          # GalleryManager（照片存储、预览、下载）
│   └── app.js              # 主逻辑（摄像头、连拍、设置面板、声控）
├── manifest.json           # PWA 清单（应用名、图标、全屏模式）
├── sw.js                   # Service Worker（离线缓存策略）
├── https_server.py         # 本地 HTTPS 服务器（用于局域网手机调试）
├── .gitignore              # 排除 *.pem 证书文件等
└── README.md
```

## 各文件职责

### `index.html`

所有 UI 元素都在这一个文件中：

| 区域 | 元素 ID | 说明 |
|------|---------|------|
| 视频 | `#camera` | `<video>` 前置摄像头预览，水平镜像 |
| 遮罩 | `#overlay-mask` | 半透明黑色遮罩，由滑块控制透明度 |
| 红点 | `#red-dot` | 64px 发光红点，纯 CSS 动画 |
| 工具栏 | `#toolbar` | 右下角三个按钮：红点开关、麦克风、齿轮 |
| 设置面板 | `#settings-panel` | 底部滑出面板，含三个 range slider |
| 拍照 | `#btn-capture` | 底部中央圆形快门按钮 |
| 闪光 | `#flash` | 连拍时的白色闪光覆盖层 |
| 计数 | `#burst-counter` | 连拍时显示"X 张" |
| 相册入口 | `#btn-gallery` | 左下角缩略图 + 角标 |
| 相册面板 | `#gallery-panel` | 全屏相册，网格 + 大图预览 |
| 画布 | `#capture-canvas` | 隐藏的 canvas，用于视频截帧 |

### `css/style.css`

按模块组织，从上到下依次是：

1. **基础重置**：全局盒模型、禁止选择、黑色背景
2. **视频**：全屏覆盖、`scaleX(-1)` 镜像
3. **遮罩**：`z-index:2`，`pointer-events:none`
4. **红点**：64px、radial-gradient、四层 box-shadow 光晕、`dot-pulse` 动画
5. **工具栏**：右下角、纵向排列、毛玻璃按钮
6. **拍照按钮**：白色圆环 + 内圆，连拍时变红
7. **闪光/计数**：连拍反馈
8. **相册**：入口按钮、网格、选择标记、大图预览
9. **设置面板**：`z-index:15`、半透明毛玻璃、底部滑出、滑块样式
10. **声控按钮**：开启时绿色闪烁

### `js/dot.js`

#### `DotController`

红点动画控制器，`requestAnimationFrame` 驱动：

- `speed`：移动速度（px/帧），默认 5，可通过 `setSpeed(val)` 动态调整
- `changeFreq`：改变方向的频率，默认 400ms
- 碰到边界反弹 + 随机方向偏移，模拟激光笔的不可预测性
- 0.8% 概率突然跳跃到新位置
- `toggle()`：切换显示/隐藏
- `setSpeed(val)`：动态修改速度（1~15）

#### `BirdSound`

鸟叫合成器，预生成 6 种不同的 WAV Blob URL：

- 频率范围 2500~4200Hz，带频率扫描
- 样本振幅 1.0（满幅度）
- `_scheduleChirp()`：基于 `freqLevel` 计算延迟（level 1→2000ms，10→300ms）
- `setFrequency(level)`：动态调整鸟叫间隔（1~10）
- iOS 兼容：等待用户手势后才能播放音频

### `js/gallery.js`

`GalleryManager`：纯前端照片管理：

- `addPhotos(dataUrls)`：添加一组连拍照片
- 照片存储在内存中（`this.photos` 数组），关闭页面后清空
- 网格展示、点击选择、长按预览大图
- 通过 `<a download>` 触发浏览器下载
- `_updateThumbnail()`：最新一张作为相册入口缩略图

### `js/app.js`

主入口，IIFE 封装：

1. **摄像头初始化**：`getUserMedia`，前置摄像头 1920x1080
2. **连拍流程**：`startBurst()` → 12 帧循环 → `finishBurst()` → 存入相册
3. **设置面板**：齿轮按钮打开，点击外部关闭，三个 slider 实时控制
4. **遮罩控制**：range slider 驱动 `rgba(0,0,0, val)`，初始 30%
5. **声控拍照**：`webkitSpeechRecognition`，中文识别，检测"拍照"/"拍"，iOS 自动重启
6. **Service Worker 注册**：离线缓存

### `manifest.json`

PWA 配置：`display: standalone`（无浏览器 UI）、`orientation: portrait`、黑色主题。

### `sw.js`

Service Worker 缓存策略：缓存优先，回退网络。预缓存所有核心资源文件。

### `https_server.py`

本地开发用的 HTTPS 服务器（Python），用于局域网内手机访问调试。依赖 `cert.pem` + `key.pem`（已在 `.gitignore` 中排除）。

## 本地开发

```bash
cd ~/.claude/cat-selfie

# 方式一：简单 HTTP（声控需要 HTTPS 才能用）
python3 -m http.server 8080

# 方式二：HTTPS（需要先生成证书）
python3 https_server.py
```

## 部署

项目已部署在 GitHub Pages：

```
https://happyjoey2333.github.io/cat-selfie/
```

推送 main 分支即可自动更新：

```bash
git add <修改的文件>
git commit -m "描述改动"
git push origin main
```

## 迭代方向参考

- `index.html`：新增 UI 元素（如滤镜选择、定时拍照等）
- `css/style.css`：新组件样式
- `js/dot.js`：红点运动模式（如 8 字形、圆周运动）、鸟叫变体
- `js/gallery.js`：持久化存储（IndexedDB）、照片编辑
- `js/app.js`：新增功能绑定、滤镜、美颜等
- `sw.js`：缓存版本号更新（`CACHE_NAME`）
