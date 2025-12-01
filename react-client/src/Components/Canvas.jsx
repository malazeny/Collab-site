import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { socket } from "../socket.js";

const Canvas = forwardRef(function Canvas(
  { brushColor, brushSize, segmentIndex, numSegments, revealed, clearFlag },
  ref
) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [prevPos, setPrevPos] = useState(null);

  // store everything drawn
  const strokesRef = useRef([]);
  const stickersRef = useRef([]);

  // dragging stickers
  const [draggingSticker, setDraggingSticker] = useState(null);

  // allow App to call addSticker()
  useImperativeHandle(ref, () => ({
    addSticker: (src) => {
      stickersRef.current.push({
        id: crypto.randomUUID(),
        src,
        x: 80,
        y: 80,
      });
      redraw();
    },
  }));

  // setup canvas once
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.4;
    canvas.height = window.innerHeight * 0.9;

    const ctx = canvas.getContext("2d");
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctxRef.current = ctx;
  }, []);

  // define your assigned vertical slice
  const getSegmentBounds = () => {
    const canvas = canvasRef.current;
    if (!canvas || segmentIndex == null || !numSegments) return null;

    const segHeight = canvas.height / numSegments;
    const yStart = segHeight * segmentIndex;
    return { yStart, yEnd: yStart + segHeight };
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
  
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    const segHeight = canvas.height / numSegments;
    const myYStart = segHeight * segmentIndex;
  
    // --- 1. DRAW ONLY STROKES unless revealed ---
    strokesRef.current.forEach((s) => {
      if (!revealed && s.segment !== segmentIndex) return;
  
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
  
    // --- 3. MASK OTHER SECTIONS ---
    if (!revealed) {
      ctx.save();
      ctx.fillStyle = "white";
      for (let i = 0; i < numSegments; i++) {
        if (i === segmentIndex) continue;
        ctx.fillRect(0, segHeight * i, canvas.width, segHeight);
      }
      ctx.restore();
    }
  
    // --- 4. DRAW HIGHLIGHT BOX LAST ---
    if (!revealed) {
      ctx.save();
      ctx.fillStyle = "rgba(233, 231, 231, 0.25)";
      ctx.fillRect(0, myYStart, canvas.width, segHeight);
  
      ctx.strokeStyle = "rgb(186, 186, 156)";
      ctx.lineWidth = 4;
      ctx.strokeRect(0, myYStart, canvas.width, segHeight);
      ctx.restore();
    }
  };

  // clear
  useEffect(() => {
    strokesRef.current = [];
    stickersRef.current = [];
    redraw();
  }, [clearFlag]);

  // segment changes → update highlight/mask
  useEffect(() => {
    redraw();
  }, [segmentIndex, numSegments, revealed]);

  // receive strokes from others
  useEffect(() => {
    const handleDraw = (data) => {
      strokesRef.current.push(data);
      redraw();
    };

    socket.on("draw", handleDraw);
    return () => socket.off("draw", handleDraw);
  }, []);


  const startDrawing = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;

    // check if clicking a sticker first
    for (const s of stickersRef.current) {
      if (Math.abs(offsetX - s.x) < 40 && Math.abs(offsetY - s.y) < 40) {
        setDraggingSticker(s.id);
        return;
      }
    }

    // segment restriction
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

    // --- dragging stickers ---
    if (draggingSticker) {
      const st = stickersRef.current.find((s) => s.id === draggingSticker);
      if (st) {
        st.x = offsetX;
        st.y = offsetY;
        redraw();
      }
      return;
    }

    // --- drawing strokes ---
    if (!isDrawing || !prevPos) return;

    const bounds = getSegmentBounds();
    if (!revealed && bounds) {
      if (offsetY < bounds.yStart || offsetY > bounds.yEnd) return;
    }

    // attach `segment` to stroke so it knows where it belongs
    const stroke = {
      x1: prevPos.x,
      y1: prevPos.y,
      x2: offsetX,
      y2: offsetY,
      color: brushColor,
      size: brushSize,
      segment: segmentIndex, // 
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
