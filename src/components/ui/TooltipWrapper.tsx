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
    <TooltipProvider delayDuration={400} skipDelayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded-md shadow-lg border border-border font-normal max-w-xs z-50 animate-in fade-in-50 zoom-in-95 duration-200"
          sideOffset={6}
          avoidCollisions={true}
          collisionPadding={8}
          hideWhenDetached={true}
        >
          <div className="text-center leading-tight">
            {content}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};