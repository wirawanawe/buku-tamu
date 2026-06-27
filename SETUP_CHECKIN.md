# Cara Setup Google Apps Script untuk Check-in

Agar fitur **check-in tamu** bisa menulis ke Google Sheets, ikuti langkah berikut:

## 1. Buka Google Apps Script

1. Buka spreadsheet Anda di Google Sheets
2. Klik menu **Extensions** → **Apps Script**

## 2. Paste Kode Berikut

Hapus semua kode yang ada, lalu paste kode ini:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    var sheetName = data.sheetName;
    var rowNumber = data.rowNumber;
    var jumlahKehadiran = data.jumlahKehadiran || 0;
    var souvenirA = data.souvenirA || 0;
    var souvenirB = data.souvenirB || 0;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Sheet tidak ditemukan: ' + sheetName
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Update kolom D (Checklist) = TRUE
    sheet.getRange(rowNumber, 4).setValue(true);
    
    // Update kolom E (Jumlah Kehadiran)
    sheet.getRange(rowNumber, 5).setValue(jumlahKehadiran);
    
    // Update kolom I (SOUVENIR A)
    sheet.getRange(rowNumber, 9).setValue(souvenirA);
    
    // Update kolom J (SOUVENIR B)
    sheet.getRange(rowNumber, 10).setValue(souvenirB);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Check-in berhasil'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function (optional)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Wedding Guest Book API is running'
  })).setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Deploy sebagai Web App

1. Klik tombol **Deploy** → **New deployment**
2. Klik ikon ⚙️ gear di sebelah **Select type**, pilih **Web app**
3. Isi:
   - **Description**: Wedding Guest Book API
   - **Execute as**: **Me** (akun Anda)
   - **Who has access**: **Anyone**
4. Klik **Deploy**
5. Klik **Authorize access** → pilih akun Google Anda → klik **Allow**
6. **Salin URL** web app yang muncul

## 4. Tambahkan URL ke .env.local

Buka file `.env.local` dan tambahkan:

```
APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXXXX/exec
```

Ganti `XXXXXX` dengan URL yang Anda salin dari langkah sebelumnya.

## 5. Restart Dev Server

```bash
# Ctrl+C untuk stop, lalu jalankan lagi
npm run dev
```

Selesai! Fitur check-in seharusnya sudah berfungsi.
