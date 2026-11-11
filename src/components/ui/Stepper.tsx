import React from 'react';

export interface StepperItem {
  id: string;
  dotType?: 'solid' | 'ring' | 'square';
  dotColor?: string;
  time?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  content?: React.ReactNode;
  isLast?: boolean;
}

export interface StepperProps {
  items: StepperItem[];
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({ items, className = '' }) => {
  return (
    <div className={`relative flex flex-col ${className}`.trim()}>
      {items.map((item, index) => {
        const isLast = item.isLast ?? index === items.length - 1;
        const color = item.dotColor || 'var(--action-primary)';

        return (
          <div key={item.id} className="relative flex gap-3 min-h-[48px]">
            {/* Left Rail & Node */}
            <div className="relative flex flex-col items-center w-6 shrink-0 pt-1">
              {/* Vertical connecting rail line */}
              {!isLast && (
                <div
                  className="absolute top-4 bottom-0 w-0.5 bg-[var(--border-strong)]"
                  style={{ left: 'calc(50% - 1px)' }}
                />
              )}

              {/* Node indicator */}
              <div
                className="relative z-10 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: item.dotType === 'ring' ? 'var(--surface)' : color,
                  border: `2px solid ${color}`
                }}
              />
            </div>

            {/* Right Content */}
            <div className={`flex-1 pb-6 ${isLast ? 'pb-2' : ''}`}>
              <div className="flex items-baseline gap-2">
                {item.time && (
                  <span className="text-[14px] leading-[20px] font-bold tabular-nums text-[var(--text-primary)]">
                    {item.time}
                  </span>
                )}
                <div className="text-[14px] leading-[20px] font-semibold text-[var(--text-primary)]">
                  {item.title}
                </div>
              </div>

              {item.subtitle && (
                <div className="text-[12px] leading-[16px] text-[var(--text-secondary)] mt-0.5">
                  {item.subtitle}
                </div>
              )}

              {item.content && <div className="mt-2">{item.content}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
