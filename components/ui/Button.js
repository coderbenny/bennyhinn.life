// app/components/ui/Button.js
export default function Button({ children, variant = 'primary', onClick }) {
  const baseClasses = "btn-base";
  
  const variantClasses = {
    primary: "btn-primary",
    secondary: "btn-secondary"
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