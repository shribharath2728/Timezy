import React, { useState } from 'react';
import { Plus, Check, Trash2, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { EventPlan, PriorityLevel, TimelinePhase, TimelineTask } from '../types';

interface TimelineTabProps {
  plan: EventPlan;
  onUpdateTimelineTasks: (tasks: TimelineTask[]) => void;
}

const PHASES: Array<{ phase: TimelinePhase; label: string }> = [
  { phase: '6_to_8_weeks', label: '6 se 8 hafte pehle' },
  { phase: '3_to_4_weeks', label: '3 se 4 hafte pehle' },
  { phase: '1_to_2_weeks', label: '1 se 2 hafte pehle' },
  { phase: 'final_days', label: 'Aakhiri kuch din' },
  { phase: 'event_day', label: 'Shubh Din (Main Event)' },
];

export const TimelineTab: React.FC<TimelineTabProps> = ({ plan, onUpdateTimelineTasks }) => {
  const [tasks, setTasks] = useState<TimelineTask[]>(plan.timelineTasks);
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'P1' | 'pending' | 'completed'>('all');

  // New task form state
  const [newName, setNewName] = useState('');
  const [newPhase, setNewPhase] = useState<TimelinePhase>('3_to_4_weeks');
  const [newDate, setNewDate] = useState(plan.eventDate);
  const [newPriority, setNewPriority] = useState<PriorityLevel>('P2');
  const [newNotes, setNewNotes] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const toggleTask = (id: string) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTasks(updated);
    onUpdateTimelineTasks(updated);
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    onUpdateTimelineTasks(updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const phaseObj = PHASES.find((p) => p.phase === newPhase);

    const newTask: TimelineTask = {
      id: `t-${Date.now()}`,
      name: newName.trim(),
      phase: newPhase,
      phaseLabel: phaseObj ? phaseObj.label : 'Custom Milestone',
      recommendedDate: newDate,
      priority: newPriority,
      completed: false,
      notes: newNotes.trim() || undefined,
    };

    const updated = [...tasks, newTask];
    setTasks(updated);
    onUpdateTimelineTasks(updated);

    // Reset
    setNewName('');
    setNewNotes('');
    setIsAdding(false);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filter === 'P1') return t.priority === 'P1';
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  // Group tasks by phase in chronological sequence
  const grouped = PHASES.map((ph) => {
    return {
      phase: ph.phase,
      label: ph.label,
      tasks: filteredTasks.filter((t) => t.phase === ph.phase),
    };
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-up">
      
      {/* Header Info */}
      <div className="glass-card rounded-xl p-6 ">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="font-mono text-base text-[#C9A84C] block">
              Organizing Chronology
            </span>
            <h2 className="font-serif text-xl sm:text-2xl text-[#F5EFE0] font-normal">
              Tayyari Timeline
            </h2>
            <p className="text-xs text-[#9C9080] font-sans mt-0.5">
              Calibrated specifically to your event date: {plan.eventDate} ({completedCount}/{tasks.length} milestones completed)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-1.5 rounded bg-[#A45564] hover:bg-[#8E4453] text-[#FEFBF8] text-xs font-sans flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Milestone Task</span>
            </button>
          </div>
        </div>

        {/* Milestone Filters & Progress Bar */}
        <div className="pt-3 border-t border-[rgba(201,168,76,0.22)]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: `All (${tasks.length})` },
              { id: 'P1', label: `Crucial P1 (${tasks.filter(t => t.priority === 'P1').length})` },
              { id: 'pending', label: `Pending (${tasks.filter(t => !t.completed).length})` },
              { id: 'completed', label: `Done (${completedCount})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filter === f.id
                    ? 'bg-[#A45564] text-[#FEFBF8] font-medium'
                    : 'bg-[rgba(255,255,255,0.04)] text-[#9C9080] border border-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.65)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 min-w-[140px]">
            <div className="w-28 bg-[rgba(201,168,76,0.08)] h-1.5 rounded-full overflow-hidden border border-[rgba(201,168,76,0.22)]/50">
              <div 
                className="h-full progress-fill rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-[#9C9080]">{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* Add Custom Task Form */}
      {isAdding && (
        <form onSubmit={handleAddTask} className="p-5 rounded-md bg-[rgba(255,255,255,0.04)]/95 border border-[rgba(201,168,76,0.22)] space-y-4  shadow-xs">
          <div className="text-xs font-mono uppercase text-[#9C9080]">
            New Timeline Milestone
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-[#9C9080] mb-1">Milestone Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Schedule final tasting with caterer"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full input-dark focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#9C9080] mb-1">Target Phase</label>
              <select
                value={newPhase}
                onChange={(e) => setNewPhase(e.target.value as TimelinePhase)}
                className="w-full input-dark focus:outline-none"
              >
                {PHASES.map((p) => (
                  <option key={p.phase} value={p.phase}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-[#9C9080] mb-1">Recommended Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full input-dark focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#9C9080] mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                className="w-full input-dark focus:outline-none"
              >
                <option value="P1">P1 — Crucial</option>
                <option value="P2">P2 — Important</option>
                <option value="P3">P3 — Moderate</option>
                <option value="P4">P4 — Low</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[#9C9080] mb-1">Notes (optional)</label>
              <input
                type="text"
                placeholder="Important contact or notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full input-dark focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1 rounded bg-[rgba(201,168,76,0.08)] text-xs text-[#9C9080] hover:bg-[#DEC8CF]/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1 rounded bg-[#A45564] text-xs text-[#FEFBF8] hover:bg-[#8E4453]"
            >
              Add Task
            </button>
          </div>
        </form>
      )}

      {/* Chronological Timeline Groups */}
      <div className="space-y-6">
        {grouped.map((group) => {
          if (group.tasks.length === 0) return null;

          return (
            <div 
              key={group.phase}
              className="glass-card rounded-xl p-5 sm:p-6   relative shadow-xs"
            >
              {/* Phase Header */}
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[rgba(201,168,76,0.22)]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A45564]" />
                <h3 className="font-serif text-base sm:text-lg text-[#F5EFE0] font-normal">
                  {group.label}
                </h3>
                <span className="text-[11px] font-mono text-[#9C9080] ml-auto">
                  {group.tasks.filter((t) => t.completed).length} / {group.tasks.length} done
                </span>
              </div>

              {/* Tasks within Phase */}
              <div className="space-y-2.5">
                {group.tasks.map((task) => {
                  const isOverdue = !task.completed && task.recommendedDate < todayStr;
                  const isToday = !task.completed && task.recommendedDate === todayStr;

                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded border transition-all flex items-start justify-between gap-3 ${
                        task.completed
                          ? 'bg-[rgba(255,255,255,0.04)]/50 border-[rgba(201,168,76,0.22)]/60 opacity-70'
                          : isOverdue
                          ? 'bg-[rgba(201,168,76,0.08)] border-[#C5A5B0]'
                          : 'bg-[rgba(255,255,255,0.04)] border-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.65)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            task.completed
                              ? 'bg-[#A45564] border-[rgba(201,168,76,0.65)] text-[#FEFBF8]'
                              : 'bg-[rgba(255,255,255,0.04)] border-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.65)]'
                          }`}
                          aria-label={`Mark ${task.name} as ${task.completed ? 'incomplete' : 'complete'}`}
                        >
                          {task.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
                        </button>

                        <div>
                          <div className={`text-sm font-serif ${task.completed ? 'line-through text-[#9C9080]' : 'text-[#F5EFE0]'}`}>
                            {task.name}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#9C9080] mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#C9A84C]" />
                              Due: {task.recommendedDate}
                            </span>

                            {isOverdue && (
                              <span className="text-[#8E4453] font-medium flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3 text-[#C9A84C]" />
                                Overdue
                              </span>
                            )}

                            {isToday && (
                              <span className="text-[#C9A84C] font-medium flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-[#C9A84C]" />
                                Today
                              </span>
                            )}

                            {task.notes && (
                              <span className="text-[#9C9080] italic font-serif">
                                • {task.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[rgba(201,168,76,0.08)] text-[#9C9080] border border-[rgba(201,168,76,0.22)]">
                          {task.priority}
                        </span>

                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-[#C5A5B0] hover:text-[#8E4453] p-1"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

