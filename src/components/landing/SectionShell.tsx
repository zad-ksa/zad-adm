import React from "react";
import { hexToRgba, type SectionStyle } from "@/lib/landing";

/**
 * غلاف فقرة الواجهة الرئيسية: يبني طبقات الخلفية (لون/تدرّج/صورة + طبقة overlay)
 * وطبقة التأثير الحركي اللانهائي، ويُمرّر ضوابط النص (لون/حجم/محاذاة) عبر سمات
 * data ومتغيّرات CSS يستهلكها globals.css.
 *
 * مكوّن عرض صِرف بلا "use client" — يعمل من مكوّن خادم (page.tsx) ومن مكوّن عميل
 * (المعاينة الحية) معاً.
 */
export default function SectionShell({
  style,
  children,
  className = "",
  id,
}: {
  style: SectionStyle;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const bg = style.background;
  const text = style.text;

  const styleVars: React.CSSProperties = {};
  if (text.headingColor) (styleVars as Record<string, string>)["--sec-heading"] = text.headingColor;
  if (text.bodyColor) (styleVars as Record<string, string>)["--sec-body"] = text.bodyColor;
  if (text.headingScale && text.headingScale !== 1) {
    (styleVars as Record<string, string>)["--sec-heading-scale"] = String(text.headingScale);
  }
  if (text.bodyScale && text.bodyScale !== 1) {
    (styleVars as Record<string, string>)["--sec-body-scale"] = String(text.bodyScale);
  }

  const dataAttrs: Record<string, string> = {};
  if (text.headingColor) dataAttrs["data-ls-hc"] = "";
  if (text.bodyColor) dataAttrs["data-ls-bc"] = "";
  if (text.headingScale && text.headingScale !== 1) dataAttrs["data-ls-hscale"] = "";
  if (text.bodyScale && text.bodyScale !== 1) dataAttrs["data-ls-bscale"] = "";
  if (text.align) dataAttrs["data-ls-align"] = text.align;

  const img = bg.image;

  return (
    <div
      id={id}
      className={`relative isolate ${className}`}
      style={styleVars}
      {...dataAttrs}
    >
      {/* طبقة الخلفية */}
      {bg.type === "solid" && (
        <div aria-hidden className="absolute inset-0 z-0" style={{ backgroundColor: bg.color }} />
      )}

      {bg.type === "gradient" && (
        <div
          aria-hidden
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `linear-gradient(${bg.gradient.angle}deg, ${bg.gradient.from}, ${bg.gradient.to})`,
          }}
        />
      )}

      {bg.type === "image" && img && (
        <div aria-hidden className="absolute inset-0 z-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("${img.url}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: img.opacity,
              filter: img.blur ? `blur(${img.blur}px)` : undefined,
              transform: img.blur ? "scale(1.06)" : undefined,
            }}
          />
          {img.overlayOpacity > 0 && (
            <div
              className="absolute inset-0"
              style={{ backgroundColor: hexToRgba(img.overlayColor, img.overlayOpacity) }}
            />
          )}
        </div>
      )}

      {/* طبقة التأثير الحركي */}
      {bg.animation.type !== "none" && (
        <div
          aria-hidden
          className={`landing-anim landing-anim--${bg.animation.type}`}
          style={
            {
              "--anim-duration": `${bg.animation.speed}s`,
              "--anim-a": bg.animation.colorA,
              "--anim-b": bg.animation.colorB,
            } as React.CSSProperties
          }
        />
      )}

      {/* المحتوى فوق كل الطبقات */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
