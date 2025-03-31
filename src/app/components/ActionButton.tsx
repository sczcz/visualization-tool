import React, { forwardRef } from 'react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  tooltip?: string;
  tooltipId?: string;  // Add this prop
}

const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>((props, ref) => {
  const {
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    icon,
    tooltip,
    tooltipId,  // Get the tooltipId from props
    ...rest
  } = props;

  // Use the provided ID or create a fallback (though fallback may still cause hydration issues)
  const actualTooltipId = tooltip ? (tooltipId || `tooltip-${Math.random().toString(36).substring(2, 11)}`) : undefined;

  const variantStyles = {
    primary: "bg-blue-500 text-white",
    secondary: "bg-gray-200 text-gray-800",
    outline: "border border-gray-300 bg-white",
    ghost: "bg-transparent hover:bg-gray-100"
  };
  
  const sizeStyles = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2",
    lg: "text-base px-4 py-2"
  };
  
  const buttonClasses = [
    "rounded font-medium",
    variantStyles[variant],
    sizeStyles[size],
    className
  ].filter(Boolean).join(' ');
  
  return (
    <>
      <button
        className={buttonClasses}
        ref={ref}
        data-tooltip-id={actualTooltipId}
        data-tooltip-content={tooltip}
        {...rest}
      >
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </button>
      
      {tooltip && <Tooltip id={actualTooltipId} />}
    </>
  );
});

ActionButton.displayName = 'ActionButton';

export default ActionButton;