'use client';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export const Checkbox = forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn('h-4 w-4 rounded border-input accent-primary', className)}
    {...props}
  />
));
Checkbox.displayName = 'Checkbox';