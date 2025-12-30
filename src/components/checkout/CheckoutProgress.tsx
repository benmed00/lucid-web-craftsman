import { Check, User, MapPin, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckoutProgressProps {
  currentStep: number;
  completedSteps: number[];
}

const steps = [
  { id: 1, label: "Information", icon: User },
  { id: 2, label: "Livraison", icon: MapPin },
  { id: 3, label: "Paiement", icon: CreditCard },
];

const CheckoutProgress = ({ currentStep, completedSteps }: CheckoutProgressProps) => {
  return (
    <div className="max-w-3xl mx-auto mb-10">
      <div className="relative">
        {/* Progress bar background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" />
        
        {/* Active progress bar */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500 ease-out"
          style={{ 
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
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
                {/* Step circle */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "bg-background border-primary text-primary ring-4 ring-primary/20",
                    isUpcoming && "bg-muted border-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 animate-in zoom-in duration-200" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>

                {/* Step label */}
                <div className="mt-3 text-center">
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isCurrent && "text-primary",
                      isCompleted && "text-foreground",
                      isUpcoming && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  {isCompleted && (
                    <p className="text-xs text-muted-foreground mt-0.5">Complété</p>
                  )}
                  {isCurrent && (
                    <p className="text-xs text-primary mt-0.5">En cours</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CheckoutProgress;
