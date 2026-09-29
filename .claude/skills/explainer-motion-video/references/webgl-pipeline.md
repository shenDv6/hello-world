# WebGL 路线：WebGL2 + Canvas2D + Web Audio + puppeteer + ffmpeg

适合：需要“光感”和“震撼”的片子，比如成千上万的粒子、真正的泛光、粒子组成文字、彩纸爆炸，
或者明亮活泼的风格。Remotion 路线（DOM/SVG）最多几百个元素，而且发光只能用 CSS 阴影模拟。

`assets/webgl-template/` 是一条完整跑通的 90 秒成片（《苏州电信 AI 转型 · 活力版》）的源码。
新视频就从它复制出来，改文案、改场景、改配色。

## 技术栈

| 层 | 技术 | 文件 | 作用 |
| --- | --- | --- | --- |
| 画面 | WebGL2（半精度浮点纹理 RGBA16F + 实例化渲染）+ Canvas2D | `web/gl.js` `web/particles.js` `web/scenes.js` `web/draw.js` | 背景着色器（流动的渐变光斑 + 点阵）、4000+ 实例化粒子、泛光；文字、卡片、UI 用 Canvas2D 画 |
| 时间 | 旁白驱动的时间轴 | `web/timeline.js` | 从 `vo.json` 推出每一幕的起止帧和所有“落点”（`B.xxx`），画面、音效、同步检测共用这套数字 |
| 音乐 | Web Audio `OfflineAudioContext` | `web/audio.js` | 用代码合成全部音乐和音效，离线一次性渲染；包括混响（Convolver）、延迟、压缩器、旁白出现时自动压低音乐（ducking） |
| 导出 | Node + puppeteer-core + ws | `tools/export.mjs` | 本地起一个静态服务器，用无头 Chrome 打开页面，逐帧渲染，每帧转成 JPEG 通过 WebSocket 传给 Node |
| 编码 | ffmpeg（libx264 + AAC） | `tools/export.mjs` | 帧通过管道进 ffmpeg；再混入音轨，并把响度标准化到 -14 LUFS |
| 核对 | ffmpeg + Python/numpy | `tools/check.py` | 接触表、频谱图、响度；用 numpy 测每个关键落点的“音频起音”和“画面变化峰值”相对计划时间的偏差 |

## 命令

```bash
cp -r .claude/skills/explainer-motion-video/assets/webgl-template videos/<项目名> && cd videos/<项目名>
npm install                                   # puppeteer-core, ws, 字体包
pip install edge-tts imageio-ffmpeg numpy
# 1. 写 vo-script.json（每句一条 {scene, text}），合成旁白 → audio/vo/*.wav + web/vo.json
python3 tools/tts.py --voice zh-CN-XiaoxiaoNeural --extra 2:0.3,8:0.9
# 2. 改 web/timeline.js 里的落点 B（用 word(line, "某个词") 对齐到旁白里的词），改 scenes.js / particles.js
# 3. 先抽几帧看（每帧约 3 秒，很快）
node tools/export.mjs --stills 300,900,1500,2100,2600
# 4. 整片：音轨 → 逐帧 → 混音 + 响度标准化 → out/final.mp4
node tools/export.mjs            # 用 run_in_background 跑
python3 tools/check.py           # 接触表、频谱图、响度、音画同步
```

只改了某几幕时，**不要整片重渲**：渲染是确定性的，只重渲那一段再拼回去（见 `pitfalls.md` § 局部重渲）。

## 架构要点

- **一切都是帧号的纯函数**：`renderFrame(f)` 只依赖 `f`。随机数用 `rnd(i, salt)` 哈希，不用 `Math.random()`；
  不用 `requestAnimationFrame`、CSS 动画、`Date.now()`。这样才能任意跳帧、分段重渲。
- **粒子编排**（`particles.js`）：每个粒子在命名“阵型”之间变形：漂浮、问号、漩涡、文字（从字形采样）、
  柱状图、路径光流、环绕、瀑布、彩纸雨，还有“爆炸”（从上一阵型的位置炸开）。每个关键帧写
  `k(at, 阵型, 时长, 错峰, 缓动)`。位置在 CPU 上算，每帧 `bufferSubData` 一次，GPU 用实例化一次画完。
- **文字变粒子**：`sampleText()` 用 OffscreenCanvas 把字画出来，读像素后按网格采样成点。粒子组成“AI”“100万”“?”
  时视觉冲击很强。**字体必须先 `document.fonts.load()` 加载完。**
- **泛光**：粒子先画到 RGBA16F 纹理里，降采样到 1/4，横竖两次模糊，最后合成。明亮风格用“滤色”（screen）把光晕叠在浅色底上；
  暗色风格可以改成加法混合，再加色调映射。
- **合成顺序**：背景 → 光晕 → 粒子 → 胶片颗粒（顺便消除渐变色带）。最后把 WebGL 画布和 UI 画布 `drawImage` 到输出画布上。
- **UI 层**（`draw.js`）：`pop()` 回弹入场、`popOut()`、`pill()` 胶囊、`marker()` 荧光笔、`sparkle()` 星星爆、`check()` 打勾动画。
- **音效和画面落点是同一份数据**：`audio.js` 里的 `at(B.xxx, fn, label, main)` 同时生成音效和 `cues.json`，`check.py` 拿它来测同步。

## 性能（云端沙箱，无 GPU，SwiftShader 软件渲染）

- 1080×1920、4200 个粒子、泛光、UI：约 **0.66 秒/帧**，90 秒成片约 **30 分钟**。
- 音轨离线合成约 1–2 分钟。
- 本机有 GPU 时会快一个数量级。沙箱里：
  - 启动参数用 `--use-angle=swiftshader --enable-unsafe-swiftshader`（`export.mjs` 已写好）；
  - 先用 `--stills` 看关键帧，确认没问题再整片渲染；
  - 改动只重渲受影响的段落。
- 满屏彩纸加颗粒纹理很难压缩：crf 18–20 的 1080p 成片有 240–380 MB。发给用户时压一个 720p、2.2 Mbps 的两遍编码版本（约 26 MB）。

## 明亮活泼风格的配方（活力版实测有效）

- 奶油白底 `#FFF7EC`，上面是粉彩光斑（调色板颜色往白色混 55%），每一幕换一组主色调，淡淡的点阵网格。
- 调色板：电信蓝 `#2F6BFF`、柠檬黄 `#FFC531`、珊瑚红 `#FF5E57`、薄荷绿 `#1FCF9B`、紫 `#7B61FF`；文字用深海军蓝 `#15203B`。
- 字体：思源黑体 900 做标题；ZCOOL KuaiLe 这类圆润字体只用在“?”这种趣味元素上。
- 动效：回弹入场（`outBack`）、贴纸微旋转并晃动后稳住、荧光笔划重点、星星爆、震屏、闪白。
- 音乐：120 BPM，C–G–Am–F 和弦进行，四拍底鼓、反拍和弦、16 分音符琶音加延迟；前奏只有铺底和琶音，“落地”那一刻全部乐器进来；
  片尾先收一个小节，再用上升音效推到标题。
