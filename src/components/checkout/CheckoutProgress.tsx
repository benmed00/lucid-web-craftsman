import { Check, User, MapPin, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface CheckoutProgressProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
}

const CheckoutProgress = ({ currentStep, completedSteps, onStepClick }: CheckoutProgressProps) => {
  const { t } = useTranslation('checkout');
  
  const steps = [
    { id: 1, label: t('steps.information'), shortLabel: "Info", icon: User },
    { id: 2, label: t('steps.shipping'), shortLabel: t('steps.shipping'), icon: MapPin },
    { id: 3, label: t('steps.payment'), shortLabel: t('steps.payment'), icon: CreditCard },
  ];

  const handleStepClick = (stepId: number) => {
    // Only allow clicking on completed steps or current step
    const isClickable = completedSteps.includes(stepId) || stepId < currentStep;
    if (isClickable && onStepClick) {
      onStepClick(stepId);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mb-6 md:mb-10 px-2">
      <div className="relative">
        {/* Progress bar background */}
        <div className="absolute top-4 md:top-5 left-8 right-8 md:left-0 md:right-0 h-0.5 bg-muted" />
        
        {/* Active progress bar */}
        <div 
          className="absolute top-4 md:top-5 left-8 md:left-0 h-0.5 bg-primary transition-all duration-500 ease-out"
          style={{ 
            width: `calc(${((currentStep - 1) / (steps.length - 1)) * 100}% - ${currentStep === 1 ? '0px' : '32px'})` 
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;
            const isUpcoming = currentStep < step.id;
            const isClickable = (isCompleted || step.id < currentStep) && onStepClick;
            const Icon = step.icon;

            return (
              <div 
                key={step.id} 
                className="flex flex-col items-center"
              >
                {/* Step circle - clickable if completed */}
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "bg-background border-primary text-primary ring-2 md:ring-4 ring-primary/20",
                    isUpcoming && "bg-muted border-muted text-muted-foreground",
                    isClickable && "cursor-pointer hover:scale-110 hover:shadow-lg active:scale-95",
                    !isClickable && "cursor-default"
                  )}
                  aria-label={isClickable ? t('steps.returnToStep', { step: step.label }) : step.label}
                  title={isClickable ? t('steps.clickToModify', { step: step.label }) : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 md:h-5 md:w-5 animate-in zoom-in duration-200" />
                  ) : (
                    <Icon className="h-4 w-4 md:h-5 md:w-5" />
                  )}
                </button>

                {/* Step label - clickable if completed */}
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "mt-2 md:mt-3 text-center bg-transparent border-none p-0",
                    isClickable && "cursor-pointer hover:underline",
                    !isClickable && "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs md:text-sm font-medium transition-colors",
                      isCurrent && "text-primary",
                      isCompleted && "text-foreground",
                      isUpcoming && "text-muted-foreground"
                    )}
                  >
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.shortLabel}</span>
                  </span>
                  {/* Status text */}
                  <p className={cn(
                    "hidden md:block text-xs mt-0.5",
                    isCompleted && "text-muted-foreground",
                    isCurrent && "text-primary"
                  )}>
                    {isCompleted && t('steps.completed')}
                    {isCurrent && t('steps.inProgress')}
                  </p>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Mobile step indicator with navigation hint */}
      <div className="md:hidden mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          {t('steps.stepOf', { current: currentStep, total: steps.length })}
        </p>
        {completedSteps.length > 0 && currentStep > 1 && (
          <p className="text-xs text-primary mt-1">
            {t('steps.clickCompletedToModify')}
          </p>
        )}
      </div>
    </div>
  );
};

export default CheckoutProgress;