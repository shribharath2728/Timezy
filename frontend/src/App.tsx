import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AiAssistantPanel,
  FlipBookWorkspace,
  FloatingQuillButton,
  MarginaliaDrawer,
  TimezyHeader,
  TimezyLandingPage,
} from './components';
import { BudgetItem, ChecklistItem, EventPlan, TimelineTask } from './types';
import { storageService } from './services/storageService';

// ---------------------------------------------------------------------------
// Error Boundary — prevents a single component crash from white-screening the app
// ---------------------------------------------------------------------------
interface ErrorBoundaryState { hasError: boolean; error: Error | null }

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f8f2] text-[#082b03] p-8">
          <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
          <p className="text-sm text-[#5e7264] mb-6 max-w-md text-center">
            An unexpected error occurred. Please refresh the page to continue.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-5 py-2 rounded-xl bg-[#082b03] text-white text-sm font-semibold hover:bg-[#1a4a0a] transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export const App: React.FC = () => {
  const [plans, setPlans] = useState<EventPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isScrapbookOpen, setIsScrapbookOpen] = useState(false);

  // Track whether the initial load from localStorage has happened so we don't
  // write back the empty initial state before the data is loaded.
  const initializedRef = useRef(false);

  // Initialize from localStorage once on mount
  useEffect(() => {
    const savedPlans = storageService.getPlans();
    setPlans(savedPlans);

    const savedActiveId = storageService.getActivePlanId();
    if (savedActiveId && savedPlans.some((p) => p.id === savedActiveId)) {
      setActivePlanId(savedActiveId);
    }
    initializedRef.current = true;
  }, []);

  // Persist plans whenever they change — skip the first render (before init)
  useEffect(() => {
    if (!initializedRef.current) return;
    storageService.savePlans(plans);
  }, [plans]);

  // Persist active plan ID whenever it changes — skip the first render
  useEffect(() => {
    if (!initializedRef.current) return;
    storageService.setActivePlanId(activePlanId);
  }, [activePlanId]);

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;

  // Memoized handlers so child components don't re-render unnecessarily
  const handleCreatePlan = useCallback((newPlan: EventPlan) => {
    setPlans((prev) => [newPlan, ...prev]);
    setActivePlanId(newPlan.id);
  }, []);

  const handleUpdatePlan = useCallback((updatedPlan: EventPlan) => {
    setPlans((prev) => prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)));
  }, []);

  const handleAiAddBudgetItem = useCallback((item: BudgetItem) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === activePlanId
          ? { ...p, budgetItems: [...p.budgetItems, item] }
          : p
      )
    );
  }, [activePlanId]);

  const handleAiAddTimelineTask = useCallback((task: TimelineTask) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === activePlanId
          ? { ...p, timelineTasks: [...p.timelineTasks, task] }
          : p
      )
    );
  }, [activePlanId]);

  const handleAiAddChecklistItem = useCallback((item: ChecklistItem) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === activePlanId
          ? { ...p, checklistItems: [...p.checklistItems, item] }
          : p
      )
    );
  }, [activePlanId]);

  const handleAiUpdateTheme = useCallback((theme: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === activePlanId ? { ...p, theme } : p
      )
    );
  }, [activePlanId]);

  const handleToggleAi = useCallback(() => setIsAiOpen((v) => !v), []);
  const handleOpenAi = useCallback(() => setIsAiOpen(true), []);
  const handleCloseAi = useCallback(() => setIsAiOpen(false), []);
  const handleBackToHome = useCallback(() => setActivePlanId(null), []);
  const handleOpenScrapbook = useCallback(() => setIsScrapbookOpen(true), []);
  const handleCloseScrapbook = useCallback(() => setIsScrapbookOpen(false), []);

  return (
    <AppErrorBoundary>
      <div className="min-h-screen text-[#113425] flex flex-col font-sans selection:bg-[#113425] selection:text-white relative">

        <TimezyHeader
          onToggleAi={handleToggleAi}
          isAiOpen={isAiOpen}
          isInWorkspace={!!activePlan}
          onBackToHome={handleBackToHome}
          onOpenScrapbook={handleOpenScrapbook}
        />

        <main className="flex-1 pb-12">
          {activePlan ? (
            <FlipBookWorkspace
              plan={activePlan}
              onBack={handleBackToHome}
              onUpdatePlan={handleUpdatePlan}
              onOpenAi={handleOpenAi}
            />
          ) : (
            <TimezyLandingPage
              onCreatePlan={handleCreatePlan}
              savedPlans={plans}
              onSelectSavedPlan={setActivePlanId}
            />
          )}
        </main>

        <FloatingQuillButton onClick={handleOpenAi} isOpen={isAiOpen} />

        <MarginaliaDrawer
          isOpen={isScrapbookOpen}
          onClose={handleCloseScrapbook}
          planTitle={activePlan?.title}
        />

        <AiAssistantPanel
          isOpen={isAiOpen}
          onClose={handleCloseAi}
          plan={activePlan}
          onAddBudgetItem={handleAiAddBudgetItem}
          onAddTimelineTask={handleAiAddTimelineTask}
          onAddChecklistItem={handleAiAddChecklistItem}
          onUpdateTheme={handleAiUpdateTheme}
        />

        <footer className="w-full border-t border-[#c8dec0] py-4 text-center text-xs text-[#5e7264] font-medium bg-[#dcecd2]/80 backdrop-blur-xs mt-auto no-print">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Timezy — Smart Event &amp; Celebration Planner.</span>
            <span className="font-mono text-[11px] text-[#5e7264]"></span>
          </div>
        </footer>

      </div>
    </AppErrorBoundary>
  );
};

export default App;
