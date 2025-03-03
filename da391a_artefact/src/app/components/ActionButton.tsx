import React from 'react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  tooltip?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  icon,
  tooltip,
  ...props
}) => {
  // Simple variant styles
  const variantStyles = {
    primary: "bg-blue-500 text-white",
    secondary: "bg-gray-200 text-gray-800",
    outline: "border border-gray-300 bg-white",
    ghost: "bg-transparent hover:bg-gray-100"
  };
  
  // Simple size styles
  const sizeStyles = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2",
    lg: "text-base px-4 py-2"
  };
  
  // Combine classes manually
  const buttonClasses = [
    "rounded font-medium",
    variantStyles[variant],
    sizeStyles[size],
    className
  ].filter(Boolean).join(' ');
  
  return (
    <button
      className={buttonClasses}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default ActionButton;