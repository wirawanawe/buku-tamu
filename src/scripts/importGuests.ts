import { getGuests } from '../lib/googleSheets';
import { getPool } from '../lib/db';

async function main() {
  console.log('Starting migration: Google Sheets -> MySQL...');
  
  const pool = getPool();
  const sheets = ['Tamu Rahma (Perempuan)', 'Tamu Angga (Laki Laki)'];

  try {
    // 1. Fetch any existing check-ins from the checkins table to prevent data loss
    const [existingCheckins] = await pool.execute('SELECT * FROM checkins') as any;
    const checkinMap = new Map();
    
    if (Array.isArray(existingCheckins)) {
      for (const c of existingCheckins) {
        checkinMap.set(`${c.sheet_name}-${c.guest_row}`, c);
      }
    }
    console.log(`Found ${checkinMap.size} existing check-ins to preserve.`);

    // 2. Fetch and import guests for each sheet
    for (const sheet of sheets) {
      console.log(`Fetching data for: "${sheet}"...`);
      const guests = await getGuests(sheet);
      console.log(`Fetched ${guests.length} guests. Inserting into MySQL "guests" table...`);

      for (const guest of guests) {
        // Check if there is an existing checkin for this guest
        const key = `${sheet}-${guest.rowNumber}`;
        const checkin = checkinMap.get(key);
        
        let checklist = guest.checklist;
        let jumlahKehadiran = guest.jumlahKehadiran;
        let souvenirA = guest.souvenirA;
        let souvenirB = guest.souvenirB;

        // If there was a checkin record in DB, override Sheet values
        if (checkin) {
          checklist = checkin.checked_in === 1 || checkin.checked_in === true;
          jumlahKehadiran = checkin.jumlah_kehadiran;
          souvenirA = checkin.souvenir_a;
          souvenirB = checkin.souvenir_b;
        }

        await pool.execute(
          `INSERT INTO guests (sheet_name, guest_row, no, name, undangan, checklist, jumlah_kehadiran, kupon_souvenir, keterangan, konfirmasi_hadir, souvenir_a, souvenir_b)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             no = VALUES(no),
             name = VALUES(name),
             undangan = VALUES(undangan),
             checklist = VALUES(checklist),
             jumlah_kehadiran = VALUES(jumlah_kehadiran),
             kupon_souvenir = VALUES(kupon_souvenir),
             keterangan = VALUES(keterangan),
             konfirmasi_hadir = VALUES(konfirmasi_hadir),
             souvenir_a = VALUES(souvenir_a),
             souvenir_b = VALUES(souvenir_b)`,
          [
            sheet,
            guest.rowNumber,
            guest.no,
            guest.name,
            guest.undangan,
            checklist ? 1 : 0,
            jumlahKehadiran,
            guest.kuponSouvenir,
            guest.keterangan,
            guest.konfirmasiHadir,
            souvenirA,
            souvenirB
          ]
        );
      }
      console.log(`Imported "${sheet}" successfully.`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

main();
