import { db } from '../db';
import { attendanceTable, tendiksTable } from '../db/schema';
import { type RecapitulationFilter } from '../schema';
import { eq, gte, lte, and, desc } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';
import PDFDocument from 'pdfkit';

export async function exportRecapitulationToPDF(filter: RecapitulationFilter): Promise<Buffer> {
  try {
    // Build the query with joins
    let query = db.select({
      id: attendanceTable.id,
      tendik_id: attendanceTable.tendik_id,
      date: attendanceTable.date,
      checkin_time: attendanceTable.checkin_time,
      checkout_time: attendanceTable.checkout_time,
      status: attendanceTable.status,
      tendik_name: tendiksTable.name,
      tendik_position: tendiksTable.position
    })
    .from(attendanceTable)
    .innerJoin(tendiksTable, eq(attendanceTable.tendik_id, tendiksTable.id));

    // Build conditions for filtering
    const conditions: SQL<unknown>[] = [];

    if (filter.start_date) {
      conditions.push(gte(attendanceTable.date, filter.start_date));
    }

    if (filter.end_date) {
      conditions.push(lte(attendanceTable.date, filter.end_date));
    }

    if (filter.tendik_id) {
      conditions.push(eq(attendanceTable.tendik_id, filter.tendik_id));
    }

    if (filter.status) {
      conditions.push(eq(attendanceTable.status, filter.status));
    }

    // Build final query with conditions and ordering
    const finalQuery = conditions.length > 0 
      ? query.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : query;

    const results = await finalQuery
      .orderBy(desc(attendanceTable.date), tendiksTable.name)
      .execute();

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      doc.on('error', reject);

      // PDF Header
      doc.fontSize(16).font('Helvetica-Bold');
      doc.text('REKAP ABSENSI TENDIK', { align: 'center' });
      doc.fontSize(12).font('Helvetica');
      
      // Date range info if provided
      if (filter.start_date || filter.end_date) {
        let periodText = 'Periode: ';
        if (filter.start_date && filter.end_date) {
          periodText += `${new Date(filter.start_date).toLocaleDateString('id-ID')} - ${new Date(filter.end_date).toLocaleDateString('id-ID')}`;
        } else if (filter.start_date) {
          periodText += `Mulai ${new Date(filter.start_date).toLocaleDateString('id-ID')}`;
        } else if (filter.end_date) {
          periodText += `Sampai ${new Date(filter.end_date).toLocaleDateString('id-ID')}`;
        }
        doc.text(periodText, { align: 'center' });
      }

      doc.moveDown(2);

      // Table headers
      const startX = 50;
      let currentY = doc.y;
      const rowHeight = 25;
      const colWidths = [30, 150, 80, 100, 80, 100]; // No, Name, Date, Checkin, Status, Checkout

      // Draw table header
      doc.font('Helvetica-Bold').fontSize(10);
      const headers = ['No', 'Nama Tendik', 'Tanggal', 'Check-in', 'Status', 'Check-out'];
      let currentX = startX;

      headers.forEach((header, index) => {
        doc.rect(currentX, currentY, colWidths[index], rowHeight).stroke();
        doc.text(header, currentX + 5, currentY + 8, { width: colWidths[index] - 10 });
        currentX += colWidths[index];
      });

      currentY += rowHeight;
      doc.font('Helvetica').fontSize(9);

      // Table rows
      results.forEach((row, index) => {
        currentX = startX;
        
        // Check if we need a new page
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        const data = [
          (index + 1).toString(),
          row.tendik_name,
          row.date ? new Date(row.date + 'T00:00:00').toLocaleDateString('id-ID') : '-',
          row.checkin_time ? new Date(row.checkin_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
          row.status,
          row.checkout_time ? new Date(row.checkout_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'
        ];

        data.forEach((cell, cellIndex) => {
          doc.rect(currentX, currentY, colWidths[cellIndex], rowHeight).stroke();
          doc.text(cell, currentX + 5, currentY + 8, { width: colWidths[cellIndex] - 10 });
          currentX += colWidths[cellIndex];
        });

        currentY += rowHeight;
      });

      // Footer
      doc.moveDown(3);
      const today = new Date().toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      
      doc.text(`Ponorogo, ${today}`, { align: 'right' });
      doc.moveDown(1);
      doc.text('Kepala Madrasah', { align: 'right' });
      doc.moveDown(3);
      doc.font('Helvetica-Bold');
      doc.text('SUPRIYANTO, M.Pd', { align: 'right' });

      doc.end();
    });

  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
}

export async function generateAttendanceReport(startDate: string, endDate: string, tendikId?: number): Promise<Buffer> {
  try {
    // Build detailed query for comprehensive report
    let query = db.select({
      id: attendanceTable.id,
      tendik_id: attendanceTable.tendik_id,
      date: attendanceTable.date,
      checkin_time: attendanceTable.checkin_time,
      checkout_time: attendanceTable.checkout_time,
      status: attendanceTable.status,
      tendik_name: tendiksTable.name,
      tendik_position: tendiksTable.position
    })
    .from(attendanceTable)
    .innerJoin(tendiksTable, eq(attendanceTable.tendik_id, tendiksTable.id));

    // Apply date filters
    const conditions: SQL<unknown>[] = [];
    
    conditions.push(gte(attendanceTable.date, startDate));
    conditions.push(lte(attendanceTable.date, endDate));

    if (tendikId) {
      conditions.push(eq(attendanceTable.tendik_id, tendikId));
    }

    const results = await query
      .where(and(...conditions))
      .orderBy(tendiksTable.name, desc(attendanceTable.date))
      .execute();

    // Calculate statistics
    const stats = {
      total: results.length,
      hadir: results.filter(r => r.status === 'Hadir').length,
      terlambat: results.filter(r => r.status === 'Terlambat').length,
      alpha: results.filter(r => r.status === 'Alpha').length
    };

    // Generate comprehensive PDF report
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      doc.on('error', reject);

      // Report Header
      doc.fontSize(18).font('Helvetica-Bold');
      doc.text('LAPORAN KEHADIRAN TENDIK', { align: 'center' });
      doc.fontSize(12).font('Helvetica');
      doc.text(`Periode: ${new Date(startDate + 'T00:00:00').toLocaleDateString('id-ID')} - ${new Date(endDate + 'T00:00:00').toLocaleDateString('id-ID')}`, { align: 'center' });
      doc.moveDown(2);

      // Statistics Section
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('RINGKASAN STATISTIK');
      doc.fontSize(11).font('Helvetica');
      doc.moveDown(1);

      const statsText = [
        `Total Kehadiran: ${stats.total}`,
        `Hadir: ${stats.hadir} (${stats.total > 0 ? ((stats.hadir / stats.total) * 100).toFixed(1) : '0.0'}%)`,
        `Terlambat: ${stats.terlambat} (${stats.total > 0 ? ((stats.terlambat / stats.total) * 100).toFixed(1) : '0.0'}%)`,
        `Alpha: ${stats.alpha} (${stats.total > 0 ? ((stats.alpha / stats.total) * 100).toFixed(1) : '0.0'}%)`
      ];

      statsText.forEach(text => {
        doc.text(text);
      });

      doc.moveDown(2);

      // Detailed Attendance Table
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('RINCIAN KEHADIRAN');
      doc.moveDown(1);

      // Table setup
      const startX = 50;
      let currentY = doc.y;
      const rowHeight = 20;
      const colWidths = [25, 120, 70, 80, 70, 80, 80]; // No, Name, Position, Date, Checkin, Status, Checkout

      // Draw table header
      doc.font('Helvetica-Bold').fontSize(9);
      const headers = ['No', 'Nama', 'Jabatan', 'Tanggal', 'Check-in', 'Status', 'Check-out'];
      let currentX = startX;

      headers.forEach((header, index) => {
        doc.rect(currentX, currentY, colWidths[index], rowHeight).stroke();
        doc.text(header, currentX + 3, currentY + 6, { width: colWidths[index] - 6 });
        currentX += colWidths[index];
      });

      currentY += rowHeight;
      doc.font('Helvetica').fontSize(8);

      // Table rows
      results.forEach((row, index) => {
        currentX = startX;
        
        // Check if we need a new page
        if (currentY > 720) {
          doc.addPage();
          currentY = 50;
          
          // Redraw headers on new page
          doc.font('Helvetica-Bold').fontSize(9);
          let headerX = startX;
          headers.forEach((header, headerIndex) => {
            doc.rect(headerX, currentY, colWidths[headerIndex], rowHeight).stroke();
            doc.text(header, headerX + 3, currentY + 6, { width: colWidths[headerIndex] - 6 });
            headerX += colWidths[headerIndex];
          });
          currentY += rowHeight;
          doc.font('Helvetica').fontSize(8);
        }

        const data = [
          (index + 1).toString(),
          row.tendik_name,
          row.tendik_position,
          row.date ? new Date(row.date + 'T00:00:00').toLocaleDateString('id-ID') : '-',
          row.checkin_time ? new Date(row.checkin_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
          row.status,
          row.checkout_time ? new Date(row.checkout_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'
        ];

        data.forEach((cell, cellIndex) => {
          doc.rect(currentX, currentY, colWidths[cellIndex], rowHeight).stroke();
          doc.text(cell, currentX + 3, currentY + 6, { width: colWidths[cellIndex] - 6 });
          currentX += colWidths[cellIndex];
        });

        currentY += rowHeight;
      });

      // Footer
      doc.moveDown(3);
      const today = new Date().toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      
      doc.text(`Ponorogo, ${today}`, { align: 'right' });
      doc.moveDown(1);
      doc.text('Kepala Madrasah', { align: 'right' });
      doc.moveDown(3);
      doc.font('Helvetica-Bold');
      doc.text('SUPRIYANTO, M.Pd', { align: 'right' });

      doc.end();
    });

  } catch (error) {
    console.error('Attendance report generation failed:', error);
    throw error;
  }
}