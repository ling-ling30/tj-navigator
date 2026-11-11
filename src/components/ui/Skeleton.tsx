import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: 'badge' | 'control' | 'card' | 'full';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = 'control'
}) => {
  const roundedStyles = {
    badge: 'rounded-[var(--radius-badge)]',
    control: 'rounded-[var(--radius-control)]',
    card: 'rounded-[var(--radius-card)]',
    full: 'rounded-full'
  }[rounded];

  return (
    <div
      style={{ width, height }}
      className={`animate-pulse bg-[var(--surface-active)] ${roundedStyles} ${className}`.trim()}
    />
  );
};
