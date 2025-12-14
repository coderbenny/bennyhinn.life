// app/components/Navigation.js
export default function Navigation({ currentSlide, onNavigate }) {
  const navItems = ['About', 'Stack', 'Work', 'Experience', 'Contact'];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500">
      <div className="flex justify-between items-center px-8 py-6">
        <div className="text-2xl font-bold bg-gradient-to-r from-coral-500 to-amber-500 bg-clip-text text-transparent">
          BH
        </div>
        <div className="flex gap-8">
          {navItems.map((item, idx) => (
            <button
              key={item}
              onClick={() => onNavigate(idx)}
              className={`text-sm tracking-wider transition-all duration-300 ${
                currentSlide === idx 
                  ? 'text-coral-500 font-semibold' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}