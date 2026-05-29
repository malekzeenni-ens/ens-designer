interface PreviewPanelProps {
  svg: string | null;
}

export function PreviewPanel({ svg }: PreviewPanelProps) {
  return (
    <section className="preview-panel" aria-label="Generated design preview">
      {svg ? (
        <div className="preview-surface" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="preview-empty">Preview</div>
      )}
    </section>
  );
}
