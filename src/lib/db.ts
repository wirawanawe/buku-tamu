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

export async function getGuestsFromDb(sheetName: string): Promise<Guest[]> {
  const db = getPool();
  const [rows] = await db.execute(
    'SELECT * FROM guests WHERE sheet_name = ? ORDER BY guest_row ASC',
    [sheetName]
  );
  
  if (!Array.isArray(rows)) return [];
  
  return rows.map((r: any) => ({
    rowNumber: r.guest_row,
    no: r.no || '',
    name: r.name || '',
    undangan: r.undangan || '',
    checklist: r.checklist === 1 || r.checklist === true,
    jumlahKehadiran: r.jumlah_kehadiran || 0,
    kuponSouvenir: r.kupon_souvenir || '',
    keterangan: r.keterangan || 'Lainnya',
    konfirmasiHadir: r.konfirmasi_hadir || '',
    souvenirA: r.souvenir_a || 0,
    souvenirB: r.souvenir_b || 0,
  }));
}

export async function checkinGuest(
  sheetName: string,
  guestRow: number,
  jumlahKehadiran: number,
  souvenirA: number,
  souvenirB: number
): Promise<void> {
  const db = getPool();
  await db.execute(
    `UPDATE guests 
     SET checklist = TRUE, 
         jumlah_kehadiran = ?, 
         souvenir_a = ?, 
         souvenir_b = ? 
     WHERE sheet_name = ? AND guest_row = ?`,
    [jumlahKehadiran, souvenirA, souvenirB, sheetName, guestRow]
  );
}

export async function resetGuest(
  sheetName: string,
  guestRow: number
): Promise<void> {
  const db = getPool();
  await db.execute(
    `UPDATE guests 
     SET checklist = FALSE, 
         jumlah_kehadiran = 0, 
         souvenir_a = 0, 
         souvenir_b = 0 
     WHERE sheet_name = ? AND guest_row = ?`,
    [sheetName, guestRow]
  );
}

export async function createGuest(
  sheetName: string,
  name: string,
  keterangan: string,
  jumlahKehadiran: number,
  souvenirA: number,
  souvenirB: number
): Promise<Guest> {
  const db = getPool();
  
  // Get next guest_row
  const [rows] = await db.execute(
    'SELECT COALESCE(MAX(guest_row), 0) + 1 AS nextRow FROM guests WHERE sheet_name = ?',
    [sheetName]
  ) as any;
  const nextRow = rows[0]?.nextRow || 1;

  // Insert new guest
  await db.execute(
    `INSERT INTO guests (sheet_name, guest_row, no, name, undangan, checklist, jumlah_kehadiran, kupon_souvenir, keterangan, konfirmasi_hadir, souvenir_a, souvenir_b)
     VALUES (?, ?, '', ?, 'Undangan', TRUE, ?, 'A', ?, 'Hadir', ?, ?)`,
    [sheetName, nextRow, name, jumlahKehadiran, keterangan || 'Lainnya', souvenirA, souvenirB]
  );

  return {
    rowNumber: nextRow,
    no: '',
    name,
    undangan: 'Undangan',
    checklist: true,
    jumlahKehadiran,
    kuponSouvenir: 'A',
    keterangan: keterangan || 'Lainnya',
    konfirmasiHadir: 'Hadir',
    souvenirA,
    souvenirB
  };
}

export async function deleteGuestFromDb(sheetName: string, guestRow: number): Promise<void> {
  const db = getPool();
  await db.execute(
    'DELETE FROM guests WHERE sheet_name = ? AND guest_row = ?',
    [sheetName, guestRow]
  );
}

export async function getGrandStats(): Promise<{ total: number; hadir: number; totalOrang: number }> {
  const db = getPool();
  const [rows] = await db.execute(
    'SELECT COUNT(*) as total, SUM(checklist) as hadir, SUM(jumlah_kehadiran) as totalOrang FROM guests'
  ) as any;
  return {
    total: rows[0]?.total || 0,
    hadir: parseInt(rows[0]?.hadir, 10) || 0,
    totalOrang: parseInt(rows[0]?.totalOrang, 10) || 0,
  };
}
