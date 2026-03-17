import { Check, User, MapPin, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface CheckoutProgressProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
}

const CheckoutProgress = ({
  currentStep,
  completedSteps,
  onStepClick,
}: CheckoutProgressProps) => {
  const { t } = useTranslation('checkout');

  const steps = [
    { id: 1, label: t('steps.information'), shortLabel: 'Info', icon: User },
    {
      id: 2,
      label: t('steps.shipping'),
      shortLabel: t('steps.shipping'),
      icon: MapPin,
    },
    {
      id: 3,
      label: t('steps.payment'),
      shortLabel: t('steps.payment'),
      icon: CreditCard,
    },
  ];

  const handleStepClick = (stepId: number) => {
    const isClickable = completedSteps.includes(stepId) || stepId < currentStep;
    if (isClickable && onStepClick) {
      onStepClick(stepId);
    }
  };

  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="max-w-2xl mx-auto mb-8 md:mb-12 px-4">
      <div className="relative">
        {/* Track background */}
        <div className="absolute top-6 md:top-7 left-[40px] right-[40px] h-[2px] bg-border" />

        {/* Active track */}
        <div
          className="absolute top-6 md:top-7 left-[40px] h-[2px] bg-primary transition-all duration-700 ease-out"
          style={{
            width: `calc(${progressPercent}% - ${progressPercent > 0 ? '40px' : '0px'})`,
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;
            const isUpcoming = currentStep < step.id;
            const isClickable =
              (isCompleted || step.id < currentStep) && !!onStepClick;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center z-10">
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    'w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300 border-2 relative',
                    isCompleted &&
                      'bg-primary border-primary text-primary-foreground shadow-md',
                    isCurrent &&
                      'bg-background border-primary text-primary shadow-lg ring-4 ring-primary/15',
                    isUpcoming &&
                      'bg-muted/60 border-border text-muted-foreground',
                    isClickable &&
                      'cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95',
                    !isClickable && 'cursor-default'
                  )}
                  aria-label={
                    isClickable
                      ? t('steps.returnToStep', { step: step.label })
                      : step.label
                  }
                  title={
                    isClickable
                      ? t('steps.clickToModify', { step: step.label })
                      : undefined
                  }
                >
                  {isCompleted ? (
                    <Check
                      className="h-5 w-5 md:h-6 md:w-6"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  )}
                </button>

                <div
                  className={cn(
                    'mt-3 text-center',
                    isClickable && 'cursor-pointer'
                  )}
                  onClick={() => isClickable && handleStepClick(step.id)}
                >
                  <span
                    className={cn(
                      'text-xs md:text-sm font-semibold transition-colors block',
                      isCurrent && 'text-primary',
                      isCompleted && 'text-foreground',
                      isUpcoming && 'text-muted-foreground'
                    )}
                  >
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.shortLabel}</span>
                  </span>
                  <span
                    className={cn(
                      'text-[11px] mt-0.5 block',
                      isCompleted && 'text-muted-foreground',
                      isCurrent && 'text-primary/80',
                      isUpcoming && 'text-transparent'
                    )}
                  >
                    {isCompleted && t('steps.completed')}
                    {isCurrent && t('steps.inProgress')}
                    {isUpcoming && '—'}
                  </span>
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
