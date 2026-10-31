import React, { useState, useEffect } from 'react';
import { TimezyHeader } from './components/TimezyHeader';
import { TimezyLandingPage } from './components/TimezyLandingPage';
import { FlipBookWorkspace } from './components/FlipBookWorkspace';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { MarginaliaDrawer } from './components/MarginaliaDrawer';
import { FloatingQuillButton } from './components/FloatingQuillButton';
import { BudgetItem, ChecklistItem, EventPlan, TimelineTask } from './types';
import { storageService } from './services/storageService';

export const App: React.FC = () => {
  const [plans, setPlans] = useState<EventPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isScrapbookOpen, setIsScrapbookOpen] = useState(false);

  // Initialize from LocalStorage
  useEffect(() => {
    const savedPlans = storageService.getPlans();
    setPlans(savedPlans);

    const savedActiveId = storageService.getActivePlanId();
    if (savedActiveId && savedPlans.some((p) => p.id === savedActiveId)) {
      setActivePlanId(savedActiveId);
    }
  }, []);

  // Save changes to LocalStorage
  useEffect(() => {
    storageService.savePlans(plans);
  }, [plans]);

  useEffect(() => {
    storageService.setActivePlanId(activePlanId);
  }, [activePlanId]);

  const activePlan = plans.find((p) => p.id === activePlanId) || null;

  const handleCreatePlan = (newPlan: EventPlan) => {
    setPlans((prev) => [newPlan, ...prev]);
    setActivePlanId(newPlan.id);
  };

  const handleUpdatePlan = (updatedPlan: EventPlan) => {
    setPlans((prev) => prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)));
  };

  const handleAiAddBudgetItem = (item: BudgetItem) => {
    if (!activePlan) return;
    const updated = {
      ...activePlan,
      budgetItems: [...activePlan.budgetItems, item],
    };
    handleUpdatePlan(updated);
  };

  const handleAiAddTimelineTask = (task: TimelineTask) => {
    if (!activePlan) return;
    const updated = {
      ...activePlan,
      timelineTasks: [...activePlan.timelineTasks, task],
    };
    handleUpdatePlan(updated);
  };

  const handleAiAddChecklistItem = (item: ChecklistItem) => {
    if (!activePlan) return;
    const updated = {
      ...activePlan,
      checklistItems: [...activePlan.checklistItems, item],
    };
    handleUpdatePlan(updated);
  };

  const handleAiUpdateTheme = (theme: string) => {
    if (!activePlan) return;
    const updated = {
      ...activePlan,
      theme,
    };
    handleUpdatePlan(updated);
  };

  return (
    <div className="min-h-screen text-[#113425] flex flex-col font-sans selection:bg-[#113425] selection:text-white relative">
      
      {/* Timezy App Header */}
      <TimezyHeader
        onToggleAi={() => setIsAiOpen(!isAiOpen)}
        isAiOpen={isAiOpen}
        isInWorkspace={!!activePlan}
        onBackToHome={() => setActivePlanId(null)}
        savedPlansCount={plans.length}
        onOpenSavedPlans={() => setActivePlanId(null)}
        onOpenScrapbook={() => setIsScrapbookOpen(true)}
      />

      {/* Main Content: Either the 3-Phone Showcase or the 3D Book Flip Workspace */}
      <main className="flex-1 pb-12">
        {activePlan ? (
          <FlipBookWorkspace
            plan={activePlan}
            onBack={() => setActivePlanId(null)}
            onUpdatePlan={handleUpdatePlan}
            onOpenAi={() => setIsAiOpen(true)}
          />
        ) : (
          <TimezyLandingPage
            onCreatePlan={handleCreatePlan}
            savedPlans={plans}
            onSelectSavedPlan={(id) => setActivePlanId(id)}
          />
        )}
      </main>

      {/* Floating AI Button */}
      <FloatingQuillButton
        onClick={() => setIsAiOpen(true)}
        isOpen={isAiOpen}
      />

      {/* Diary Scrapbook / Notes Drawer */}
      <MarginaliaDrawer
        isOpen={isScrapbookOpen}
        onClose={() => setIsScrapbookOpen(false)}
        planTitle={activePlan?.title}
      />

      {/* AI Assistant Side Panel */}
      <AiAssistantPanel
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        plan={activePlan}
        onAddBudgetItem={handleAiAddBudgetItem}
        onAddTimelineTask={handleAiAddTimelineTask}
        onAddChecklistItem={handleAiAddChecklistItem}
        onUpdateTheme={handleAiUpdateTheme}
      />

      {/* Footer */}
      <footer className="w-full border-t border-[#c8dec0] py-4 text-center text-xs text-[#5e7264] font-medium bg-[#dcecd2]/80 backdrop-blur-xs mt-auto no-print">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Timezy — Smart Event &amp; Celebration Planner.</span>
          <span className="font-mono text-[11px] text-[#5e7264]"></span>
        </div>
      </footer>

    </div>
  );
};

export default App;
