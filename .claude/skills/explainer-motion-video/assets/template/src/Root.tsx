import React from "react";
import { Composition } from "remotion";
import { Demo } from "./Demo";
export const Root: React.FC = () => (
  <Composition id="Demo" component={Demo} durationInFrames={120} fps={30} width={1080} height={1920} />
);
