// Visual theme color definitions for Journal Categories and Priority Ribbons
export const CATEGORY_META = {
  birthday: {
    label: 'Birthday',
    color: '#d946ef', // fuchsia-500
    tabBg: 'bg-pink-600 text-white hover:bg-pink-700',
    tabBorder: 'border-pink-400',
    badge: 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-300 dark:border-pink-800',
    icon: 'Cake',
  },
  wedding: {
    label: 'Wedding',
    color: '#e11d48', // rose-600
    tabBg: 'bg-rose-700 text-white hover:bg-rose-800',
    tabBorder: 'border-rose-400',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800',
    icon: 'HeartHandshake',
  },
  meeting: {
    label: 'Meeting',
    color: '#4f46e5', // indigo-600
    tabBg: 'bg-indigo-700 text-white hover:bg-indigo-800',
    tabBorder: 'border-indigo-400',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800',
    icon: 'Briefcase',
  },
  travel: {
    label: 'Travel',
    color: '#ea580c', // orange-600
    tabBg: 'bg-amber-600 text-white hover:bg-amber-700',
    tabBorder: 'border-amber-400',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
    icon: 'Plane',
  },
  community: {
    label: 'Community',
    color: '#0d9488', // teal-600
    tabBg: 'bg-teal-700 text-white hover:bg-teal-800',
    tabBorder: 'border-teal-400',
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-300 dark:border-teal-800',
    icon: 'Users',
  },
};

// Priority ribbon bookmarks: P1 red, P2 orange, P3 blue, P4 gray
export const PRIORITY_META = {
  P1: {
    label: 'P1 - High',
    color: '#dc2626', // red-600
    ribbonClass: 'bg-red-600 text-white border-b-2 border-red-800',
    badge: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-300 dark:border-red-800',
    pill: 'bg-red-600 text-white',
  },
  P2: {
    label: 'P2 - Medium',
    color: '#ea580c', // orange-600
    ribbonClass: 'bg-orange-600 text-white border-b-2 border-orange-800',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-300 dark:border-orange-800',
    pill: 'bg-orange-600 text-white',
  },
  P3: {
    label: 'P3 - Low',
    color: '#2563eb', // blue-600
    ribbonClass: 'bg-blue-600 text-white border-b-2 border-blue-800',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-300 dark:border-blue-800',
    pill: 'bg-blue-600 text-white',
  },
  P4: {
    label: 'P4 - Info',
    color: '#6b7280', // gray-500
    ribbonClass: 'bg-gray-600 text-white border-b-2 border-gray-800',
    badge: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border border-stone-300 dark:border-stone-700',
    pill: 'bg-gray-600 text-white',
  },
};

export const CURRENCY = '₹';

export function formatINR(val) {
  if (val === null || val === undefined) return '₹0';
  return `${CURRENCY}${Number(val).toLocaleString('en-IN')}`;
}
