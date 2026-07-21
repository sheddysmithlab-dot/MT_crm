import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, FileSpreadsheet, Wrench, PackageCheck, ReceiptText, ArrowRight, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import InspectionStep from './jobs/InspectionStep';
import EstimateStep from './jobs/EstimateStep';
import JobSheetStep from './jobs/JobSheetStep';
import ChalanStep from './jobs/ChalanStep';
import InvoiceStep from './jobs/InvoiceStep';
import useJobsStore, { initializeDefaultJob } from '@/store/jobsStore';
import { motion } from 'framer-motion';

const steps = [
  { id: 'inspection', name: 'Vehicle Inspection', icon: ClipboardList, component: InspectionStep },
  { id: 'estimate', name: 'Estimate', icon: FileSpreadsheet, component: EstimateStep },
  { id: 'jobsheet', name: 'Job Sheet', icon: Wrench, component: JobSheetStep },
  { id: 'chalan', name: 'Labour Bill', icon: PackageCheck, component: ChalanStep },
  { id: 'invoice', name: 'Invoice', icon: ReceiptText, component: InvoiceStep },
];

// localStorage keys that carry the in-progress job "draft" between steps.
// The flow (Next/Previous/tab switches) keeps the Jobs component mounted, so
// these survive while you work. They are wiped whenever the Jobs module is
// freshly (re)entered — sidebar click, reload, returning from another page —
// so a direct open starts blank instead of showing the previous job.
const JOB_DRAFT_KEYS = [
  'inspectionItems',
  'jobSheetEstimate',
  'extraWork',
  'jobsContext',
  'estimateContext',
  'estimateDiscount',
  'estimateAdvancePayment',
  'estimateRoundOff',
  'challanEditContext',
];

const Jobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [onNextCallback, setOnNextCallback] = useState(null);
  const jobs = useJobsStore(state => state.jobs);

  // Run ONCE synchronously on the first render — before the step components
  // mount and read these keys (child effects fire before parent effects, so an
  // effect here would be too late). An Edit action that reloads the page sets
  // `jobFlowResume` so the record it loaded into the draft is preserved.
  const didResetDrafts = useRef(false);
  if (!didResetDrafts.current) {
    didResetDrafts.current = true;
    if (sessionStorage.getItem('jobFlowResume')) {
      sessionStorage.removeItem('jobFlowResume');
    } else {
      JOB_DRAFT_KEYS.forEach((k) => localStorage.removeItem(k));
    }
  }

  const activeJobId = Object.keys(jobs)[0];

  useEffect(() => {
    initializeDefaultJob();
  }, []);

  useEffect(() => {
    const stepParam = searchParams.get('step');
    const stepIndex = steps.findIndex(s => s.id === stepParam);
    setCurrentStep(stepIndex >= 0 ? stepIndex : 0);
    setOnNextCallback(null); // Reset callback when step changes
  }, [searchParams]);

  const navigateToStep = (index) => {
    setSearchParams({ step: steps[index].id });
  };

  const registerOnNext = (callback) => {
    setOnNextCallback(() => callback);
  };

  const handleNext = async () => { 
    if (currentStep < steps.length - 1) {
      // Execute the registered onNext callback if it exists
      if (onNextCallback && typeof onNextCallback === 'function') {
        try {
          await onNextCallback();
        } catch (error) {
          console.error('Error in onNext callback:', error);
          return; // Don't navigate if callback fails
        }
      }
      navigateToStep(currentStep + 1);
    }
  };
  
  const handlePrev = () => { if (currentStep > 0) navigateToStep(currentStep - 1); };
  
  const ActiveComponent = steps[currentStep].component;

  if (!activeJobId) {
    return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
            <p className="text-gray-500 dark:text-dark-text-secondary">No jobs found</p>
            <Button 
              onClick={async () => {
                // Create a new job and navigate to inspection step
                try {
                  await useJobsStore.getState().createNewJob({
                    vehicleNumber: '',
                    customerName: '',
                    phoneNumber: '',
                    description: ''
                  });
                  setSearchParams({ step: 'inspection' });
                } catch (error) {
                  console.error('Error creating new job:', error);
                }
              }}
              className="bg-brand-red text-white"
            >
              Create New Job
            </Button>
        </div>
    );
  }

  return (
    <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="bg-white dark:bg-dark-card p-4 sm:p-6 rounded-xl shadow-card dark:shadow-dark-card border border-gray-100 dark:border-gray-700 space-y-6"
    >
      <div className="border-b dark:border-gray-700 pb-4">
        <nav aria-label="Progress">
          <ol role="list" className="flex flex-wrap gap-2">
            {steps.map((step, stepIdx) => {
              const isCompleted = stepIdx < currentStep;
              const isCurrent = stepIdx === currentStep;
              const isFuture = stepIdx > currentStep;
              return (
                <li key={step.name} className="flex items-center gap-2">
                  <motion.button
                    onClick={() => navigateToStep(stepIdx)}
                    animate={{ scale: isCurrent ? 1.05 : 1 }}
                    transition={{ duration: 0.15 }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer select-none transition-all duration-200 border
                      ${isCompleted ? 'bg-red-600 text-white border-red-600 opacity-80' : ''}
                      ${isCurrent  ? 'bg-red-600 text-white border-red-600 shadow-md' : ''}
                      ${isFuture   ? 'bg-white dark:bg-dark-card text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600' : ''}
                    `}
                  >
                    <step.icon className="h-4 w-4 shrink-0" />
                    <span>{step.name}</span>
                  </motion.button>
                  {stepIdx < steps.length - 1 && (
                    <ArrowRight className={`h-4 w-4 shrink-0 ${stepIdx < currentStep ? 'text-red-500' : 'text-gray-300 dark:text-gray-600'}`} />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Navigation Buttons - Moved above content */}
      <div className="flex justify-between items-center pb-4 border-b dark:border-gray-700">
        <Button onClick={handlePrev} disabled={currentStep === 0} variant="secondary">
          <ArrowLeft className="h-5 w-5 mr-2"/> Previous
        </Button>
        {currentStep < steps.length - 1 && (
          <Button onClick={handleNext}>
            Next <ArrowRight className="h-5 w-5 ml-2"/>
          </Button>
        )}
      </div>

      <div className="min-h-[400px]">
        <ActiveComponent jobId={activeJobId} registerOnNext={registerOnNext} />
      </div>
    </motion.div>
  );
};
export default Jobs;
