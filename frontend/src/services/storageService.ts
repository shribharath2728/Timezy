import { EventPlan } from '../types';

const STORAGE_KEY = 'gather_and_plan_diary_events';
const ACTIVE_PLAN_KEY = 'gather_and_plan_active_id';

export const storageService = {
  getPlans(): EventPlan[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse plans from localStorage:', e);
      return [];
    }
  },

  savePlans(plans: EventPlan[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    } catch (e) {
      console.error('Failed to save plans to localStorage:', e);
    }
  },

  getPlanById(id: string): EventPlan | undefined {
    const plans = this.getPlans();
    return plans.find((p) => p.id === id);
  },

  savePlan(plan: EventPlan): void {
    const plans = this.getPlans();
    const index = plans.findIndex((p) => p.id === plan.id);
    if (index >= 0) {
      plans[index] = plan;
    } else {
      plans.unshift(plan);
    }
    this.savePlans(plans);
  },

  deletePlan(id: string): void {
    const plans = this.getPlans().filter((p) => p.id !== id);
    this.savePlans(plans);
    if (this.getActivePlanId() === id) {
      this.setActivePlanId(null);
    }
  },

  getActivePlanId(): string | null {
    return localStorage.getItem(ACTIVE_PLAN_KEY);
  },

  setActivePlanId(id: string | null): void {
    if (id) {
      localStorage.setItem(ACTIVE_PLAN_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PLAN_KEY);
    }
  },
};

