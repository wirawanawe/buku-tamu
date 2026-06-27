import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'buku_tamu',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export interface CheckinRecord {
  sheet_name: string;
  guest_row: number;
  guest_name: string;
  jumlah_kehadiran: number;
  souvenir_a: number;
  souvenir_b: number;
  checked_in: boolean;
}

export async function getCheckins(sheetName: string): Promise<CheckinRecord[]> {
  const db = getPool();
  const [rows] = await db.execute(
    'SELECT * FROM checkins WHERE sheet_name = ?',
    [sheetName]
  );
  return rows as CheckinRecord[];
}

export async function upsertCheckin(
  sheetName: string,
  guestRow: number,
  guestName: string,
  jumlahKehadiran: number,
  souvenirA: number,
  souvenirB: number
): Promise<void> {
  const db = getPool();
  await db.execute(
    `INSERT INTO checkins (sheet_name, guest_row, guest_name, jumlah_kehadiran, souvenir_a, souvenir_b, checked_in)
     VALUES (?, ?, ?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE
       guest_name = VALUES(guest_name),
       jumlah_kehadiran = VALUES(jumlah_kehadiran),
       souvenir_a = VALUES(souvenir_a),
       souvenir_b = VALUES(souvenir_b),
       checked_in = TRUE`,
    [sheetName, guestRow, guestName, jumlahKehadiran, souvenirA, souvenirB]
  );
}

export async function resetCheckin(sheetName: string, guestRow: number): Promise<void> {
  const db = getPool();
  await db.execute(
    `INSERT INTO checkins (sheet_name, guest_row, guest_name, jumlah_kehadiran, souvenir_a, souvenir_b, checked_in)
     VALUES (?, ?, '', 0, 0, 0, FALSE)
     ON DUPLICATE KEY UPDATE
       jumlah_kehadiran = 0,
       souvenir_a = 0,
       souvenir_b = 0,
       checked_in = FALSE`,
    [sheetName, guestRow]
  );
}
