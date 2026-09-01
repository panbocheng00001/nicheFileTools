"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export type LightboxImage = {
  src: string;
  alt: string;
  caption?: string;
};

type View = { scale: number; x: number; y: number };

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const STEP = 1.4;
const FIT: View = { scale: 1, x: 0, y: 0 };

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/**
 * Drop-in replacement for a plain <img> in docs / help pages.
 * Click (or keyboard Enter) opens a full-screen viewer with zoom, pan,
 * keyboard controls and optional prev/next navigation through a group.
 */
export function ZoomableImage({
  image,
  group,
  eager = false,
  className = "w-full",
}: {
  image: LightboxImage;
  group?: LightboxImage[];
  eager?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const images = useMemo(
    () => (group && group.length > 0 ? group : [image]),
    [group, image],
  );
  const startIndex = Math.max(
    0,
    images.findIndex((i) => i.src === image.src),
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Enlarge image: ${image.alt}`}
        className="group/zoom relative block w-full cursor-zoom-in text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <img
          src={image.src}
          alt={image.alt}
          loading={eager ? "eager" : "lazy"}
          className={`${className} transition-transform duration-500 group-hover/zoom:scale-[1.015] group-focus-visible/zoom:scale-[1.015]`}
        />
        <span className="pointer-events-none absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/85 px-2 py-1 font-mono text-sm uppercase tracking-widest text-muted-foreground opacity-0 backdrop-blur transition-opacity duration-200 group-hover/zoom:opacity-100 group-focus-visible/zoom:opacity-100">
          <Expand className="h-3 w-3" aria-hidden="true" />
          Click to enlarge
        </span>
      </button>

      {open ? (
        <Lightbox
          images={images}
          index={startIndex}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function Lightbox({
  images,
  index: initialIndex,
  onClose,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [view, setView] = useState<View>(FIT);
  const [dragging, setDragging] = useState(false);
  const [mounted, setMounted] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(
    null,
  );

  const current = images[index] ?? images[0];
  const multiple = images.length > 1;
  const zoomed = view.scale > MIN_SCALE;

  const reset = useCallback(() => setView(FIT), []);

  /** Zoom by `factor`, keeping the point (cx, cy) — relative to the stage centre — anchored. */
  const zoomAt = useCallback((factor: number, cx = 0, cy = 0) => {
    setView((v) => {
      const next = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
      if (next === v.scale) return v;
      const k = next / v.scale;
      return {
        scale: next,
        x: cx - (cx - v.x) * k,
        y: cy - (cy - v.y) * k,
      };
    });
  }, []);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + images.length) % images.length);
      setView(FIT);
    },
    [images.length],
  );

  useEffect(() => setMounted(true), []);

  // Lock page scroll and move focus into the dialog.
  // Guarded on `mounted`: the portal only exists after the first client render.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  // Wheel zoom, anchored at the cursor.
  useEffect(() => {
    if (!mounted) return;
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = stage.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      zoomAt(e.deltaY < 0 ? STEP : 1 / STEP, cx, cy);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [zoomAt, mounted]);

  // Keyboard: Esc / arrows / + / - / 0, plus a simple focus trap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "ArrowRight":
          if (multiple) {
            e.preventDefault();
            go(1);
          }
          break;
        case "ArrowLeft":
          if (multiple) {
            e.preventDefault();
            go(-1);
          }
          break;
        case "+":
        case "=":
          e.preventDefault();
          zoomAt(STEP);
          break;
        case "-":
        case "_":
          e.preventDefault();
          zoomAt(1 / STEP);
          break;
        case "0":
          e.preventDefault();
          reset();
          break;
        case "Tab": {
          const root = panelRef.current;
          if (!root) return;
          const focusables = Array.from(
            root.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null);
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, multiple, onClose, reset, zoomAt]);

  const onPointerDown = (e: ReactPointerEvent<HTMLImageElement>) => {
    if (view.scale <= MIN_SCALE) return;
    e.preventDefault();
    // Capture so panning keeps working once the pointer leaves the image box.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      px: e.clientX,
      py: e.clientY,
      ox: view.x,
      oy: view.y,
    };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLImageElement>) => {
    const d = dragRef.current;
    if (!d) return;
    setView((v) => ({
      ...v,
      x: d.ox + (e.clientX - d.px),
      y: d.oy + (e.clientY - d.py),
    }));
  };

  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  if (!mounted) return null;

  const imgStyle: CSSProperties = {
    transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
    transition: dragging ? "none" : "transform 180ms ease-out",
    cursor: zoomed ? (dragging ? "grabbing" : "grab") : "zoom-in",
    touchAction: "none",
  };

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={current.alt || "Image viewer"}
      className="nft-fade-in fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-md"
    >
      {/* ---------- toolbar ---------- */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <p className="mono-label truncate text-muted-foreground">
          {multiple ? `${index + 1} / ${images.length}` : "Preview"}
        </p>
        <div className="flex items-center gap-1.5">
          <ToolButton
            onClick={() => zoomAt(1 / STEP)}
            label="Zoom out"
            disabled={!zoomed}
          >
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </ToolButton>
          <span className="w-14 text-center font-mono text-sm text-muted-foreground">
            {Math.round(view.scale * 100)}%
          </span>
          <ToolButton
            onClick={() => zoomAt(STEP)}
            label="Zoom in"
            disabled={view.scale >= MAX_SCALE}
          >
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </ToolButton>
          <ToolButton onClick={reset} label="Reset zoom" disabled={!zoomed}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </ToolButton>
          {multiple ? (
            <>
              <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
              <ToolButton onClick={() => go(-1)} label="Previous image">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </ToolButton>
              <ToolButton onClick={() => go(1)} label="Next image">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </ToolButton>
            </>
          ) : null}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <ToolButton ref={closeRef} onClick={onClose} label="Close viewer">
            <X className="h-4 w-4" aria-hidden="true" />
          </ToolButton>
        </div>
      </div>

      {/* ---------- stage ---------- */}
      <div
        ref={stageRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 sm:p-8"
      >
        {/* Wrapper carries the entrance animation so it never fights the zoom transform. */}
        <span
          className="nft-lightbox-img flex h-full w-full items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <img
            src={current.src}
            alt={current.alt}
            draggable={false}
            style={imgStyle}
            onDoubleClick={() => (zoomed ? reset() : zoomAt(2.5))}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="max-h-full max-w-full select-none rounded-lg border border-border/60 bg-background object-contain shadow-2xl"
          />
        </span>

        {multiple ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border/60 bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary sm:left-4"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border/60 bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary sm:right-4"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {/* ---------- footer ---------- */}
      <div className="border-t border-border/60 px-4 py-3">
        {current.caption ? (
          <p className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-muted-foreground">
            {current.caption}
          </p>
        ) : null}
        <p className="mt-2 text-center font-mono text-sm text-muted-foreground/70">
          Esc to close &middot; scroll or +/&minus; to zoom &middot; double-click
          to toggle &middot; drag to pan
        </p>
      </div>
    </div>,
    document.body,
  );
}

function ToolButton({
  onClick,
  label,
  disabled,
  children,
  ref,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-md border border-border/60 bg-background/70 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
