import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { socket } from "../socket.js";

const Canvas = forwardRef(function Canvas(
  { brushColor, brushSize, segmentIndex, numSegments, revealed, clearFlag },
  ref
) {

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [prevPos, setPrevPos] = useState(null);

  // strokes + stickers stored locally
  const strokesRef = useRef([]);
  const stickersRef = useRef([]);

  // dragging state
  const [draggingSticker, setDraggingSticker] = useState(null);

  // expose addSticker() to parent (App.jsx)
  useImperativeHandle(ref, () => ({
    addSticker: (src) => {
      stickersRef.current.push({
        id: crypto.randomUUID(),
        src,
        x: 80,
        y: 80,
      });
      redraw();
    }
  }));

  // Setup canvas once
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.4;
    canvas.height = window.innerHeight * 0.9;

    const ctx = canvas.getContext("2d");
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctxRef.current = ctx;
  }, []);

  // decides where user can draw
  const getSegmentBounds = () => {
    const canvas = canvasRef.current;
    if (!canvas || segmentIndex == null || !numSegments) return null;

    const segHeight = canvas.height / numSegments;
    const yStart = segHeight * segmentIndex;
    return { yStart, yEnd: yStart + segHeight };
  };

  // redraw everything
  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- 1. DRAW ALL STROKES ---
    strokesRef.current.forEach((s) => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    });

    // --- 2. DRAW STICKERS ---
    stickersRef.current.forEach((sticker) => {
      const img = new Image();
      img.src = sticker.src;
      img.onload = () => {
        ctx.drawImage(img, sticker.x - 40, sticker.y - 40, 80, 80);
      };
    });

    // --- 3. HIGHLIGHT SECTION ---
    if (!revealed && segmentIndex != null) {
      const segHeight = canvas.height / numSegments;
      const yStart = segHeight * segmentIndex;

      ctx.save();
      ctx.fillStyle = "rgba(233, 231, 231, 0.25)";
      ctx.fillRect(0, yStart, canvas.width, segHeight);

      ctx.strokeStyle = "rgb(186, 186, 156)";
      ctx.lineWidth = 4;
      ctx.strokeRect(0, yStart, canvas.width, segHeight);
      ctx.restore();
    }

    // --- 4. MASK OTHER SECTIONS ---
    if (!revealed && segmentIndex != null) {
      const segHeight = canvas.height / numSegments;

      ctx.save();
      ctx.fillStyle = "white";

      for (let i = 0; i < numSegments; i++) {
        if (i === segmentIndex) continue;
        ctx.fillRect(0, segHeight * i, canvas.width, segHeight);
      }

      ctx.restore();
    }
  };

  // When CLEAR flag changes → wipe strokes + stickers
  useEffect(() => {
    strokesRef.current = [];
    stickersRef.current = [];
    redraw();
  }, [clearFlag]);

  // Update redraw when section changes
  useEffect(() => {
    redraw();
  }, [segmentIndex, numSegments, revealed]);

  // incoming strokes
  useEffect(() => {
    const handleDraw = (data) => {
      strokesRef.current.push(data);
      redraw();
    };
    socket.on("draw", handleDraw);
    return () => socket.off("draw", handleDraw);
  }, []);

  // --- DRAWING WITH MOUSE ---
  const startDrawing = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;

    // FIRST check if clicking a sticker
    for (const s of stickersRef.current) {
      if (Math.abs(offsetX - s.x) < 40 && Math.abs(offsetY - s.y) < 40) {
        setDraggingSticker(s.id);
        return;
      }
    }

    const bounds = getSegmentBounds();
    if (!revealed && bounds) {
      if (offsetY < bounds.yStart || offsetY > bounds.yEnd) return;
    }

    setIsDrawing(true);
    setPrevPos({ x: offsetX, y: offsetY });
  };

  const stopDrawing = () => {
    setDraggingSticker(null);
    setIsDrawing(false);
    setPrevPos(null);
  };

  const move = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;

    // DRAGGING STICKERS
    if (draggingSticker) {
      const st = stickersRef.current.find((s) => s.id === draggingSticker);
      if (st) {
        st.x = offsetX;
        st.y = offsetY;
        redraw();
      }
      return;
    }

    // DRAWING
    if (!isDrawing || !prevPos) return;

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

    strokesRef.current.push(stroke);
    redraw();
    socket.emit("draw", stroke);

    setPrevPos({ x: offsetX, y: offsetY });
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onMouseMove={move}
      style={{
        border: "1px solid #999",
        cursor: draggingSticker ? "grabbing" : "crosshair",
        display: "block",
        margin: "0 auto",
      }}
    />
  );
});

export default Canvas;
