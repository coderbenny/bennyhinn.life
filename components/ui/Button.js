// app/components/ui/Button.js
export default function Button({ children, variant = 'primary', onClick }) {
  const baseClasses = "px-10 py-4 text-sm font-semibold tracking-wider uppercase border-none cursor-pointer transition-all duration-300 relative overflow-hidden";
  
  const variantClasses = {
    primary: "bg-gradient-to-br from-coral-500 to-amber-500 text-white hover:shadow-lg hover:shadow-coral-500/50",
    secondary: "bg-transparent border-2 border-coral-500 text-coral-500 hover:bg-coral-500 hover:text-white"
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
}