import { useEffect, useState } from 'react';

interface SwipeGesturesProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  children: React.ReactNode;
  className?: string;
}

export const SwipeGestures = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  children,
  className = '',
}: SwipeGesturesProps) => {
  const [startTouch, setStartTouch] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isScrolling, setIsScrolling] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setStartTouch({ x: touch.clientX, y: touch.clientY });
    setIsScrolling(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startTouch) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - startTouch.x);
    const deltaY = Math.abs(touch.clientY - startTouch.y);

    // If vertical movement is greater than horizontal, user is scrolling
    if (deltaY > deltaX && deltaY > 10) {
      setIsScrolling(true);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!startTouch || isScrolling) {
      setStartTouch(null);
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startTouch.x;
    const deltaY = touch.clientY - startTouch.y;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Horizontal swipe
    if (absDeltaX > threshold && absDeltaX > absDeltaY) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    // Vertical swipe
    else if (absDeltaY > threshold && absDeltaY > absDeltaX) {
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown();
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp();
      }
    }

    setStartTouch(null);
  };

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};
