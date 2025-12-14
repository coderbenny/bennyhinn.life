// app/components/SlideIndicators.js
export default function SlideIndicators({ total, current, onNavigate }) {
  return (
    <div className="slide-indicators">
      {[...Array(total)].map((_, idx) => (
        <button
          key={idx}
          onClick={() => onNavigate(idx)}
          className={`indicator ${current === idx ? 'active' : ''}`}
          aria-label={`Go to slide ${idx + 1}`}
        />
      ))}
    </div>
  );
}