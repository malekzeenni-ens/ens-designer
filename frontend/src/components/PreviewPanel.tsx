import { useEffect, useRef } from "react";

interface LineBox {
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
}

interface PreviewPanelProps {
  svg: string | null;
  lineBoxes?: LineBox[];
  canvasWidthMm?: number;
  canvasHeightMm?: number;
  selectedLine?: number | null;
  onSelectLine?: (i: number) => void;
  onLineDrag?: (i: number, dxMm: number, dyMm: number) => void;
}

export function PreviewPanel({
  svg,
  lineBoxes,
  canvasWidthMm,
  canvasHeightMm,
  selectedLine,
  onSelectLine,
  onLineDrag,
}: PreviewPanelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  function startDrag(
    e: React.PointerEvent<HTMLDivElement>,
    lineIndex: number,
  ) {
    e.preventDefault();
    e.stopPropagation();
    cleanupDragRef.current?.();

    const handleEl = e.currentTarget as HTMLDivElement;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    let finished = false;

    try {
      handleEl.setPointerCapture(pointerId);
    } catch {
      // Document listeners below still carry the drag if capture is unavailable.
    }

    const getHandleEl = () =>
      handleEl.isConnected
        ? handleEl
        : hostRef.current?.querySelector<HTMLElement>(
            `[data-line-index="${lineIndex}"]`,
          ) ?? null;

    function cleanup() {
      const activeHandle = getHandleEl();
      if (activeHandle) {
        activeHandle.style.transform = "";
      }
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onUp, true);
      cleanupDragRef.current = null;
    }

    function onMove(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      ev.preventDefault();

      const activeHandle = getHandleEl();
      if (!activeHandle) return;

      activeHandle.style.transform = `translate3d(${ev.clientX - startX}px, ${ev.clientY - startY}px, 0)`;
    }

    function onUp(ev: PointerEvent) {
      if (ev.pointerId !== pointerId || finished) return;
      finished = true;
      ev.preventDefault();

      cleanup();

      const host = hostRef.current;
      onSelectLine?.(lineIndex);

      if (!host || !canvasWidthMm || !canvasHeightMm) {
        return;
      }

      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      const dxMm = (ev.clientX - startX) * (canvasWidthMm / rect.width);
      const dyMm = (ev.clientY - startY) * (canvasHeightMm / rect.height);

      if (Math.abs(dxMm) > 0.05 || Math.abs(dyMm) > 0.05) {
        onLineDrag?.(lineIndex, dxMm, dyMm);
      }
    }

    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
    cleanupDragRef.current = cleanup;
  }

  const showOverlay =
    svg && lineBoxes && lineBoxes.length > 0 && canvasWidthMm && canvasHeightMm;

  return (
    <section className="preview-panel" aria-label="Generated design preview">
      {svg ? (
        <div className="preview-surface">
          <div ref={hostRef} className="preview-svg-host">
            <div dangerouslySetInnerHTML={{ __html: svg }} />
            {showOverlay && (
              <div className="preview-drag-overlay">
                {lineBoxes!.map((box, i) => (
                  <div
                    key={i}
                    className={`preview-drag-handle${selectedLine === i ? " preview-drag-handle--selected" : ""}`}
                    style={{
                      left: `${(box.xMm / canvasWidthMm!) * 100}%`,
                      top: `${(box.yMm / canvasHeightMm!) * 100}%`,
                      width: `${(box.wMm / canvasWidthMm!) * 100}%`,
                      height: `${(box.hMm / canvasHeightMm!) * 100}%`,
                    }}
                    data-line-index={i}
                    onPointerDown={(e) => startDrag(e, i)}
                    title={`Drag to move Line ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="preview-empty">Preview</div>
      )}
    </section>
  );
}
