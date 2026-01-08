'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// Optimized image component with lazy loading and blur placeholder
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  fill = false,
  sizes,
  quality = 75,
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  ...props
}) {
  var [isLoading, setIsLoading] = useState(true);
  var [error, setError] = useState(false);
  
  // Default blur placeholder
  var defaultBlur = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAQMDBAMBAAAAAAAAAAAAAQIDBAAFEQYSITETQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAQEBAAAAAAAAAAAAAAAAAQIDESH/2gAMAwEAAhEDEEA/ANBg2RoSUqdU44sgKJBOAVH0M/eKqhISkJSOAMClKqSSEqWz/9k=';
  
  if (error) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}
        style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
      >
        <span className="text-xs">Image unavailable</span>
      </div>
    );
  }
  
  return (
    <div className={cn("relative overflow-hidden", fill && "w-full h-full")}>
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes}
        quality={quality}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL || defaultBlur}
        className={cn(
          "duration-300 ease-in-out",
          isLoading ? "scale-105 blur-sm" : "scale-100 blur-0",
          className
        )}
        onLoad={function(e) {
          setIsLoading(false);
          onLoad?.(e);
        }}
        onError={function() {
          setError(true);
        }}
        {...props}
      />
    </div>
  );
}

// Avatar image with fallback
export function AvatarImage({ src, alt, size = 40, fallback, className }) {
  var [error, setError] = useState(false);
  
  if (error || !src) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {fallback || alt?.charAt(0)?.toUpperCase() || '?'}
      </div>
    );
  }
  
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
      onError={function() { setError(true); }}
    />
  );
}

// Thumbnail with aspect ratio
export function Thumbnail({ src, alt, aspectRatio = '16/9', className, ...props }) {
  return (
    <div 
      className={cn("relative overflow-hidden rounded-md", className)}
      style={{ aspectRatio: aspectRatio }}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover"
        {...props}
      />
    </div>
  );
}
