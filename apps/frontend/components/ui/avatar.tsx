'use client';

import { forwardRef } from 'react';
import type { ElementRef, ComponentPropsWithoutRef } from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/cn';

type RootRef = ElementRef<typeof AvatarPrimitive.Root>;
type RootProps = ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>;
type ImageRef = ElementRef<typeof AvatarPrimitive.Image>;
type ImageProps = ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>;
type FallbackRef = ElementRef<typeof AvatarPrimitive.Fallback>;
type FallbackProps = ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>;

const Avatar = forwardRef<RootRef, RootProps>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root ref={ref} className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)} {...props} />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = forwardRef<ImageRef, ImageProps>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn('aspect-square h-full w-full', className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = forwardRef<FallbackRef, FallbackProps>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback ref={ref} className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground', className)} {...props} />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };