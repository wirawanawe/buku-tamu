import { NextResponse } from 'next/server';
import { getGuestsFromDb, checkinGuest, resetGuest, createGuest, deleteGuestFromDb, getGrandStats } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get('sheet');

    if (!sheetName) {
      return NextResponse.json({ error: 'Sheet name is required' }, { status: 400 });
    }

    // Get guest list from MySQL database directly
    const guests = await getGuestsFromDb(sheetName);

    const totalDiundang = guests.length;
    const totalHadirChecklist = guests.filter(g => g.checklist).length;
    const totalHadirOrang = guests.reduce((sum, g) => sum + g.jumlahKehadiran, 0);

    // Get grand stats (combined totals across all sheets)
    const grandStats = await getGrandStats();

    return NextResponse.json({
      guests,
      stats: {
        totalDiundang,
        totalHadirChecklist,
        totalHadirOrang,
      },
      grandStats
    });
  } catch (error: any) {
    console.error("API GET Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, sheetName, rowNumber, name, keterangan, jumlahKehadiran, souvenirA, souvenirB } = body;

    if (!sheetName) {
      return NextResponse.json({ error: 'Missing sheet name' }, { status: 400 });
    }

    if (action === 'create') {
      if (!name) {
        return NextResponse.json({ error: 'Nama tamu wajib diisi' }, { status: 400 });
      }
      const newGuest = await createGuest(
        sheetName,
        name,
        keterangan || 'Lainnya',
        jumlahKehadiran || 0,
        souvenirA || 0,
        souvenirB || 0
      );
      return NextResponse.json({ success: true, guest: newGuest });
    } else {
      if (!rowNumber) {
        return NextResponse.json({ error: 'Missing row number' }, { status: 400 });
      }

      await checkinGuest(
        sheetName,
        rowNumber,
        jumlahKehadiran || 0,
        souvenirA || 0,
        souvenirB || 0
      );

      return NextResponse.json({ success: true });
    }
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
    const action = searchParams.get('action');

    if (!sheetName || isNaN(rowNumber)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'delete') {
      await deleteGuestFromDb(sheetName, rowNumber);
    } else {
      await resetGuest(sheetName, rowNumber);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API DELETE Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
