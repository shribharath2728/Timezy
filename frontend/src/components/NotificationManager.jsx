import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { Bell, BellRing, BellOff } from 'lucide-react';

export function NotificationManager() {
  const { addToast } = useToast();
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      addToast({ message: 'Desktop notifications are not supported in this browser.', type: 'warning' });
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        addToast({ message: 'Notifications enabled for event updates!', type: 'success' });
      } else {
        addToast({ message: 'Notification permission was denied.', type: 'warning' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <button
      onClick={requestPermission}
      title={
        permission === 'granted'
          ? 'Notifications are Active'
          : permission === 'denied'
          ? 'Notifications Blocked'
          : 'Enable Notifications'
      }
      className={`p-2 rounded-xl transition border text-xs flex items-center gap-1.5 font-medium ${
        permission === 'granted'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
          : permission === 'denied'
          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
      }`}
    >
      {permission === 'granted' ? (
        <>
          <BellRing className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">Alerts On</span>
        </>
      ) : permission === 'denied' ? (
        <>
          <BellOff className="w-4 h-4 text-red-500" />
          <span className="hidden sm:inline">Alerts Blocked</span>
        </>
      ) : (
        <>
          <Bell className="w-4 h-4 text-amber-500" />
          <span className="hidden sm:inline">Enable Alerts</span>
        </>
      )}
    </button>
  );
}
