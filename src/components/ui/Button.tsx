import React from 'react';
import './ui.scss';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'text';
  size?: 'small' | 'middle' | 'large';
  block?: boolean;
  ghost?: boolean;
  icon?: React.ReactNode;
  htmlType?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'middle',
  block = false,
  ghost = false,
  icon,
  children,
  className = '',
  htmlType = 'button',
  ...props
}) => {
  return (
    <button
      type={htmlType}
      className={`ui-button ${variant} ${size} ${ghost ? 'ghost' : ''} ${block ? 'block' : ''} ${className}`.trim()}
      {...props}
    >
      {icon && <span className="button-icon">{icon}</span>}
      {children}
    </button>
  );
};
