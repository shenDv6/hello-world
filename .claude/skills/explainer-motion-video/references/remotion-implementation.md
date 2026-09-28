# Remotion 实现（已在本云端环境实测通过）

`assets/template/` 是一个能直接跑的最小工程：HUD 外壳、星尘背景、颗粒、暗角、
中文字体、词块错峰入场加编号滚动、配乐加音效。新视频从它复制出来改，不要从零写。

```bash
cp -r .claude/skills/explainer-motion-video/assets/template videos/<项目名>
cd videos/<项目名> && npm install
node ../../.claude/skills/explainer-motion-video/scripts/gen-audio.mjs public/audio 60 cool
```

## 1. 工程结构

```
src/index.ts        registerRoot
src/Root.tsx        <Composition> 定义时长、fps、尺寸（1080×1920 @30）
src/theme.ts        颜色、网格、缓动、弹簧（全片唯一来源）
src/fonts.ts        字体加载和预加载
src/components/     Hud / Stars / Grain / Vignette / Title / ...
src/scenes/         每章一个文件：01-Tokenize.tsx ...
src/Video.tsx       用 <Sequence> 或 <Series> 把各幕串起来，外面套全局层
public/audio/       bgm.wav 和各种音效
```

全局层（背景、星尘、HUD、颗粒、暗角）放在 `Video.tsx` 里，**不跟着每一幕重新挂载**，
这样它们跨幕连续，才不会每一幕“闪一下”。

## 2. 确定性（渲染是多线程乱序取帧，下面这些必须遵守）

- 一切动画只由 `useCurrentFrame()` 驱动。不要用 CSS `animation` / `transition`，
  不要用 `setTimeout`、`Date.now()`、`Math.random()`。
- 随机数用 `random("some-seed")`（来自 `remotion`），同一个种子永远返回同一个值。
  “滚动的数字”写成 `random(\`r${i}-${Math.floor(frame / 2)}\`)`，每 2 帧换一次。
- `interpolate` 一律加 `extrapolateLeft/Right: "clamp"`，并加 `easing`。
- 时间写成秒 × fps（`0.4 * fps`），不要到处写死帧号。每一幕的起止时间集中定义在一个 timeline 常量里。
- 闪烁光标：`frame % 30 < 15`。

## 3. 中文字体（这里踩过坑）

- **不要用 `@remotion/google-fonts`**：在这个云端沙箱里，无头 Chromium 不信任代理证书，
  请求 fonts.gstatic.com 会报 `ERR_CERT_AUTHORITY_INVALID`，渲染直接失败。
  GitHub raw 下载字体也被网络策略拦了。
- **用 npm 装 `@fontsource-variable/*`**（npm 源可以访问），字体文件会被打包进工程，离线也能渲染：
  `@fontsource-variable/noto-sans-sc`、`@fontsource-variable/noto-serif-sc`、`@fontsource-variable/jetbrains-mono`。
- 中文字体按 unicode-range 切成了 100 多个分片，只有用到对应的字才会下载那一片，
  所以**必须预加载全片出现的所有文字**，否则前几帧会出现回退字体。模板里的 `preloadFonts()` 用
  `delayRender` + `document.fonts.load(font, 全部文字)` 解决了这个问题。**新增文案时记得把文字也加进预加载列表。**
- font-family 名字带 `Variable` 后缀：`'Noto Sans SC Variable'`，可以用 100–900 任意字重。

## 4. 渲染

本环境里 Chromium 已经装好，不要下载，直接指定可执行文件：

```bash
CH=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | head -1)
# 单帧预览（改动后先看关键帧，快）
npx remotion still src/index.ts Demo out/f90.png --frame=90 --browser-executable="$CH"
# 成片
npx remotion render src/index.ts Demo out/video.mp4 --codec=h264 --crf=16 --color-space=bt709 --browser-executable="$CH"
```

- `--color-space=bt709`：不加的话输出是 `yuvj420p/bt470bg`，上传平台后颜色可能发灰或偏色。
- `--crf=16`：平台会二次压缩，母版给高一点码率。
- 本地环境不一定有 `/opt/pw-browsers`，没有就去掉 `--browser-executable`，让 Remotion 自己下载。
- 4 秒 1080×1920 的片子在这里渲染大约 18 秒；60 秒预计 4–5 分钟，用 `run_in_background` 跑。

## 5. 自检：抽帧、拼接触表、自己看（必须做）

Remotion 自带的 ffmpeg 是精简版，没有 `tile` 等滤镜。用完整版 ffmpeg：

```bash
FF=$(command -v ffmpeg || (pip install -q imageio-ffmpeg >/dev/null 2>&1; python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"))
# 每秒 1 帧，5×3 拼一张图（60 秒的片子会生成 4 张）
$FF -v error -y -i out/video.mp4 -vf "fps=1,scale=216:-1,tile=5x3" out/contact_%02d.jpg
# 单独看某一刻的全尺寸画面
$FF -v error -y -ss 17 -i out/video.mp4 -frames:v 1 out/t17.jpg
```

用 Read 工具打开接触表逐张看，重点查：
1. 文字溢出、贴边、被底部 20% 平台 UI 区域挡住
2. 穿帮：元素在入场前就出现了，或者退场后还残留（多半是漏了 clamp）
3. 空镜：某一秒画面几乎是空的，或者没有任何东西在动
4. 同一帧里有多个发光焦点、颜色超出设计系统
5. 回退字体（字形明显不是思源黑体/宋体）
6. 和 `reference-breakdown.md` 的标杆比：HUD、网格、层次、真实内容有没有做到

修 → 重新渲染 → 重新抽帧 → 再看。**不看图不交付。**
视频发给用户之前，也把接触表一起发过去。

## 6. 声音

```bash
node .claude/skills/explainer-motion-video/scripts/gen-audio.mjs public/audio <秒数> <cool|warm>
# 生成：bgm.wav（氛围铺底）tick.wav（数字/吸附）whoosh.wav（转场）hit.wav（揭示/高潮）chime.wav（情绪转折）
```

```tsx
import { Audio, Sequence, staticFile } from "remotion";
<Audio src={staticFile("audio/bgm.wav")} volume={0.35} />
{/* 音效比画面落点早 2–3 帧，感觉才是同步的 */}
<Sequence from={hitFrame - 3}><Audio src={staticFile("audio/hit.wav")} volume={0.8} /></Sequence>
```

- 配乐淡入淡出由脚本自带；需要在转折处换情绪，可以分别生成 cool 和 warm 两段，用 `<Sequence>` 交叉淡化（`volume` 可以传一个按帧计算的函数）。
- 用户有自己的音乐时优先用他的，把切点对在拍子上：`framesPerBeat = fps * 60 / BPM`。
- 有旁白时，画面节奏跟着旁白的逐字时间戳走，配乐再压低 6–10 dB。
