import React from 'react';

// ==========================================
// 1. Spinner Component
// ==========================================
export function Spinner({ className = 'w-6 h-6', color = 'text-primary-500' }: { className?: string; color?: string }) {
  return (
    <svg className={`animate-spin ${className} ${color}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ==========================================
// 2. Button Component
// ==========================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', isLoading, className = '', disabled, ...props }, ref) => {
    const baseStyle = 'inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]',
      secondary: 'glass-card border-slate-700 text-slate-200 hover:bg-slate-800/50 hover:text-white',
      danger: 'bg-danger-500 hover:bg-danger-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]',
      success: 'bg-success-500 hover:bg-success-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]',
      ghost: 'text-slate-400 hover:text-white hover:bg-slate-800/30',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyle} ${variants[variant]} ${className}`}
        {...props}
      >
        {isLoading && <Spinner className="w-4 h-4 mr-2" color="text-white" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ==========================================
// 3. Input Component
// ==========================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>}
        <input
          ref={ref}
          type={type}
          className={`glass-input w-full px-3 py-2 text-sm text-slate-100 rounded-lg outline-none transition-all duration-200 ${
            error ? 'border-danger-500 focus:border-danger-500' : 'border-slate-800 focus:border-primary-500'
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-danger-500 mt-1 block">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ==========================================
// 4. Textarea Component
// ==========================================
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>}
        <textarea
          ref={ref}
          className={`glass-input w-full px-3 py-2 text-sm text-slate-100 rounded-lg outline-none transition-all duration-200 min-h-[80px] ${
            error ? 'border-danger-500 focus:border-danger-500' : 'border-slate-800 focus:border-primary-500'
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-danger-500 mt-1 block">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// ==========================================
// 5. Select Component
// ==========================================
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>}
        <select
          ref={ref}
          className={`glass-input w-full px-3 py-2 text-sm text-slate-100 rounded-lg outline-none transition-all duration-200 cursor-pointer ${
            error ? 'border-danger-500 focus:border-danger-500' : 'border-slate-800 focus:border-primary-500'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-danger-500 mt-1 block">{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ==========================================
// 6. Card Component
// ==========================================
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card p-6 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.2)] ${className}`}>
      {children}
    </div>
  );
}

// ==========================================
// 7. Badge Component
// ==========================================
type BadgeColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function Badge({ children, color = 'neutral', className = '' }: { children: React.ReactNode; color?: BadgeColor; className?: string }) {
  const styles = {
    primary: 'bg-primary-500/10 text-primary-500 border border-primary-500/20',
    success: 'bg-success-500/10 text-success-500 border border-success-500/20',
    warning: 'bg-warning-500/10 text-warning-500 border border-warning-500/20',
    danger: 'bg-danger-500/10 text-danger-500 border border-danger-500/20',
    info: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    neutral: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${styles[color]} ${className}`}>
      {children}
    </span>
  );
}

// ==========================================
// 8. Modal Component
// ==========================================
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className = 'max-w-md',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Dialog container */}
      <div className={`glass-panel w-full rounded-xl p-6 relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in ${className}`}>
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
