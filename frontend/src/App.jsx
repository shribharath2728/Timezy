import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { DashboardScreen } from './screens/DashboardScreen';
import { NewEventScreen } from './screens/NewEventScreen';
import { EventDetailScreen } from './screens/EventDetailScreen';
import { CalendarScreen } from './screens/CalendarScreen';

export function AppContent() {
  const [activeScreen, setActiveScreen] = useState('dashboard'); // 'dashboard' | 'new-event' | 'calendar' | 'event-detail'
  const [selectedEventId, setSelectedEventId] = useState(null);

  const handleSelectEvent = (id) => {
    setSelectedEventId(id);
    setActiveScreen('event-detail');
  };

  const handleCreatedEvent = (id) => {
    setSelectedEventId(id);
    setActiveScreen('event-detail');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        activeScreen={activeScreen}
        setActiveScreen={(scr) => {
          setActiveScreen(scr);
          if (scr !== 'event-detail') {
            setSelectedEventId(null);
          }
        }}
      />

      <main className="flex-1 pb-16 md:pb-8">
        {activeScreen === 'dashboard' && (
          <DashboardScreen
            onSelectEvent={handleSelectEvent}
            onNavigateNewEvent={() => setActiveScreen('new-event')}
          />
        )}

        {activeScreen === 'new-event' && (
          <NewEventScreen
            onCreated={handleCreatedEvent}
            onCancel={() => setActiveScreen('dashboard')}
          />
        )}

        {activeScreen === 'event-detail' && selectedEventId && (
          <EventDetailScreen
            eventId={selectedEventId}
            onBack={() => setActiveScreen('dashboard')}
          />
        )}

        {activeScreen === 'calendar' && (
          <CalendarScreen onSelectEvent={handleSelectEvent} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
