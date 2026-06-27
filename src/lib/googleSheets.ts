export const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1BjCYp-RaJUD_F5XT7DB8xbTbRHPRxQ3iWIJBpZENjRM';

export interface Guest {
  rowNumber: number;
  no: string;
  name: string;
  undangan: string;
  checklist: boolean;
  jumlahKehadiran: number;
  kuponSouvenir: string;
  keterangan: string;
  konfirmasiHadir: string;
  souvenirA: number;
  souvenirB: number;
}

/**
 * Parse CSV string into array of string arrays.
 * Handles quoted fields with commas and newlines inside.
 */
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current.trim());
        current = '';
      } else if (char === '\n') {
        row.push(current.trim());
        current = '';
        if (row.some(cell => cell !== '')) {
          rows.push(row);
        }
        row = [];
      } else if (char === '\r') {
        // skip carriage return
      } else {
        current += char;
      }
    }
  }

  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.some(cell => cell !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

export async function getGuests(sheetName: string): Promise<Guest[]> {
  const SHEET_GID_MAP: Record<string, string> = {
    "Tamu Rahma (Perempuan)": "0",
    "Tamu Angga (Laki Laki)": "1379497232"
  };

  const gid = SHEET_GID_MAP[sheetName] || '0';
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;

  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to fetch spreadsheet data: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  const allRows = parseCSV(csvText);

  let currentGroup = 'Lainnya';
  const guests: Guest[] = [];

  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    if (!row || row.length === 0) continue;

    const col0 = (row[0] || '').trim();
    const col1 = (row[1] || '').trim();

    // 1. Skip spreadsheet title and header rows
    if (col0.startsWith('Daftar Hadir') || col0 === 'No' || col1.startsWith('Nama Tamu')) {
      continue;
    }

    // 2. Detect section headers (e.g. KELUARGA AKI USEP)
    // A section header has text in column 0 but column 1 is empty.
    if (col0 !== '' && col1 === '') {
      currentGroup = col0;
      continue;
    }

    // 3. Parse guest rows
    // A guest row has a number in column 0 and a guest name in column 1.
    if (col0 !== '' && col1 !== '') {
      const name = col1;
      const no = col0;
      const undangan = (row[2] || '').trim();
      const checklist = (row[3] || '').trim().toUpperCase() === 'TRUE';
      const jumlahKehadiran = parseInt(row[4], 10) || 0;
      const kuponSouvenir = (row[5] || '').trim();
      const konfirmasiHadir = (row[7] || '').trim();
      const souvenirA = parseInt(row[8], 10) || 0;
      const souvenirB = parseInt(row[9], 10) || 0;

      guests.push({
        rowNumber: i + 1, // 1-based row index matching spreadsheet row number exactly
        no,
        name,
        undangan,
        checklist,
        jumlahKehadiran,
        kuponSouvenir,
        keterangan: currentGroup, // Override Keterangan with the Section Header
        konfirmasiHadir,
        souvenirA,
        souvenirB,
      });
    }
  }

  return guests.filter(guest => guest.name && guest.name.trim() !== '');
}
