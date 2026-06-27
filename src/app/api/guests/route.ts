import { NextResponse } from 'next/server';
import { getGuests } from '@/lib/googleSheets';
import { getCheckins, upsertCheckin, resetCheckin } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get('sheet');

    if (!sheetName) {
      return NextResponse.json({ error: 'Sheet name is required' }, { status: 400 });
    }

    // Get guest list from Google Sheets
    const guests = await getGuests(sheetName);

    // Get check-in data from MySQL
    const checkins = await getCheckins(sheetName);
    const checkinMap = new Map(checkins.map(c => [c.guest_row, c]));

    // Merge: override checklist data with MySQL data
    const mergedGuests = guests.map(guest => {
      const checkin = checkinMap.get(guest.rowNumber);
      if (checkin) {
        // If a checkin record exists in the DB, it is the source of truth (can be true or false)
        return {
          ...guest,
          checklist: checkin.checked_in === 1 || checkin.checked_in === true,
          jumlahKehadiran: checkin.jumlah_kehadiran,
          souvenirA: checkin.souvenir_a,
          souvenirB: checkin.souvenir_b,
        };
      }
      return guest;
    });

    const totalDiundang = mergedGuests.length;
    const totalHadirChecklist = mergedGuests.filter(g => g.checklist).length;
    const totalHadirOrang = mergedGuests.reduce((sum, g) => sum + g.jumlahKehadiran, 0);

    return NextResponse.json({
      guests: mergedGuests,
      stats: {
        totalDiundang,
        totalHadirChecklist,
        totalHadirOrang,
      }
    });
  } catch (error: any) {
    console.error("API GET Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sheetName, rowNumber, guestName, jumlahKehadiran, souvenirA, souvenirB } = body;

    if (!sheetName || !rowNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await upsertCheckin(
      sheetName,
      rowNumber,
      guestName || '',
      jumlahKehadiran || 0,
      souvenirA || 0,
      souvenirB || 0
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API POST Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get('sheetName');
    const rowNumber = parseInt(searchParams.get('rowNumber') || '', 10);

    if (!sheetName || isNaN(rowNumber)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await resetCheckin(sheetName, rowNumber);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API DELETE Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
