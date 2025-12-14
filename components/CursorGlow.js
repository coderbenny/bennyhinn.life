// app/components/CursorGlow.js
export default function CursorGlow({ position }) {
  return (
    <div 
      className="cursor-glow"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    />
  );
}