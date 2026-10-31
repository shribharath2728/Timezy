import { 
  BudgetItem, 
  ChecklistItem, 
  EventCategory, 
  FunctionType, 
  TimelineTask, 
  Vendor 
} from '../types';

export function isHomeVenue(venue?: string): boolean {
  if (!venue) return false;
  const v = venue.toLowerCase().trim();
  return (
    v.includes('house') ||
    v.includes('home') ||
    v.includes('flat') ||
    v.includes('apartment') ||
    v.includes('residence') ||
    v.includes('terrace') ||
    v.includes('backyard') ||
    v.includes('lawn at home') ||
    v.includes('living room') ||
    v.includes('my place') ||
    v.includes('our place')
  );
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function generateInitialBudget(
  category: EventCategory, 
  functionType: FunctionType | undefined, 
  totalBudget: number,
  venue?: string
): BudgetItem[] {
  // Realistic Indian budget in INR (₹)
  const budget = totalBudget > 0 ? totalBudget : (category === 'birthday' ? 50000 : 500000);
  const atHome = isHomeVenue(venue);

  if (category === 'birthday') {
    if (atHome) {
      // Home celebration: ZERO venue cost, budget allocated to food, cake, decor, photography
      const catering = Math.round(budget * 0.45);
      const decor = Math.round(budget * 0.20);
      const cake = Math.round(budget * 0.18);
      const photo = Math.round(budget * 0.10);
      const giftsAndBuffer = budget - (catering + decor + cake + photo);

      return [
        {
          id: 'b-1',
          category: 'Venue & Space',
          name: 'Home Venue (No Rental Fee)',
          estimatedCost: 0,
          actualCost: 0,
          paymentStatus: 'paid',
          notes: 'Celebration hosted at home — zero venue rental cost',
        },
        {
          id: 'b-2',
          category: 'Catering & Dining',
          name: 'Party snacks buffet, live finger food & beverages',
          estimatedCost: catering,
          actualCost: 0,
          paymentStatus: 'unpaid',
          notes: 'Live snacks, appetizers, party beverages & dessert cups',
        },
        {
          id: 'b-3',
          category: 'Cake & Confectionery',
          name: 'Custom celebration cake, cupcakes & dessert station',
          estimatedCost: cake,
          actualCost: 0,
          paymentStatus: 'unpaid',
          notes: 'Multi-flavor birthday cake, celebration sparklers & cupcakes',
        },
        {
          id: 'b-4',
          category: 'Theme Decor & Lighting',
          name: 'Home balloon garland, fairy lights & party backdrop',
          estimatedCost: decor,
          actualCost: 0,
          paymentStatus: 'unpaid',
          notes: 'Living room/terrace backdrop styling, balloons & ambient lights',
        },
        {
          id: 'b-5',
          category: 'Photography & Memories',
          name: 'Candid event photography & family celebration reel',
          estimatedCost: photo,
          actualCost: 0,
          paymentStatus: 'unpaid',
        },
        {
          id: 'b-6',
          category: 'Party Favors & Contingency',
          name: 'Guest return gifts, party games & emergency reserve',
          estimatedCost: Math.max(0, giftsAndBuffer),
          actualCost: 0,
          paymentStatus: 'unpaid',
        },
      ];
    }

    // Commercial hall / lawn rental
    const venueCost = Math.round(budget * 0.22);
    const catering = Math.round(budget * 0.35);
    const decor = Math.round(budget * 0.15);
    const cake = Math.round(budget * 0.10);
    const photo = Math.round(budget * 0.10);
    const giftsAndBuffer = budget - (venueCost + catering + decor + cake + photo);

    return [
      {
        id: 'b-1',
        category: 'Banquet & Venue',
        name: 'Party hall, lawn or venue rental',
        estimatedCost: venueCost,
        actualCost: 0,
        paymentStatus: 'unpaid',
        notes: 'Air-conditioned banquet hall with dedicated seating',
      },
      {
        id: 'b-2',
        category: 'Theme Decor & Lighting',
        name: 'Themed balloon arch, welcome banner & ambient lighting',
        estimatedCost: decor,
        actualCost: 0,
        paymentStatus: 'unpaid',
      },
      {
        id: 'b-3',
        category: 'Cake & Confectionery',
        name: 'Custom celebration cake, pastries & dessert counter',
        estimatedCost: cake,
        actualCost: 0,
        paymentStatus: 'unpaid',
      },
      {
        id: 'b-4',
        category: 'Catering & Beverages',
        name: 'Buffet catering, live counters & refreshments',
        estimatedCost: catering,
        actualCost: 0,
        paymentStatus: 'unpaid',
        notes: 'Live food counters, appetizers, main course buffet & desserts',
      },
      {
        id: 'b-5',
        category: 'Photography & Videography',
        name: 'Candid event photography & highlight video captures',
        estimatedCost: photo,
        actualCost: 0,
        paymentStatus: 'unpaid',
      },
      {
        id: 'b-6',
        category: 'Return Gifts & Contingency',
        name: 'Guest return gift hampers & reserve buffer',
        estimatedCost: Math.max(0, giftsAndBuffer),
        actualCost: 0,
        paymentStatus: 'unpaid',
      },
    ];
  }

  // Functions (Weddings, Receptions, Engagements)
  if (atHome) {
    const catering = Math.round(budget * 0.40);
    const decor = Math.round(budget * 0.25);
    const photo = Math.round(budget * 0.15);
    const styling = Math.round(budget * 0.08);
    const music = Math.round(budget * 0.05);
    const buffer = budget - (catering + decor + photo + styling + music);

    return [
      {
        id: 'f-1',
        category: 'Venue & Space',
        name: 'Family Residence / Home Venue (No Rental Cost)',
        estimatedCost: 0,
        actualCost: 0,
        paymentStatus: 'paid',
        notes: 'Celebration hosted at family residence — zero commercial venue rental',
      },
      {
        id: 'f-2',
        category: 'Catering & Dining',
        name: 'Grand multi-course dinner buffet, live counters & dessert spread',
        estimatedCost: catering,
        actualCost: 0,
        paymentStatus: 'unpaid',
        notes: 'Welcome drinks, live appetizers, full-course dinner & hot dessert station',
      },
      {
        id: 'f-3',
        category: 'Stage Decor & Floral Arrangements',
        name: 'Fresh floral stage decoration, entrance arch & ambient fairy lights',
        estimatedCost: decor,
        actualCost: 0,
        paymentStatus: 'unpaid',
      },
      {
        id: 'f-4',
        category: 'Photography & Cinematography',
        name: 'Professional candid photography & highlight film',
        estimatedCost: photo,
        actualCost: 0,
        paymentStatus: 'unpaid',
      },
      {
        id: 'f-5',
        category: 'Makeover & Styling',
        name: 'Hair styling & guest styling coordination',
        estimatedCost: styling,
        actualCost: 0,
        paymentStatus: 'unpaid',
      },
      {
        id: 'f-6',
        category: 'Music & Sound',
        name: 'Sound system, festive background music & lighting',
        estimatedCost: music,
        actualCost: 0,
        paymentStatus: 'unpaid',
      },
      {
        id: 'f-7',
        category: 'Reserve & Emergency Buffer',
        name: 'Contingency reserve for extra guest plates and last-minute needs',
        estimatedCost: Math.max(0, buffer),
        actualCost: 0,
        paymentStatus: 'unpaid',
      },
    ];
  }

  const isWedding = functionType === 'wedding' || functionType === undefined;
  
  return [
    {
      id: 'f-1',
      category: 'Venue & Banquet Hall',
      name: isWedding ? 'Wedding resort & reception hall reservation' : 'Banquet hall & lawn booking',
      estimatedCost: Math.round(budget * 0.28),
      actualCost: 0,
      paymentStatus: 'unpaid',
      notes: 'Includes grand stage, banquet tables and dressing suites',
    },
    {
      id: 'f-2',
      category: 'Stage Decor & Floral Arrangements',
      name: 'Fresh floral stage decoration, entrance arch & photobooth backdrop',
      estimatedCost: Math.round(budget * 0.16),
      actualCost: 0,
      paymentStatus: 'unpaid',
      notes: 'Stage backdrop flowers, pathway floral pedestals and welcome easel',
    },
    {
      id: 'f-3',
      category: 'Catering & Dining',
      name: 'Grand multi-course dinner buffet, live counters & dessert spread',
      estimatedCost: Math.round(budget * 0.32),
      actualCost: 0,
      paymentStatus: 'unpaid',
      notes: 'Welcome drinks, live appetizers, full-course dinner & hot dessert station',
    },
    {
      id: 'f-4',
      category: 'Photography & Cinematography',
      name: 'Professional candid photography, cinematic drone film & teaser',
      estimatedCost: Math.round(budget * 0.10),
      actualCost: 0,
      paymentStatus: 'unpaid',
    },
    {
      id: 'f-5',
      category: 'Makeover & Styling',
      name: 'Hair styling, groom/bridal makeover & dressing coordination',
      estimatedCost: Math.round(budget * 0.05),
      actualCost: 0,
      paymentStatus: 'unpaid',
    },
    {
      id: 'f-6',
      category: 'Music, DJ & Sound',
      name: 'Professional DJ sound system, acoustic lighting & musical procession',
      estimatedCost: Math.round(budget * 0.04),
      actualCost: 0,
      paymentStatus: 'unpaid',
    },
    {
      id: 'f-7',
      category: 'Reserve & Emergency Buffer',
      name: 'Contingency reserve for extra guest plates and last-minute needs',
      estimatedCost: Math.round(budget * 0.05),
      actualCost: 0,
      paymentStatus: 'unpaid',
    },
  ];
}

export function parseTimeString(timeStr?: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 18, minutes: 30 }; // default 6:30 PM
  const s = timeStr.trim().toLowerCase();

  if (s.includes('am') || s.includes('pm')) {
    const isPm = s.includes('pm');
    const clean = s.replace(/am|pm/g, '').trim();
    const parts = clean.split(':');
    let h = parseInt(parts[0] || '18', 10);
    const m = parseInt(parts[1] || '30', 10);
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return { hours: h, minutes: m };
  }

  const parts = s.split(':');
  const h = parseInt(parts[0] || '18', 10);
  const m = parseInt(parts[1] || '30', 10);
  return { hours: isNaN(h) ? 18 : h, minutes: isNaN(m) ? 30 : m };
}

export function formatTime12h(hours: number, minutes: number): string {
  const normHours = ((hours % 24) + 24) % 24;
  const period = normHours >= 12 ? 'PM' : 'AM';
  const h12 = normHours % 12 === 0 ? 12 : normHours % 12;
  const mStr = String(minutes).padStart(2, '0');
  const hStr = String(h12).padStart(2, '0');
  return `${hStr}:${mStr} ${period}`;
}

export function offsetTime(timeStr: string | undefined, offsetMinutes: number): string {
  const { hours, minutes } = parseTimeString(timeStr);
  const totalMin = hours * 60 + minutes + offsetMinutes;
  const newH = Math.floor(totalMin / 60);
  const newM = ((totalMin % 60) + 60) % 60;
  return formatTime12h(newH, newM);
}

export function generateInitialTimeline(
  category: EventCategory, 
  functionType: FunctionType | undefined, 
  eventDate: string,
  commencementTime?: string
): TimelineTask[] {
  const isBirthday = category === 'birthday';
  const cTime = commencementTime || '18:30';

  if (isBirthday) {
    return [
      {
        id: 't-1',
        phase: '1_to_2_months',
        phaseLabel: '3 to 4 Weeks Before (Concept & Venue)',
        name: 'Finalize birthday party theme, guest list and venue arrangements',
        priority: 'P1',
        completed: false,
        recommendedDate: addDays(eventDate, -25),
        timeSlot: '10:00 AM',
      },
      {
        id: 't-2',
        phase: '2_to_4_weeks',
        phaseLabel: '2 Weeks Before (Vendor Confirmations)',
        name: 'Order custom cake, finalize snack menu and send digital invitation cards',
        priority: 'P1',
        completed: false,
        recommendedDate: addDays(eventDate, -14),
        timeSlot: '02:00 PM',
      },
      {
        id: 't-3',
        phase: '1_to_2_weeks',
        phaseLabel: '1 Week Before (Decor & Photography)',
        name: 'Confirm balloon styling arch, music playlist and candid photographer',
        priority: 'P2',
        completed: false,
        recommendedDate: addDays(eventDate, -7),
        timeSlot: '11:30 AM',
      },
      {
        id: 't-4',
        phase: 'day_of',
        phaseLabel: 'Celebration Day (Setup)',
        name: 'Venue setup, cake delivery inspection and decoration check',
        priority: 'P1',
        completed: false,
        recommendedDate: eventDate,
        timeSlot: offsetTime(cTime, -120), // 2 hours before commencement
      },
      {
        id: 't-5',
        phase: 'day_of',
        phaseLabel: 'Celebration Day (Commencement)',
        name: 'Guest arrival commencement, welcome refreshments & photo booth',
        priority: 'P1',
        completed: false,
        recommendedDate: eventDate,
        timeSlot: offsetTime(cTime, 0), // exact commencement time
      },
      {
        id: 't-6',
        phase: 'day_of',
        phaseLabel: 'Celebration Day (Cake & Dinner)',
        name: 'Cake cutting ceremony, party activities & buffet dining',
        priority: 'P1',
        completed: false,
        recommendedDate: eventDate,
        timeSlot: offsetTime(cTime, 60), // 1 hour after commencement
      },
    ];
  }

  // Weddings & Grand Galas
  return [
    {
      id: 't-1',
      phase: '3_to_6_months',
      phaseLabel: '1 to 2 Months Before (Venue & Core Vendors)',
      name: 'Confirm venue arrangement, advance catering and master photography',
      priority: 'P1',
      completed: false,
      recommendedDate: addDays(eventDate, -45),
      timeSlot: '10:00 AM',
    },
    {
      id: 't-2',
      phase: '1_to_2_months',
      phaseLabel: '3 to 4 Weeks Before (Decor & Wardrobe)',
      name: 'Finalize stage floral layout, guest invitations and attire fitting',
      priority: 'P1',
      completed: false,
      recommendedDate: addDays(eventDate, -25),
      timeSlot: '02:30 PM',
    },
    {
      id: 't-3',
      phase: '1_to_2_weeks',
      phaseLabel: '1 Week Before (Final Rehearsals)',
      name: 'Conduct sound check, reconfirm guest rooms and review run-of-show with emcee',
      priority: 'P2',
      completed: false,
      recommendedDate: addDays(eventDate, -7),
      timeSlot: '04:00 PM',
    },
    {
      id: 't-4',
      phase: 'day_of',
      phaseLabel: 'Event Day (Pre-Commencement)',
      name: 'Stage inspection, sound balance, styling & floral placement',
      priority: 'P1',
      completed: false,
      recommendedDate: eventDate,
      timeSlot: offsetTime(cTime, -120), // 2 hours before commencement
    },
    {
      id: 't-5',
      phase: 'day_of',
      phaseLabel: 'Event Day (Commencement & Reception)',
      name: 'Grand commencement, guest welcome drinks & initial reception',
      priority: 'P1',
      completed: false,
      recommendedDate: eventDate,
      timeSlot: offsetTime(cTime, 0), // exact commencement time
    },
    {
      id: 't-6',
      phase: 'day_of',
      phaseLabel: 'Event Day (Ceremony & Banquet)',
      name: 'Main ceremony, couple honors, grand banquet dining buffet & music',
      priority: 'P1',
      completed: false,
      recommendedDate: eventDate,
      timeSlot: offsetTime(cTime, 75), // 1h 15m after commencement
    },
  ];
}

export function generateInitialChecklist(
  category: EventCategory, 
  functionType: FunctionType | undefined
): ChecklistItem[] {
  const isBirthday = category === 'birthday';

  // IMPORTANT: All checklist items start UNCHECKED (completed: false)
  return [
    // Venue & Stage Setup
    { id: 'c-1', category: 'Venue & Stage Setup', title: 'Confirm space setup hours and sound arrangements', completed: false },
    { id: 'c-2', category: 'Venue & Stage Setup', title: 'Arrange guest seating and welcome reception area', completed: false },
    { id: 'c-3', category: 'Venue & Stage Setup', title: 'Verify power points and lighting setup', completed: false },

    // Guests & Invitations
    { id: 'c-4', category: 'Guests & Invitations', title: 'Compile complete family and friend contact directory', completed: false },
    { id: 'c-5', category: 'Guests & Invitations', title: 'Send digital invitation cards with location map pin', completed: false },
    { id: 'c-6', category: 'Guests & Invitations', title: 'Confirm attendance and special dietary requirements', completed: false },

    // Catering & Dining
    { id: 'c-7', category: 'Catering & Dining', title: isBirthday ? 'Confirm custom celebration cake with candles and sparklers' : 'Arrange welcome beverages, mocktails and fresh fruit juice counter', completed: false },
    { id: 'c-8', category: 'Catering & Dining', title: 'Finalize live snack counters and dessert menu', completed: false },
    { id: 'c-9', category: 'Catering & Dining', title: 'Label special dietary items (vegetarian, Jain, vegan)', completed: false },

    // Decor & Ceremony
    { id: 'c-10', category: 'Decor & Ceremony', title: 'Inspect photo backdrop, party lighting and decorations', completed: false },
    { id: 'c-11', category: 'Decor & Ceremony', title: 'Ensure party balloons/garlands arrive on schedule', completed: false },
    { id: 'c-12', category: 'Decor & Ceremony', title: 'Organize celebration accessories and cake table items', completed: false },

    // Entertainment & Music
    { id: 'c-13', category: 'Entertainment & Music', title: 'Setup sound system and test speakers', completed: false },
    { id: 'c-14', category: 'Entertainment & Music', title: 'Review curated celebration playlist and party games', completed: false },

    // Gifts & Essentials
    { id: 'c-15', category: 'Gifts & Essentials', title: 'Prepare gift envelopes and guest greeting cards', completed: false },
    { id: 'c-16', category: 'Gifts & Essentials', title: 'Arrange return gift hampers at the exit counter', completed: false },
    { id: 'c-17', category: 'Gifts & Essentials', title: 'Keep first-aid kit, scissors, tape and phone chargers handy', completed: false },
  ];
}

export function generateInitialVendors(
  category: EventCategory, 
  functionType: FunctionType | undefined,
  totalBudget?: number,
  venue?: string
): Vendor[] {
  const isBirthday = category === 'birthday';
  const budget = totalBudget && totalBudget > 0 ? totalBudget : (isBirthday ? 50000 : 500000);
  const atHome = isHomeVenue(venue);

  if (isBirthday) {
    if (atHome) {
      // Home party vendors
      const cakeCost = Math.round(budget * 0.18);
      const decorCost = Math.round(budget * 0.20);
      const cateringCost = Math.round(budget * 0.45);
      const photoCost = Math.round(budget * 0.12);

      return [
        {
          id: 'v-1',
          name: 'The Royal Artisanal Bakery',
          category: 'Catering & Bakery',
          contactInfo: 'orders@royalbakery.in | +91 98201 23456',
          quotedPrice: cakeCost,
          advancePayment: Math.round(cakeCost * 0.4),
          remainingPayment: cakeCost - Math.round(cakeCost * 0.4),
          status: 'In Discussion',
          notes: 'Celebration cake with custom toppers, sparklers & cupcakes',
        },
        {
          id: 'v-2',
          name: 'Grand Bloom Home Party Decorators',
          category: 'Decoration',
          contactInfo: 'decor@grandbloom.in | +91 98450 88990',
          quotedPrice: decorCost,
          advancePayment: Math.round(decorCost * 0.3),
          remainingPayment: decorCost - Math.round(decorCost * 0.3),
          status: 'Quotation Received',
          notes: 'Home balloon arch, fairy lights & customized party wall backdrop',
        },
        {
          id: 'v-3',
          name: 'Gourmet Feast Home Party Catering',
          category: 'Catering',
          contactInfo: 'catering@gourmetfeast.in | +91 97111 22334',
          quotedPrice: cateringCost,
          advancePayment: Math.round(cateringCost * 0.4),
          remainingPayment: cateringCost - Math.round(cateringCost * 0.4),
          status: 'In Discussion',
          notes: 'Fresh appetizers, finger food buffet, mocktails & desserts',
        },
        {
          id: 'v-4',
          name: 'Focus Memories Photography',
          category: 'Photography',
          contactInfo: 'hello@focusmemories.in | +91 99100 44556',
          quotedPrice: photoCost,
          advancePayment: Math.round(photoCost * 0.35),
          remainingPayment: photoCost - Math.round(photoCost * 0.35),
          status: 'Quotation Received',
          notes: 'Candid event photos, family portraits & edited high-res digital album',
        },
      ];
    }

    // Commercial hall party vendors
    const cakeCost = Math.round(budget * 0.12);
    const decorCost = Math.round(budget * 0.18);
    const photoCost = Math.round(budget * 0.15);
    const cateringCost = Math.round(budget * 0.35);

    return [
      {
        id: 'v-1',
        name: 'The Royal Artisanal Bakery',
        category: 'Catering & Bakery',
        contactInfo: 'orders@royalbakery.in | +91 98201 23456',
        quotedPrice: cakeCost,
        advancePayment: Math.round(cakeCost * 0.4),
        remainingPayment: cakeCost - Math.round(cakeCost * 0.4),
        status: 'In Discussion',
        notes: 'Celebration cake with custom toppers, sparklers & dessert pastries',
      },
      {
        id: 'v-2',
        name: 'Grand Bloom Event Decorators',
        category: 'Decoration',
        contactInfo: 'decor@grandbloom.in | +91 98450 88990',
        quotedPrice: decorCost,
        advancePayment: Math.round(decorCost * 0.3),
        remainingPayment: decorCost - Math.round(decorCost * 0.3),
        status: 'Quotation Received',
        notes: 'Pastel balloon arch, LED custom neon sign & photo booth backdrop',
      },
      {
        id: 'v-3',
        name: 'Focus Memories Photography',
        category: 'Photography',
        contactInfo: 'hello@focusmemories.in | +91 99100 44556',
        quotedPrice: photoCost,
        advancePayment: Math.round(photoCost * 0.35),
        remainingPayment: photoCost - Math.round(photoCost * 0.35),
        status: 'Quotation Received',
        notes: 'Candid event coverage, family portraits & edited high-res digital album',
      },
      {
        id: 'v-4',
        name: 'Gourmet Feast Live Catering',
        category: 'Catering',
        contactInfo: 'catering@gourmetfeast.in | +91 97111 22334',
        quotedPrice: cateringCost,
        advancePayment: Math.round(cateringCost * 0.4),
        remainingPayment: cateringCost - Math.round(cateringCost * 0.4),
        status: 'In Discussion',
        notes: 'Live appetizer stalls, finger food buffet & mocktails counter',
      },
    ];
  }

  // Weddings & Galas (scales realistically to budget)
  if (atHome) {
    const cateringCost = Math.round(budget * 0.40);
    const decorCost = Math.round(budget * 0.25);
    const photoCost = Math.round(budget * 0.15);

    return [
      {
        id: 'v-1',
        name: 'Imperial Royal Feast Caterers',
        category: 'Catering & Dining',
        contactInfo: 'info@imperialfeast.in | +91 94140 77889',
        quotedPrice: cateringCost,
        advancePayment: Math.round(cateringCost * 0.35),
        remainingPayment: cateringCost - Math.round(cateringCost * 0.35),
        status: 'Quotation Received',
        notes: 'Home banquet multi-course dinner buffet & dessert station',
      },
      {
        id: 'v-2',
        name: 'Elegance Stage & Floral Decor',
        category: 'Decoration',
        contactInfo: 'decor@elegancestage.in | +91 98765 12345',
        quotedPrice: decorCost,
        advancePayment: Math.round(decorCost * 0.3),
        remainingPayment: decorCost - Math.round(decorCost * 0.3),
        status: 'In Discussion',
        notes: 'Residence floral decoration, pathway lighting and welcome easel',
      },
      {
        id: 'v-3',
        name: 'Cinematic Moments Studio',
        category: 'Photography & Drone',
        contactInfo: 'studio@cinematicmoments.in | +91 98199 44332',
        quotedPrice: photoCost,
        advancePayment: Math.round(photoCost * 0.3),
        remainingPayment: photoCost - Math.round(photoCost * 0.3),
        status: 'Quotation Received',
        notes: 'Ceremony photography & highlight film',
      },
    ];
  }

  const venueCost = Math.round(budget * 0.28);
  const cateringCost = Math.round(budget * 0.32);
  const photoCost = Math.round(budget * 0.12);
  const decorCost = Math.round(budget * 0.15);

  return [
    {
      id: 'v-1',
      name: 'Grand Heritage Palace & Lawns',
      category: 'Venue & Banquet',
      contactInfo: 'reservations@grandheritage.in | +91 98220 11223',
      quotedPrice: venueCost,
      advancePayment: Math.round(venueCost * 0.4),
      remainingPayment: venueCost - Math.round(venueCost * 0.4),
      status: 'In Discussion',
      notes: 'Banquet hall & lawn reservation, dedicated dressing suites & power backup',
    },
    {
      id: 'v-2',
      name: 'Imperial Royal Feast Caterers',
      category: 'Catering & Dining',
      contactInfo: 'info@imperialfeast.in | +91 94140 77889',
      quotedPrice: cateringCost,
      advancePayment: Math.round(cateringCost * 0.35),
      remainingPayment: cateringCost - Math.round(cateringCost * 0.35),
      status: 'Quotation Received',
      notes: 'Multi-course dinner buffet, live appetizer counters & hot dessert spread',
    },
    {
      id: 'v-3',
      name: 'Cinematic Moments Studio',
      category: 'Photography & Drone',
      contactInfo: 'studio@cinematicmoments.in | +91 98199 44332',
      quotedPrice: photoCost,
      advancePayment: Math.round(photoCost * 0.3),
      remainingPayment: photoCost - Math.round(photoCost * 0.3),
      status: 'Quotation Received',
      notes: 'Full ceremony cinematography, aerial drone clips & premium photo book',
    },
    {
      id: 'v-4',
      name: 'Elegance Stage & Floral Decor',
      category: 'Decoration',
      contactInfo: 'decor@elegancestage.in | +91 98765 12345',
      quotedPrice: decorCost,
      advancePayment: Math.round(decorCost * 0.3),
      remainingPayment: decorCost - Math.round(decorCost * 0.3),
      status: 'In Discussion',
      notes: 'Stage backdrop flowers, walkway floral pedestals and welcome easel',
    },
  ];
}
