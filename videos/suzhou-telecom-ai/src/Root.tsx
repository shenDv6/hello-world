import React from "react";
import { Composition } from "remotion";
import { FPS, H, W } from "./theme";
import { TOTAL } from "./timeline";
import { Video } from "./Video";

export const Root: React.FC = () => (
  <Composition id="Main" component={Video} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);
