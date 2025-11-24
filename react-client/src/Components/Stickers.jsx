import {useState} from 'react';
import "./Stickers.css";

export default function Stickers({onAddSticker}) {
    const stickers = [
        "/stickers/hat1.png",
        "/stickers/hat2.png",
        "/stickers/hat3.png", 
        "/stickers/hat4.png", 
        "/stickers/glasses1.png",
        "/stickers/jean1.png", 
        "/stickers/jean 2.png", 
        "/stickers/jean3.png", 
        "/stickers/mustache.png", 
        "/stickers/shoes2-1.png", 
        "/stickers/shoes3-1.png", 
        "/stickers/shoes4.png", 
        "/stickers/shoes5.png", 
        "/stickers/skirt1.png", 
        "/stickers/skirt2-1.png", 
        "/stickers/top1.png", 
        "/stickers/top2.png", 
        "/stickers/top3.png" 
    ];

    return (
        <div className = "stickers-panel">
            <h3>Stickers</h3>
            <div className="stickers-grid">
                {stickers.map((src) => (
                    <img 
                        key={src} 
                        src={src} 
                        className="sticker-icon"
                        onClick={() => onAddSticker(src)}
                    />
                ))}

            </div>
        </div>
    );
}