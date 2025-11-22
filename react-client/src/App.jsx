import { useEffect, useState } from "react";
import { socket } from "./socket";
import Canvas from "./Components/Canvas";

export default function App() {
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);

  const [segmentIndex, setSegmentIndex] = useState(null);
  const [numSegments, setNumSegments] = useState(3);
  const [revealed, setRevealed] = useState(false);

  const [clearFlag, setClearFlag] = useState(false);

  const sectionNames = ["Head", "Body", "Legs"];

  useEffect(() => {
    function handleConnect() {
      console.log("Socket connected! ID:", socket.id);
      socket.emit("joinGame");
    }
  
    socket.on("connect", handleConnect);
  
    socket.on("assignedSegment", ({ segment, total }) => {
      console.log("Segment received:", segment, "total:", total);
      setSegmentIndex(segment);
      setNumSegments(total);
    });
  
    socket.on("reveal", () => setRevealed(true));
    socket.on("clear", () => setClearFlag((f) => !f));
  
    return () => {
      socket.off("connect", handleConnect);
      socket.off("assignedSegment");
      socket.off("reveal");
      socket.off("clear");
    };
  }, []);

  const handleReveal = () => {
    socket.emit("requestReveal");
  };

  const handleClear = () => {
    socket.emit("clear");
    setClearFlag((f) => !f);
    setRevealed(false);
  };

  return (
    <div className="app">
      <div className="toolbar">
        <input
          type="color"
          value={brushColor}
          onChange={(e) => setBrushColor(e.target.value)}
        />
        <input
          type="range"
          min="1"
          max="30"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />
        <button onClick={handleReveal}>Reveal</button>
        <button onClick={handleClear}>Clear</button>
      </div>

      <p style={{ margin: "10px 0", color: "black" }}>
        {segmentIndex == null
          ? "Connecting..."
          : `You are drawing the ${sectionNames[segmentIndex]}`}
      </p>

      <Canvas
        brushColor={brushColor}
        brushSize={brushSize}
        segmentIndex={segmentIndex}
        numSegments={numSegments}
        revealed={revealed}
        clearFlag={clearFlag}
      />
    </div>
  );
}
