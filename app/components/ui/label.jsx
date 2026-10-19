'use client';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

const Label = forwardRef(({ className, ...props }, ref) => (
  <label ref={ref} className={cn('text-sm font-medium', className)} {...props} />
));
Label.displayName = 'Label';
export { Label };