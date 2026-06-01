import { useRef } from "react";

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

  function startDrag(
    e: React.PointerEvent<HTMLDivElement>,
    lineIndex: number,
  ) {
    e.preventDefault();
    onSelectLine?.(lineIndex);

    // Capture values into the closure — no React state or refs needed during drag
    const handleEl = e.currentTarget as HTMLDivElement;
    const startX = e.clientX;
    const startY = e.clientY;

    function onMove(ev: PointerEvent) {
      handleEl.style.transform = `translate(${ev.clientX - startX}px, ${ev.clientY - startY}px)`;
    }

    function onUp(ev: PointerEvent) {
      handleEl.style.transform = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);

      const host = hostRef.current;
      if (!host || !canvasWidthMm || !canvasHeightMm) return;
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dxMm = (ev.clientX - startX) * (canvasWidthMm / rect.width);
      const dyMm = (ev.clientY - startY) * (canvasHeightMm / rect.height);

      if (Math.abs(dxMm) > 0.05 || Math.abs(dyMm) > 0.05) {
        onLineDrag?.(lineIndex, dxMm, dyMm);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
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
