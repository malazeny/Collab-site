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

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.7;

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

  useEffect(() => {
    const handleDraw = (data) => {
      const { x1, y1, x2, y2, color, size } = data;
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = size;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    socket.on("draw", handleDraw);
    return () => socket.off("draw", handleDraw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [clearFlag]);

  const startDrawing = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    const bounds = getSegmentBounds();


    if (bounds && !revealed) {
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
    if (bounds && !revealed) {
      if (offsetY < bounds.yStart || offsetY > bounds.yEnd) return;
    }

    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;

    ctx.beginPath();
    ctx.moveTo(prevPos.x, prevPos.y);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();

    socket.emit("draw", {
      x1: prevPos.x,
      y1: prevPos.y,
      x2: offsetX,
      y2: offsetY,
      color: brushColor,
      size: brushSize,
    });

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
