import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, Plus, CheckCircle } from 'lucide-react';
import { AiMessage, AiSuggestion, BudgetItem, ChecklistItem, EventPlan, TimelineTask } from '../../types';
import { askAiAssistant } from '../../services/aiService';

interface AiAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: EventPlan | null;
  onAddBudgetItem?: (item: BudgetItem) => void;
  onAddTimelineTask?: (task: TimelineTask) => void;
  onAddChecklistItem?: (item: ChecklistItem) => void;
  onUpdateTheme?: (theme: string) => void;
}

const GENERAL_ACTIONS = [
  'Hi! How can you help me?',
  'Budget allocation guide (₹)',
  'What should I plan first?',
  'Birthday party ideas',
  'Wedding planning tips',
];

const PLAN_ACTIONS = [
  'Hello! How is my plan looking?',
  'Optimize my budget in INR (₹)',
  'Suggest day-of schedule',
  'What should I do next?',
  'Ways to save money',
];

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  isOpen,
  onClose,
  plan,
  onAddBudgetItem,
  onAddTimelineTask,
  onAddChecklistItem,
  onUpdateTheme,
}) => {
  const planTitle = plan ? plan.title : null;
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [addedSuggestionIds, setAddedSuggestionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const welcome = planTitle
      ? `Welcome to your event planning assistant for **${planTitle}**.\n\nHow can I help with your preparations today? Choose a quick action below or ask any question about themes, budget allocations, or vendor schedules in Indian Rupees (₹).`
      : `Welcome to the **Timezy** AI Assistant!\n\nI am here to help you brainstorm themes, design budgets in Indian Rupees (₹), and organize memorable timelines. You can ask me any question or pick a quick topic below.`;

    setMessages([{
      id: 'init-1',
      role: 'assistant',
      content: welcome,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  }, [planTitle, isOpen]);

  if (!isOpen) return null;

  const quickActions = plan ? PLAN_ACTIONS : GENERAL_ACTIONS;

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: AiMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const aiReply = await askAiAssistant(query, plan, messages);
      setMessages((prev) => [...prev, aiReply]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'I could not complete that request at this moment. Please try asking again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySuggestion = (sug: AiSuggestion) => {
    if (addedSuggestionIds.has(sug.id)) return;
    if (sug.type === 'budget' && onAddBudgetItem) onAddBudgetItem(sug.data as BudgetItem);
    else if (sug.type === 'timeline' && onAddTimelineTask) onAddTimelineTask(sug.data as TimelineTask);
    else if (sug.type === 'checklist' && onAddChecklistItem) onAddChecklistItem(sug.data as ChecklistItem);
    else if (sug.type === 'theme' && onUpdateTheme) onUpdateTheme((sug.data as { theme: string }).theme);
    setAddedSuggestionIds((prev) => new Set([...prev, sug.id]));
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] z-50 flex flex-col bg-white border-l border-[#e2ede0] shadow-2xl no-print">
      
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e2ede0] flex items-center justify-between bg-[#f4f8f2]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#113425] flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#113425] leading-tight">
              AI Event Assistant
            </h3>
            <span className="text-[11px] text-[#6b7f73] font-mono">
              {plan ? `Tailored for ${plan.title}` : 'General Planning Advice'}
            </span>
          </div>
        </div>
        <button onClick={onClose}
          className="p-1.5 rounded-full text-[#6b7f73] hover:text-[#113425] hover:bg-[#eaf5e6] transition-colors"
          aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick action chips */}
      <div className="px-4 py-2.5 border-b border-[#e2ede0] bg-white overflow-x-auto whitespace-nowrap space-x-1.5">
        {quickActions.map((action) => (
          <button key={action} onClick={() => handleSend(action)} disabled={isLoading}
            className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-[#f4f8f2] text-[#113425] border border-[#e2ede0] hover:bg-[#eaf5e6] transition-all disabled:opacity-40">
            {action}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed border ${
                isUser
                  ? 'bg-[#113425] text-white border-[#113425] rounded-br-none shadow-sm'
                  : 'bg-[#f8faf7] text-[#113425] border-[#e2ede0] rounded-bl-none'
              }`}>
                <div className="whitespace-pre-line font-sans">{m.content}</div>

                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#e2ede0] space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#6b7f73] block">
                      Suggested Actions:
                    </span>
                    {m.suggestions.map((sug) => {
                      const isAdded = addedSuggestionIds.has(sug.id);
                      return (
                        <div key={sug.id}
                          className="p-2.5 rounded-xl bg-white border border-[#e2ede0] flex flex-col gap-1 text-[11px] shadow-2xs">
                          <div className="text-[#113425] font-bold flex items-center justify-between">
                            <span>{sug.title}</span>
                            <span className="text-[9px] font-mono text-[#113425] uppercase px-1.5 py-0.5 rounded-full bg-[#eaf5e6]">{sug.type}</span>
                          </div>
                          <p className="text-[10px] text-[#6b7f73]">{sug.description}</p>
                          {plan && (
                            <div className="pt-1 flex justify-end">
                              <button type="button" onClick={() => handleApplySuggestion(sug)} disabled={isAdded}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 transition-all ${
                                  isAdded ? 'bg-[#f4f8f2] text-[#6b7f73] cursor-default' : 'timezy-btn-dark'
                                }`}>
                                {isAdded ? <><CheckCircle className="w-3 h-3" /><span>Added</span></> : <><Plus className="w-3 h-3" /><span>Add to Plan</span></>}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <span className="text-[9px] text-[#6b7f73] font-mono mt-1 px-1">{m.timestamp}</span>
            </div>
          );
        })}

        {isLoading && (
          <div className="p-3 rounded-2xl bg-[#f4f8f2] border border-[#e2ede0] text-[11px] text-[#6b7f73] font-mono animate-pulse flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#113425]" />
            <span>Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="p-3 border-t border-[#e2ede0] flex items-center gap-2 bg-[#f8faf7]">
        <input type="text"
          placeholder={plan ? "Ask about themes, budget in ₹, checklists..." : "Ask anything about event planning..."}
          value={input} onChange={(e) => setInput(e.target.value)} disabled={isLoading}
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-[#e2ede0] text-xs focus:outline-none text-[#113425]" />
        <button type="submit" disabled={!input.trim() || isLoading}
          className="timezy-btn-dark p-2.5 rounded-xl disabled:opacity-40 transition-all shrink-0"
          aria-label="Send">
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </form>
    </div>
  );
};
