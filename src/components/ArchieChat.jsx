// ============================================================
// ArchieChat — Phase 4 AI chat interface
//
// Flag logic:
//   ⚠️ Flagged   = same topic 2+ times in 7 days
//   🚨 Escalated = same topic 3+ times in 7 days OR 5+ times in 30 days
//
// Logging: one entry per unique topic per session (not per message)
// Timestamps: ISO format for accurate time display
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { CONFIG } from '../config';
import {
  fetchOrders,
  fetchNumbers,
  fetchStruggles,
  logStruggle,
  fetchDDData,
} from '../api/sheets';

// ── Helpers ───────────────────────────────────────────────────
function scrubPII(text) {
  return text
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b\d{10,16}\b/g, '[ACCT#]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{1,5}\s[\w\s]{1,30}(street|st|avenue|ave|road|rd|drive|dr|lane|ln|blvd|way)\b/gi, '[ADDRESS]');
}

function lastMonday() {
  const now      = new Date();
  const day      = now.getDay();
  const daysBack = day === 0 ? 6 : day - 1;
  const mon      = new Date(now);
  mon.setDate(now.getDate() - daysBack);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function lastSunday() {
  const sun = new Date(lastMonday());
  sun.setDate(sun.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

function classifyTopic(message) {
  const m = message.toLowerCase();
  if (m.includes('break down my') || m.includes('numbers today') || m.includes('focus on today')) return 'Daily Breakdown';
  if (m.includes('objection') || m.includes('not interested') || m.includes('t-mobile') || m.includes('verizon')) return 'Objection Handling';
  if (m.includes('busy') || m.includes("i'm busy") || m.includes('bad time')) return 'Busy Objection';
  if (m.includes('script') || m.includes('opening') || m.includes('sara') || m.includes('rehash')) return 'Script / SARA';
  if (m.includes('price') || m.includes('cost') || m.includes('bill') || m.includes('cheap')) return 'Price Objection';
  if (m.includes('activation') || m.includes('order') || m.includes('install') || m.includes('active')) return 'Activation / Order';
  if (m.includes('pay') || m.includes('commission') || m.includes('check') || m.includes('money')) return 'Pay / Commission';
  if (m.includes('chargeback') || m.includes('clawback') || m.includes('reversal')) return 'Chargeback';
  if (m.includes('cancel') || m.includes('disconnect')) return 'Cancellation';
  if (m.includes('plan') || m.includes('unlimited') || m.includes('data') || m.includes('line')) return 'Plans & Pricing';
  if (m.includes('port') || m.includes('transfer pin') || m.includes('number transfer')) return 'Porting';
  if (m.includes('exchange') || m.includes('wrong phone') || m.includes('swap')) return 'Exchange';
  if (m.includes('internet air') || m.includes('home internet') || m.includes('wifi') || m.includes('all-fi')) return 'Internet Air';
  if (m.includes('rebuttal') || m.includes('service') || m.includes('switch')) return 'Service Rebuttal';
  return 'General';
}

// ── Flag logic ────────────────────────────────────────────────
function checkFlags(struggles, topic) {
  const now   = new Date();
  const day7  = new Date(now); day7.setDate(now.getDate() - 7);
  const day30 = new Date(now); day30.setDate(now.getDate() - 30);

  const last7  = struggles.filter(s => s.topic === topic && new Date(s.date) >= day7).length;
  const last30 = struggles.filter(s => s.topic === topic && new Date(s.date) >= day30).length;

  return {
    flagged:   last7 >= 2,
    escalated: last7 >= 3 || last30 >= 5,
  };
}

// ── Knowledge base (Playbook content injected into Archie context) ────────────
const KNOWLEDGE_BASE = `
KNOWLEDGE BASE — AT&T PLANS, PORTING, EXCHANGES & MORE
Use this information to answer rep questions accurately. Always coach reps to verify current promos with their leader.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT THIS OFFICE SELLS — DO NOT GET THIS WRONG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reps in this office sell EXACTLY TWO products door-to-door:

1. AT&T WIRELESS phone plans (Premium 2.0, Extra 2.0, Value 2.0, 55+)
2. AT&T INTERNET AIR — 5G home internet via the All-Fi Hub

That's it. Two products.

DO NOT mention, recommend, or coach reps to pitch:
- Fiber internet
- DSL or wired internet of any kind
- AT&T TV / DirecTV / Stream
- U-verse
- Any product not listed above

If a customer brings up fiber: the rep should say "We don't offer fiber here — we
do AT&T wireless and 5G home internet (Internet Air). Internet Air sets up in
under 10 minutes — no tech, no install appointment, no holes in the wall. Just
plug it in." Sell convenience, not speed. Internet Air is NOT faster than
fiber — never claim that.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLANS & PRICING (after AutoPay + Paperless bill discount, taxes/fees extra)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PREMIUM 2.0:
- 1 line: $90 | 2 lines: $80/line | 3 lines: $65/line | 4-10 lines: $55/line
- Unlimited high-speed data (no slowdown based on usage)
- 100GB hotspot/mo (then 128kbps)
- 4K UHD streaming
- 5G access, US/Mexico/Canada included
- Latin America roaming in 20 countries included
- International Day Pass: $12/day (land), $20/day (land+sea)
- 50% off 1 tablet or watch line
- AT&T ActiveArmor security

EXTRA 2.0:
- 1 line: $70 | 2 lines: $60/line | 3 lines: $50/line | 4-10 lines: $40/line
- 100GB high-speed data (may slow after)
- 50GB hotspot/mo (then 128kbps)
- SD streaming, 5G access, US/Mexico/Canada included
- International Day Pass: $12/day
- AT&T ActiveArmor security

VALUE 2.0:
- 1 line: $50 | 2 lines: $45/line | 3 lines: $35/line | 4-10 lines: $30/line
- 5GB high-speed data (may slow after)
- 3GB hotspot/mo (then 128kbps)
- SD streaming, 5G access, US/Mexico/Canada included
- International Day Pass: $12/day
- AT&T ActiveArmor security

55+ PLAN:
- Requires age 55+ verification + 55+ FAN enrollment + qualifying internet service
- 1 line: $40 | 2 lines: $35/line (best deal) | 3 lines: $45/line | 4-10 lines: $36.25/line
- Unlimited talk/text/data, 10GB hotspot/mo (then 128kbps)
- 5G access, US/Mexico/Canada included, AT&T ActiveArmor

DISCOUNTS:
- AutoPay + Paperless (bank/ACH): $10/line/mo off | Debit card: $5/line/mo off
- Signature Savings (employer FAN): 20% off Premium 2.0
  → 1 line: $72 | 2 lines: $64/line | 3 lines: $52/line | 4 lines: $44/line
- Appreciation Savings (military, first responders, teachers, nurses/physicians, retired law enforcement/firefighters):
  → Value 2.0: 10% off | Extra 2.0: 15% off | Premium 2.0: 20% off
  → Requires proof of eligibility + annual recertification
- Activation/upgrade fee: up to $50/line

ADD-ONS:
- Tablet line: $20.99/mo | Wearable: $10.99/mo
- International Day Pass (land): $12/day | (land + sea): $20/day

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTERNET AIR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AT&T Internet Air is 5G home internet delivered via All-Fi Hub (self-install, plug-in device).
- Regular price: $60/mo
- With AutoPay + Paperless: $55/mo
- With eligible AT&T wireless line: $47/mo (additional 20% off)
- No annual contract, no price increase at 12 months, no overage fees
- $0 self-setup using Smart Home Manager app
- AT&T ActiveArmor internet security included
- NOT a hotspot — address-specific, cannot be used at other locations
- Always confirm address eligibility in OPUS before selling
- Compatible with Extended Wi-Fi Coverage Service (+$10/mo) and All-Fi Boosters

INTERNET AIR — HOW TO SELL IT:
- Lead with convenience, NOT speed. Internet Air is NOT faster than fiber.
- "Plug it in, it works in 10 minutes. No tech coming to your house, no install
  window, no drilling, no contract."
- Best fit: people frustrated with cable install hassles, renters who can't
  drill, anyone who wants AT&T wireless bundled (gets the $47/mo price).
- Worst fit: heavy 4K streamers in a household of 5+, gamers who need
  ultra-low ping. Don't oversell to those people — they'll churn.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BILLING CYCLE (critical to explain at every sale)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bill 1 — HIGHEST: Generated 30-45 days after activation. Prorated + $35/line activation fee. Discounts not yet applied.
Bill 2 — LOWER: Normal 30-day cycle, no longer prorated. Discounts still not applied.
Bill 3 — SUPER LOW: Activation fee credited back. All discounts from months 1-3 applied at once.
Bill 4+ — NORMAL: Consistent monthly rate going forward.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PORTING GUIDE (Transfer PINs expire in 1-14 days — must be ASAP switch)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOST MOBILE: Account # → call 1-888-266-7848 (not online, 9-digit account). Transfer PIN → created on call, per phone number. Note: press 4 for technical issues, wait, press 0. CS: 1-888-266-7848

METRO BY T-MOBILE: Account # → 9-digit on online profile or payment confirmation text. Transfer PIN → website only: Account → Permissions & Controls → Transfer PIN (NOT your phone number). CS: dial 611

SIMPLE MOBILE: Account # → last 15 digits of SIM ID or ICC ID. Transfer PIN → last 4 digits of phone number. CS: 1(877) 878-7908

T-MOBILE: Account # → on T-Mobile account bill. Transfer PIN → Settings → Permissions → Generate Transfer PIN (can also use T-Life app). IMPORTANT: disable Port Out Protection before porting. CS: 1(800) T-MOBILE

TOTAL WIRELESS / VISIBLE: Account # → on bill. Transfer PIN → text "NTP" to 611. CS: 1(866) 663-3633

VERIZON: Account # → ends in -00001. Transfer PIN → Devices → Device Management → Number Transfer PIN. IMPORTANT: must disable NumberLock first. Can take 4-24 hours. CS: 1(888) 322-1122

XFINITY MOBILE: Account # → specific number (not phone number). Transfer PIN → 4-digit customer service PIN, generate NTP at Xfinity support. Go to Devices > select number. DO NOT use app. Billing addresses must match. CS: 1(888) 936-4968

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXCHANGE POLICY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Exchange hotline: 855-698-1788 | $55 restocking fee applies to all exchanges.

ELIGIBILITY (all must be true):
- Day after shipment must be WITHIN 14 DAYS of current date
- Original phone undamaged (any physical or liquid damage voids eligibility)
- Original box AND accessories must be shipped back
- Only 1 exchange allowed per phone line

CUSTOMER IS CHARGED:
- Taxes on full retail price of new device (original taxes refunded after exchange confirmed)
- $55 restocking fee
- Full price if original device not returned within 14 days of receiving new device

ACTIVATION REQUIRED: Devices MUST be fully activated before exchange. Customer calls 833-681-2564. Customers who refuse to activate are sent to AT&T COR store.

WARRANTY ISSUES (not standard exchanges):
- iPhone/iPad malfunction → direct to Apple for warranty exchange
- Android malfunction → AT&T warranty: call 800-801-1101 or visit COR store

TELL CUSTOMER TO KEEP:
- Photos of front, back, sides of original phone showing undamaged condition
- IMEI of original phone + photo matching box IMEI
- USPS shipping label number + tracking number/proof from USPS desk (not drop box)
- Copy of original invoice

Shipping label emailed to customer. If lost, The Tower can resend. Check spam/junk first.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ORDER & ACTIVATION PROCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Preauth hold = sales tax on devices (not a charge — released when actual tax charged at shipment)
- Carriers WILL NOT leave phones at door — signature required
- 3 delivery attempts max — if missed, package returned and order cancelled
- Customer can reschedule via carrier website link in tracking email
- Discount verification (military, employer, etc.) must be done within 14 days of sign-up — cannot be backdated
- Trade-in window: 30 days from receipt of new phone to send back old device
- VIP exchange line for wrong phone received: (833) 603-3270
- Activation specialist: Future Bernard (202) 369-9695
`;

// ── System prompt ─────────────────────────────────────────────
function buildSystemPrompt({ user, orders, numbers, ddData, officeName }) {
  const name   = user?.name   || 'Rep';
  const office = user?.office || officeName || 'your office';
  const role   = user?.role   || 'rep';

  const recentOrders = (orders || []).slice(0, 10).map(o => ({
    id:         o.apexId,
    plan:       o.plan,
    lines:      o.lines,
    status:     o.status,
    orderDate:  o.orderDate,
    activeDate: o.activeDate,
  }));

  const today        = new Date().toLocaleDateString('en-US');
  const todayNumbers = (numbers || []).find(n => n.date === today) || null;

  const payRows = (ddData || []).slice(0, 6).map(r => ({
    week:   r.ddWeek,
    amount: r.amount,
  }));

  const mon            = lastMonday();
  const sun            = lastSunday();
  const thisWeekOrders = recentOrders.filter(o => {
    const d = new Date(o.orderDate);
    return !isNaN(d) && d >= mon && d <= sun;
  });
  const uniqueOrders = [...new Set(thisWeekOrders.map(o => o.id).filter(Boolean))].length;
  const totalLines   = thisWeekOrders.reduce((s, o) => s + (Number(o.lines) || 0), 0);

  const currentTime = new Date().toLocaleString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  return `You are Archie, an AI field coach built by APEX Metrics for AT&T door-to-door sales reps at ${office}.

REP CONTEXT:
- Name: ${name}
- Role: ${role}
- Office: ${office}
- Current date/time: ${currentTime}
- Use the current time to give time-appropriate advice (e.g. if it's mid-afternoon there's still time to go out)
- Orders this week (Mon–Sun): ${uniqueOrders} unique customers (target: 4+)
- Lines this week (Mon–Sun): ${totalLines} lines (target: 10+)
- An "order" = one customer/APEX ID. "Lines" = number of lines on that order.

TODAY'S NUMBERS (${today}):
${todayNumbers
    ? `- Houses knocked: ${todayNumbers.houses}
- Talk-tos: ${todayNumbers.talkTos}
- Quick Quotes: ${todayNumbers.quickQuotes}
- SARAs: ${todayNumbers.saras}
- Closed sales: ${todayNumbers.closedSales}`
    : '- No numbers logged yet today'}

RECENT ORDERS (last 10, no customer PII):
${recentOrders.length
    ? recentOrders.map(o => `- ${o.plan || 'Unknown plan'} | ${o.lines} line(s) | ${o.status} | ordered ${o.orderDate}`).join('\n')
    : '- No recent orders'}

ORDER STATUS GUIDE:
- Active / Activated = done, no action needed, do NOT surface these when asked who to follow up with
- Shipped / Delivered = needs follow up, customer needs to activate their device
- Pending = order placed, waiting on shipment
- Porting Issue = something is holding up the port, phone hasn't shipped — rep should check with manager
- Pending Valid Payment = customer needs to update payment info — rep should reach out to customer
- Backordered = phone is on hold, waiting on inventory
- Cancelled / Disconnected = lost sale
- When asked "who do I need to get active" or similar — ONLY surface Shipped, Delivered, Porting Issue, Pending Valid Payment, and Backordered. Never mention Active ones.

PAY HISTORY (DD weeks, rep share after 50/50 split):
${payRows.length
    ? payRows.map(r => `- ${r.week}: $${Number(r.amount / 2).toFixed(2)}`).join('\n')
    : '- No pay history available'}

YOUR ROLE:
- Coach reps on objection handling, scripts, SARA approach, closing, plan knowledge
- Help reps understand their pay, orders, and activation status
- Keep responses concise and field-practical — reps are reading on their phones
- Never ask for or repeat customer PII (names, addresses, SSNs, account numbers)
- If a rep seems frustrated or struggling repeatedly, acknowledge it and offer to escalate to their leader
- Use the knowledge base below to answer questions about plans, pricing, porting, exchanges, and Internet Air accurately

PRODUCT GUARDRAILS — READ EVERY TIME:
- This office sells EXACTLY two things: AT&T WIRELESS phone plans and AT&T INTERNET AIR (5G home internet, plug-in hub).
- DO NOT mention, suggest, or write scripts that pitch fiber, DSL, U-verse, DirecTV, AT&T TV, or any other AT&T product. They don't sell those here.
- If a script you're drafting includes the word "fiber," stop and rewrite it. The neighborhood pitch should reference "5G home internet" or "Internet Air," not fiber.
- Internet Air's selling point is CONVENIENCE (10-minute self-install, no tech visit, no contract, no holes in walls). It is NOT faster than fiber. Never claim it is.

PRICING GUARDRAILS:
- Quote prices from the knowledge base only. Do not invent promos, "limited-time deals," or specific discounts that aren't listed.
- When coaching reps to pitch a price out loud, prefer ranges or "starts at" framing rather than locking them into an exact monthly number that may not apply to that customer's situation.

CRITICAL RULES:
- Never make up or assume specific promotions, deals, or trial offers not listed below
- When quoting plan prices, always use the figures in the knowledge base
- Never promise things AT&T doesn't offer
- When unsure about something not in the knowledge base, say "verify this with your leader or the SARA portal before telling a customer"
- Stick to coaching and strategy — be accurate but field-practical

TONE: Direct, supportive, field-experienced. Like a senior rep who has seen it all. No corporate fluff.

${KNOWLEDGE_BASE}`;
}

// ── Quick fire prompts ────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: 'Break down my day',   text: 'Break down my numbers today and tell me what to focus on.' },
  { label: 'Carrier objection',   text: "Customer says they love who they're with and won't switch. What do I say?" },
  { label: 'Too busy objection',  text: "Customer says they're too busy to talk. What do I say?" },
  { label: 'Price objection',     text: 'Customer says AT&T is too expensive. How do I handle it?' },
  { label: 'SARA walkthrough',    text: 'Walk me through the SARA transition step by step.' },
  { label: 'Who to follow up',    text: 'Which of my orders need follow up to get activated?' },
  { label: 'Porting help',        text: 'Customer is on T-Mobile and wants to keep their number. Walk me through porting.' },
  { label: 'Explain the bill',    text: 'How do I explain the first bill to a new customer so they aren\'t shocked?' },
];

// ── Message bubble ────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isArchie = msg.role === 'assistant';
  return (
    <div style={{
      display: 'flex',
      flexDirection: isArchie ? 'row' : 'row-reverse',
      gap: 8, marginBottom: 12, alignItems: 'flex-start',
    }}>
      {isArchie && (
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg,#7B5EA7,#B8A0D4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, marginTop: 2,
        }}>🤖</div>
      )}
      <div style={{
        maxWidth: '80%', padding: '10px 14px',
        borderRadius: isArchie ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
        background: isArchie ? 'var(--bg-raised)' : 'linear-gradient(135deg,#7B5EA7,#B8A0D4)',
        border: isArchie ? '1px solid var(--border)' : 'none',
        fontSize: 14, lineHeight: 1.6,
        color: isArchie ? 'var(--text)' : '#EDE8F5',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg,#7B5EA7,#B8A0D4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
      }}>🤖</div>
      <div style={{
        padding: '12px 16px', borderRadius: '4px 14px 14px 14px',
        background: 'var(--bg-raised)', border: '1px solid var(--border)',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%', background: '#B8A0D4',
            animation: `archie-bounce 1.2s ${delay}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export function ArchieChat({ user }) {
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [ctxLoading,   setCtxLoading]   = useState(true);
  const [context,      setContext]      = useState({ orders: [], numbers: [], ddData: [], struggles: [] });
  const [loggedTopics, setLoggedTopics] = useState(new Set());

  const endRef    = useRef(null);
  const inputRef  = useRef(null);
  const firstName = (user?.name || 'there').split(' ')[0];

  useEffect(() => {
    async function loadContext() {
      if (!user?.email) return;
      try {
        const [orders, numbers, ddData, struggles] = await Promise.all([
          fetchOrders(user.email, user.name),
          fetchNumbers(user.email, user.name),
          fetchDDData(user.email, user.name),
          fetchStruggles(user.email, user.name),
        ]);
        setContext({ orders, numbers, ddData, struggles });
      } catch (e) {
        console.warn('Archie context load error:', e);
      } finally {
        setCtxLoading(false);
      }
    }
    loadContext();
  }, [user?.email, user?.name]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const logToStruggles = useCallback(async (question, archieResponse, topic) => {
    if (topic === 'Daily Breakdown') return;
    if (loggedTopics.has(topic)) return;
    if (!user?.email) return;

    try {
      const { flagged, escalated } = checkFlags(context.struggles, topic);
      const timesSeen = context.struggles.filter(s => s.topic === topic).length + 1;

      await logStruggle(user.email, {
        repName:        user.name,
        topic,
        question:       question.slice(0, 500),
        archieResponse: archieResponse.slice(0, 500),
        timesSeen,
        flagged,
        escalated,
      });

      setLoggedTopics(prev => new Set([...prev, topic]));

      setContext(prev => ({
        ...prev,
        struggles: [...prev.struggles, {
          date:    new Date().toISOString(),
          repName: user.name,
          topic, question, archieResponse,
          timesSeen, flagged, escalated,
        }],
      }));
    } catch (e) {
      console.warn('Failed to log struggle:', e);
    }
  }, [user, context.struggles, loggedTopics]);

  const send = useCallback(async (textOverride) => {
    const text = (textOverride || input).trim();
    if (!text || loading) return;

    const clean   = scrubPII(text);
    const topic   = classifyTopic(clean);
    const userMsg = { role: 'user', content: clean };
    const history = [...messages, userMsg];

    setMessages(history);
    setInput('');
    setLoading(true);

    const systemPrompt = buildSystemPrompt({
      user,
      orders:     context.orders,
      numbers:    context.numbers,
      ddData:     context.ddData,
      officeName: CONFIG.office?.name,
    });

    try {
      const response = await fetch(CONFIG.chatEndpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-5',
          max_tokens: 1000,
          system:     systemPrompt,
          messages:   history.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || err.error || 'API error');
      }

      const data       = await response.json();
      const archieText = data.content?.[0]?.text || 'Sorry, I had trouble with that. Try again.';

      setMessages(prev => [...prev, { role: 'assistant', content: archieText }]);
      logToStruggles(clean, archieText, topic);

    } catch (err) {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: `⚠️ Couldn't reach Archie right now. Check your connection and try again.\n\n(${err.message})`,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, messages, user, context, logToStruggles]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <style>{`
        @keyframes archie-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>

      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', minHeight: 400 }}>

        <div className="section-header" style={{ flexShrink: 0 }}>
          <div>
            <div className="section-title">Archie</div>
            <div className="section-subtitle">
              {ctxLoading ? 'Loading your context...' : `Ready · ${context.orders.length} orders loaded`}
            </div>
          </div>
          <div style={{
            fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700,
            padding: '4px 10px', borderRadius: 100,
            background: '#7B5EA715', border: '1px solid #7B5EA740', color: '#B8A0D4',
          }}>🤖 AI Coach</div>
        </div>

        {messages.length === 0 && !ctxLoading && (
          <div style={{ flexShrink: 0, marginBottom: 12 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11,
              letterSpacing: '0.08em', color: 'var(--text-muted)',
              textTransform: 'uppercase', marginBottom: 10,
            }}>Quick fire</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {QUICK_PROMPTS.map(q => (
                <button key={q.label} onClick={() => send(q.text)} style={{
                  padding: '6px 12px', borderRadius: 100,
                  border: '1px solid var(--border)', background: 'var(--bg-raised)',
                  color: 'var(--text-muted)', fontFamily: 'var(--font-display)',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}>{q.label}</button>
              ))}
            </div>
            <div className="card" style={{ marginTop: 12, textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🤖</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
                Hey {firstName}, I'm Archie
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 260, margin: '0 auto' }}>
                Your AI field coach. Ask me about plans, porting, objections, your pay, orders, exchanges — I know it all.
              </div>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          {loading && <TypingIndicator />}
          <div ref={endRef} />
        </div>

        <div style={{ flexShrink: 0, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={ctxLoading ? 'Loading your context...' : 'Ask Archie anything...'}
            disabled={ctxLoading || loading}
            rows={1}
            style={{
              flex: 1, padding: '10px 14px',
              borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              background: 'var(--bg-raised)', color: 'var(--text)',
              fontFamily: 'inherit', fontSize: 14,
              resize: 'none', outline: 'none', lineHeight: 1.5,
              opacity: (ctxLoading || loading) ? 0.6 : 1,
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading || ctxLoading}
            className="btn btn-primary"
            style={{ padding: '10px 16px', flexShrink: 0, fontSize: 18, opacity: (!input.trim() || loading || ctxLoading) ? 0.4 : 1 }}
          >→</button>
        </div>
      </div>
    </>
  );
}
