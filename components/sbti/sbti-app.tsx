"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { GlitchText } from "@/components/ui/glitch-text";
import { LampSection } from "@/components/ui/lamp";
import {
  DIM_EXPLANATIONS,
  DRUNK_TRIGGER_QUESTION_ID,
  NORMAL_TYPES,
  TYPE_IMAGES,
  TYPE_LIBRARY,
  dimensionMeta,
  dimensionOrder,
  questions,
  specialQuestions,
  type DimensionKey,
  type Question,
} from "@/lib/sbti-data";
import { cn } from "@/lib/cn";

type ScreenName = "intro" | "test" | "result";
type Level = "L" | "M" | "H";
type AnswerMap = Record<string, number | undefined>;
type ThemeMode = "day" | "night" | "contrast";
type TypeCode = keyof typeof TYPE_LIBRARY;
type NormalTypeCode = (typeof NORMAL_TYPES)[number]["code"];
type TypeProfile = {
  code: TypeCode;
  cn: string;
  intro: string;
  desc: string;
};

type RankedType = {
  code: NormalTypeCode;
  pattern: (typeof NORMAL_TYPES)[number]["pattern"];
  cn: string;
  intro: string;
  desc: string;
  distance: number;
  exact: number;
  similarity: number;
};

type ResultState = {
  rawScores: Record<DimensionKey, number>;
  levels: Record<DimensionKey, Level>;
  ranked: RankedType[];
  bestNormal: RankedType;
  finalType: TypeProfile;
  modeKicker: string;
  badge: string;
  sub: string;
  special: boolean;
  secondaryType: RankedType | null;
};

const screenStatus: Record<ScreenName, string> = {
  intro: "Signal Lobby",
  test: "Question Stream",
  result: "Result Archive",
};

const optionCodes = ["A", "B", "C", "D"];
const transitionMessages = [
  "signal integrity: unstable",
  "memory foam of the self is being compressed",
  "electronic fate shuffling in progress",
  "人格缓存正在抖动",
  "请勿在审判中途关闭灵魂窗口",
];
const RESULT_IMAGE_WIDTH = 1440;
const RESULT_IMAGE_HEIGHT = 3120;
const RESULT_IMAGE_FONT_STACK =
  "'SF Pro Display', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', system-ui, sans-serif";
const SITE_LOGO = "/sbti/logo.png";
const RESULT_IMAGE_QR = "/sbti/qr/site.svg";
const RESULT_IMAGE_SIDE_IMAGE_CANDIDATES = ["/sbti/qr/side-image.png", SITE_LOGO];
const RESULT_IMAGE_COLORS = {
  bgTop: "#06141b",
  bgBottom: "#0b1e27",
  panel: "rgba(7, 20, 27, 0.9)",
  panelStroke: "rgba(61, 100, 116, 0.46)",
  card: "rgba(16, 40, 51, 0.84)",
  cardSoft: "rgba(16, 40, 51, 0.68)",
  cardStroke: "rgba(61, 100, 116, 0.36)",
  accent: "#64dccb",
  accentSoft: "#14353b",
  warm: "#d68924",
  textPrimary: "#f2fafa",
  textSecondary: "#c4d7db",
  textMuted: "#89a4aa",
  watermark: "rgba(137, 164, 170, 0.1)",
};

type CanvasPaint = string | CanvasGradient | CanvasPattern;
type DrawTextBlockOptions = {
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  lineHeight: number;
  font: string;
  color: string;
  maxLines?: number;
};
type DrawPillOptions = {
  fill: CanvasPaint;
  stroke: CanvasPaint;
  color: string;
  font: string;
  height?: number;
  paddingX?: number;
  maxWidth?: number;
  radius?: number;
};

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const nextRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + nextRadius, y);
  context.lineTo(x + width - nextRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + nextRadius);
  context.lineTo(x + width, y + height - nextRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - nextRadius, y + height);
  context.lineTo(x + nextRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - nextRadius);
  context.lineTo(x, y + nextRadius);
  context.quadraticCurveTo(x, y, x + nextRadius, y);
  context.closePath();
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: CanvasPaint,
) {
  context.save();
  context.fillStyle = fillStyle;
  roundedRectPath(context, x, y, width, height, radius);
  context.fill();
  context.restore();
}

function strokeRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  strokeStyle: CanvasPaint,
  lineWidth = 1,
) {
  context.save();
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  roundedRectPath(context, x, y, width, height, radius);
  context.stroke();
  context.restore();
}

function splitTextToLines(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const logicalLines = text.split("\n");
  const lines: string[] = [];

  for (const logicalLine of logicalLines) {
    if (!logicalLine) {
      lines.push("");
      continue;
    }

    let currentLine = "";

    for (const char of logicalLine) {
      const nextLine = `${currentLine}${char}`;
      if (currentLine && context.measureText(nextLine).width > maxWidth) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = nextLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length ? lines : [""];
}

function truncateLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines?: number,
) {
  const lines = splitTextToLines(context, text, maxWidth);
  if (!maxLines || lines.length <= maxLines) {
    return lines;
  }

  const visibleLines = lines.slice(0, maxLines);
  const ellipsis = "…";
  let lastLine = visibleLines[maxLines - 1] ?? "";

  while (lastLine && context.measureText(`${lastLine}${ellipsis}`).width > maxWidth) {
    lastLine = lastLine.slice(0, -1);
  }

  visibleLines[maxLines - 1] = `${lastLine}${ellipsis}`;
  return visibleLines;
}

function drawTextBlock(context: CanvasRenderingContext2D, options: DrawTextBlockOptions) {
  const { text, x, y, maxWidth, lineHeight, font, color, maxLines } = options;

  context.save();
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "top";
  const lines = truncateLines(context, text, maxWidth, maxLines);

  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });

  context.restore();
  return y + lines.length * lineHeight;
}

function drawPill(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: DrawPillOptions,
) {
  const {
    fill,
    stroke,
    color,
    font,
    height = 56,
    paddingX = 24,
    maxWidth = Number.POSITIVE_INFINITY,
    radius = 999,
  } = options;

  context.save();
  context.font = font;
  const textWidth = context.measureText(text).width;
  const width = Math.min(maxWidth, textWidth + paddingX * 2);
  fillRoundedRect(context, x, y, width, height, radius, fill);
  strokeRoundedRect(context, x, y, width, height, radius, stroke, 1.5);
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.fillText(text, x + paddingX, y + height / 2);
  context.restore();
  return width;
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  context.save();
  roundedRectPath(context, x, y, width, height, radius);
  context.clip();
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  context.restore();
}

function drawImageContain(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  padding = 0,
) {
  const innerX = x + padding;
  const innerY = y + padding;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const scale = Math.min(innerWidth / image.width, innerHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = innerX + (innerWidth - drawWidth) / 2;
  const drawY = innerY + (innerHeight - drawHeight) / 2;

  context.save();
  roundedRectPath(context, x, y, width, height, radius);
  context.clip();
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  context.restore();
}

function drawImageTiled(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  tileWidth: number,
) {
  const aspectRatio = image.height / image.width;
  const drawTileWidth = Math.max(96, tileWidth);
  const drawTileHeight = drawTileWidth * aspectRatio;
  const columns = Math.ceil(width / drawTileWidth) + 1;
  const rows = Math.ceil(height / drawTileHeight) + 1;
  const offsetX = (width - columns * drawTileWidth) / 2;
  const offsetY = (height - rows * drawTileHeight) / 2;

  context.save();
  roundedRectPath(context, x, y, width, height, radius);
  context.clip();

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const drawX = x + offsetX + column * drawTileWidth;
      const drawY = y + offsetY + row * drawTileHeight;
      context.drawImage(image, drawX, drawY, drawTileWidth, drawTileHeight);
    }
  }

  context.restore();
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src.startsWith("http") ? src : new URL(src, window.location.origin).toString();
  });
}

async function loadFirstAvailableCanvasImage(sources: string[]) {
  for (const source of sources) {
    try {
      return await loadCanvasImage(source);
    } catch {
      continue;
    }
  }

  return null;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to create result image blob."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

function downloadResultBlob(blob: Blob, filename: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 1200);
}

async function shareResultBlob(blob: Blob, filename: string) {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function" || typeof File !== "function") {
    return "unsupported" as const;
  }

  const file = new File([blob], filename, { type: "image/png" });
  const shareData = {
    files: [file],
    title: "SBTI Result",
    text: "这是我刚生成的 SBTI 结果图。",
  };

  if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
    return "unsupported" as const;
  }

  try {
    await navigator.share(shareData);
    return "shared" as const;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled" as const;
    }

    return "failed" as const;
  }
}

async function buildResultImage(params: {
  result: ResultState;
  currentType: TypeProfile;
  topMatches: RankedType[];
  typeImage?: string;
}) {
  const { result, currentType, topMatches, typeImage } = params;

  if (typeof window === "undefined") {
    throw new Error("Result export is only available in the browser.");
  }

  if ("fonts" in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font loading failures and continue with fallback fonts.
    }
  }

  let posterImage: HTMLImageElement | null = null;
  let qrImage: HTMLImageElement | null = null;
  let sideImage: HTMLImageElement | null = null;
  if (typeImage) {
    try {
      posterImage = await loadCanvasImage(typeImage);
    } catch {
      posterImage = null;
    }
  }

  try {
    qrImage = await loadCanvasImage(RESULT_IMAGE_QR);
  } catch {
    qrImage = null;
  }

  sideImage = await loadFirstAvailableCanvasImage(RESULT_IMAGE_SIDE_IMAGE_CANDIDATES);

  const canvas = document.createElement("canvas");
  canvas.width = RESULT_IMAGE_WIDTH;
  canvas.height = RESULT_IMAGE_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context is unavailable.");
  }

  const backgroundGradient = context.createLinearGradient(0, 0, 0, RESULT_IMAGE_HEIGHT);
  backgroundGradient.addColorStop(0, RESULT_IMAGE_COLORS.bgTop);
  backgroundGradient.addColorStop(1, RESULT_IMAGE_COLORS.bgBottom);
  context.fillStyle = backgroundGradient;
  context.fillRect(0, 0, RESULT_IMAGE_WIDTH, RESULT_IMAGE_HEIGHT);

  const orbA = context.createRadialGradient(220, 220, 0, 220, 220, 380);
  orbA.addColorStop(0, "rgba(100, 220, 203, 0.28)");
  orbA.addColorStop(1, "rgba(100, 220, 203, 0)");
  context.fillStyle = orbA;
  context.fillRect(0, 0, RESULT_IMAGE_WIDTH, RESULT_IMAGE_HEIGHT);

  const orbB = context.createRadialGradient(1230, 260, 0, 1230, 260, 320);
  orbB.addColorStop(0, "rgba(214, 137, 36, 0.18)");
  orbB.addColorStop(1, "rgba(214, 137, 36, 0)");
  context.fillStyle = orbB;
  context.fillRect(0, 0, RESULT_IMAGE_WIDTH, RESULT_IMAGE_HEIGHT);

  const orbC = context.createRadialGradient(860, 2060, 0, 860, 2060, 460);
  orbC.addColorStop(0, "rgba(12, 105, 119, 0.22)");
  orbC.addColorStop(1, "rgba(12, 105, 119, 0)");
  context.fillStyle = orbC;
  context.fillRect(0, 0, RESULT_IMAGE_WIDTH, RESULT_IMAGE_HEIGHT);

  const panelInset = 56;
  const panelX = panelInset;
  const panelY = panelInset;
  const panelWidth = RESULT_IMAGE_WIDTH - panelInset * 2;
  const panelHeight = RESULT_IMAGE_HEIGHT - panelInset * 2;
  fillRoundedRect(context, panelX, panelY, panelWidth, panelHeight, 38, RESULT_IMAGE_COLORS.panel);
  strokeRoundedRect(context, panelX, panelY, panelWidth, panelHeight, 38, RESULT_IMAGE_COLORS.panelStroke, 2);

  context.save();
  context.font = `900 228px ${RESULT_IMAGE_FONT_STACK}`;
  context.fillStyle = RESULT_IMAGE_COLORS.watermark;
  context.textAlign = "right";
  context.textBaseline = "top";
  context.fillText(currentType.code, panelX + panelWidth - 52, panelY + 120);
  context.restore();

  const contentX = panelX + 48;
  const contentY = panelY + 48;
  const contentWidth = panelWidth - 96;
  const cardGap = 24;
  const posterCardWidth = 440;
  const posterCardHeight = 780;
  const infoCardX = contentX + posterCardWidth + cardGap;
  const infoCardWidth = contentWidth - posterCardWidth - cardGap;
  const topMatchesCardY = contentY + 1316;
  const dimensionGridY = contentY + 1670;
  const columnGap = 20;
  const gridCardWidth = (contentWidth - columnGap * 2) / 3;
  const generatedDate = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  drawPill(context, "SBTI RESULT ARCHIVE", contentX, contentY, {
    fill: "rgba(20, 53, 59, 0.82)",
    stroke: "rgba(61, 100, 116, 0.42)",
    color: RESULT_IMAGE_COLORS.accent,
    font: `700 24px ${RESULT_IMAGE_FONT_STACK}`,
    height: 52,
  });

  drawTextBlock(context, {
    text: currentType.code,
    x: contentX,
    y: contentY + 92,
    maxWidth: 760,
    lineHeight: 130,
    font: `900 124px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textPrimary,
    maxLines: 1,
  });

  drawTextBlock(context, {
    text: currentType.cn,
    x: contentX,
    y: contentY + 222,
    maxWidth: 640,
    lineHeight: 68,
    font: `700 58px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textSecondary,
    maxLines: 1,
  });

  drawPill(context, result.badge, contentX, contentY + 304, {
    fill: RESULT_IMAGE_COLORS.accentSoft,
    stroke: "rgba(100, 220, 203, 0.28)",
    color: RESULT_IMAGE_COLORS.textPrimary,
    font: `600 24px ${RESULT_IMAGE_FONT_STACK}`,
    height: 56,
    maxWidth: 760,
  });

  const rightMetaWidth = 280;
  const rightMetaX = panelX + panelWidth - rightMetaWidth - 48;
  drawPill(context, result.modeKicker, rightMetaX, contentY + 8, {
    fill: "rgba(214, 137, 36, 0.14)",
    stroke: "rgba(214, 137, 36, 0.3)",
    color: "#f3c98f",
    font: `700 22px ${RESULT_IMAGE_FONT_STACK}`,
    height: 50,
    maxWidth: rightMetaWidth,
  });

  drawTextBlock(context, {
    text: `生成时间 ${generatedDate}`,
    x: rightMetaX,
    y: contentY + 78,
    maxWidth: rightMetaWidth,
    lineHeight: 30,
    font: `500 24px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textMuted,
    maxLines: 1,
  });

  fillRoundedRect(context, contentX, contentY + 390, posterCardWidth, posterCardHeight, 32, RESULT_IMAGE_COLORS.card);
  strokeRoundedRect(context, contentX, contentY + 390, posterCardWidth, posterCardHeight, 32, RESULT_IMAGE_COLORS.cardStroke, 1.5);

  const posterFrameX = contentX + 24;
  const posterFrameY = contentY + 430;
  const posterFrameWidth = posterCardWidth - 48;
  const posterFrameHeight = 560;
  fillRoundedRect(
    context,
    posterFrameX,
    posterFrameY,
    posterFrameWidth,
    posterFrameHeight,
    24,
    "rgba(6, 20, 27, 0.9)",
  );

  if (posterImage) {
    drawImageContain(context, posterImage, posterFrameX, posterFrameY, posterFrameWidth, posterFrameHeight, 24, 18);
  } else {
    const placeholderGradient = context.createLinearGradient(
      posterFrameX,
      posterFrameY,
      posterFrameX + posterFrameWidth,
      posterFrameY + posterFrameHeight,
    );
    placeholderGradient.addColorStop(0, "rgba(12, 105, 119, 0.68)");
    placeholderGradient.addColorStop(1, "rgba(21, 122, 103, 0.42)");
    fillRoundedRect(context, posterFrameX, posterFrameY, posterFrameWidth, posterFrameHeight, 24, placeholderGradient);
    drawTextBlock(context, {
      text: currentType.code,
      x: posterFrameX + 36,
      y: posterFrameY + 220,
      maxWidth: posterFrameWidth - 72,
      lineHeight: 96,
      font: `900 88px ${RESULT_IMAGE_FONT_STACK}`,
      color: RESULT_IMAGE_COLORS.textPrimary,
      maxLines: 1,
    });
    drawTextBlock(context, {
      text: currentType.cn,
      x: posterFrameX + 36,
      y: posterFrameY + 320,
      maxWidth: posterFrameWidth - 72,
      lineHeight: 52,
      font: `700 42px ${RESULT_IMAGE_FONT_STACK}`,
      color: RESULT_IMAGE_COLORS.textSecondary,
      maxLines: 1,
    });
  }

  drawTextBlock(context, {
    text: "人格标语",
    x: contentX + 24,
    y: contentY + 1016,
    maxWidth: posterCardWidth - 48,
    lineHeight: 24,
    font: `700 22px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textMuted,
    maxLines: 1,
  });
  drawTextBlock(context, {
    text: currentType.intro,
    x: contentX + 24,
    y: contentY + 1058,
    maxWidth: posterCardWidth - 48,
    lineHeight: 38,
    font: `600 28px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textSecondary,
    maxLines: 3,
  });

  fillRoundedRect(context, infoCardX, contentY + 390, infoCardWidth, posterCardHeight, 32, RESULT_IMAGE_COLORS.card);
  strokeRoundedRect(context, infoCardX, contentY + 390, infoCardWidth, posterCardHeight, 32, RESULT_IMAGE_COLORS.cardStroke, 1.5);

  drawTextBlock(context, {
    text: "Primary Type",
    x: infoCardX + 28,
    y: contentY + 420,
    maxWidth: 200,
    lineHeight: 28,
    font: `700 22px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.warm,
    maxLines: 1,
  });
  drawTextBlock(context, {
    text: result.sub,
    x: infoCardX + 28,
    y: contentY + 474,
    maxWidth: infoCardWidth - 56,
    lineHeight: 38,
    font: `600 28px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textSecondary,
    maxLines: 4,
  });
  drawTextBlock(context, {
    text: "人格解读",
    x: infoCardX + 28,
    y: contentY + 654,
    maxWidth: 220,
    lineHeight: 30,
    font: `800 28px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textPrimary,
    maxLines: 1,
  });
  drawTextBlock(context, {
    text: currentType.desc,
    x: infoCardX + 28,
    y: contentY + 706,
    maxWidth: infoCardWidth - 56,
    lineHeight: 34,
    font: `500 24px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textSecondary,
    maxLines: 11,
  });

  const secondaryNote = result.special && result.secondaryType
    ? `特殊人格已接管，但最接近你的常规人格仍然是 ${result.secondaryType.code}（${result.secondaryType.cn}）。`
    : `系统按 15 维距离给你找到了最接近的常规人格分布。`;
  fillRoundedRect(
    context,
    infoCardX + 24,
    contentY + 1038,
    infoCardWidth - 48,
    98,
    22,
    RESULT_IMAGE_COLORS.cardSoft,
  );
  strokeRoundedRect(
    context,
    infoCardX + 24,
    contentY + 1038,
    infoCardWidth - 48,
    98,
    22,
    RESULT_IMAGE_COLORS.cardStroke,
    1,
  );
  drawTextBlock(context, {
    text: secondaryNote,
    x: infoCardX + 44,
    y: contentY + 1064,
    maxWidth: infoCardWidth - 88,
    lineHeight: 30,
    font: `500 22px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textSecondary,
    maxLines: 2,
  });

  drawTextBlock(context, {
    text: "相邻人格频谱",
    x: contentX,
    y: contentY + 1232,
    maxWidth: 320,
    lineHeight: 36,
    font: `800 34px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textPrimary,
    maxLines: 1,
  });
  drawTextBlock(context, {
    text: "系统根据十五维匹配度，为你保留了三条最接近的侧写。",
    x: contentX,
    y: contentY + 1280,
    maxWidth: contentWidth,
    lineHeight: 32,
    font: `500 24px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textSecondary,
    maxLines: 1,
  });

  topMatches.slice(0, 3).forEach((item, index) => {
    const cardX = contentX + index * (gridCardWidth + columnGap);
    fillRoundedRect(context, cardX, topMatchesCardY, gridCardWidth, 220, 26, RESULT_IMAGE_COLORS.cardSoft);
    strokeRoundedRect(context, cardX, topMatchesCardY, gridCardWidth, 220, 26, RESULT_IMAGE_COLORS.cardStroke, 1.25);
    drawTextBlock(context, {
      text: `#${index + 1} Signal`,
      x: cardX + 24,
      y: topMatchesCardY + 24,
      maxWidth: 180,
      lineHeight: 24,
      font: `700 20px ${RESULT_IMAGE_FONT_STACK}`,
      color: RESULT_IMAGE_COLORS.warm,
      maxLines: 1,
    });
    drawTextBlock(context, {
      text: `${item.code} (${item.cn})`,
      x: cardX + 24,
      y: topMatchesCardY + 62,
      maxWidth: gridCardWidth - 150,
      lineHeight: 36,
      font: `800 30px ${RESULT_IMAGE_FONT_STACK}`,
      color: RESULT_IMAGE_COLORS.textPrimary,
      maxLines: 2,
    });
    drawTextBlock(context, {
      text: item.intro,
      x: cardX + 24,
      y: topMatchesCardY + 120,
      maxWidth: gridCardWidth - 48,
      lineHeight: 30,
      font: `500 22px ${RESULT_IMAGE_FONT_STACK}`,
      color: RESULT_IMAGE_COLORS.textSecondary,
      maxLines: 2,
    });
    context.save();
    context.font = `900 44px ${RESULT_IMAGE_FONT_STACK}`;
    context.fillStyle = RESULT_IMAGE_COLORS.accent;
    context.textAlign = "right";
    context.textBaseline = "top";
    context.fillText(`${item.similarity}%`, cardX + gridCardWidth - 24, topMatchesCardY + 26);
    context.restore();
  });

  drawTextBlock(context, {
    text: "十五维度矩阵",
    x: contentX,
    y: contentY + 1568,
    maxWidth: 320,
    lineHeight: 36,
    font: `800 34px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textPrimary,
    maxLines: 1,
  });
  drawTextBlock(context, {
    text: "15D Signal Grid",
    x: contentX,
    y: contentY + 1616,
    maxWidth: 240,
    lineHeight: 30,
    font: `600 22px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textMuted,
    maxLines: 1,
  });

  dimensionOrder.forEach((dim, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const cardX = contentX + column * (gridCardWidth + columnGap);
    const cardY = dimensionGridY + row * 150;
    const level = result.levels[dim];

    fillRoundedRect(context, cardX, cardY, gridCardWidth, 130, 24, RESULT_IMAGE_COLORS.cardSoft);
    strokeRoundedRect(context, cardX, cardY, gridCardWidth, 130, 24, RESULT_IMAGE_COLORS.cardStroke, 1.25);
    drawTextBlock(context, {
      text: dimensionMeta[dim].model,
      x: cardX + 20,
      y: cardY + 18,
      maxWidth: gridCardWidth - 160,
      lineHeight: 22,
      font: `700 18px ${RESULT_IMAGE_FONT_STACK}`,
      color: RESULT_IMAGE_COLORS.warm,
      maxLines: 1,
    });
    drawTextBlock(context, {
      text: dimensionMeta[dim].name,
      x: cardX + 20,
      y: cardY + 48,
      maxWidth: gridCardWidth - 160,
      lineHeight: 28,
      font: `700 22px ${RESULT_IMAGE_FONT_STACK}`,
      color: RESULT_IMAGE_COLORS.textPrimary,
      maxLines: 2,
    });
    drawTextBlock(context, {
      text: DIM_EXPLANATIONS[dim][level],
      x: cardX + 20,
      y: cardY + 82,
      maxWidth: gridCardWidth - 40,
      lineHeight: 24,
      font: `500 18px ${RESULT_IMAGE_FONT_STACK}`,
      color: RESULT_IMAGE_COLORS.textSecondary,
      maxLines: 2,
    });
    context.save();
    context.font = `800 22px ${RESULT_IMAGE_FONT_STACK}`;
    context.fillStyle = RESULT_IMAGE_COLORS.accent;
    context.textAlign = "right";
    context.textBaseline = "top";
    context.fillText(`${level} / ${result.rawScores[dim]}分`, cardX + gridCardWidth - 20, cardY + 18);
    context.restore();
  });

  const qrCardSize = 220;
  const qrSideCardSize = 220;
  const qrCardGap = 24;
  const qrCardX = panelX + panelWidth - 48 - qrCardSize;
  const qrSideCardX = qrCardX - qrCardGap - qrSideCardSize;
  const qrCardY = panelY + panelHeight - 126 - qrCardSize - 42;

  drawTextBlock(context, {
    text: "扫码继续测试",
    x: contentX,
    y: qrCardY + 28,
    maxWidth: 320,
    lineHeight: 36,
    font: `800 34px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textPrimary,
    maxLines: 1,
  });
  drawTextBlock(context, {
    text: "sbti.willsleep.dev",
    x: contentX,
    y: qrCardY + 80,
    maxWidth: 520,
    lineHeight: 34,
    font: `600 26px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.accent,
    maxLines: 1,
  });
  drawTextBlock(context, {
    text: "顺手也把你朋友拉来测测，反正大家都疯了，谁也别装正常。",
    x: contentX,
    y: qrCardY + 124,
    maxWidth: 680,
    lineHeight: 30,
    font: `500 22px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textSecondary,
    maxLines: 2,
  });

  fillRoundedRect(context, qrSideCardX, qrCardY, qrSideCardSize, qrSideCardSize, 26, "rgba(255, 255, 255, 0.08)");
  strokeRoundedRect(context, qrSideCardX, qrCardY, qrSideCardSize, qrSideCardSize, 26, "rgba(61, 100, 116, 0.22)", 1.25);
  if (sideImage) {
    drawImageContain(context, sideImage, qrSideCardX, qrCardY, qrSideCardSize, qrSideCardSize, 26, 18);
  } else {
    drawTextBlock(context, {
      text: "SBTI",
      x: qrSideCardX + 54,
      y: qrCardY + 82,
      maxWidth: 120,
      lineHeight: 44,
      font: `900 42px ${RESULT_IMAGE_FONT_STACK}`,
      color: RESULT_IMAGE_COLORS.textPrimary,
      maxLines: 1,
    });
  }

  fillRoundedRect(context, qrCardX, qrCardY, qrCardSize, qrCardSize, 26, "#ffffff");
  strokeRoundedRect(context, qrCardX, qrCardY, qrCardSize, qrCardSize, 26, "rgba(61, 100, 116, 0.22)", 1.25);
  if (qrImage) {
    drawImageCover(context, qrImage, qrCardX + 20, qrCardY + 20, qrCardSize - 40, qrCardSize - 40, 16);
  } else {
    drawTextBlock(context, {
      text: "QR",
      x: qrCardX + 74,
      y: qrCardY + 78,
      maxWidth: 80,
      lineHeight: 44,
      font: `900 42px ${RESULT_IMAGE_FONT_STACK}`,
      color: "#000000",
      maxLines: 1,
    });
  }

  context.save();
  context.strokeStyle = "rgba(61, 100, 116, 0.34)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(contentX, panelY + panelHeight - 126);
  context.lineTo(contentX + contentWidth, panelY + panelHeight - 126);
  context.stroke();
  context.restore();

  drawTextBlock(context, {
    text: "结果图片仅供娱乐分享，请勿当作专业诊断或人生判决书。",
    x: contentX,
    y: panelY + panelHeight - 94,
    maxWidth: 700,
    lineHeight: 30,
    font: `500 22px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textMuted,
    maxLines: 1,
  });
  drawTextBlock(context, {
    text: "Subjective Brainrot Tendency Inventory",
    x: contentX + contentWidth - 430,
    y: panelY + panelHeight - 94,
    maxWidth: 430,
    lineHeight: 30,
    font: `600 20px ${RESULT_IMAGE_FONT_STACK}`,
    color: RESULT_IMAGE_COLORS.textSecondary,
    maxLines: 1,
  });

  return canvasToBlob(canvas);
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function sumToLevel(score: number): Level {
  if (score <= 3) return "L";
  if (score === 4) return "M";
  return "H";
}

function levelNum(level: Level) {
  return { L: 1, M: 2, H: 3 }[level];
}

function parsePattern(pattern: string) {
  return pattern.replace(/-/g, "").split("") as Level[];
}

function getVisibleQuestions(shuffledQuestions: Question[], answers: AnswerMap) {
  const visible = [...shuffledQuestions];
  const gateIndex = visible.findIndex((question) => question.id === "drink_gate_q1");

  if (gateIndex !== -1 && answers.drink_gate_q1 === 3) {
    visible.splice(gateIndex + 1, 0, specialQuestions[1]);
  }

  return visible;
}

function resolveSystemTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "night";
  }

  if (typeof window.matchMedia !== "function") {
    return "night";
  }

  if (window.matchMedia("(prefers-contrast: more)").matches) {
    return "contrast";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
}

function computeResult(answers: AnswerMap): ResultState {
  const rawScores = Object.keys(dimensionMeta).reduce(
    (acc, dim) => ({
      ...acc,
      [dim]: 0,
    }),
    {} as Record<DimensionKey, number>,
  );

  for (const question of questions) {
    rawScores[question.dim] += Number(answers[question.id] || 0);
  }

  const levels = dimensionOrder.reduce(
    (acc, dim) => ({
      ...acc,
      [dim]: sumToLevel(rawScores[dim]),
    }),
    {} as Record<DimensionKey, Level>,
  );

  const userVector = dimensionOrder.map((dim) => levelNum(levels[dim]));
  const ranked: RankedType[] = NORMAL_TYPES.map((type) => {
    const profile = TYPE_LIBRARY[type.code];
    const vector = parsePattern(type.pattern).map(levelNum);
    let distance = 0;
    let exact = 0;

    for (let index = 0; index < vector.length; index += 1) {
      const diff = Math.abs(userVector[index] - vector[index]);
      distance += diff;
      if (diff === 0) {
        exact += 1;
      }
    }

    const similarity = Math.max(0, Math.round((1 - distance / 30) * 100));
    return {
      code: type.code,
      pattern: type.pattern,
      cn: profile.cn,
      intro: profile.intro,
      desc: profile.desc,
      distance,
      exact,
      similarity,
    };
  }).sort((left, right) => {
    if (left.distance !== right.distance) {
      return left.distance - right.distance;
    }

    if (left.exact !== right.exact) {
      return right.exact - left.exact;
    }

    return right.similarity - left.similarity;
  });

  const bestNormal = ranked[0];
  if (!bestNormal) {
    throw new Error("No normal types configured.");
  }
  const drunkTriggered = answers[DRUNK_TRIGGER_QUESTION_ID] === 2;

  if (drunkTriggered) {
    return {
      rawScores,
      levels,
      ranked,
      bestNormal,
      finalType: TYPE_LIBRARY.DRUNK,
      modeKicker: "隐藏人格已激活",
      badge: "匹配度 100% · 酒精异常因子已接管",
      sub: "乙醇亲和性过强，系统已直接跳过常规人格审判。",
      special: true,
      secondaryType: bestNormal,
    };
  }

  if (bestNormal.similarity < 60) {
    return {
      rawScores,
      levels,
      ranked,
      bestNormal,
      finalType: TYPE_LIBRARY.HHHH,
      modeKicker: "系统强制兜底",
      badge: `标准人格库最高匹配仅 ${bestNormal.similarity}%`,
      sub: "标准人格库对你的脑回路集体罢工了，于是系统把你强制分配给了 HHHH。",
      special: true,
      secondaryType: null,
    };
  }

  return {
    rawScores,
    levels,
    ranked,
    bestNormal,
    finalType: bestNormal,
    modeKicker: "你的主类型",
    badge: `匹配度 ${bestNormal.similarity}% · 精准命中 ${bestNormal.exact}/15 维`,
    sub: "维度命中度较高，当前结果可视为你的第一人格画像。",
    special: false,
    secondaryType: null,
  };
}

export function SbtiApp() {
  const [screen, setScreen] = useState<ScreenName>("intro");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [result, setResult] = useState<ResultState | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [transitionTick, setTransitionTick] = useState(0);
  const [theme, setTheme] = useState<ThemeMode | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [saveImageNotice, setSaveImageNotice] = useState<string | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const questionHeadingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  useEffect(() => {
    const applyTheme = () => {
      const nextTheme = resolveSystemTheme();
      document.documentElement.setAttribute("data-theme", nextTheme);
      document.documentElement.style.colorScheme = nextTheme === "day" ? "light" : "dark";
      setTheme((currentTheme) => (currentTheme === nextTheme ? currentTheme : nextTheme));
    };

    if (typeof window.matchMedia !== "function") {
      applyTheme();
      return;
    }

    const schemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const contrastQuery = window.matchMedia("(prefers-contrast: more)");
    applyTheme();

    const addMediaListener = (query: MediaQueryList) => {
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", applyTheme);
      } else {
        query.addListener(applyTheme);
      }
    };

    const removeMediaListener = (query: MediaQueryList) => {
      if (typeof query.removeEventListener === "function") {
        query.removeEventListener("change", applyTheme);
      } else {
        query.removeListener(applyTheme);
      }
    };

    addMediaListener(schemeQuery);
    addMediaListener(contrastQuery);

    return () => {
      removeMediaListener(schemeQuery);
      removeMediaListener(contrastQuery);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  const visibleQuestions = getVisibleQuestions(shuffledQuestions, answers);
  const currentQuestion = visibleQuestions[currentQuestionIndex] ?? null;
  const answeredCount = visibleQuestions.filter((question) => answers[question.id] !== undefined).length;
  const progress = visibleQuestions.length
    ? Math.round((answeredCount / visibleQuestions.length) * 100)
    : 0;
  const isComplete = visibleQuestions.length > 0 && answeredCount === visibleQuestions.length;
  const transitionMessage =
    transitionMessages[currentQuestionIndex % transitionMessages.length] ?? transitionMessages[0];

  useEffect(() => {
    if (!visibleQuestions.length) {
      return;
    }

    if (currentQuestionIndex > visibleQuestions.length - 1) {
      setCurrentQuestionIndex(visibleQuestions.length - 1);
    }
  }, [currentQuestionIndex, visibleQuestions.length]);

  useEffect(() => {
    if (screen !== "test" || !currentQuestion) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const questionHeading = questionHeadingRef.current;
      if (!questionHeading) {
        return;
      }

      const prefersReducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const stickyHeaderHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
      const topOffset = window.innerWidth < 768 ? 18 : 24;
      const targetTop =
        window.scrollY + questionHeading.getBoundingClientRect().top - stickyHeaderHeight - topOffset;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });

      try {
        questionHeading.focus({ preventScroll: true });
      } catch {
        questionHeading.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [currentQuestion, screen]);

  const pulseTransition = () => {
    setTransitionTick((current) => current + 1);
  };

  const navigateToScreen = (nextScreen: ScreenName) => {
    if (nextScreen !== "result") {
      setSaveImageNotice(null);
    }
    setScreen(nextScreen);
    pulseTransition();
  };

  const navigateQuestion = (nextIndex: number) => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
    setCurrentQuestionIndex(nextIndex);
    pulseTransition();
  };

  const startTest = () => {
    const regularQuestions = shuffle(questions);
    const insertIndex = Math.floor(Math.random() * regularQuestions.length) + 1;

    if (autoAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
    }

    setAnswers({});
    setResult(null);
    setSaveImageNotice(null);
    setCurrentQuestionIndex(0);
    setShuffledQuestions([
      ...regularQuestions.slice(0, insertIndex),
      specialQuestions[0],
      ...regularQuestions.slice(insertIndex),
    ]);
    navigateToScreen("test");
  };

  const handleAnswer = (questionId: string, value: number, index: number) => {
    const nextAnswers = {
      ...answers,
      [questionId]: value,
    };

    if (questionId === "drink_gate_q1" && value !== 3) {
      delete nextAnswers.drink_gate_q2;
    }

    setAnswers(nextAnswers);

    const nextVisibleQuestions = getVisibleQuestions(shuffledQuestions, nextAnswers);
    if (autoAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
    }

    if (index < nextVisibleQuestions.length - 1) {
      autoAdvanceTimeoutRef.current = window.setTimeout(() => {
        navigateQuestion(index + 1);
      }, 220);
    }
  };

  const submitResult = () => {
    const nextResult = computeResult(answers);
    setResult(nextResult);
    navigateToScreen("result");
  };

  const currentType = result?.finalType ?? TYPE_LIBRARY.CTRL;
  const typeImage = TYPE_IMAGES[currentType.code];
  const topMatches = result?.ranked.slice(0, 3) ?? [];
  const themeLabel =
    theme === "contrast"
      ? "Contrast Reactor"
      : theme === "day"
        ? "Day Reactor"
        : theme === "night"
          ? "Night Reactor"
          : "Auto Reactor";
  const protocolLabel =
    theme === "contrast"
      ? "contrast override protocol"
      : theme === "day"
        ? "solar glitch protocol"
        : theme === "night"
          ? "lunar glitch protocol"
          : "adaptive glitch protocol";

  const saveResultAsImage = async () => {
    if (!result || isSavingImage) {
      return;
    }

    setIsSavingImage(true);
    setSaveImageNotice(null);

    try {
      const blob = await buildResultImage({
        result,
        currentType,
        topMatches,
        typeImage,
      });
      const filename = `sbti-${currentType.code.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}-result.png`;
      const shareState = await shareResultBlob(blob, filename);

      if (shareState === "shared") {
        setSaveImageNotice("已打开系统分享面板，你可以直接保存到相册。");
        return;
      }

      if (shareState === "cancelled") {
        setSaveImageNotice("你取消了本次分享。");
        return;
      }

      downloadResultBlob(blob, filename);
      setSaveImageNotice(
        shareState === "failed"
          ? "当前浏览器未能直接调起系统分享，已回退为下载图片。"
          : "当前浏览器不支持直接保存到相册，已开始下载图片。",
      );
    } catch (error) {
      console.error(error);
      setSaveImageNotice("保存失败了，请稍后再试。");
    } finally {
      setIsSavingImage(false);
    }
  };

  return (
    <div className="sbti-page relative min-h-screen overflow-hidden px-3 py-4 text-[var(--text-primary)] sm:px-4 sm:py-5 md:px-6 md:py-6">
      <div className="signal-orb signal-orb-a" />
      <div className="signal-orb signal-orb-b" />
      <div className="signal-orb signal-orb-c" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header
          ref={headerRef}
          className="glass-nav sticky top-3 z-40 flex flex-col gap-4 rounded-[1.6rem] px-4 py-4 md:top-4 md:rounded-full md:px-5 md:py-4 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="brand-mark grid h-12 w-12 place-items-center overflow-hidden rounded-2xl">
              <Image
                src={SITE_LOGO}
                alt="SBTI logo"
                width={48}
                height={48}
                className="h-full w-full object-contain p-1"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[var(--secondary)] sm:tracking-[0.4em]">Subjective Brainrot Tendency Inventory</p>
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">Modified by willsleep</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:flex-wrap md:items-center">
            <div className="status-pill-warm inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] sm:text-xs sm:tracking-[0.24em] md:w-auto">
              <span suppressHydrationWarning>{themeLabel}</span>
            </div>
            <a
              href="https://career.yueqiao.dev"
              target="_blank"
              rel="noreferrer"
              className="nav-cta-link inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition hover:-translate-y-0.5 md:w-auto"
            >
              求求了给个工作吧
            </a>
            <div className="status-pill-neutral inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] sm:text-xs sm:tracking-[0.24em] md:w-auto">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              {screenStatus[screen]}
            </div>
          </div>
        </header>

        {screen === "intro" ? (
          <LampSection className="intro-shell">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-center">
              <div className="relative z-10">
                <div className="hero-kicker inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] sm:tracking-[0.28em]">
                  semi-unhinged system indexing how your mind starts to bend, glitch, and spiritually overclock
                </div>
                <p className="mt-5 text-xs uppercase tracking-[0.22em] text-[var(--warning)] sm:text-sm sm:tracking-[0.34em]">
                  把人格测试改造成一台会闪烁、会低鸣、还会顺手扫描你精神褶皱的装置。
                </p>
                <h1 className="mt-4 max-w-4xl text-[2.7rem] font-black leading-[0.92] tracking-[-0.08em] text-[var(--text-primary)] sm:text-5xl md:text-7xl">
                  MBTI 先别演了，
                  <GlitchText
                    as="span"
                    className="block text-[var(--accent)]"
                    text="SBTI 正在接管你的灵魂与人格。"
                  />
                </h1>
                <p className="mt-6 max-w-2xl text-[0.98rem] leading-8 text-[color:var(--text-secondary)] md:text-lg">
                  这玩意儿真不是那种老派到冒灰的人格测试，别一看到问题就条件反射开始给自己贴标签，先别急，真的先别急。它更像是拿着显微镜，顺着你的脑回路一路往里扒，狠狠干一波你思维纹理的“现场采样”。有些题你会显得巨理性，冷静得像刚从逻辑引擎里出厂，仿佛下一秒就要开始列一二三四；但还有一些题，会把你那种自己平时都懒得承认、甚至根本说不清的内在倾斜直接抖出来。不是，谁懂，这种感觉就像你以为自己稳得一批，结果拐个弯突然被自己的潜意识背刺，当场掉帧。你以为你在答题，其实是你的思维自己在偷偷露馅。
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button type="button" className="signal-button signal-button-primary w-full sm:w-auto" onClick={startTest}>
                    开测，别演了。
                  </button>
                  <a
                    href="https://space.bilibili.com/417038183"
                    target="_blank"
                    rel="noreferrer"
                    className="signal-button signal-button-secondary w-full sm:w-auto"
                  >
                    原作者 B站@蛆肉儿串儿
                  </a>
                </div>

                <div className="mt-8 grid gap-3 md:grid-cols-3">
                  <div className="metric-card">
                    <span className="metric-label">Modified by</span>
                    <strong>willsleep</strong>
                    <p>国际服困神</p>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Career</span>
                    <strong>求求了给个工作吧</strong>
                    <p>孩子都 senior 了，再没 job 真的要红温了</p>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Output</span>
                    <strong>27 种人格</strong>
                    <p>普通款、隐藏款，再叠个 15 维矩阵一起开大，最后把你归档成一份离谱但精准的怪东西。</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10">
                <BentoGrid className="auto-rows-[minmax(9rem,auto)]">
                  <BentoCard className="hero-feature-card md:col-span-4 md:row-span-2">
                    <div className="hero-feature-chip inline-flex rounded-full px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.24em]">
                      Signal Matrix
                    </div>
                    <div className="mt-4 text-5xl font-black tracking-[-0.08em] text-[var(--text-on-brand)] md:text-6xl">15D / 31Q</div>
                    <div className="mt-5 grid gap-3 text-sm leading-7 text-[color:var(--text-on-brand-soft)]">
                      <p>31 道题会被随机打散，像命运自己动手抽你。</p>
                      <p>最后给你的也不是什么温柔安慰，而是一张闪着光的电子人格通缉令。</p>
                    </div>
                    <div className="hero-feature-chip mt-5 inline-flex w-fit rounded-full px-3 py-1 text-[0.65rem] uppercase tracking-[0.28em] text-[color:var(--text-on-brand-soft)]">
                      <span suppressHydrationWarning>{protocolLabel}</span>
                    </div>
                  </BentoCard>

                  <CardSpotlight className="md:col-span-2">
                    <div className="p-5">
                      <p className="tone-cool text-[0.68rem] font-bold uppercase tracking-[0.24em]">你，会怎么反应</p>
                      <h2 className="mt-3 text-2xl font-black tracking-[-0.05em] text-[var(--text-primary)]">味儿完全不对</h2>
                      <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
                        你是先稳住，先乱掉，先质疑，先硬撑，还是当场跟着一起抽象。
                      </p>
                    </div>
                  </CardSpotlight>

                  <CardSpotlight className="md:col-span-2">
                    <div className="p-5">
                      <p className="tone-warm text-[0.68rem] font-bold uppercase tracking-[0.24em]">免责声明</p>
                      <h2 className="mt-3 text-2xl font-black tracking-[-0.05em] text-[var(--text-primary)]">不能定义你的全部</h2>
                      <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
                        这不是诊断书，是一份抽象侧写；请理性观看，别一边破防一边对号入座。
                      </p>
                    </div>
                  </CardSpotlight>

                  <CardSpotlight className="md:col-span-3">
                    <div className="p-5">
                      <p className="tone-cool text-[0.68rem] font-bold uppercase tracking-[0.24em]">长吗</p>
                      <h2 className="mt-3 text-2xl font-black tracking-[-0.05em] text-[var(--text-primary)]">大概 3–6 分钟</h2>
                      <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
                        5 分钟 ？
                        没有标准答案，
                        只有你在世界开始轻微发癫时，留下来的反应痕迹。
                      </p>
                    </div>
                  </CardSpotlight>

                  <CardSpotlight className="md:col-span-3">
                    <div className="p-5">
                      <p className="tone-warm text-[0.68rem] font-bold uppercase tracking-[0.24em]">Result Archive</p>
                      <h2 className="mt-3 text-2xl font-black tracking-[-0.05em] text-[var(--text-primary)]">人格矩阵</h2>
                      <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
                        你会拿到一组人格代号、核心倾向、行为描述， 以及你在系统里到底是怎么歪掉的。  不是“你是谁”的温柔归档， 是“你一进噪声和混乱就会往哪边发癫”的现场通报。  说白了， 这不是人格测试结果， 这是你的精神失真报告。
                      </p>
                    </div>
                  </CardSpotlight>
                </BentoGrid>
              </div>
            </div>
          </LampSection>
        ) : null}

        {screen === "test" ? (
          <section className="content-shell rounded-[2rem] px-5 py-6 md:px-7 md:py-7">
            <div key={`scene-${transitionTick}`} className="scene-flash" aria-hidden="true" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="section-chip">Question Stream</div>
                <h2 className="mt-4 max-w-2xl text-[2.3rem] font-black tracking-[-0.06em] text-[var(--text-primary)] md:text-5xl">
                  今天这系统不读答案，读你。
                </h2>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--secondary)] sm:text-sm sm:tracking-[0.28em]">
                  抽取你的灵魂
                </p>
              </div>

              <div className="progress-shell w-full max-w-none lg:max-w-md">
                <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                  <span>Current Progress</span>
                  <span className="text-[var(--accent)]">
                    {answeredCount} / {visibleQuestions.length}
                  </span>
                </div>
                <div className="progress-track mt-3 h-3 overflow-hidden rounded-full">
                  <div
                    className="progress-fill h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="section-note mt-5 rounded-full px-4 py-3 text-sm leading-7">
              {isComplete
                ? "做完了？正在打包你的魂魄交给结果页发落。"
                : "做个测试还想中途灵魂出走，属实有点太赛博游魂了，乖乖答题吧。"}
            </div>

            <div className="question-signal-strip mt-6">
              <GlitchText as="p" className="text-[var(--question-strip-text)] text-sm uppercase tracking-[0.32em]" text={transitionMessage} />
            </div>

            {currentQuestion ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,1fr)]">
                <CardSpotlight className="order-2 p-5 lg:order-1">
                  <p className="tone-cool text-[0.68rem] font-bold uppercase tracking-[0.24em]">Current Slice</p>
                  <GlitchText
                    as="div"
                    className="mt-4 text-6xl font-black tracking-[-0.09em] text-[var(--text-primary)]"
                    text={`${currentQuestionIndex + 1}`}
                  />
                  <p className="mt-2 text-sm text-[color:var(--text-secondary)]">/ {visibleQuestions.length}</p>

                  <div className="question-index-grid mt-5">
                    {visibleQuestions.map((question, index) => (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => navigateQuestion(index)}
                        className={cn(
                          "question-dot-row",
                          index === currentQuestionIndex && "question-dot-row-active",
                          answers[question.id] !== undefined && "question-dot-row-complete",
                        )}
                      >
                        <span className="question-dot-index">{index + 1}</span>
                        <span className="truncate">
                          {"special" in question && question.special ? "special branch" : "signal shard"}
                        </span>
                      </button>
                    ))}
                  </div>
                </CardSpotlight>

                <article
                  key={`${currentQuestion.id}-${transitionTick}`}
                  className="question-card question-card-focus order-1 lg:order-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--text-muted)]">
                    <span className="badge-pill">第 {currentQuestionIndex + 1} 题</span>
                    <span>
                      {"special" in currentQuestion && currentQuestion.special ? "补充题 / hidden branch" : "维度已隐藏"}
                    </span>
                  </div>

                  <div ref={questionHeadingRef} tabIndex={-1} className="question-heading-anchor">
                    <GlitchText
                      as="h3"
                      className="mt-5 whitespace-pre-wrap text-[1.6rem] leading-[1.7] text-[var(--text-primary)] sm:text-2xl md:text-3xl"
                      text={currentQuestion.text}
                    />
                  </div>

                  <div className="mt-6 grid gap-3">
                    {currentQuestion.options.map((option, optionIndex) => {
                      const checked = answers[currentQuestion.id] === option.value;
                      return (
                        <label
                          key={`${currentQuestion.id}-${option.value}`}
                          className={cn("answer-option", checked && "answer-option-active")}
                        >
                          <input
                            checked={checked}
                            onChange={() => handleAnswer(currentQuestion.id, option.value, currentQuestionIndex)}
                            className="mt-1 accent-[var(--primary)]"
                            type="radio"
                            name={currentQuestion.id}
                            value={option.value}
                          />
                          <span className="option-code">{optionCodes[optionIndex] || optionIndex + 1}</span>
                          <span className="text-[0.95rem] leading-7 text-[color:var(--text-secondary)] md:text-[0.98rem]">
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
                    <div className="text-sm uppercase tracking-[0.26em] text-[color:var(--text-muted)]">
                      {answers[currentQuestion.id] !== undefined ? "signal captured" : "waiting for your answer"}
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        className="signal-button signal-button-secondary w-full sm:w-auto"
                        disabled={currentQuestionIndex === 0}
                        onClick={() => navigateQuestion(Math.max(0, currentQuestionIndex - 1))}
                      >
                        上一题
                      </button>
                      {currentQuestionIndex < visibleQuestions.length - 1 ? (
                        <button
                          type="button"
                          className="signal-button signal-button-primary w-full sm:w-auto"
                          disabled={answers[currentQuestion.id] === undefined}
                          onClick={() => navigateQuestion(Math.min(visibleQuestions.length - 1, currentQuestionIndex + 1))}
                        >
                          下一题
                        </button>
                      ) : (
                        <button
                          className="signal-button signal-button-primary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                          onClick={submitResult}
                          disabled={!isComplete}
                        >
                          提交并查看结果
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm uppercase tracking-[0.28em] text-[color:var(--text-muted)]">未完成之前，系统不会给你结果。</p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                <button type="button" className="signal-button signal-button-secondary w-full sm:w-auto" onClick={() => navigateToScreen("intro")}>
                  返回首页
                </button>
                <div className="status-pill-neutral rounded-full px-4 py-3 text-center text-xs uppercase tracking-[0.24em]">
                  auto jump after selection
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {screen === "result" && result ? (
          <section className="content-shell rounded-[2rem] px-5 py-6 md:px-7 md:py-7">
            <div key={`scene-${transitionTick}`} className="scene-flash" aria-hidden="true" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="section-chip">Result Archive</div>
                <h2 className="mt-4 text-[2.3rem] font-black tracking-[-0.06em] text-[var(--text-primary)] md:text-5xl">
                  系统已经完成压缩与命名。
                </h2>
              </div>
              <div className="badge-pill max-w-full justify-center text-center">
                {result.modeKicker}
              </div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(300px,0.88fr)_minmax(0,1.12fr)]">
              <CardSpotlight className="poster-panel p-5">
                <div className="pointer-events-none absolute right-5 top-3 text-[clamp(3rem,10vw,7rem)] font-black tracking-[-0.1em] text-[var(--text-muted)] opacity-15">
                  <GlitchText as="span" text={currentType.code} />
                </div>
                <div className="relative z-10 flex h-full flex-col gap-4">
                  <div
                    className="poster-image-wrap"
                    role="img"
                    aria-label={`${currentType.code}（${currentType.cn}）`}
                    style={
                      typeImage
                        ? {
                            backgroundImage: `url(${typeImage})`,
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "contain",
                            backgroundPosition: "center center",
                          }
                        : undefined
                    }
                  />
                  <div>
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">人格标语</p>
                    <p className="mt-3 text-base leading-8 text-[color:var(--text-secondary)]">{currentType.intro}</p>
                  </div>
                </div>
              </CardSpotlight>

              <div className="grid gap-5">
                <CardSpotlight className="p-6">
                  <p className="tone-warm text-[0.68rem] font-bold uppercase tracking-[0.24em]">Primary Type</p>
                  <GlitchText
                    as="h3"
                    className="mt-4 text-[2.8rem] font-black tracking-[-0.08em] text-[var(--text-primary)] md:text-6xl"
                    text={currentType.code}
                  />
                  <span className="mt-3 block text-[1.7rem] font-bold tracking-[-0.04em] text-[color:var(--text-secondary)] md:text-3xl">
                    {currentType.cn}
                  </span>
                  <div className="badge-pill mt-5 inline-flex normal-case tracking-normal text-[0.92rem] text-[var(--text-primary)]">
                    {result.badge}
                  </div>
                  <p className="mt-4 text-base leading-8 text-[color:var(--text-secondary)]">{result.sub}</p>
                </CardSpotlight>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                  <CardSpotlight className="p-6 lg:row-span-2">
                    <h3 className="text-2xl font-black tracking-[-0.05em] text-[var(--text-primary)]">人格解读</h3>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-[color:var(--text-secondary)] md:text-[0.98rem]">
                      {currentType.desc}
                    </p>
                  </CardSpotlight>

                  <CardSpotlight className="p-6">
                    <h3 className="text-2xl font-black tracking-[-0.05em] text-[var(--text-primary)]">相邻人格频谱</h3>
                    <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
                      {result.special && result.secondaryType
                        ? `特殊人格已接管，但常规人格里最接近你的仍然是 ${result.secondaryType.code}（${result.secondaryType.cn}）。`
                        : "系统按 15 维距离给你找了三个最接近的常规人格。"}
                    </p>
                    <div className="mt-4 grid gap-3">
                      {topMatches.map((item, index) => (
                        <div key={item.code} className="card-soft rounded-[1.25rem] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="tone-warm text-[0.68rem] font-bold uppercase tracking-[0.22em]">
                                #{index + 1} Signal
                              </p>
                              <p className="mt-2 text-xl font-black tracking-[-0.04em] text-[var(--text-primary)]">
                                {item.code}
                                <span className="ml-2 text-sm font-medium tracking-normal text-[color:var(--text-secondary)]">({item.cn})</span>
                              </p>
                              <p className="mt-2 text-sm leading-7 text-[color:var(--text-secondary)]">{item.intro}</p>
                            </div>
                            <div className="text-2xl font-black tracking-[-0.04em] text-[var(--accent)]">{item.similarity}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardSpotlight>

                  <CardSpotlight className="p-6">
                    <h3 className="text-2xl font-black tracking-[-0.05em] text-[var(--text-primary)]">友情提示</h3>
                    <p className="mt-4 text-sm leading-7 text-[color:var(--text-secondary)]">
                      {result.special
                        ? "本测试仅供娱乐。隐藏人格和傻乐兜底都属于作者故意埋的损招，请勿把它当成医学、心理学、相学、命理学或灵异学依据。"
                        : "本测试仅供娱乐，别拿它当诊断、面试、相亲、分手、招魂、算命或人生判决书。你可以笑，但别太当真。"}
                    </p>
                  </CardSpotlight>
                </div>
              </div>
            </div>

            <CardSpotlight className="mt-5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black tracking-[-0.05em] text-[var(--text-primary)]">十五维度矩阵</h3>
                  <p className="mt-2 text-sm uppercase tracking-[0.24em] text-[color:var(--text-muted)]">15D Signal Grid</p>
                </div>
                <div className="badge-pill">Archive Snapshot</div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {dimensionOrder.map((dim) => {
                  const level = result.levels[dim];
                  return (
                    <div key={dim} className="card-soft rounded-[1.5rem] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="tone-warm text-[0.68rem] font-bold uppercase tracking-[0.22em]">
                            {dimensionMeta[dim].model}
                          </p>
                          <p className="mt-2 text-base font-bold text-[var(--text-primary)]">{dimensionMeta[dim].name}</p>
                        </div>
                        <div className="text-right text-base font-black text-[var(--accent)]">
                          {level} / {result.rawScores[dim]}分
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">{DIM_EXPLANATIONS[dim][level]}</p>
                    </div>
                  );
                })}
              </div>
            </CardSpotlight>

            <details className="details-panel mt-5 rounded-[1.75rem] p-6 text-[color:var(--text-secondary)]">
              <summary className="cursor-pointer list-none text-2xl font-black tracking-[-0.05em] text-[var(--text-primary)]">
                作者的话
              </summary>
              <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5 text-sm leading-8">
                <p>本测试首发于 B 站 up 主蛆肉儿串儿（UID 417038183），初衷是劝诫一位爱喝酒的朋友戒酒。</p>
                <p>由于作者的人格是 SHIT 愤世者，所以平等地攻击了各位，在此抱歉，不过她说自己是一个绝世大美女，你们一定会原谅她。</p>
                <p>这个测试没法很好地平衡娱乐和专业性，因此某些人格解释可能模糊甚至不准，如有冒犯非常抱歉。</p>
                <p>总之好玩为主，请不要把它用于盈利、诊断或人生裁决。</p>
              </div>
              <summary className="cursor-pointer list-none text-2xl font-black tracking-[-0.05em] text-[var(--text-primary)]">
                改编者的话
              </summary>
              <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5 text-sm leading-8">
                我无话可说
              </div>

            </details>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[color:var(--text-muted)]">结果已经归档，你也可以重新审判一次自己。</p>
                {saveImageNotice ? (
                  <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{saveImageNotice}</p>
                ) : null}
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  className="signal-button signal-button-secondary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                  onClick={saveResultAsImage}
                  disabled={isSavingImage}
                >
                  {isSavingImage ? "正在生成图片..." : "保存/分享图片"}
                </button>
                <button type="button" className="signal-button signal-button-secondary w-full sm:w-auto" onClick={startTest}>
                  重新测试
                </button>
                <button type="button" className="signal-button signal-button-primary w-full sm:w-auto" onClick={() => navigateToScreen("intro")}>
                  回到首页
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
