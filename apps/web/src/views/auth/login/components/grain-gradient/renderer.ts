import { GRAIN_GRADIENT_FRAGMENT_SHADER, GRAIN_GRADIENT_VERTEX_SHADER } from './shaders';

import type { GrainGradientController, GrainGradientOptions } from '@/types';

const DEFAULT_FRAME = 332733.07699987973;
const MAX_PIXELS = 900_000;
const MAX_COLORS = 7;

const parseHexRgba = (hex: string): [number, number, number, number] => {
  const raw = hex.trim().replace(/^#/, '');
  const expanded =
    raw.length === 3 || raw.length === 4
      ? raw
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : raw;
  const padded = expanded.padEnd(8, 'f').slice(0, 8);

  return [
    Number.parseInt(padded.slice(0, 2), 16) / 255,
    Number.parseInt(padded.slice(2, 4), 16) / 255,
    Number.parseInt(padded.slice(4, 6), 16) / 255,
    Number.parseInt(padded.slice(6, 8), 16) / 255,
  ];
};

const compileShader = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('无法创建 WebGL 着色器');
  }

  // 在低精度设备上自动升格为 highp，避免波形和噪声计算出现条纹
  const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT)?.precision ?? 0;
  gl.shaderSource(shader, precision < 23 ? source.replace(/\b(?:lowp|mediump)\b/g, 'highp') : source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(info || 'WebGL 着色器编译失败');
  }
  return shader;
};

const createProgram = (gl: WebGL2RenderingContext): WebGLProgram => {
  const program = gl.createProgram();
  if (!program) {
    throw new Error('无法创建 WebGL 程序');
  }

  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, GRAIN_GRADIENT_VERTEX_SHADER],
      [gl.FRAGMENT_SHADER, GRAIN_GRADIENT_FRAGMENT_SHADER],
    ] as const) {
      const shader = compileShader(gl, type, source);
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'WebGL 程序链接失败');
    }
    return program;
  } catch (error) {
    gl.deleteProgram(program);
    throw error;
  }
};

/**
 * 挂载颗粒渐变 WebGL2 渲染器，支持运行时无闪烁更新配色并完整回收资源
 */
export const mountGrainGradient = (
  canvas: HTMLCanvasElement,
  noiseImage: HTMLImageElement,
  options: GrainGradientOptions,
): GrainGradientController | undefined => {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) {
    return undefined;
  }

  const speed = options.speed ?? 0.6;
  const scale = options.scale ?? 3.07;
  const offsetY = options.offsetY ?? 0.15;
  const softness = options.softness ?? 1;
  const intensity = options.intensity ?? 0.4;
  const noise = options.noise ?? 0;

  const program = createProgram(gl);
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, noiseImage);

  const uniform = (name: string) => gl.getUniformLocation(program, `u_${name}`);
  const staticUniforms = {
    softness,
    intensity,
    noise,
    shape: 1,
    fit: 1,
    scale,
    originX: 0.5,
    originY: 0.5,
    offsetY,
  };
  for (const [name, value] of Object.entries(staticUniforms)) {
    gl.uniform1f(uniform(name), value);
  }

  const colorsCountLoc = uniform('colorsCount');
  const colorsLoc = uniform('colors[0]');
  const timeLoc = uniform('time');
  const resolutionLoc = uniform('resolution');
  const pixelRatioLoc = uniform('pixelRatio');

  const applyColors = (colors: string[]): void => {
    const normalized = colors.slice(0, MAX_COLORS);
    if (normalized.length === 0) {
      return;
    }
    const buffer = new Float32Array(MAX_COLORS * 4);
    normalized.forEach((hex, index) => {
      const [r, g, b, a] = parseHexRgba(hex);
      buffer[index * 4] = r;
      buffer[index * 4 + 1] = g;
      buffer[index * 4 + 2] = b;
      buffer[index * 4 + 3] = a;
    });
    gl.uniform1f(colorsCountLoc, normalized.length);
    gl.uniform4fv(colorsLoc, buffer);
  };

  applyColors(options.colors);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let elapsed = 0;
  let previous: number | null = null;
  let animationId = 0;
  let disposed = false;

  const render = (now: number): void => {
    if (disposed) {
      return;
    }
    if (previous !== null && !reducedMotion.matches && !document.hidden) {
      elapsed += now - previous;
    }
    previous = now;
    gl.uniform1f(timeLoc, (DEFAULT_FRAME + elapsed * speed) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  const animate = (now: number): void => {
    render(now);
    animationId = requestAnimationFrame(animate);
  };

  const updateAnimation = (): void => {
    cancelAnimationFrame(animationId);
    previous = null;
    if (!document.hidden && !reducedMotion.matches) {
      animationId = requestAnimationFrame(animate);
    }
  };

  const resize = (): void => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) {
      return;
    }
    const ratio = Math.min(devicePixelRatio, Math.sqrt(MAX_PIXELS / (width * height)));
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
    gl.uniform1f(pixelRatioLoc, canvas.width / Math.round(width));
    render(performance.now());
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', updateAnimation);
  reducedMotion.addEventListener('change', updateAnimation);
  resize();
  updateAnimation();

  return {
    updateColors: (nextColors: string[]) => {
      if (disposed) {
        return;
      }
      applyColors(nextColors);
      render(performance.now());
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', updateAnimation);
      reducedMotion.removeEventListener('change', updateAnimation);
      gl.useProgram(null);
      gl.deleteTexture(texture);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
    },
  };
};
