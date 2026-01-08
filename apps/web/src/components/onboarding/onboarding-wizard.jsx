'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  Store, 
  Users, 
  Scissors, 
  Calendar,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

var ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Fresh!',
    description: 'Let\'s get your salon set up in just a few steps. This will only take a couple of minutes.',
    icon: Sparkles,
    action: null,
  },
  {
    id: 'salon',
    title: 'Create Your Salon',
    description: 'First, let\'s create your salon. You\'ll add your salon details including name, address, and business hours.',
    icon: Store,
    action: '/dashboard/locations/new',
    actionLabel: 'Create Salon',
  },
  {
    id: 'settings',
    title: 'Complete Salon Details',
    description: 'Add more information about your salon like business hours and policies.',
    icon: Store,
    action: '/dashboard/settings',
    actionLabel: 'Go to Settings',
  },
  {
    id: 'services',
    title: 'Add Your Services',
    description: 'Create the services you offer with pricing and duration. You can organize them into categories.',
    icon: Scissors,
    action: '/dashboard/services',
    actionLabel: 'Add Services',
  },
  {
    id: 'staff',
    title: 'Add Team Members',
    description: 'Invite your staff members and set their working hours. Each team member can manage their own schedule.',
    icon: Users,
    action: '/dashboard/staff',
    actionLabel: 'Add Staff',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Your salon is ready to accept bookings. You can start managing appointments right away.',
    icon: CheckCircle2,
    action: '/dashboard/calendar',
    actionLabel: 'View Calendar',
  },
];

var STORAGE_KEY = 'fresh_onboarding_completed';
var STEP_KEY = 'fresh_onboarding_step';

export function useOnboarding() {
  var [isCompleted, setIsCompleted] = useState(true);
  var [currentStep, setCurrentStep] = useState(0);
  
  useEffect(function() {
    var completed = localStorage.getItem(STORAGE_KEY);
    var savedStep = localStorage.getItem(STEP_KEY);
    
    setIsCompleted(completed === 'true');
    if (savedStep) {
      setCurrentStep(parseInt(savedStep, 10));
    }
  }, []);
  
  function completeOnboarding() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsCompleted(true);
  }
  
  function resetOnboarding() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STEP_KEY);
    setIsCompleted(false);
    setCurrentStep(0);
  }
  
  function saveStep(step) {
    localStorage.setItem(STEP_KEY, step.toString());
    setCurrentStep(step);
  }
  
  return {
    isCompleted: isCompleted,
    currentStep: currentStep,
    completeOnboarding: completeOnboarding,
    resetOnboarding: resetOnboarding,
    saveStep: saveStep,
  };
}

export function OnboardingWizard() {
  var router = useRouter();
  var { isCompleted, currentStep, completeOnboarding, saveStep } = useOnboarding();
  var [open, setOpen] = useState(false);
  
  useEffect(function() {
    // Show wizard after a short delay if not completed
    var timeout = setTimeout(function() {
      if (!isCompleted) {
        setOpen(true);
      }
    }, 500);
    
    return function() { clearTimeout(timeout); };
  }, [isCompleted]);
  
  function handleNext() {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      var newStep = currentStep + 1;
      saveStep(newStep);
    } else {
      completeOnboarding();
      setOpen(false);
    }
  }
  
  function handlePrevious() {
    if (currentStep > 0) {
      var newStep = currentStep - 1;
      saveStep(newStep);
    }
  }
  
  function handleAction() {
    var step = ONBOARDING_STEPS[currentStep];
    if (step.action) {
      router.push(step.action);
      setOpen(false);
    }
  }
  
  function handleSkip() {
    completeOnboarding();
    setOpen(false);
  }
  
  if (isCompleted) return null;
  
  var step = ONBOARDING_STEPS[currentStep];
  var Icon = step.icon;
  var progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">{step.title}</DialogTitle>
          <DialogDescription className="text-base pt-2">
            {step.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {ONBOARDING_STEPS.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Step indicators */}
          <div className="flex justify-center gap-2">
            {ONBOARDING_STEPS.map(function(s, index) {
              return (
                <div
                  key={s.id}
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    index === currentStep
                      ? "bg-primary"
                      : index < currentStep
                      ? "bg-primary/50"
                      : "bg-muted"
                  )}
                />
              );
            })}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <div>
            {currentStep > 0 && (
              <Button variant="ghost" onClick={handlePrevious}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {currentStep === 0 && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tour
              </Button>
            )}
            
            {step.action && currentStep !== ONBOARDING_STEPS.length - 1 ? (
              <>
                <Button variant="outline" onClick={handleNext}>
                  Skip Step
                </Button>
                <Button onClick={handleAction}>
                  {step.actionLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button onClick={handleNext}>
                {currentStep === ONBOARDING_STEPS.length - 1 ? (
                  <>
                    Get Started
                    <Sparkles className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Onboarding checklist for dashboard
export function OnboardingChecklist() {
  var router = useRouter();
  var { isCompleted, completeOnboarding, resetOnboarding } = useOnboarding();
  var [dismissed, setDismissed] = useState(false);
  
  useEffect(function() {
    var wasDismissed = localStorage.getItem('fresh_checklist_dismissed');
    setDismissed(wasDismissed === 'true');
  }, []);
  
  function handleDismiss() {
    localStorage.setItem('fresh_checklist_dismissed', 'true');
    setDismissed(true);
    completeOnboarding();
  }
  
  if (isCompleted || dismissed) return null;
  
  var tasks = [
    { label: 'Set up salon profile', href: '/dashboard/settings', completed: false },
    { label: 'Add services', href: '/dashboard/services', completed: false },
    { label: 'Invite team members', href: '/dashboard/staff', completed: false },
    { label: 'Create first booking', href: '/dashboard/calendar', completed: false },
  ];
  
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">Getting Started Checklist</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Complete these tasks to set up your salon
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="mt-4 space-y-3">
        {tasks.map(function(task, index) {
          return (
            <button
              key={index}
              onClick={function() { router.push(task.href); }}
              className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted transition-colors"
            >
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border-2",
                task.completed
                  ? "border-primary bg-primary text-white"
                  : "border-muted-foreground/30"
              )}>
                {task.completed && <CheckCircle2 className="h-4 w-4" />}
              </div>
              <span className={cn(
                "text-sm",
                task.completed && "text-muted-foreground line-through"
              )}>
                {task.label}
              </span>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
