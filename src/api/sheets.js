// ============================================================
// GOOGLE SHEETS API
// All sheet reads go through here
// ============================================================

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

async function readSheet(sheetId, range, accessToken) {
  const url      = `${SHEETS_BASE}/${sheetId}/values/${range}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Sheets API error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.values || [];
}

async function writeToSheet(sheetId, range, values, accessToken) {
  const url      = `${SHEETS_BASE}/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method:  'PUT',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Sheets write error: ${err.error?.message || response.statusText}`);
  }

  return await response.json();
}

async function appendToSheet(sheetId, range, values, accessToken) {
  const url      = `${SHEETS_BASE}/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const response = await fetch(url, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Sheets append error: ${err.error?.message || response.statusText}`);
  }

  return await response.json();
}

// ── ROSTER ───────────────────────────────────────────────────────────────────

export async function lookupUserInRoster(email, rosterSheetId, accessToken) {
  // Now reads A:F to include status column
  const rows = await readSheet(rosterSheetId, 'ROSTER!A:F', accessToken);
  if (rows.length <= 1) return null;

  let userRow = null;
  for (let i = 1; i < rows.length; i++) {
    const [rowEmail] = rows[i];
    if (rowEmail && rowEmail.toLowerCase().trim() === email.toLowerCase().trim()) {
      userRow = rows[i];
      break;
    }
  }

  if (!userRow) return null;

  const [rowEmail, name, role, office, aPlayerAssignment, status] = userRow;

  // Block inactive users — they get denied just like unlisted emails
  if ((status || 'active').trim().toLowerCase() === 'inactive') return null;

  const userRole = (role || 'rep').trim().toLowerCase();

  // If a_player: build team by scanning col E for rows pointing to this user's name
  // Only include active reps
  let team = '';
  if (userRole === 'a_player') {
    const myName = (name || '').trim().toLowerCase();
    const teamMembers = rows.slice(1)
      .filter(row => {
        const rowStatus = (row[5] || 'active').trim().toLowerCase();
        return rowStatus === 'active' &&
               (row[4] || '').trim().toLowerCase() === myName;
      })
      .map(row => (row[1] || '').trim())
      .filter(Boolean);
    team = teamMembers.join(',');
  }

  return {
    email:  rowEmail.trim(),
    name:   name    || '',
    role:   userRole,
    office: office  || '',
    team,
  };
}

export async function fetchRoster(rosterSheetId, accessToken) {
  const rows = await readSheet(rosterSheetId, 'ROSTER!A:F', accessToken);
  if (rows.length <= 1) return [];
  return rows.slice(1)
    .filter(row => row[0] || row[1])
    .map((row, i) => ({
      rowIndex: i + 2,
      email:    (row[0] || '').trim(),
      name:     (row[1] || '').trim(),
      role:     (row[2] || 'rep').trim().toLowerCase(),
      office:   (row[3] || '').trim(),
      team:     (row[4] || '').trim(),
      status:   (row[5] || 'active').trim().toLowerCase(),
    }));
}

export async function addRepToRoster(rosterSheetId, accessToken, rep) {
  const row = [
    rep.email,
    rep.name,
    rep.role   || 'rep',
    rep.office || '',
    rep.team   || '',
    'active',
  ];
  return appendToSheet(rosterSheetId, 'ROSTER!A:F', [row], accessToken);
}

export async function updateRosterRow(rosterSheetId, accessToken, rowIndex, rep) {
  const row = [
    rep.email,
    rep.name,
    rep.role   || 'rep',
    rep.office || '',
    rep.team   || '',
    rep.status || 'active',
  ];
  return writeToSheet(rosterSheetId, `ROSTER!A${rowIndex}:F${rowIndex}`, [row], accessToken);
}

// ── ORDERS ───────────────────────────────────────────────────────────────────

export async function fetchOrders(ordersSheetId, accessToken, repName = null) {
  const rows = await readSheet(ordersSheetId, 'ORDERS!A:H', accessToken);
  if (rows.length <= 1) return [];

  const data = rows.slice(1).map(row => ({
    apexId:     row[0] || '',
    customer:   row[1] || '',
    repName:    row[2] || '',
    orderDate:  row[3] || '',
    plan:       row[4] || '',
    lines:      row[5] || '',
    status:     row[6] || '',
    activeDate: row[7] || '',
  })).filter(o => o.apexId || o.customer);

  return repName
    ? data.filter(o => o.repName.toLowerCase() === repName.toLowerCase())
    : data;
}

// ── PAYCHECK ─────────────────────────────────────────────────────────────────

export async function fetchPaycheck(paycheckSheetId, accessToken, repName = null) {
  const rows = await readSheet(paycheckSheetId, 'PAYCHECK!A:E', accessToken);
  if (rows.length <= 1) return [];

  const data = rows.slice(1).map(row => ({
    repName:     row[0] || '',
    email:       row[1] || '',
    periodStart: row[2] || '',
    periodEnd:   row[3] || '',
    activations: row[4] || 0,
  }));

  return repName
    ? data.filter(p => p.repName.toLowerCase() === repName.toLowerCase())
    : data;
}

// ── NUMBERS ───────────────────────────────────────────────────────────────────

export async function fetchNumbers(numbersSheetId, accessToken, repName = null) {
  const rows = await readSheet(numbersSheetId, 'NUMBERS!A:H', accessToken);
  if (rows.length <= 1) return [];

  const data = rows.slice(1).map(row => ({
    repName:     row[0] || '',
    email:       row[1] || '',
    date:        row[2] || '',
    houses:      Number(row[3]) || 0,
    talkTos:     Number(row[4]) || 0,
    quickQuotes: Number(row[5]) || 0,
    saras:       Number(row[6]) || 0,
    closedSales: Number(row[7]) || 0,
  }));

  return repName
    ? data.filter(n => n.repName.toLowerCase() === repName.toLowerCase())
    : data;
}

export async function submitNumbers(numbersSheetId, accessToken, repData) {
  const today = repData.date;
  const rows  = await readSheet(numbersSheetId, 'NUMBERS!A:H', accessToken);

  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === repData.repName && rows[i][2] === today) {
      rowIndex = i + 1;
      break;
    }
  }

  const row = [
    repData.repName,
    repData.email,
    today,
    repData.houses,
    repData.talkTos,
    repData.quickQuotes,
    repData.saras,
    repData.closedSales,
  ];

  if (rowIndex > 0) {
    return writeToSheet(numbersSheetId, `NUMBERS!A${rowIndex}:H${rowIndex}`, [row], accessToken);
  } else {
    return appendToSheet(numbersSheetId, 'NUMBERS!A:H', [row], accessToken);
  }
}

// ── STRUGGLES ────────────────────────────────────────────────────────────────

export async function fetchStruggles(strugglesSheetId, accessToken, repName = null) {
  const rows = await readSheet(strugglesSheetId, 'STRUGGLES!A:H', accessToken);
  if (rows.length <= 1) return [];

  const data = rows.slice(1).map(row => ({
    date:           row[0] || '',
    repName:        row[1] || '',
    topic:          row[2] || '',
    question:       row[3] || '',
    archieResponse: row[4] || '',
    timesSeen:      Number(row[5]) || 1,
    flagged:        row[6] === 'TRUE',
    escalated:      row[7] === 'TRUE',
  }));

  return repName
    ? data.filter(s => s.repName.toLowerCase() === repName.toLowerCase())
    : data;
}

export async function logStruggle(strugglesSheetId, accessToken, entry) {
  const row = [
    new Date().toISOString(),
    entry.repName,
    entry.topic,
    entry.question,
    entry.archieResponse,
    entry.timesSeen || 1,
    entry.flagged   ? 'TRUE' : 'FALSE',
    entry.escalated ? 'TRUE' : 'FALSE',
  ];
  return appendToSheet(strugglesSheetId, 'STRUGGLES!A:H', [row], accessToken);
}

// ── METRICS SHEET ────────────────────────────────────────────────────────────

export async function fetchMetrics(metricsSheetId, accessToken) {
  const tabNames = ['METRICS', 'Sheet1'];
  let rows = null;

  for (const tab of tabNames) {
    try {
      const result = await readSheet(metricsSheetId, `${tab}!A1:G200`, accessToken);
      if (result && result.length > 0) { rows = result; break; }
    } catch (e) {
      // try next tab name
    }
  }

  if (!rows || rows.length < 2) return { office: null, reps: [] };

  function parseMetricRow(row) {
    return {
      repName:     (row[0] || '').trim(),
      actCount:    Number(row[1]) || 0,
      lineTotal:   Number(row[2]) || 0,
      actRate:     Number(row[3]) || 0,
      churnCount:  Number(row[4]) || 0,
      activeLines: Number(row[5]) || 0,
      churnRate:   Number(row[6]) || 0,
    };
  }

  const officeRow = rows[1] || [];
  const office = {
    actCount:    Number(officeRow[0]) || 0,
    lineTotal:   Number(officeRow[1]) || 0,
    actRate:     Number(officeRow[2]) || 0,
    churnCount:  Number(officeRow[3]) || 0,
    activeLines: Number(officeRow[4]) || 0,
    churnRate:   Number(officeRow[5]) || 0,
  };

  const reps = rows.slice(4)
    .filter(row => row[0] && row[0].trim())
    .map(parseMetricRow);

  return { office, reps };
}

// ── MASTER TRACKER — DD DATA ─────────────────────────────────────────────────

export async function fetchDDData(masterSheetId, accessToken, repName = null, officeName = null) {
  const rows = await readSheet(masterSheetId, "'DD Data'!A:AA", accessToken);
  if (rows.length <= 1) return [];

  const norm = s => (s || '').toLowerCase().trim().replace(/\s*\(.*?\)\s*/g, '').trim();

  return rows.slice(1)
    .filter(row => !officeName || norm(row[0]) === norm(officeName))
    .filter(row => !repName    || norm(row[2]) === norm(repName))
    .map(row => ({
      repName:       (row[2]  || '').trim().replace(/\s*\(.*?\)\s*/g, '').trim(),
      ddWeek:        (row[8]  || '').trim(),
      clDescription: (row[15] || '').trim(),
      amount:        parseFloat((row[26] || '0').toString().replace(/[$,]/g, '')) || 0,
    }));
}

// ── MASTER TRACKER — ORDER DETAIL ────────────────────────────────────────────

const MASTER_TABS = [
  "This Week's Sales",
  "Last Week's Sales",
  "Sales Two Weeks Ago",
  "Sales Three Weeks Ago",
  "Sales Four Weeks Ago",
  "Old Sales",
];

function parseOrderRow(row) {
  return {
    office:     row[0]  || '',
    repName:    row[1]  || '',
    orderDate:  row[2]  || '',
    customer:   row[3]  || '',
    plan:       row[8]  || '',
    phone:      row[9]  || '',
    status:     row[11] || '',
    activeDate: row[12] || '',
    notes:      row[13] || '',
    followUp:   row[14] || '',
  };
}

export async function fetchOrderDetail(masterSheetId, accessToken, { customer, repName, orderDate }) {
  const normalize    = s => (s || '').toLowerCase().trim();
  const custNorm     = normalize(customer);
  const repNorm      = normalize(repName);
  const orderDateObj = orderDate ? new Date(orderDate) : null;
  const results      = [];

  for (const tab of MASTER_TABS) {
    try {
      const rows = await readSheet(masterSheetId, `'${tab}'!A:O`, accessToken);
      if (rows.length <= 1) continue;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[3]) continue;

        const rowCust = normalize(row[3]);
        const rowRep  = normalize(row[1]);
        const rowDate = row[2] ? new Date(row[2]) : null;

        const custMatch = rowCust === custNorm ||
          rowCust.startsWith(custNorm.split(' ')[0].toLowerCase());
        const repMatch  = rowRep === repNorm ||
          rowRep.includes(repNorm.split(' ')[0].toLowerCase());
        const dateMatch = !orderDateObj || !rowDate ||
          Math.abs(orderDateObj - rowDate) < 2 * 24 * 60 * 60 * 1000;

        if (custMatch && repMatch && dateMatch) {
          results.push(parseOrderRow(row));
        }
      }

      if (results.length > 0) break;
    } catch (e) {
      console.warn(`Could not read tab "${tab}":`, e.message);
    }
  }

  return results;
}
