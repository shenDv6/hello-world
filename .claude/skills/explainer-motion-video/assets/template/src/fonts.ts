import "@fontsource-variable/noto-sans-sc";
import "@fontsource-variable/noto-serif-sc";
import "@fontsource-variable/jetbrains-mono";
import { continueRender, delayRender } from "remotion";

export const fonts = {
  sans: "'Noto Sans SC Variable', sans-serif",
  serif: "'Noto Serif SC Variable', serif",
  mono: "'JetBrains Mono Variable', monospace",
};

// CJK fonts are split into unicode-range chunks that only download when a glyph
// is used, so explicitly load every string that appears in the video before rendering.
export const preloadFonts = (texts: string[]) => {
  const handle = delayRender("fonts");
  const all = texts.join("");
  Promise.all(
    ["400", "700"].flatMap((w) => [
      document.fonts.load(`${w} 40px 'Noto Sans SC Variable'`, all),
      document.fonts.load(`${w} 40px 'Noto Serif SC Variable'`, all),
      document.fonts.load(`${w} 40px 'JetBrains Mono Variable'`, all),
    ]),
  ).then(() => continueRender(handle), () => continueRender(handle));
};
