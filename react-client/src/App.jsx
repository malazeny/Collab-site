import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Canvas from './Components/Canvas.jsx'

export default function App() {
	//use react states to keep track of our brush color and size
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Collaborative Drawing (React + Socket.io)</h1>

      <div style={{ marginBottom: "15px" }}>
        <label>Color: </label>
        <input
          type="color"
          value={brushColor}
          onChange={(e) => setBrushColor(e.target.value)}
        />

        <label style={{ marginLeft: "15px" }}>Brush Size: </label>
        <input
          type="range"
          min="1"
          max="30"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />
        <span style={{ marginLeft: "8px" }}>{brushSize}px</span>
      </div>

      <Canvas brushColor={brushColor} brushSize={brushSize} />
    </div>
  );
}
