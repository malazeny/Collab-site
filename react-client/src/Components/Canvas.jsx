import { useEffect, useRef, useState } from "react";
import { socket } from "../socket.js";

export default function Canvas({
  brushColor,
  brushSize,
  segmentIndex,
  numSegments,
  revealed,
  clearFlag,
}) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prevPos, setPrevPos] = useState(null);

  // store all strokes locally so we can redraw after masking
  const strokesRef = useRef([]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.4;
    canvas.height = window.innerHeight * 0.9;

    const ctx = canvas.getContext("2d");
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctxRef.current = ctx;
  }, []);

  const getSegmentBounds = () => {
    const canvas = canvasRef.current;
    if (!canvas || segmentIndex == null || !numSegments) return null;

    const segHeight = canvas.height / numSegments;
    const yStart = segHeight * segmentIndex;
    const yEnd = yStart + segHeight;
    return { yStart, yEnd };
  };

  // Redraw everything: strokes → highlight → mask
  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw all strokes
    ctx.globalCompositeOperation = "source-over";
    for (const s of strokesRef.current) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }

    // 2. Draw highlight only in my section
    if (!revealed && segmentIndex != null) {
      const segHeight = canvas.height / numSegments;
      const yStart = segHeight * segmentIndex;

      ctx.save();
      ctx.fillStyle = "rgba(255, 230, 0, 0.25)";
      ctx.fillRect(0, yStart, canvas.width, segHeight);

      ctx.strokeStyle = "rgba(255, 200, 0, 1)";
      ctx.lineWidth = 4;
      ctx.strokeRect(0, yStart, canvas.width, segHeight);
      ctx.restore();
    }

    // 3. Draw mask LAST
    if (!revealed && segmentIndex != null) {
      const segHeight = canvas.height / numSegments;

      ctx.save();
      ctx.fillStyle = "white";

      for (let i = 0; i < numSegments; i++) {
        if (i === segmentIndex) continue;
        const yStart = segHeight * i;
        ctx.fillRect(0, yStart, canvas.width, segHeight);
      }

      ctx.restore();
    }
  };

  // When CLEAR happens → wipe strokes + redraw
  useEffect(() => {
    strokesRef.current = [];
    redraw();
  }, [clearFlag]);

  // When segment changes → redraw to update highlight/mask
  useEffect(() => {
    redraw();
  }, [segmentIndex, numSegments, revealed]);

  // Incoming strokes
  useEffect(() => {
    const handleDraw = (data) => {
      strokesRef.current.push(data);
      redraw();
    };

    socket.on("draw", handleDraw);
    return () => socket.off("draw", handleDraw);
  }, []);

  // Local drawing
  const startDrawing = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    const bounds = getSegmentBounds();

    if (!revealed && bounds) {
      if (offsetY < bounds.yStart || offsetY > bounds.yEnd) return;
    }

    setIsDrawing(true);
    setPrevPos({ x: offsetX, y: offsetY });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setPrevPos(null);
  };

  const draw = (e) => {
    if (!isDrawing || !prevPos) return;

    const { offsetX, offsetY } = e.nativeEvent;
    const bounds = getSegmentBounds();
    if (!revealed && bounds) {
      if (offsetY < bounds.yStart || offsetY > bounds.yEnd) return;
    }

    const stroke = {
      x1: prevPos.x,
      y1: prevPos.y,
      x2: offsetX,
      y2: offsetY,
      color: brushColor,
      size: brushSize,
    };

    // Store locally and redraw
    strokesRef.current.push(stroke);
    redraw();

    // Emit to others
    socket.emit("draw", stroke);

    setPrevPos({ x: offsetX, y: offsetY });
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onMouseMove={draw}
      style={{
        border: "1px solid #999",
        cursor: "crosshair",
        display: "block",
        margin: "0 auto",
      }}
    />
  );
}
