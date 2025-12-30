import { Check, User, MapPin, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckoutProgressProps {
  currentStep: number;
  completedSteps: number[];
}

const steps = [
  { id: 1, label: "Information", shortLabel: "Info", icon: User },
  { id: 2, label: "Livraison", shortLabel: "Livraison", icon: MapPin },
  { id: 3, label: "Paiement", shortLabel: "Paiement", icon: CreditCard },
];

const CheckoutProgress = ({ currentStep, completedSteps }: CheckoutProgressProps) => {
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
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Step circle - smaller on mobile */}
                <div
                  className={cn(
                    "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "bg-background border-primary text-primary ring-2 md:ring-4 ring-primary/20",
                    isUpcoming && "bg-muted border-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 md:h-5 md:w-5 animate-in zoom-in duration-200" />
                  ) : (
                    <Icon className="h-4 w-4 md:h-5 md:w-5" />
                  )}
                </div>

                {/* Step label - shorter on mobile */}
                <div className="mt-2 md:mt-3 text-center">
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
                  {/* Hide status text on mobile to save space */}
                  <p className={cn(
                    "hidden md:block text-xs mt-0.5",
                    isCompleted && "text-muted-foreground",
                    isCurrent && "text-primary"
                  )}>
                    {isCompleted && "Complété"}
                    {isCurrent && "En cours"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Mobile step indicator */}
      <div className="md:hidden mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          Étape {currentStep} sur {steps.length}
        </p>
      </div>
    </div>
  );
};

export default CheckoutProgress;
