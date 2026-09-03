import { useMemo, useRef, useState } from "react";

const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 220;

function pointFromEvent(event, element) {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(VIEWBOX_WIDTH, ((event.clientX - rect.left) / rect.width) * VIEWBOX_WIDTH)),
    y: Math.max(0, Math.min(VIEWBOX_HEIGHT, ((event.clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT)),
  };
}

function strokesToPath(strokes) {
  return strokes
    .filter((stroke) => stroke.length > 0)
    .map((stroke) => stroke.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "))
    .join(" ");
}

function pathToDisplay(path) {
  return String(path || "").trim();
}

function ElectronicSignature({ value, method = "DRAWN", onChange, label = "Electronic signature", required = true }) {
  const [activeMethod, setActiveMethod] = useState(method === "TYPED" ? "TYPED" : "DRAWN");
  const [strokes, setStrokes] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const surfaceRef = useRef(null);

  const existingDrawnPath = activeMethod === "DRAWN" ? pathToDisplay(value) : "";
  const currentPath = useMemo(() => strokes.length > 0 ? strokesToPath(strokes) : existingDrawnPath, [strokes, existingDrawnPath]);

  function changeMethod(nextMethod) {
    setActiveMethod(nextMethod);
    setStrokes([]);
    onChange(nextMethod, "");
  }

  function handlePointerDown(event) {
    if (activeMethod !== "DRAWN") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = pointFromEvent(event, surfaceRef.current);
    setDrawing(true);
    setStrokes((current) => [...current, [point]]);
  }

  function handlePointerMove(event) {
    if (!drawing || activeMethod !== "DRAWN") return;
    event.preventDefault();
    const point = pointFromEvent(event, surfaceRef.current);
    setStrokes((current) => {
      if (current.length === 0) return current;
      const next = current.map((stroke) => [...stroke]);
      next[next.length - 1].push(point);
      const path = strokesToPath(next);
      onChange("DRAWN", path);
      return next;
    });
  }

  function endDrawing(event) {
    if (!drawing) return;
    event.preventDefault();
    setDrawing(false);
    const path = strokesToPath(strokes);
    if (path) onChange("DRAWN", path);
  }

  function clearSignature() {
    setStrokes([]);
    onChange(activeMethod, "");
  }

  return (
    <div className="border rounded-4 p-3 bg-white">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <label className="form-label fw-semibold mb-1">{label}{required ? " *" : ""}</label>
          <p className="small text-muted mb-0">Draw your signature, or type your full name if drawing is not accessible for you.</p>
        </div>
        <div className="btn-group" role="group" aria-label="Electronic signature method">
          <button type="button" className={`btn btn-sm ${activeMethod === "DRAWN" ? "btn-dark" : "btn-outline-dark"}`} onClick={() => changeMethod("DRAWN")}>Draw</button>
          <button type="button" className={`btn btn-sm ${activeMethod === "TYPED" ? "btn-dark" : "btn-outline-dark"}`} onClick={() => changeMethod("TYPED")}>Type</button>
        </div>
      </div>

      {activeMethod === "DRAWN" ? (
        <>
          <div className="border rounded-3 overflow-hidden" style={{ background: "white", touchAction: "none" }}>
            <svg
              ref={surfaceRef}
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
              width="100%"
              height="190"
              role="img"
              aria-label="Signature drawing area"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrawing}
              onPointerCancel={endDrawing}
              onPointerLeave={(event) => { if (drawing) endDrawing(event); }}
              style={{ display: "block", cursor: "crosshair" }}
            >
              <line x1="25" y1="175" x2="775" y2="175" stroke="currentColor" strokeOpacity="0.2" />
              {currentPath && <path d={currentPath} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
            </svg>
          </div>
          <small className="d-block mt-2 text-muted">Use a mouse, touch screen, stylus, or other pointing device.</small>
        </>
      ) : (
        <input
          type="text"
          className="form-control"
          value={activeMethod === "TYPED" ? String(value || "") : ""}
          onChange={(event) => onChange("TYPED", event.target.value)}
          placeholder="Type your full name as your electronic signature"
          autoComplete="name"
        />
      )}

      <button type="button" className="btn btn-sm btn-link px-0 mt-2" onClick={clearSignature}>Clear signature</button>
    </div>
  );
}

export default ElectronicSignature;
