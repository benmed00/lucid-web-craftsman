import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipWrapperProps {
  children: React.ReactNode;
  content: string;
  side?: "top" | "right" | "bottom" | "left";
  disabled?: boolean;
}

export const TooltipWrapper = ({ 
  children, 
  content, 
  side = "top",
  disabled = false 
}: TooltipWrapperProps) => {
  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          className="bg-stone-900 text-white text-sm px-3 py-2 rounded-lg shadow-xl border border-stone-700 font-medium max-w-xs z-50 animate-in fade-in-0 zoom-in-95"
          sideOffset={8}
          avoidCollisions={true}
          collisionPadding={10}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};