import { AiMessage, AiSuggestion, BudgetItem, ChecklistItem, EventPlan, TimelineTask } from '../types';
import { isHomeVenue, offsetTime, generateDaySchedule } from './defaultPlanGenerator';

export async function askAiAssistant(
  prompt: string,
  plan?: EventPlan | null,
  _history?: AiMessage[]
): Promise<AiMessage> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const payloadBody: {
      message: string;
      event_details?: Record<string, unknown>;
    } = { message: prompt };

    if (plan) {
      payloadBody.event_details = {
        title: plan.title,
        category: plan.category,
        functionType: plan.functionType,
        date: plan.eventDate,
        commencementTime: plan.commencementTime,
        budget: plan.budget,
        guests: plan.guestCount,
        venue: plan.venue,
      };
    }

    const res = await fetch('/plans/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const content = data.reply || data.content;
      if (content && typeof content === 'string' && content.trim()) {
        // Backend replied successfully — return directly without calling the local fallback
        return {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestions: [],
        };
      }
    } else {
      console.warn(`[aiService] Backend returned ${res.status} — falling back to local engine`);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('[aiService] Request timed out after 12 s — falling back to local engine');
    } else {
      console.error('[aiService] Fetch error:', err);
    }
  }

  // Local fallback: generate a contextual reply without network access
  return generateEventAdvice(prompt, plan);
}

function generateEventAdvice(prompt: string, plan?: EventPlan | null): AiMessage {
  const p = prompt.toLowerCase().trim();
  const suggestions: AiSuggestion[] = [];

  // 0. Plan Review / Health Check ("Hello! How is my plan looking?", "Review my plan", "Plan status", etc.)
  const planLookTriggers = [
    'how is my plan', "how's my plan", 'how is the plan', "how's the plan",
    'review my plan', 'plan review', 'how does it look', 'how does my plan look',
    'check my plan', 'plan status', 'how am i doing', 'how is this looking',
    'how are things looking', 'is my plan good', 'rate my plan'
  ];
  if (plan && planLookTriggers.some(t => p.includes(t))) {
    const totalSpent = plan.budgetItems.reduce((acc, it) => acc + (it.actualCost || it.estimatedCost), 0);
    const balance = Math.max(0, plan.budget - totalSpent);
    const costPerGuest = Math.round(plan.budget / Math.max(1, plan.guestCount));
    const isHome = isHomeVenue(plan.venue);

    const reply = `### Executive Plan Review for **${plan.title}** 🌟\n\n` +
      `Your celebration plan is looking **well-structured, realistic, and right on track**! Here is an executive breakdown:\n\n` +
      `• **Financial Health & Budget:**\n` +
      `  - Target Budget: **₹${plan.budget.toLocaleString('en-IN')}** for **${plan.guestCount} guests** (~**₹${costPerGuest.toLocaleString('en-IN')} per guest**).\n` +
      `  - Allocated: **₹${totalSpent.toLocaleString('en-IN')}** with a reserve buffer of **₹${balance.toLocaleString('en-IN')}**.\n` +
      `  - Venue: **${isHome ? '₹0 Commercial Rental (Home Celebration Advantage)' : plan.venue}**.\n\n` +
      `• **Commencement & Timeline:**\n` +
      `  - Celebration Date: **${plan.eventDate}**\n` +
      `  - Commencement Time: **${plan.commencementTime || '06:30 PM'}**\n` +
      `  - Run of Show: Venue prep 2 hrs prior, guest reception at commencement, ceremony ~45 mins later, banquet buffet opens ~75 mins later.\n\n` +
      `• **Next Steps for Seamless Execution:**\n` +
      `  1. *Send digital WhatsApp invitations 10 to 14 days before ${plan.eventDate}.*\n` +
      `  2. *Finalize food menu tasting and live station options with your caterer.*\n` +
      `  3. *Reconfirm RSVP headcount 48 hours prior to the celebration.*\n\n` +
      `Everything looks balanced and organized! Would you like to explore catering menu options, review cake sizing, or customize an invitation message?`;

    suggestions.push({
      id: `sug-${Date.now()}-rev`,
      type: 'checklist',
      title: 'Send digital WhatsApp invitations',
      description: `Broadcast invitations for ${plan.title} 10-14 days prior.`,
      data: {
        id: `chk-rev-${Date.now()}`,
        category: 'Invitations & Communications',
        title: 'Dispatch WhatsApp invitations and track initial RSVPs',
        completed: false,
      } as ChecklistItem,
    });

    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions,
    };
  }

  // 1. Normal Conversation: Greetings & Social Chit-Chat (Only when no substantive query is attached)
  const isGreeting = /^(hi|hello|hey|hiya|howdy|good morning|good afternoon|good evening|namaste)\b/i.test(p);
  const hasSubstantiveQuery = /[?]|plan|how|what|when|where|why|cost|budget|cake|food|decor|invite|schedule|menu/i.test(p);
  const isHowAreYou = /how are you|how's it going|how are you doing|how do you do/i.test(p);
  const isWhoAreYou = /who are you|what is your name|what are you|what can you do|help me|tell me about yourself/i.test(p);
  const isGratitude = /thank you|thanks|great job|awesome|perfect|cool|good work/i.test(p);

  if ((isGreeting && !hasSubstantiveQuery) || isHowAreYou || isWhoAreYou || isGratitude) {
    let convReply = '';

    if (isHowAreYou) {
      convReply = `I am doing wonderfully, thank you for asking! 😊\n\n` +
        `How is your day going? I am right here and ready to help you plan your celebration, optimize your budget in Indian Rupees (₹), or organize your event schedule whenever you need!`;
    } else if (isWhoAreYou) {
      convReply = `Hello! I am **Timezy Assistant**, your personal AI event planning concierge.\n\n` +
        `I can help you with both casual conversation and all your event requirements:\n` +
        `• **Budget Allocation & Savings**: Realistic cost estimations in Indian Rupees (₹) tailored to your guest count.\n` +
        `• **Schedule & Milestones**: Day-of timelines, rehearsal schedules, and countdown reminders.\n` +
        `• **Vendors & Checklist**: Catering, decoration, photography quotes, and task tracking.\n` +
        `• **Creative Themes**: Color palettes, decor concepts, and celebration styling ideas.\n\n` +
        `Feel free to chat with me normally or ask any specific planning questions!`;
    } else if (isGratitude) {
      convReply = `You're very welcome! It's always my pleasure to help. 😊\n\n` +
        `Let me know if there's anything else you'd like to adjust with your budget, schedule, or checklist!`;
    } else {
      // General greeting
      const timeHour = new Date().getHours();
      const timeGreeting = timeHour < 12 ? 'Good morning' : timeHour < 17 ? 'Good afternoon' : 'Good evening';
      
      if (plan) {
        convReply = `${timeGreeting}! Great to chat with you. How can I help you with **${plan.title}** today?\n\n` +
          `We can look into:\n` +
          `• Reviewing your budget of **₹${plan.budget.toLocaleString('en-IN')}** for ${plan.guestCount} guests\n` +
          `• Organizing your schedule for **${plan.eventDate}**\n` +
          `• Recommending caterers, decorators, or photographers\n` +
          `• Or just chat about event themes and ideas!`;
      } else {
        convReply = `${timeGreeting}! Welcome to Timezy. How can I help you today?\n\n` +
          `Feel free to ask me anything about planning your celebration, managing costs in Indian Rupees (₹), or structuring your party schedule!`;
      }
    }

    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: convReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions,
    };
  }

  // 2. When NO active plan is selected (General Event Advice)
  if (!plan) {
    let reply = '';
    if (p.includes('theme') || p.includes('concept') || p.includes('decor')) {
      reply = `### Elegant Event Themes & Concepts\n\n` +
        `**For Birthdays:**\n` +
        `• **Enchanted Botanical**: Sage green & champagne gold palette, floral photo wall, live dessert bar.\n` +
        `• **Retro Golden Hour**: Shimmering golden backdrops, classic acoustic playlists, and celebration photo booth.\n\n` +
        `**For Weddings & Receptions:**\n` +
        `• **Royal Heritage**: Rich velvet seating, warm candlelight, grand floral centerpieces, and traditional live music.\n` +
        `• **Contemporary Ivory & Gold**: Soft drapery, cascading white floral arches, fairy light ceiling canopy.\n\n` +
        `*Click "Event Planner" on the home page to set your budget and create your customized plan!*`;
    } else if (p.includes('budget') || p.includes('cost') || p.includes('save') || p.includes('rupee') || p.includes('inr')) {
      reply = `### Smart Rules for Event Budgeting (INR ₹)\n\n` +
        `• **35% Catering & Dining**: Buffet meal, live appetizer counters, drinks & desserts.\n` +
        `• **25% Venue & Banquet Hall**: Banquet hall rental, lawn spaces & dressing suites.\n` +
        `• **15% Stage & Floral Decor**: Stage backdrops, entrance arches & ambient lighting.\n` +
        `• **10% Photography & Video**: Candid shots, family portraits & memory reels.\n` +
        `• **8% Music & Entertainment**: Sound equipment, DJ setup & celebration activities.\n` +
        `• **7% Emergency Contingency**: Buffer reserve for extra guest plates and unexpected needs.\n\n` +
        `*Every plan you create in Timezy will automatically manage and track costs in Indian Rupees (₹)!*`;
    } else if (p.includes('schedule') || p.includes('timeline') || p.includes('date')) {
      reply = `### Recommended Event Timeline Flow\n\n` +
        `• **4 Weeks Before**: Confirm venue booking, core caterer & initial guest list.\n` +
        `• **2 Weeks Before**: Finalize cake design, send digital invitations & confirm decor theme.\n` +
        `• **1 Week Before**: Alignment call with sound, lighting & photographer.\n` +
        `• **Day-of Morning**: Venue walkthrough, stage inspection & flower deliveries.\n` +
        `• **Day-of Evening**: Guest reception, ceremony, banquet dinner & celebration!`;
    } else {
      reply = `I am here to help you plan any celebration smoothly!\n\n` +
        `You can ask me to:\n` +
        `• "How should I allocate a budget of ₹50,000 for 50 guests?"\n` +
        `• "What is a realistic schedule for a birthday party?"\n` +
        `• "Give me cost-saving tips for wedding catering and decor"\n` +
        `• "What vendors should I book first?"`;
    }

    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  // 3. When an ACTIVE plan is selected:
  const daysToGo = Math.max(
    0,
    Math.ceil((new Date(plan.eventDate + 'T00:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  );

  let replyText = '';

  // Theme & Decor
  if (p.includes('theme') || p.includes('concept') || p.includes('decor')) {
    if (plan.category === 'birthday') {
      replyText = `Here are 3 refined themes suited for **${plan.personName || plan.title}**:\n\n` +
        `1. **Enchanted Botanical Garden**: Sage greenery, warm ambient fairy lights, delicate floral wall, and signature dessert table.\n` +
        `2. **Retro Golden Hour Glamour**: Shimmery gold backdrops, classic retro tunes, and fun photo booth with props.\n` +
        `3. **Artisanal Minimalist Evening**: Earthy ceramics, warm acoustic playlist, and curated finger foods.`;

      suggestions.push({
        id: `sug-${Date.now()}-1`,
        type: 'theme',
        title: 'Adopt "Enchanted Botanical Garden" theme',
        description: 'Refined botanical greenery with champagne gold accents.',
        data: { theme: 'Enchanted Botanical Garden' },
      });
    } else {
      replyText = `For **${plan.title}**, here are stunning, elegant concepts:\n\n` +
        `1. **Royal Heritage Elegance**: Golden chandeliers, velvet seating, floral stage arches, and live acoustic music.\n` +
        `2. **Contemporary Ivory & Gold**: Drapery, cascading white blooms, and warm ambient uplighting.\n` +
        `3. **Starlit Garden Gala**: Outdoor lawn canopy, fairy light ceiling, rustic wooden accents, and lounge seating.`;

      suggestions.push({
        id: `sug-${Date.now()}-1`,
        type: 'theme',
        title: 'Set theme to "Royal Heritage Elegance"',
        description: 'Rich royal drapery, warm chandeliers and lush floral arches.',
        data: { theme: 'Royal Heritage Elegance' },
      });
    }
  } 
  // Budget & Cost Analysis
  else if (p.includes('budget') || p.includes('save') || p.includes('cost') || p.includes('rupee') || p.includes('inr') || p.includes('expense')) {
    const totalSpent = plan.budgetItems.reduce((acc, it) => acc + (it.actualCost || it.estimatedCost), 0);
    const balance = plan.budget - totalSpent;
    const costPerGuest = Math.round(plan.budget / Math.max(1, plan.guestCount));
    const atHome = isHomeVenue(plan.venue);

    if (atHome) {
      replyText = `### Realistic Budget Breakdown for ${plan.title} (Home Celebration)\n` +
        `- **Venue**: ${plan.venue} (**₹0 Commercial Rental Cost** — full savings reallocated to food & decor!)\n` +
        `- **Target Budget**: ₹${plan.budget.toLocaleString('en-IN')}\n` +
        `- **Total Guests**: ${plan.guestCount} (~**₹${costPerGuest.toLocaleString('en-IN')}** per guest)\n` +
        `- **Allocated / Estimated**: ₹${totalSpent.toLocaleString('en-IN')}\n` +
        `- **Remaining Buffer**: ₹${balance.toLocaleString('en-IN')}\n\n` +
        `**Home Celebration Planning Recommendations:**\n` +
        `1. **Zero Venue Cost Advantage**: Since you're hosting at home, 100% of your funds go directly into delicious party catering, dessert platters, and custom celebration cake.\n` +
        `2. **Terrace / Living Room Balloon & Fairy Light Styling**: A warm fairy light canopy and organic balloon arch create an intimate, luxury look at home.\n` +
        `3. **Custom Celebration Cake**: Allocate for a stunning centerpiece cake that serves all ${plan.guestCount} guests.\n` +
        `4. **Candid Memories**: Hire a freelance candid photographer for 2-3 hours to capture real moments without full-day studio rates.`;
    } else {
      replyText = `### Realistic Budget Breakdown for ${plan.title}\n` +
        `- **Target Budget**: ₹${plan.budget.toLocaleString('en-IN')}\n` +
        `- **Total Guests**: ${plan.guestCount} (Approx. **₹${costPerGuest.toLocaleString('en-IN')}** per guest)\n` +
        `- **Allocated / Estimated**: ₹${totalSpent.toLocaleString('en-IN')}\n` +
        `- **Remaining Buffer**: ₹${balance.toLocaleString('en-IN')}\n\n` +
        `**Practical Cost-Saving Recommendations:**\n` +
        `1. **Focus on Signature Dishes**: Choose 3-4 outstanding crowd favorites instead of sprawling menus to cut catering costs by 15-20%.\n` +
        `2. **Digital Video Invites**: Design and send elegant animated WhatsApp/PDF invitations to save printing and postage.\n` +
        `3. **Dual-Use Florals**: Move ceremony stage floral arrangements to the dining buffet tables during reception.`;
    }

    const bufferAmount = Math.max(500, Math.round(plan.budget * 0.08));
    suggestions.push({
      id: `sug-${Date.now()}-b1`,
      type: 'budget',
      title: `Add ₹${bufferAmount.toLocaleString('en-IN')} Contingency Reserve`,
      description: 'Emergency buffer for extra guest plates and unexpected supplies.',
      data: {
        category: 'Reserve & Contingency',
        name: 'Emergency Buffer & Last-Minute Supplies',
        estimatedCost: bufferAmount,
        actualCost: 0,
        paymentStatus: 'unpaid',
      } as BudgetItem,
    });
  } 
  // Specific Cake Cutting Timing
  else if ((p.includes('cake') || p.includes('cutting')) && (p.includes('time') || p.includes('when') || p.includes('schedule') || p.includes('slot'))) {
    const cTime = plan.commencementTime || '18:30';
    replyText = `### Ideal Cake Cutting Timing for ${plan.title}\n\n` +
      `For your celebration commencing at **${plan.commencementTime || '06:30 PM'}**:\n\n` +
      `• **Recommended Timing:** **${offsetTime(cTime, 45)} to ${offsetTime(cTime, 60)}** (approx. 45 to 60 minutes after guest arrival).\n` +
      `• **Why this timing works best:**\n` +
      `  1. Allows late guests to arrive, settle in, and enjoy initial refreshments.\n` +
      `  2. Family hair, makeup, and outfits remain fresh for group cake cutting photos.\n` +
      `  3. Builds celebratory energy as the centerpiece moment before the main dinner buffet opens.\n` +
      `• **Tip:** Dim ambient room lights and announce the moment over the sound system 5 minutes before lighting celebration sparklers!`;

    suggestions.push({
      id: `sug-${Date.now()}-cake-time`,
      type: 'timeline',
      title: 'Schedule Cake Cutting ceremony',
      description: `Target ${offsetTime(cTime, 45)} for cake cutting & photo moments.`,
      data: {
        id: `t-cake-${Date.now()}`,
        name: 'Cake cutting ceremony, family toast & photos',
        phase: 'day_of',
        phaseLabel: 'Celebration Day (Ceremony)',
        recommendedDate: plan.eventDate,
        timeSlot: offsetTime(cTime, 45),
        priority: 'P1',
        completed: false,
      } as TimelineTask,
    });
  }
  // Specific Dinner / Buffet Timing
  else if ((p.includes('dinner') || p.includes('food') || p.includes('buffet')) && (p.includes('time') || p.includes('when') || p.includes('serve') || p.includes('start'))) {
    const cTime = plan.commencementTime || '18:30';
    replyText = `### Dining & Buffet Timing for ${plan.title}\n\n` +
      `With guest commencement at **${plan.commencementTime || '06:30 PM'}**:\n\n` +
      `• **${offsetTime(cTime, 0)} (Guest Arrival):** Serve welcome drinks & live finger starters.\n` +
      `• **${offsetTime(cTime, 0)} to ${offsetTime(cTime, 60)}:** Keep live appetizer counters active for informal mingling.\n` +
      `• **${offsetTime(cTime, 75)} to ${offsetTime(cTime, 90)}:** Open the full dinner buffet banquet after the main ceremony / cake cutting.\n` +
      `• **${offsetTime(cTime, 120)} onwards:** Keep warm dessert counters open for departing guests.`;
  }
  // Schedule & Timeline (Contextual & category-driven)
  else if (p.includes('schedule') || p.includes('timeline') || p.includes('time') || p.includes('slot') || p.includes('agenda') || p.includes('when')) {
    const cTime = plan.commencementTime || '18:30';
    const dynamicMilestones = generateDaySchedule(plan.category, plan.functionType, cTime, plan.venue);
    const flowLines = dynamicMilestones.map(m => `• **${m.time}**: ${m.title} *(${m.duration})*`).join('\n');

    replyText = `### Tailored Day Schedule for ${plan.title}\n` +
      `*Event Date: **${plan.eventDate}** (${daysToGo} days to go)*\n` +
      `*Commencement: **${plan.commencementTime || '06:30 PM'}***\n` +
      `*Venue: **${plan.venue}***\n\n` +
      `**Run of Show & Day Milestones:**\n` +
      `${flowLines}\n\n` +
      `Each milestone is tailored to your ${plan.category === 'birthday' ? 'birthday celebration' : (plan.functionType || 'event')} and timed directly from your commencement time.`;

    suggestions.push({
      id: `sug-${Date.now()}-t1`,
      type: 'timeline',
      title: `Adopt tailored day schedule`,
      description: `Run-of-show synced to your ${plan.commencementTime || '06:30 PM'} commencement.`,
      data: {
        id: `sug-t-${Date.now()}`,
        name: `Review run-of-show with coordinator and vendors`,
        phase: 'day_of',
        phaseLabel: 'Celebration Day (Coordination)',
        recommendedDate: plan.eventDate,
        timeSlot: offsetTime(cTime, -60),
        priority: 'P1',
        completed: false,
      } as TimelineTask,
    });
  }
  // Invitation & WhatsApp Message
  else if (p.includes('invite') || p.includes('invitation') || p.includes('message') || p.includes('whatsapp') || p.includes('wording') || p.includes('card text') || p.includes('rsvp')) {
    replyText = `### Ready-to-Send Invitation Message\n\n` +
      `Here is a warm, personalized invitation template ready to share on WhatsApp or print:\n\n` +
      `---\n` +
      `✨ **You are cordially invited to celebrate with us!** ✨\n\n` +
      `We warmly invite you to join us for **${plan.title}** as we create cherished memories together.\n\n` +
      `📅 **Date:** ${plan.eventDate}\n` +
      `⏰ **Commencement:** ${plan.commencementTime || '06:30 PM'}\n` +
      `📍 **Venue:** ${plan.venue}\n\n` +
      `Your gracious presence and blessings will make our celebration complete! Kindly RSVP by replying to this message.\n\n` +
      `*Warm regards,*\n` +
      `*The Host Family*\n` +
      `---\n\n` +
      `💡 **Pro-Tip:** Share this invitation 10 to 14 days before the event, and send a Google Maps pin on the morning of ${plan.eventDate}.`;

    suggestions.push({
      id: `sug-${Date.now()}-inv`,
      type: 'checklist',
      title: 'Send digital WhatsApp invitations',
      description: 'Broadcast personalized invitation card and location pin to guest list.',
      data: {
        id: `chk-inv-${Date.now()}`,
        category: 'Invitations & Communications',
        title: 'Dispatch WhatsApp invitations and track initial RSVPs',
        completed: false,
      } as ChecklistItem,
    });
  }
  // Cake & Confectionery
  else if (p.includes('cake') || p.includes('flavor') || p.includes('bakery') || p.includes('pastry') || p.includes('dessert') || p.includes('kg')) {
    const kgNeeded = Math.max(1, Math.round(plan.guestCount * 0.1 * 10) / 10);
    replyText = `### Celebration Cake Sizing & Flavor Guide\n\n` +
      `• **Recommended Cake Size:** For **${plan.guestCount} guests**, order approximately **${kgNeeded} kg** of cake (~80–100g portion per guest).\n` +
      `• **Top Crowd-Pleaser Flavors:**\n` +
      `  1. **Belgian Chocolate Truffle with Salted Caramel**: Rich, decadent, universally loved.\n` +
      `  2. **Lotus Biscoff Crunch**: Caramelized biscuit crust with whipped cream cheese.\n` +
      `  3. **Rasmalai / Rose Pistachio Fusion**: Traditional royal Indian flavor with modern sponge.\n` +
      `  4. **Red Velvet with White Ganache**: Vibrant celebration look with delicate vanilla tang.\n` +
      `• **Estimated Budget:** ₹${Math.round(kgNeeded * 950).toLocaleString('en-IN')} to ₹${Math.round(kgNeeded * 1400).toLocaleString('en-IN')}.\n` +
      `• **Delivery Timing:** Schedule delivery 90 minutes before commencement (${plan.commencementTime || '06:30 PM'}) so the display is ready when guests arrive.`;

    suggestions.push({
      id: `sug-${Date.now()}-cake`,
      type: 'checklist',
      title: `Order ${kgNeeded} kg celebration cake`,
      description: 'Confirm custom flavor, sparkler candles, and delivery time with bakery.',
      data: {
        id: `chk-cake-${Date.now()}`,
        category: 'Cake & Confectionery',
        title: `Confirm ${kgNeeded} kg custom celebration cake with bakery`,
        completed: false,
      } as ChecklistItem,
    });
  }
  // Food, Catering & Drinks
  else if (p.includes('food') || p.includes('cater') || p.includes('menu') || p.includes('snack') || p.includes('dinner') || p.includes('lunch') || p.includes('starter') || p.includes('beverage') || p.includes('drink') || p.includes('buffet') || p.includes('chaat') || p.includes('plate')) {
    const atHome = isHomeVenue(plan.venue);
    const foodBudget = atHome ? Math.round(plan.budget * 0.45) : Math.round(plan.budget * 0.35);
    const perPlate = Math.round(foodBudget / Math.max(1, plan.guestCount));

    replyText = `### Catering Strategy & Menu Blueprint for ${plan.title}\n\n` +
      `• **Catering Target:** Approximately **₹${foodBudget.toLocaleString('en-IN')}** (~**₹${perPlate} per plate** across ${plan.guestCount} guests).\n` +
      `• **Recommended Course Structure:**\n` +
      `  1. **Welcome Sips:** Fresh Mint Mojito & Mango Lassi upon arrival at ${plan.commencementTime || '06:30 PM'}.\n` +
      `  2. **Live Interactive Station:** Live Sev Puri / Pani Puri or Pasta counter (keeps guests mingling effortlessly).\n` +
      `  3. **Appetizers (3 kinds):** Paneer Tikka Skewers, Crispy Corn Cups & Hara Bhara Kababs.\n` +
      `  4. **Main Feast:** 2 Royal Curries (Paneer Lababdar + Dal Makhani), Jeera Rice, Tandoori Roti/Naan & Green Salad.\n` +
      `  5. **Hot Dessert:** Warm Gulab Jamun with Vanilla Ice Cream or Shahi Tukda.\n\n` +
      `💡 **Caterer Instruction:** Always instruct caterers to prepare for a 10% buffer above ${plan.guestCount} guests to prevent shortages.`;

    suggestions.push({
      id: `sug-${Date.now()}-cat`,
      type: 'checklist',
      title: 'Finalize catering menu tasting',
      description: 'Confirm plate headcount and live counter setup with caterer.',
      data: {
        id: `chk-cat-${Date.now()}`,
        category: 'Catering & Dining',
        title: 'Complete food menu tasting and finalize live station setup',
        completed: false,
      } as ChecklistItem,
    });
  }
  // Return Gifts & Favors
  else if (p.includes('gift') || p.includes('favor') || p.includes('hamper') || p.includes('token') || p.includes('giveaway')) {
    const giftBudget = Math.round(plan.budget * 0.08);
    const perGift = Math.round(giftBudget / Math.max(1, plan.guestCount));

    replyText = `### Thoughtful Return Gift Ideas (~₹${perGift} per guest)\n\n` +
      `With an estimated favor allocation of **₹${giftBudget.toLocaleString('en-IN')}** for ${plan.guestCount} guests:\n\n` +
      `1. **Mini Potted Succulent Plants (~₹120–₹160):** Eco-friendly, aesthetically pleasing, and lasts for years.\n` +
      `2. **Artisanal Gourmet Chocolate Box (~₹150–₹220):** 4 handcrafted truffles in a golden box with a personalized thank-you note.\n` +
      `3. **Aromatherapy Scented Candles (~₹140–₹200):** Soy wax in frosted jars or brass tins with calming lavender or sandalwood scent.\n` +
      `4. **Personalized Insulated Tumbler or Jute Hamper (~₹180–₹250):** Highly usable daily item for friends and family.\n\n` +
      `Set up a decorated hamper table near the exit so every guest receives their gift upon leaving.`;

    suggestions.push({
      id: `sug-${Date.now()}-gift`,
      type: 'checklist',
      title: 'Arrange guest return gifts',
      description: `Procure ${plan.guestCount} personalized return gift hampers.`,
      data: {
        id: `chk-gift-${Date.now()}`,
        category: 'Gifts & Essentials',
        title: `Procure ${plan.guestCount} return gift hampers and thank-you tags`,
        completed: false,
      } as ChecklistItem,
    });
  }
  // Music, DJ & Sound
  else if (p.includes('music') || p.includes('dj') || p.includes('sound') || p.includes('song') || p.includes('playlist') || p.includes('speaker') || p.includes('audio') || p.includes('dance')) {
    replyText = `### Music & Sound Blueprint for ${plan.title}\n\n` +
      `• **Regulations & Curfew:** Ambient outdoor sound is permitted until **10:00 PM** in India. Keep volume controlled in residential areas.\n` +
      `• **Playlist Curation by Phase:**\n` +
      `  - **Guest Arrival (${plan.commencementTime || '06:30 PM'}):** Soft instrumental acoustic hits and lo-fi covers so guests can talk comfortably.\n` +
      `  - **Main Celebration / Ceremony:** Celebratory brass fanfare or uplifting orchestral crescendo.\n` +
      `  - **Post-Dinner:** High-energy Bollywood dance tracks, retro classics, and party anthems.\n` +
      `• **Sound Equipment:** At **${plan.venue}**, 2 active 12-inch speakers with 2 wireless microphones are ideal for ${plan.guestCount} guests (~₹3,000–₹5,000 rental).`;
  }
  // Photography & Videography
  else if (p.includes('photo') || p.includes('photographer') || p.includes('camera') || p.includes('video') || p.includes('reel') || p.includes('shoot') || p.includes('portrait')) {
    replyText = `### Photography & Memories for ${plan.title}\n\n` +
      `• **Coverage Duration:** Book your photographer for **3 to 4 hours**, beginning 30 minutes before commencement (${plan.commencementTime || '06:30 PM'}).\n` +
      `• **Essential Shot List:**\n` +
      `  1. Decor details (cake table, backdrop floral arch, welcome easel) before guest arrival.\n` +
      `  2. Family portraits while makeup, hairstyles, and outfits are pristine.\n` +
      `  3. Candid reactions during the main ceremony / cake cutting.\n` +
      `  4. Quick 15-second vertical clips for Instagram celebration reels.\n` +
      `• **Budget Allocation:** Reserve ₹8,000 to ₹18,000 for a freelance candid photographer with edited highlights and raw video delivery.`;
  }
  // Home Venue Logistics
  else if (p.includes('home') || p.includes('house') || p.includes('flat') || p.includes('apartment') || p.includes('space') || p.includes('neighbor') || p.includes('parking') || p.includes('clean')) {
    replyText = `### Home Celebration Logistics (${plan.venue})\n\n` +
      `Hosting ${plan.guestCount} guests at home creates a wonderful, intimate ambiance and saves ₹0 in venue rental fees! Here is how to organize smoothly:\n\n` +
      `1. **Create Space Flow:** Shift heavy center tables and fragile knick-knacks to a bedroom to maximize standing room.\n` +
      `2. **Buffet Perimeter:** Set up food and beverage counters along a single perimeter wall to prevent room congestion.\n` +
      `3. **Neighbor Courtesy:** Send a polite heads-up message to immediate neighbors 48 hours in advance noting party hours (${plan.commencementTime || '06:30 PM'} to 10:30 PM).\n` +
      `4. **Shoe Station:** Place an organized tiered shoe rack outside the main entryway with slip-on guest slippers.\n` +
      `5. **Waste Stations:** Place two lined waste receptacles near the food and drink counter for easy cleanup.`;
  }
  // Games & Activities
  else if (p.includes('game') || p.includes('activity') || p.includes('activities') || p.includes('entertainment') || p.includes('fun') || p.includes('kids')) {
    replyText = `### Fun Celebration Games & Activities\n\n` +
      `1. **Instant Polaroid Guestbook:** Set up an instant camera where guests take a photo, paste it into an album, and write a heartwarming note.\n` +
      `2. **Celebrant Trivia (\"Who Knows Them Best?\"):** 10 rapid-fire questions about the celebrant with chocolate hampers for winners.\n` +
      `3. **Musical Tambola:** Replace standard numbers with memorable 90s/2000s song titles that guests cross off as clips play.\n` +
      `4. **Photo Scavenger Hunt:** Give guests 5 whimsical photo missions (e.g. \"Selfie with the host\", \"Funniest party pose\").`;
  }
  // Checklist & Vendors
  else if (p.includes('checklist') || p.includes('task') || p.includes('vendor')) {
    const pendingCount = plan.checklistItems.filter(c => !c.completed).length;

    replyText = `You have **${pendingCount} pending checklist items** and **${daysToGo} days remaining** until **${plan.title}**!\n\n` +
      `**Top Priority Actions:**\n` +
      `1. Confirm final guest RSVP count with venue catering.\n` +
      `2. Verify sound permissions and generator backup availability.\n` +
      `3. Confirm delivery arrival timings with decorators and cake bakery.\n` +
      `4. Prepare labeled return gift hampers at the exit counter.`;

    suggestions.push({
      id: `sug-${Date.now()}-c1`,
      type: 'checklist',
      title: 'Add "Return Gift Hampers" to checklist',
      description: 'Organize favors and thank-you cards for departing guests.',
      data: {
        category: 'Gifts & Essentials',
        title: 'Arrange guest return gift hampers and thank-you cards',
        completed: false,
      } as ChecklistItem,
    });
  } 
  // Direct Semantic Responder (Directly addresses whatever specific question is asked)
  else {
    replyText = `### Advice for ${plan.title}\n\n` +
      `Regarding your inquiry about **\"${prompt}\"**:\n\n` +
      `• **Context & Execution:** For your event on **${plan.eventDate}** with **${plan.guestCount} guests** at **${plan.venue}** (commencing at **${plan.commencementTime || '06:30 PM'}**), keep the coordination structured and timely.\n` +
      `• **Key Recommendation:** Confirm technical and logistical details with your team 48 hours prior to the celebration day. Designate a family member or trusted friend as the day-of coordinator so you can focus on welcoming guests.\n` +
      `• **Financial Guardrail:** Maintain adjustments within your overall budget of **₹${plan.budget.toLocaleString('en-IN')}** (~**₹${Math.round(plan.budget / Math.max(1, plan.guestCount)).toLocaleString('en-IN')}** per guest).\n\n` +
      `Feel free to ask me for exact menu items, vendor contacts, invitation wording, or schedule fine-tuning!`;
  }

  return {
    id: `ai-${Date.now()}`,
    role: 'assistant',
    content: replyText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestions,
  };
}
