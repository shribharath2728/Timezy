export type EventCategory = 'birthday' | 'functions';

export type FunctionType = 
  | 'wedding' 
  | 'engagement' 
  | 'reception'
  | 'anniversary' 
  | 'family' 
  | 'housewarming' 
  | 'celebration'
  | 'sangeet_mehendi'
  | 'puja_ceremony';

export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export type VendorStatus = 
  | 'To Contact' 
  | 'In Discussion'
  | 'Awaiting Response' 
  | 'Quotation Received' 
  | 'Booked' 
  | 'Advance Paid' 
  | 'Completed';

export interface BudgetItem {
  id: string;
  category: string;
  name: string;
  estimatedCost: number;
  actualCost: number;
  paymentStatus: PaymentStatus;
  notes?: string;
}

export type TimelinePhase = 
  | '3_to_6_months'
  | '1_to_2_months'
  | '6_to_8_weeks' 
  | '3_to_4_weeks' 
  | '2_to_4_weeks'
  | '1_to_2_weeks' 
  | 'final_days' 
  | 'day_of'
  | 'event_day';

export interface TimelineTask {
  id: string;
  name: string;
  phase: TimelinePhase;
  phaseLabel: string;
  recommendedDate: string; // ISO date string YYYY-MM-DD
  timeSlot?: string;
  priority: PriorityLevel;
  completed: boolean;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  completed: boolean;
  notes?: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contactInfo: string;
  quotedPrice: number;
  advancePayment: number;
  remainingPayment: number;
  status: VendorStatus;
  notes?: string;
}

export interface EventPlan {
  id: string;
  title: string;
  category: EventCategory;
  functionType?: FunctionType;
  eventDate: string; // YYYY-MM-DD
  commencementTime?: string; // e.g. "18:30" or "06:30 PM"
  personName?: string;
  age?: number;
  theme?: string;
  venue: string;
  guestCount: number;
  budget: number; // in INR (₹)
  notes?: string;
  createdAt: string;
  budgetItems: BudgetItem[];
  timelineTasks: TimelineTask[];
  checklistItems: ChecklistItem[];
  vendors: Vendor[];
}

export interface AiSuggestion {
  id: string;
  type: 'budget' | 'timeline' | 'checklist' | 'theme';
  title: string;
  description: string;
  data: any;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: AiSuggestion[];
}
