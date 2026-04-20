// ============================================================
// PlaybookView — Knowledge base / Playbook tab
// ============================================================

import { useState } from 'react';

function Card({ children, accent }) {
  return (
    <div className="card" style={{ marginBottom: 10, borderColor: accent ? accent + '30' : undefined }}>
      {children}
    </div>
  );
}

function CardTitle({ children, color }) {
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, color: color || 'var(--text)', marginBottom: 10 }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>{label}</div>
      <div style={{ fontSize: 13, color: valueColor || 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 700, textAlign: 'right', flex: 1 }}>{value}</div>
    </div>
  );
}

function ScriptBlock({ label, text, color }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1px solid ${color || 'var(--border)'}30`, borderRadius: 'var(--radius-sm)', marginBottom: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-overlay)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: color || 'var(--text)', textAlign: 'left' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{open ? '▲' : '▼'}</div>
      </button>
      {open && (
        <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6, background: 'var(--bg-card)', borderTop: '1px solid var(--border)', whiteSpace: 'pre-line' }}>
          {text}
        </div>
      )}
    </div>
  );
}

function ObjectionBlock({ objection, response }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '10px 14px', background: open ? '#C4748A10' : 'var(--bg-overlay)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: open ? '1px solid var(--border)' : 'none' }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: '#C4748A', textAlign: 'left' }}>"{objection}"</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8, flexShrink: 0 }}>{open ? '▲' : '▼'}</div>
      </button>
      {open && (
        <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {response}
        </div>
      )}
    </div>
  );
}

function BulletList({ items }) {
  return (
    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
          <span>✓</span><span>{item}</span>
        </div>
      ))}
    </div>
  );
}

// ── SECTION 1: Plans & Pricing ────────────────────────────────

function PlansSection() {
  const [activePlan, setActivePlan] = useState('premium');
  const [lines, setLines] = useState(4);

  const plans = {
    premium: {
      name: 'Premium 2.0', color: '#7B8FCE', tag: 'BEST VALUE',
      prices: { 1: 90, 2: 80, 3: 65, '4-10': 55 },
      features: ['Unlimited high-speed data (no slowdown based on usage)', '100GB hotspot/mo (then 128kbps)', '4K UHD streaming', '5G access', 'US, Mexico & Canada included', 'Latin America roaming in 20 countries', 'International Day Pass: $12/day', '50% off 1 tablet or watch line', 'AT&T ActiveArmor security'],
    },
    extra: {
      name: 'Extra 2.0', color: '#B8A0D4', tag: '',
      prices: { 1: 70, 2: 60, 3: 50, '4-10': 40 },
      features: ['100GB high-speed data (may slow after)', '50GB hotspot/mo (then 128kbps)', 'SD streaming', '5G access', 'US, Mexico & Canada included', 'International Day Pass: $12/day', 'AT&T ActiveArmor security'],
    },
    value: {
      name: 'Value 2.0', color: '#A0C4B8', tag: '',
      prices: { 1: 50, 2: 45, 3: 35, '4-10': 30 },
      features: ['5GB high-speed data (may slow after)', '3GB hotspot/mo (then 128kbps)', 'SD streaming', '5G access', 'US, Mexico & Canada included', 'International Day Pass: $12/day', 'AT&T ActiveArmor security'],
    },
    fiftyfive: {
      name: '55+ Plan', color: '#E8C87A', tag: 'AGE 55+',
      prices: { 1: 40, 2: 35, 3: 45, '4-10': 36.25 },
      features: ['Unlimited talk, text & data', '10GB hotspot/mo (then 128kbps)', '5G access', 'US, Mexico & Canada included', 'AT&T ActiveArmor security', 'Best deal: 2 lines at $35/line/mo', 'Requires age 55+ verification', 'Requires 55+ FAN enrollment + qualifying internet service'],
    },
  };

  const lineKey = lines >= 4 ? '4-10' : lines;
  const plan = plans[activePlan];

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>
        Prices after AutoPay & Paperless bill discount. Taxes and fees extra. Discount starts within 2 bill cycles.
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {Object.entries(plans).map(([key, p]) => (
          <button key={key} onClick={() => setActivePlan(key)} style={{ flex: 1, padding: '8px 4px', borderRadius: 'var(--radius-sm)', border: `1px solid ${activePlan === key ? p.color : 'var(--border)'}`, background: activePlan === key ? p.color + '20' : 'transparent', color: activePlan === key ? p.color : 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>
            {p.name.replace(' 2.0', '')}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Lines</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4].map(n => (
            <button key={n} onClick={() => setLines(n)} style={{ width: 36, height: 32, borderRadius: 'var(--radius-sm)', border: `1px solid ${lines === n ? plan.color : 'var(--border)'}`, background: lines === n ? plan.color + '20' : 'transparent', color: lines === n ? plan.color : 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
              {n}{n === 4 ? '+' : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12, borderColor: plan.color + '40', background: plan.color + '08' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: plan.color }}>
              {plan.name}
              {plan.tag && <span style={{ fontSize: 10, background: plan.color + '20', border: `1px solid ${plan.color}50`, borderRadius: 100, padding: '2px 6px', color: plan.color, marginLeft: 8 }}>{plan.tag}</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {lines >= 4 ? '4-10 lines' : `${lines} line${lines > 1 ? 's' : ''}`} · after AutoPay/Paperless
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 34, color: plan.color, lineHeight: 1 }}>${plan.prices[lineKey]}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>/line/mo</div>
            {lines >= 2 && <div style={{ fontSize: 11, color: plan.color, fontFamily: 'var(--font-display)', fontWeight: 700, marginTop: 4 }}>${plan.prices[lineKey] * (lines >= 4 ? 4 : lines)}/mo total</div>}
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          {plan.features.map((f, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text)', padding: '3px 0', display: 'flex', gap: 6 }}>
              <span style={{ color: plan.color, flexShrink: 0 }}>✓</span> {f}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardTitle>All Plans — Price Per Line</CardTitle>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {[['Lines', 'var(--text-muted)', 'left'], ['Prem', '#7B8FCE', 'center'], ['Extra', '#B8A0D4', 'center'], ['Value', '#A0C4B8', 'center'], ['55+', '#E8C87A', 'center']].map(([h, c, a]) => (
                  <th key={h} style={{ textAlign: a, padding: '6px 4px', color: c, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[['1 line', 90, 70, 50, 40], ['2 lines', 80, 60, 45, 35], ['3 lines', 65, 50, 35, 45], ['4-10 lines', 55, 40, 30, 36.25]].map(([label, prem, ext, val, ffive]) => (
                <tr key={label} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 4px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{label}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, color: '#7B8FCE' }}>${prem}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, color: '#B8A0D4' }}>${ext}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, color: '#A0C4B8' }}>${val}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, color: '#E8C87A' }}>${ffive}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' }}>55+ plan: age 55+ required, 2-line max for best pricing, requires FAN enrollment + qualifying internet service.</div>
        </div>
      </Card>

      <Card accent="#E8C87A">
        <CardTitle color="#E8C87A">Signature Savings (Employer)</CardTitle>
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>20% off Premium 2.0 for eligible employees/union members. Must verify through employer FAN.</div>
        <InfoRow label="Premium 2.0 — 1 line" value="$72/mo (save $18)" />
        <InfoRow label="Premium 2.0 — 2 lines" value="$64/line (save $32 total)" />
        <InfoRow label="Premium 2.0 — 3 lines" value="$52/line (save $39 total)" />
        <InfoRow label="Premium 2.0 — 4 lines" value="$44/line (save $44 total)" />
      </Card>

      <Card accent="#C4748A">
        <CardTitle color="#C4748A">Appreciation Savings</CardTitle>
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>Military/Veterans, First Responders, Teachers, Nurses/Physicians, Retired Law Enforcement/Firefighters</div>
        <InfoRow label="Value 2.0" value="10% off" valueColor="#A0C4B8" />
        <InfoRow label="Extra 2.0" value="15% off" valueColor="#B8A0D4" />
        <InfoRow label="Premium 2.0" value="20% off" valueColor="#7B8FCE" />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>Requires annual recertification. Proof of eligibility required at point of sale.</div>
      </Card>

      <Card>
        <CardTitle>Add-ons</CardTitle>
        <InfoRow label="Tablet line" value="$20.99/mo" />
        <InfoRow label="Smartwatch/Wearable" value="$10.99/mo" />
        <InfoRow label="International Day Pass (land)" value="$12/day" />
        <InfoRow label="International Day Pass (land + sea)" value="$20/day" />
        <InfoRow label="Activation/upgrade fee" value="up to $50/line" />
        <InfoRow label="AutoPay + Paperless discount" value="$10/line/mo (bank/ACH)" />
      </Card>
    </div>
  );
}

// ── SECTION 2: Rehash Scripts ─────────────────────────────────

function RehashSection() {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>Tap any script to expand. Use these as guides — make them your own.</div>

      <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Opening</div>

      <ScriptBlock color="#7B8FCE" label="Cold Door Opener" text={`"Hey, how's it going? I'm [Name] with AT&T — I'm in the neighborhood today. Quick question: who's your phone service with right now?"

[Let them answer]

"Perfect — I'm not here to talk you into anything, but I do want to make sure you're aware of what's out here. A lot of people in this area have been switching and saving — can I show you what the difference looks like real quick?"`} />

      <ScriptBlock color="#7B8FCE" label="SARA Transition" text={`After they show interest:

"Alright, so the fastest way I can show you exactly what you'd pay — and what you'd save — is if I pull up what we call a quick quote. It takes about 60 seconds, it's just based on your current plan and how many lines you have. Sound good?"

[Get their current carrier, number of lines, and current monthly bill]

"Okay so right now you're paying [X] for [Y lines]. Here's what that looks like with us..."`} />

      <ScriptBlock color="#7B8FCE" label="Closing the Sale" text={`"So based on everything we went over — you're getting [benefit], [benefit], and [benefit]. The process takes about 15 minutes and everything transfers automatically. The only thing I need from you is your ID and we can get you started today. Make sense?"

[Pause — let them respond]

If they hesitate: "What's the one thing holding you back?"
Then address that specifically.`} />

      <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, marginTop: 16 }}>Billing Explanation</div>

      <ScriptBlock color="#E8C87A" label="Explaining the 3-Bill Cycle" text={`"I want to set expectations so your first bill doesn't catch you off guard — because it will look higher than normal.

Here's why: your first bill is prorated, meaning it covers partial months, plus the $35 per line activation fee. So it's the highest.

Your second bill is your first full 30-day cycle — still a little higher because discounts haven't kicked in yet.

Your THIRD bill is when everything clicks. The activation fee gets credited back, and all the discounts from months 1, 2, and 3 hit at once. So that bill is usually really low.

After that? Normal, predictable every single month.

Does that make sense?"`} />

      <ScriptBlock color="#E8C87A" label="Preauth Hold / Sales Tax Explanation" text={`"So today we're placing a preauthorization hold equal to the sales tax on your devices — not a charge, just a hold. It reserves your phones.

The actual sales tax charge happens when your phones are ready to ship. As soon as that goes through, the hold is released and those funds come right back.

Just make sure your account has enough to cover both at the same time temporarily — usually a day or two overlap.

Any questions on that?"`} />

      <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, marginTop: 16 }}>Trade-In</div>

      <ScriptBlock color="#A0C4B8" label="Trade-In Walkthrough" text={`"For the trade-in — AT&T sends you free shipping labels and boxes, so there's no cost. You just pack up your old phone and drop it off.

You'll get an email with everything you need. The link to start it is att.com or you can call us and we'll walk you through it.

One thing to remember: you have 30 days from when you receive your new phone to send the trade-in back. Don't let that slip — it affects your promo credit.

Any questions on the trade-in process?"`} />
    </div>
  );
}

// ── SECTION 3: Objection Handling ────────────────────────────

function ObjectionSection() {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>Tap an objection to see the recommended response.</div>

      <ObjectionBlock objection="I'm happy with T-Mobile / Verizon" response={`"Totally get that — loyalty matters. I'm not here to trash them. Quick question though: are you happy with your bill, or just comfortable with what you know?

Most people I talk to who switched said they had no idea they were overpaying until they saw the comparison side by side. Takes 60 seconds to show you — worst case, you confirm you already have the best deal out there."`} />

      <ObjectionBlock objection="It's too expensive" response={`"I hear you. Can I ask — how much are you paying right now per month?

[Let them answer]

Okay, so here's the thing — most people say that before they see the numbers. With the trade-in promo, your phones are $0/month, and with AutoPay you save $10 per line. Most families I sit down with end up paying less than what they're paying now.

Let me just show you the actual number for your specific plan — no pressure."`} />

      <ObjectionBlock objection="I already have AT&T" response={`"Oh perfect — so you know the network is solid. The question is just whether you're on the right plan.

A lot of existing customers I talk to are on older plans and paying more than new customers for the same service. Are you on Premium, Extra, or Starter right now?

[Listen]

Let me pull up what you'd pay if you upgraded or restructured your plan today — there might be a promo you're missing out on."`} />

      <ObjectionBlock objection="I need to talk to my spouse / think about it" response={`"Of course — that's a big decision and it should be a conversation.

Can I ask — is there a specific part you're not sure about, or just want to loop them in? Sometimes it helps if I can answer whatever the hesitation is right now so you have the full picture when you talk.

Or if it's easier, I can call back when you're both available — when's a good time?"`} />

      <ObjectionBlock objection="I'm not interested" response={`"No worries at all. Can I ask — is it the timing, the carrier, or something else?

[Listen]

Got it. I'll leave you my info — if anything changes with your bill or you want to revisit, just reach out. You'd be surprised how often people come back after their next bill."`} />

      <ObjectionBlock objection="I'm in a contract" response={`"That's actually one of the most common things I hear — and AT&T covers your early termination fee when you switch. So the contract isn't really the barrier it sounds like.

The only thing that matters is whether the plan makes sense for you. Want me to run the numbers real quick so you can see what it actually looks like?"`} />

      <ObjectionBlock objection="The first bill is going to be huge" response={`"You're right that the first bill is the highest — and I want to be upfront about that. It's because it's prorated and includes the activation fee.

But here's the thing: by your third bill, the activation fee gets credited back and all your discounts from months 1-3 apply at once. So your third bill is usually your lowest.

After that it's consistent every month. I'd rather tell you now than have you surprised later."`} />
    </div>
  );
}

// ── SECTION 4: Order & Activation ────────────────────────────

function ActivationSection() {
  const [expandedStep, setExpandedStep] = useState(null);

  const steps = [
    { id: 1, icon: '💳', title: 'Preauth Hold & Sales Tax', color: '#7B8FCE', content: `The customer's initial payment is a preauthorization hold — not a charge — equal to the sales tax on their devices.\n\nWhat to tell them:\n• The hold reserves their devices\n• The actual sales tax charge happens when phones are ready to ship\n• Once the charge goes through, the hold is released (funds come back)\n• Their account needs to cover both temporarily (usually 1-2 days overlap)\n\nCommon question: "Why was I charged?"\n→ It's a hold, not a charge. The funds aren't gone — they're reserved.` },
    { id: 2, icon: '📦', title: 'Order Tracking', color: '#7B8FCE', content: `After the order is placed, the customer will receive tracking emails from both AT&T and the carrier (FedEx or UPS).\n\nTell the customer:\n• Monitor their email closely\n• Each email has a link to the carrier website\n• They can modify delivery options (reschedule, redirect) via that link\n• Tracking can take 24-48 hours to appear after order\n\nKey website: att.com/getstarted` },
    { id: 3, icon: '🚚', title: 'Delivery', color: '#E8C87A', content: `Carriers WILL NOT leave phones at the door — signature required.\n\nCritical points:\n• 3 delivery attempts will be made\n• If all 3 are missed, the package is returned to AT&T and the order is cancelled\n• Customer must be home to sign OR reschedule via the carrier's website\n\nIf they miss a delivery:\n→ Go to FedEx.com or UPS.com using the tracking link in their email\n→ Reschedule or pick up at a local facility\n\nThis is a common churn point — remind customers before they leave.` },
    { id: 4, icon: '🚀', title: 'Activation', color: '#A0C4B8', content: `Phones come with pre-set activation instructions inside the box.\n\nActivation steps:\n1. Power on the new device\n2. Follow the on-screen setup prompts\n3. Transfer data from old phone using the included guide\n\nIf they need help:\n• Contact Future Bernard: (202) 369-9695\n• Activate online: att.com/getstarted\n\nPorting numbers: If they're keeping their number, they'll need their account number and PIN from their old carrier. This info should be gathered at point of sale.` },
    { id: 5, icon: '🔄', title: 'Trade-In Process', color: '#B8A0D4', content: `Customers trading in a device must send it back to AT&T.\n\nHow it works:\n• Free shipping labels and boxes are provided — no cost to customer\n• Start the trade-in at att.com or call us for help\n• 30-day window from receipt of new phone to send trade-in back\n• Promo credit is tied to the trade-in — missing the deadline affects the deal\n\nWrong phone received?\n→ Call the Residential VIP Line: (833) 603-3270\n→ We can get an exchange started immediately` },
    { id: 6, icon: '⚠️', title: 'Discount Verification', color: '#C4748A', content: `If the customer qualified for an employee, military, first responder, or other AT&T discount — they MUST verify eligibility.\n\nCritical:\n• Must verify within 14 days of sign-up\n• Cannot be backdated once the window closes\n• Easy to forget — remind them before they leave\n\nVerification link: att.com/getstarted\n\nThis is the most commonly missed step post-sale. Make it a habit to mention it every time.` },
    { id: 7, icon: '🔁', title: 'Exchanges', color: '#C4748A', content: `Exchange Hotline: 855-698-1788 · $55 Restocking Fee applies to all exchanges.\n\nELIGIBILITY — all must be true:\n• Day after shipment of original order must be WITHIN 14 DAYS of current date\n• Original phone is in undamaged condition (ANY physical or liquid damage VOIDS eligibility)\n• Original phone box AND accessories must be shipped back\n• No prior exchanges on that line — 1 EXCHANGE ALLOWED per phone line\n\nCUSTOMER CHARGES:\n• Taxes on full retail price of new device (original taxes refunded after exchange confirmed)\n• $55 restocking fee\n• Charged FULL PRICE if original device not returned within 14 days of receiving new device\n\nACTIVATION REQUIRED:\n• Devices MUST be fully activated before exchange — customers call 833-681-2564\n• Customers who refuse to activate are sent to an AT&T COR store\n\nDEVICE ISSUES (not standard exchanges):\n• iPhone/iPad malfunction or defect → direct to Apple for warranty exchange\n• Android malfunction or defect → AT&T warranty (call 800-801-1101 or COR store)\n\nTELL CUSTOMERS TO KEEP:\n• Photos of front, back, sides, top & bottom of original phone\n• IMEI of original phone (device settings + photo matching box IMEI)\n• USPS shipping label number\n• Tracking number from USPS desk (drop box does NOT provide tracking)\n• Photocopy of original invoice\n\nShipping label is emailed to customer. If lost, The Tower can resend. Check spam/junk folder first.` },
    { id: 8, icon: '💰', title: 'Billing Cycle Explained', color: '#E8C87A', content: `3-bill explanation — memorize this:\n\nBill 1 — HIGHEST\nGenerated 30-45 days after activation. Prorated (partial month), includes $35/line activation fee. Discounts not yet applied.\n\nBill 2 — LOWER\nNormal 30-day cycle, no longer prorated. Discounts and promotions still not applied.\n\nBill 3 — SUPER LOW\nActivation fee credited back. All discounts from months 1-3 applied at once. Usually the lowest bill they'll ever see.\n\nBill 4+ — NORMAL\nConsistent monthly rate from here forward.\n\nUse this script every single time. It prevents angry calls when the first bill arrives.` },
  ];

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>Full customer journey from order to activation. Tap each step to expand.</div>

      <Card accent="#A0C4B8">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>Activation Specialist</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Future Bernard</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: '#A0C4B8' }}>(202) 369-9695</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Call or text anytime</div>
          </div>
        </div>
      </Card>

      <Card>
        <InfoRow label="VIP Exchange Line" value="(833) 603-3270" valueColor="#B8A0D4" />
        <InfoRow label="Activation / Track Order" value="att.com/getstarted" valueColor="#7B8FCE" />
        <InfoRow label="Discount Verification Deadline" value="14 days from sign-up" valueColor="#C4748A" />
        <InfoRow label="Trade-In Window" value="30 days from receipt" valueColor="#E8C87A" />
      </Card>

      {steps.map(step => (
        <div key={step.id} style={{ border: `1px solid ${step.color}30`, borderRadius: 'var(--radius-sm)', marginBottom: 8, overflow: 'hidden' }}>
          <button
            onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
            style={{ width: '100%', padding: '12px 14px', background: expandedStep === step.id ? step.color + '12' : 'var(--bg-overlay)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: expandedStep === step.id ? `1px solid ${step.color}30` : 'none' }}
          >
            <div style={{ fontSize: 20, flexShrink: 0 }}>{step.icon}</div>
            <div style={{ flex: 1, textAlign: 'left', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: step.color }}>{step.id}. {step.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{expandedStep === step.id ? '▲' : '▼'}</div>
          </button>
          {expandedStep === step.id && (
            <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {step.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── SECTION 5: Internet Air ───────────────────────────────────

function InternetAirSection() {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>
        AT&T Internet Air — 5G home internet. Always confirm address eligibility in OPUS before selling.
      </div>

      <div className="card" style={{ marginBottom: 10, borderColor: '#7B8FCE40', background: '#7B8FCE08' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: '#7B8FCE' }}>Internet Air</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>5G home internet · address-specific</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 34, color: '#7B8FCE', lineHeight: 1 }}>$47</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>/mo after discounts</div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <InfoRow label="Regular price" value="$60/mo" />
          <InfoRow label="With AutoPay + Paperless" value="$55/mo (-$5)" valueColor="#7B8FCE" />
          <InfoRow label="With eligible AT&T wireless line" value="$47/mo (additional 20% off)" valueColor="#7B8FCE" />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>Discounts start within 2 bill cycles. AutoPay & Paperless billing required.</div>
        </div>
      </div>

      <Card accent="#A0C4B8">
        <CardTitle color="#A0C4B8">Best For</CardTitle>
        <BulletList items={[
          'Customers at eligible addresses with sufficient 5G coverage',
          'Customers without AT&T Fiber available in their area',
          "Existing AT&T Internet customers who are migration-eligible and don't have Fiber",
        ]} />
      </Card>

      <Card>
        <CardTitle>Key Selling Points</CardTitle>
        <BulletList items={[
          'No price increase at 12 months',
          'No overage fees',
          'No annual contract',
          '$0 self-setup — plug in All-Fi Hub, done',
          'Complete WiFi with enhanced coverage & security',
          'AT&T ActiveArmor internet security — 24/7, all devices',
          'Compatible with Extended Wi-Fi Coverage Service (+$10/mo) & All-Fi Boosters',
        ]} />
      </Card>

      <ScriptBlock color="#B8A0D4" label="Is this a hotspot?" text={"No — Internet Air is NOT a mobile hotspot. It's home internet tied to the customer's specific address. They cannot take it to other locations.\n\nIt uses the AT&T 5G network to deliver home internet through an All-Fi Hub device that plugs into an outlet."} />

      <ScriptBlock color="#B8A0D4" label="What's needed to set up?" text={"The customer needs:\n• A valid mobile phone number\n• A valid email address\n\nSetup is self-install using the Smart Home Manager app (QR code on the box). The app guides them where to place the All-Fi Hub for best signal.\n\nAlways confirm address eligibility in OPUS before selling."} />

      <ScriptBlock color="#E8C87A" label="Internet Air Pitch Script" text={`"Do you have home internet right now? Who are you with?"\n\n[Listen]\n\n"So AT&T actually has a home internet option that runs over the 5G network — no cable, no digging, no installation appointment. You just plug in a device and you're connected."\n\n"The price is $60 a month, but if you already have an AT&T wireless line — which you're getting today — you automatically get 20% off, bringing it down to $47. And there's no contract, no overage fees, no price hike after year one."\n\n"The only catch is it has to be available at your address — let me check that real quick."\n\n[Check OPUS for eligibility]`} />

      <Card>
        <CardTitle>Important Limitations</CardTitle>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <div>• AT&T may temporarily slow speeds if the network is busy</div>
          <div>• Service is address-specific — not portable</div>
          <div>• 5G coverage required (LTE may be used depending on signal)</div>
          <div>• Not available in all areas — always verify in OPUS first</div>
          <div>• Monthly State Cost Recovery Charge applies in OH, NV, TX</div>
        </div>
      </Card>
    </div>
  );
}

// ── SECTION 6: Porting Guide ──────────────────────────────────

function PortingSection() {
  const [expanded, setExpanded] = useState(null);

  const carriers = [
    { id: 'boost', name: 'Boost Mobile', color: '#C4748A', accountLocation: 'Not online. Call 1-888-266-7848 for 9-digit account #', transferPin: 'Transfer PIN created on call — for EACH phone number separately', notes: 'Must call to reach live person. Press 4 for technical issues, then wait and press 0.', customerService: '1-888-266-7848' },
    { id: 'metro', name: 'Metro by T-Mobile', color: '#7B8FCE', accountLocation: '9-digit number on online profile or payment confirmation text', transferPin: 'Must be done through website: Account → Permissions & Controls → Transfer PIN', notes: 'NOT your phone number.', customerService: 'Dial 611' },
    { id: 'simple', name: 'Simple Mobile', color: '#B8A0D4', accountLocation: 'Last 15 digits of SIM ID or ICC ID', transferPin: 'Last 4 digits of phone number', notes: 'N/A', customerService: '1 (877) 878-7908' },
    { id: 'tmobile', name: 'T-Mobile', color: '#E8A0B0', accountLocation: 'On T-Mobile account bill', transferPin: 'Settings → Permissions → Generate Transfer PIN', notes: 'Disable Port Out Protection before porting. Can generate temp PIN in T-Life app.', customerService: '1 (800) T-MOBILE' },
    { id: 'total', name: 'Total Wireless / Visible', color: '#A0C4B8', accountLocation: 'On Total / Visible bill', transferPin: 'Text "NTP" to 611', notes: 'N/A', customerService: '1 (866) 663-3633' },
    { id: 'verizon', name: 'Verizon', color: '#E8C87A', accountLocation: 'Account number ends in -00001', transferPin: 'Devices → Device Management → Number Transfer PIN', notes: 'Must disable NumberLock feature first. Can take 4-24 hours to complete.', customerService: '1 (888) 322-1122' },
    { id: 'xfinity', name: 'Xfinity Mobile', color: '#7B5EA7', accountLocation: 'Specific number (not phone number)', transferPin: '4-digit customer service PIN. Generate NTP at Xfinity support.', notes: 'Go to Devices > select number. DO NOT use app. Billing addresses must match.', customerService: '1 (888) 936-4968' },
  ];

  return (
    <div>
      <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 14, background: '#C4748A15', border: '1px solid #C4748A50', fontSize: 13, color: '#C4748A', fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1.5 }}>
        ⚠️ Transfer PINs expire in 1-14 days — this needs to be an ASAP switch after getting the PIN!
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>Tap a carrier to see account number location, how to get the Transfer PIN, and customer service number.</div>

      {carriers.map(c => (
        <div key={c.id} style={{ border: `1px solid ${expanded === c.id ? c.color + '60' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', marginBottom: 8, overflow: 'hidden', background: expanded === c.id ? c.color + '08' : 'var(--bg-card)' }}>
          <button
            onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            style={{ width: '100%', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: c.color }}>{c.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{expanded === c.id ? '▲' : '▼'}</div>
          </button>
          {expanded === c.id && (
            <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
              <div style={{ paddingTop: 12 }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Account # Location</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{c.accountLocation}</div>
                </div>
                <div style={{ marginBottom: 10, padding: '10px 12px', background: c.color + '15', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${c.color}` }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.color, marginBottom: 4 }}>How to Get Transfer PIN</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{c.transferPin}</div>
                </div>
                {c.notes !== 'N/A' && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4748A', marginBottom: 4 }}>⚠️ Special Notes</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{c.notes}</div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Customer Service</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, color: c.color }}>{c.customerService}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────

export function PlaybookView({ user }) {
  const [section, setSection] = useState('activation');

  const tabs = [
    { id: 'plans',      label: 'Plans',      icon: '📱' },
    { id: 'rehash',     label: 'Scripts',    icon: '🎯' },
    { id: 'objections', label: 'Objections', icon: '💬' },
    { id: 'activation', label: 'Activation', icon: '🚀' },
    { id: 'internet',   label: 'Internet',   icon: '📡' },
    { id: 'porting',    label: 'Porting',    icon: '🔀' },
  ];

  return (
    <div className="fade-up">
      <div className="section-header">
        <div>
          <div className="section-title">Playbook</div>
          <div className="section-subtitle">Everything you need in the field</div>
        </div>
      </div>

      <div style={{ display: 'flex', marginBottom: 16, overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-overlay)', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            style={{ flexShrink: 0, minWidth: 70, padding: '10px 8px', border: 'none', borderBottom: section === t.id ? '2px solid #7B8FCE' : '2px solid transparent', background: section === t.id ? 'var(--bg-card)' : 'transparent', color: section === t.id ? '#7B8FCE' : 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s ease' }}
          >
            <div style={{ fontSize: 16, marginBottom: 3 }}>{t.icon}</div>
            {t.label}
          </button>
        ))}
      </div>

      {section === 'plans'      && <PlansSection />}
      {section === 'rehash'     && <RehashSection />}
      {section === 'objections' && <ObjectionSection />}
      {section === 'activation' && <ActivationSection />}
      {section === 'internet'   && <InternetAirSection />}
      {section === 'porting'    && <PortingSection />}
    </div>
  );
}
