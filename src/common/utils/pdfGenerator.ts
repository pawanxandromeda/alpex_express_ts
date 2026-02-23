import PDFDocument from "pdfkit";
import { Readable } from "stream";

interface PIData {
  piNo: string;
  piDate: Date;
  logo?: string | Buffer;
  customer?: {
    customerName: string;
    gstrNo?: string;
    address?: string;
  };
  partyName?: string;
  gstNo?: string;
  transporter?: string;
  destination?: string;
  modeOfTransport?: string;
  courier?: string;
  paymentTerms?: string;
  notes?: string;
  lineItems?: Array<{
    itemNo: number;
    brandName?: string;
    composition?: string;
    orderType?: string;
    packing?: string;
    section?: string;
    qty?: string;
    mrp?: string;
    rate?: string;
    amount?: string;
    gst?: string;
    totalAmt?: string;
  }>;
  subtotal?: string;
  gstAmount?: string;
  grandTotal?: string;
  advance?: string;
  preparedBy?: { name: string; email?: string };
  checkedBy?: { name: string; email?: string };
  accountant?: { name: string; email?: string };
  designer?: { name: string; email?: string };
  authorisedBy?: { name: string; email?: string };
  bankDetails?: {
    name?: string;
    bank?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
  termsAndConditions?: string[];
}

export class PDFGenerator {
  /**
   * Generate Proforma Invoice PDF
   */
  static async generateProformaInvoicePDF(piData: PIData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        const chunks: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        // Header (logo optional)
        this.addHeader(doc, piData.logo);

        // Title
        doc.fontSize(18).font("Helvetica-Bold").fillColor("black").text("PROFORMA INVOICE", 200, 90);

        // PI Details
        doc.fontSize(9).font("Helvetica");
        const detailsY = 130;
        doc.text(`PI No: ${piData.piNo}`, 50, detailsY);
        doc.text(`Date: ${this.formatDate(piData.piDate)}`, 350, detailsY);

        // Billing Info
        const addressY = 155;
        doc.fontSize(9).font("Helvetica-Bold").text("BILL TO:", 50, addressY);
        doc.font("Helvetica");
        doc.fontSize(9).text(piData.customer?.customerName || piData.partyName || "", 50, addressY + 14);
        if (piData.customer?.gstrNo) doc.text(`GST: ${piData.customer.gstrNo}`, 50, addressY + 30);
        if (piData.customer?.address) {
          doc.text(piData.customer.address, 50, addressY + 44, { width: 260 });
        }

        // Transport & Delivery Details
        const transportY = 155;
        doc.font("Helvetica-Bold").fontSize(9).text("TRANSPORT DETAILS:", 360, transportY);
        doc.font("Helvetica");
        if (piData.transporter) doc.text(`Transporter: ${piData.transporter}`, 360, transportY + 14);
        if (piData.modeOfTransport) doc.text(`Mode: ${piData.modeOfTransport}`, 360, transportY + 28);
        if (piData.destination) doc.text(`Destination: ${piData.destination}`, 360, transportY + 42);
        if (piData.courier) doc.text(`Courier: ${piData.courier}`, 360, transportY + 56);

        // Line Items Table
        const tableY = 240;
        const lastY = this.addLineItemsTable(doc, piData.lineItems || [], tableY);

        // Financial Summary
        const summaryY = lastY + 10;
        doc
          .moveTo(50, summaryY - 6)
          .lineTo(550, summaryY - 6)
          .stroke();

        doc.font("Helvetica-Bold").fontSize(10).fillColor("black");
        doc.text("SUBTOTAL:", 360, summaryY, { width: 120, align: "right" });
        doc.text(piData.subtotal || "0", 490, summaryY, { width: 60, align: "right" });

        doc.text("GST:", 360, summaryY + 18, { width: 120, align: "right" });
        doc.text(piData.gstAmount || "0", 490, summaryY + 18, { width: 60, align: "right" });

        doc.text("GRAND TOTAL:", 360, summaryY + 36, { width: 120, align: "right" });
        doc.text(piData.grandTotal || "0", 490, summaryY + 36, { width: 60, align: "right" });

        if (piData.advance) {
          doc.text("ADVANCE:", 360, summaryY + 54, { width: 120, align: "right" });
          doc.text(piData.advance, 490, summaryY + 54, { width: 60, align: "right" });
        }

        // Payment Terms & Terms and Conditions
        const termsY = summaryY + 90;
        doc.fontSize(9).font("Helvetica-Bold").fillColor("black").text("PAYMENT TERMS & CONDITIONS:", 50, termsY);
        doc.font("Helvetica").fontSize(8);
        if (piData.paymentTerms) doc.text(piData.paymentTerms, 50, termsY + 14, { width: 520 });

        if (piData.termsAndConditions && Array.isArray(piData.termsAndConditions)) {
          let yOffset = termsY + 36;
          piData.termsAndConditions.forEach((term, index) => {
            if (yOffset > 720) {
              doc.addPage();
              yOffset = 50;
            }
            doc.text(`${index + 1}. ${term}`, 50, yOffset, { width: 520 });
            yOffset += 12;
          });
        }

        // Bank Details (separate page if present)
        if (piData.bankDetails) {
          doc.addPage();
          doc.rect(40, 45, 515, 40).fillAndStroke('#1aa237', '#1aa237');
          doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text('BANK DETAILS:', 50, 52);
          doc.fillColor('black').fontSize(9).font('Helvetica');
          let by = 75;
          if (piData.bankDetails.name) doc.text(`Name: ${piData.bankDetails.name}`, 50, by);
          if (piData.bankDetails.bank) doc.text(`Bank: ${piData.bankDetails.bank}`, 300, by);
          by += 18;
          if (piData.bankDetails.accountNumber)
            doc.text(`A/C No: ${piData.bankDetails.accountNumber}`, 50, by);
          if (piData.bankDetails.ifscCode) doc.text(`IFSC: ${piData.bankDetails.ifscCode}`, 300, by);
        }

        // Signatures
        doc.addPage();
        doc.fontSize(10).font("Helvetica-Bold").text("APPROVALS & SIGNATURES:", 50, 50);
        doc.fontSize(9).font("Helvetica");

        let sigY = 85;
        if (piData.preparedBy) doc.text(`Prepared By: ${piData.preparedBy.name}`, 50, sigY);
        if (piData.checkedBy) doc.text(`Checked By: ${piData.checkedBy.name}`, 300, sigY);

        sigY += 40;
        if (piData.accountant) doc.text(`Accountant: ${piData.accountant.name}`, 50, sigY);
        if (piData.designer) doc.text(`Designer: ${piData.designer.name}`, 300, sigY);

        sigY += 40;
        if (piData.authorisedBy) doc.text(`Authorised By: ${piData.authorisedBy.name}`, 50, sigY);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add header with company details and optional logo
   */
  private static addHeader(doc: PDFKit.PDFDocument, logo?: string | Buffer) {
    // top green banner
    doc.save();
    doc.rect(40, 20, 515, 55).fill('#1aa237');
    // logo area
    if (logo) {
      try {
        doc.image(logo as any, 50, 28, { width: 140, height: 40 });
      } catch (e) {
        // fallback to text if image fails
        doc.fillColor('white').fontSize(14).font('Helvetica-Bold').text('ALPEX PHARMA PVT. LTD.', 50, 32);
      }
    } else {
      doc.fillColor('white').fontSize(14).font('Helvetica-Bold').text('ALPEX PHARMA PVT. LTD.', 50, 32);
    }

    doc.fillColor('white').fontSize(8).font('Helvetica').text('Vill. Ogli, Saketi Road, Kala-Amb, Teh. Nahan, Distt. Sirmour-173011(H.P.)', 210, 28, { width: 320, align: 'right' });
    doc.text('marketing@alpexpharma.in', 210, 44, { width: 320, align: 'right' });
    doc.restore();
    doc.moveDown();
  }

  /**
   * Add line items table
   */
  private static addLineItemsTable(
    doc: PDFKit.PDFDocument,
    lineItems: PIData['lineItems'],
    startY: number
  ) {
    // Table headers
    const headers = ['S.NO', 'BRAND NAME', 'COMPOSITION', 'ORDER', 'PACKING', 'SECTION', 'QTY', 'MRP', 'RATE', 'AMOUNT', 'GST', 'TOTAL AMT'];
    const columnWidths = [30, 90, 120, 40, 50, 50, 40, 40, 40, 50, 40, 60];
    const columnX = [50, 80, 170, 295, 340, 395, 445, 485, 525, 565, 615, 660];

    // Adjust page width mapping (A4 width ~ 595) - clamp last x to fit
    // We'll use a simpler layout by computing x positions
    const xPositions = [50, 80, 170, 300, 345, 395, 445, 485, 525, 565, 605, 655];

    doc.fontSize(8).font('Helvetica-Bold');

    // header background
    doc.rect(45, startY - 4, 510, 16).fill('#e0e0e0');
    // Draw headers
    headers.forEach((header, i) => {
      const x = xPositions[i] || (50 + i * 40);
      doc.fillColor('black').fontSize(8).text(header, x, startY - 2, {
        width: columnWidths[i] || 40,
        align: 'center',
      });
    });

    // rows
    doc.font('Helvetica').fontSize(8).fillColor('black');
    let currentY = startY + 14;
    const rowHeight = 14;

    lineItems?.forEach((item, index) => {
      if (currentY + rowHeight > 720) {
        doc.addPage();
        currentY = 60;
      }

      const rowData = [
        String(item.itemNo || index + 1),
        item.brandName || '',
        item.composition || '',
        item.orderType || '',
        item.packing || '',
        item.section || '',
        item.qty || '',
        item.mrp || '',
        item.rate || '',
        item.amount || '',
        item.gst || '',
        item.totalAmt || item.amount || '',
      ];

      rowData.forEach((data, i) => {
        const x = xPositions[i] || (50 + i * 40);
        const align = i >= 6 ? 'right' : 'left';
        doc.text(data, x, currentY, { width: columnWidths[i] || 40, align: align as any });
      });

      currentY += rowHeight;
    });

    // bottom border
    doc.moveTo(45, currentY - 6).lineTo(560, currentY - 6).stroke();
    return currentY + 6;
  }

  /**
   * Format date
   */
  private static formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
}

export default PDFGenerator;
