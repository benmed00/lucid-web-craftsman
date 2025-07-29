import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string;
  showLoadingPlaceholder?: boolean;
}

export const Image = ({ 
  src, 
  alt, 
  className, 
  fallbackText = "Image non disponible", 
  showLoadingPlaceholder = true,
  ...props 
}: ImageProps) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    return (
      <div className={cn("bg-beige-100 flex items-center justify-center text-stone-500 text-sm", className)}>
        {fallbackText}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <img
        src={src}
        alt={alt}
        className={cn("transition-opacity duration-300", className)}
        style={{ opacity: loading ? 0 : 1 }}
        onError={() => setError(true)}
        onLoad={() => setLoading(false)}
        {...props}
      />
      {loading && showLoadingPlaceholder && (
        <div className={cn("absolute inset-0 bg-beige-100 animate-pulse", className)} />
      )}
    </div>
  );
};