# 踩过的坑（都是真实发生过的）

## 画面

- **一条笔直的 SVG 线加了发光滤镜后整条消失**：水平直线的包围盒高度是 0，默认的 `objectBoundingBox` 滤镜区域会被压扁。
  修法：`filterUnits="userSpaceOnUse" x=0 y=0 width=W height=H`。
- **带 `transform` 平移的 SVG 组，发光后被裁掉一半**：`userSpaceOnUse` 的区域是在这个组的局部坐标里算的。
  给这个组单独写一个局部滤镜区域，比如 `x=-150 y=-150 w=300 h=300`。
- **Canvas2D 的 `roundRect` 路径建好之后再调 `transform`，不会影响已经建好的路径**：斜切、旋转要在建路径之前设置。
- **ESM 导入了一个不存在的导出，整个页面直接白屏**：检查 `import { ... }` 里的名字。puppeteer 里要监听 `pageerror` 才能看到报错。
- **把画面切到新布局后，内容要等旁白说到才出现，中间空白好几秒**：切换时要么立刻有东西占位（贴纸、问候气泡、输入框），要么推迟切换。
- **周围装饰标签压在大数字上**：装饰按固定位置放在两侧，别用绕圈的布局；画完接触表要检查有没有重叠。
- **片尾的小字被彩纸粒子盖住**：小字放进白色胶囊里。
- **`Rise`、`group` 这类封装自己控制透明度时，外面再传 `style.opacity` 会把动画覆盖掉**：透明度设在里层元素上。
- **抽帧恰好落在元素弹出前的几帧**，看起来像“元素没显示”。先看看那个落点在哪一帧，再判断是不是 bug。

## 字体（云端沙箱）

- `@remotion/google-fonts`，还有页面里直接引用 fonts.gstatic.com：无头 Chromium 不信任代理证书，会报 `ERR_CERT_AUTHORITY_INVALID`。
  GitHub raw 下载字体也会被网络策略拦掉（403）。**用 npm 装 `@fontsource-variable/noto-sans-sc` 这类包**，npm 源可以访问。
- 中文字体被切成 100 多个 unicode-range 分片，**必须把全片出现的所有文字都 `document.fonts.load()` 一遍**，否则前几帧会显示成回退字体。

## 编码和拼接

- **Remotion 自带的 ffmpeg 是精简版**，没有 `tile` 这类滤镜。拼接触表用 `pip install imageio-ffmpeg` 提供的完整版。
- **Remotion 默认输出 `yuvj420p/bt470bg`**，要加 `--color-space=bt709`。浏览器导出的 JPEG 是全范围 BT.601，
  ffmpeg 里要加 `scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709`。
- **用 `trim`、`concat` 拼接后帧率变成了 25fps**（会丢帧、动作变卡）：`concat` 之后加 `setpts=N/(30*TB)`，输出再加 `-r 30 -fps_mode cfr`。
  拼完用 `ffmpeg -i` 检查帧率。
- **局部重渲**：渲染是确定性的，所以只重渲改过的帧段，比如 `export.mjs --frames 1099-1747 --out seg5.mp4`，
  再用 `split`、`trim`、`concat` 按帧号拼回原片。30 分钟的整片重渲能缩到 10 分钟左右。
- **成片超过 30 MB 发不出去**（SendUserFile 有上限）：另外压一个 720p、`-b:v 2200k` 的两遍编码分享版。

## 声音

- **Web Audio 里 `osc(...).connect(gain(0.3))` 不会降低音量**：振荡器已经接在别的节点上，这样只是多接了一路，而且这个新 gain 没有接到输出。
  要先建 gain 节点，再把振荡器只接到它上面。
- **整体音量太小**（Remotion 直接混出来平均 -27 dB）：最后一步一律做 `loudnorm`。
- **我没法真正“听”音频**：能测响度、频谱、起音时间，但旁白自不自然、配乐搭不搭，要请用户来判断，交付时要说清楚。

## 流程

- **命令执行前的安全检查（auto 模式）连续出错时**，命令根本不会执行。停止重试，请用户把权限模式切到 Default/Ask。
  同时先写代码、查资料、写文案，这些不需要执行命令。
- **容器是临时的**：做完要把源码提交推送到 GitHub。渲染产物、`node_modules`、生成的音频都放进 `.gitignore`。
- **整片渲染要很久**（无 GPU 时 30 分钟）：放后台跑，并告诉用户大概要多久；用户问“卡住了吗”时，
  用 `ps` 看进程 CPU，用 `/proc/<pid>/io` 看已经送进 ffmpeg 的数据量，据此估算进度。
