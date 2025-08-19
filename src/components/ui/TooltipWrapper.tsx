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
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          className="bg-stone-800 text-white text-sm px-3 py-2 rounded-md shadow-lg border-0 font-medium"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};