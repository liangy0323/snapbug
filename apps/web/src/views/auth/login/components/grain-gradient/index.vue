<template>
  <div class="grain-gradient">
    <canvas ref="canvasRef" class="grain-gradient__canvas" :style="{ opacity }" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import noiseUrl from '@/assets/images/noise.png';
import { mountGrainGradient } from './renderer';

import type { GrainGradientController } from '@/types';

interface Props {
  colors: string[];
  opacity?: number;
}

const props = withDefaults(defineProps<Props>(), {
  opacity: 0.44,
});

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef');
let controller: GrainGradientController | undefined;

watch(
  () => props.colors,
  (nextColors) => {
    controller?.updateColors(nextColors);
  },
  { deep: true },
);

onMounted(async () => {
  const element = canvasRef.value;
  if (!element) {
    return;
  }

  try {
    const noise = new Image();
    noise.src = noiseUrl;
    await noise.decode();
    if (canvasRef.value === element) {
      controller = mountGrainGradient(element, noise, { colors: props.colors });
    }
  } catch {
    // 浏览器不支持 WebGL2 或图片解码失败时，自动降级为容器的 CSS 渐变兜底
  }
});

onBeforeUnmount(() => {
  controller?.dispose();
  controller = undefined;
});
</script>

<style scoped lang="scss">
.grain-gradient {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(ellipse 75% 55% at 50% 100%, var(--color-primary-tile), transparent 70%),
    radial-gradient(ellipse 60% 45% at 15% 15%, var(--color-primary-tint), transparent 65%), var(--color-bg-canvas);
}

.grain-gradient__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transition: opacity var(--transition-base);
}
</style>
