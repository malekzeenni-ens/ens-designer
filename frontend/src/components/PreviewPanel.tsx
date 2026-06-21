import { useEffect, useRef } from "react";

interface LineBox {
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
}

type DragKind = "line" | "stake" | "ring";

interface PreviewPanelProps {
  svg: string | null;
  lineBoxes?: LineBox[];
  stakeBoxes?: LineBox[];
  ringBox?: LineBox | null;
  canvasWidthMm?: number;
  canvasHeightMm?: number;
  selectedLine?: number | null;
  selectedStake?: number | null;
  selectedRing?: boolean;
  onSelectLine?: (i: number) => void;
  onSelectStake?: (i: number) => void;
  onSelectRing?: () => void;
  onLineDrag?: (i: number, dxMm: number, dyMm: number) => void;
  onStakeDrag?: (i: number, dxMm: number, dyMm: number) => void;
  onRingDrag?: (dxMm: number, dyMm: number) => void;
}

export function PreviewPanel({
  svg,
  lineBoxes,
  stakeBoxes,
  ringBox,
  canvasWidthMm,
  canvasHeightMm,
  selectedLine,
  selectedStake,
  selectedRing,
  onSelectLine,
  onSelectStake,
  onSelectRing,
  onLineDrag,
  onStakeDrag,
  onRingDrag,
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
    kind: DragKind,
    itemIndex: number,
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
            kind === "ring" ? "[data-ring-index=\"0\"]" : `[data-${kind}-index="${itemIndex}"]`,
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

      // Direct DOM mutation, intentionally bypassing React state/render here —
      // keeps drag tracking at 60fps. Do not convert to state-driven updates.
      activeHandle.style.transform = `translate3d(${ev.clientX - startX}px, ${ev.clientY - startY}px, 0)`;
    }

    function onUp(ev: PointerEvent) {
      if (ev.pointerId !== pointerId || finished) return;
      finished = true;
      ev.preventDefault();

      cleanup();

      const host = hostRef.current;
      if (kind === "line") {
        onSelectLine?.(itemIndex);
      } else if (kind === "stake") {
        onSelectStake?.(itemIndex);
      } else {
        onSelectRing?.();
      }

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
        if (kind === "line") {
          onLineDrag?.(itemIndex, dxMm, dyMm);
        } else if (kind === "stake") {
          onStakeDrag?.(itemIndex, dxMm, dyMm);
        } else {
          onRingDrag?.(dxMm, dyMm);
        }
      }
    }

    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
    cleanupDragRef.current = cleanup;
  }

  const showOverlay =
    svg &&
    ((lineBoxes && lineBoxes.length > 0) || (stakeBoxes && stakeBoxes.length > 0) || ringBox) &&
    canvasWidthMm &&
    canvasHeightMm;

  return (
    <section className="preview-panel" aria-label="Generated design preview">
      {svg ? (
        <div className="preview-surface">
          <div ref={hostRef} className="preview-svg-host">
            <div dangerouslySetInnerHTML={{ __html: svg }} />
            {showOverlay && (
              <div className="preview-drag-overlay">
                {(lineBoxes ?? []).map((box, i) => (
                  <div
                    key={`line-${i}`}
                    className={`preview-drag-handle${selectedLine === i ? " preview-drag-handle--selected" : ""}`}
                    style={{
                      left: `${(box.xMm / canvasWidthMm!) * 100}%`,
                      top: `${(box.yMm / canvasHeightMm!) * 100}%`,
                      width: `${(box.wMm / canvasWidthMm!) * 100}%`,
                      height: `${(box.hMm / canvasHeightMm!) * 100}%`,
                    }}
                    data-line-index={i}
                    onPointerDown={(e) => startDrag(e, "line", i)}
                    title={`Drag to move Line ${i + 1}`}
                  />
                ))}
                {(stakeBoxes ?? []).map((box, i) => (
                  <div
                    key={`stake-${i}`}
                    className={`preview-drag-handle preview-drag-handle--stake${selectedStake === i ? " preview-drag-handle--selected" : ""}`}
                    style={{
                      left: `${(box.xMm / canvasWidthMm!) * 100}%`,
                      top: `${(box.yMm / canvasHeightMm!) * 100}%`,
                      width: `${(box.wMm / canvasWidthMm!) * 100}%`,
                      height: `${(box.hMm / canvasHeightMm!) * 100}%`,
                    }}
                    data-stake-index={i}
                    onPointerDown={(e) => startDrag(e, "stake", i)}
                    title={`Drag to move Stake ${i + 1}`}
                  />
                ))}
                {ringBox && (
                  <div
                    className={`preview-drag-handle preview-drag-handle--ring${selectedRing ? " preview-drag-handle--selected" : ""}`}
                    style={{
                      left: `${(ringBox.xMm / canvasWidthMm!) * 100}%`,
                      top: `${(ringBox.yMm / canvasHeightMm!) * 100}%`,
                      width: `${(ringBox.wMm / canvasWidthMm!) * 100}%`,
                      height: `${(ringBox.hMm / canvasHeightMm!) * 100}%`,
                    }}
                    data-ring-index={0}
                    onPointerDown={(e) => startDrag(e, "ring", 0)}
                    title="Drag to move Ring / Keyhole"
                  />
                )}
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
