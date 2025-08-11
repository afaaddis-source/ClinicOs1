import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Language, formatDateTime, formatCurrency, formatNumber } from './i18n';

// Arabic font support (base64 encoded - placeholder for actual font)
const NOTO_SANS_ARABIC = 'placeholder-base64-font-data';

interface PDFConfig {
  language: Language;
  direction: 'rtl' | 'ltr';
  font: string;
  fontSize: number;
  lineHeight: number;
}

interface ClinicInfo {
  nameAr: string;
  nameEn: string;
  addressAr: string;
  addressEn: string;
  phone: string;
  email: string;
  website?: string;
}

interface PatientInfo {
  id: string;
  firstName: string;
  lastName: string;
  civilId?: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE';
  address?: string;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  patient: PatientInfo;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL';
}

interface PaymentData {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference?: string;
}

interface VisitData {
  id: string;
  visitDate: string;
  patient: PatientInfo;
  doctor: {
    fullName: string;
  };
  chiefComplaint?: string;
  diagnosis?: string;
  procedures?: any[];
  doctorNotes?: string;
  followUpDate?: string;
}

export class PDFGenerator {
  private config: PDFConfig;
  private doc: jsPDF;
  private clinicInfo: ClinicInfo;
  private t: (key: string) => string;

  constructor(
    language: Language,
    clinicInfo: ClinicInfo,
    t: (key: string) => string
  ) {
    this.config = {
      language,
      direction: language === 'ar' ? 'rtl' : 'ltr',
      font: language === 'ar' ? 'NotoSansArabic' : 'helvetica',
      fontSize: language === 'ar' ? 14 : 12,
      lineHeight: language === 'ar' ? 1.8 : 1.6
    };

    this.clinicInfo = clinicInfo;
    this.t = t;

    // Initialize jsPDF with proper orientation for Arabic
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add Arabic font support
    if (language === 'ar') {
      this.setupArabicFont();
    }
  }

  private setupArabicFont() {
    // Add Arabic font (this would need actual font data)
    // For now, we'll use the default font with proper text direction
    this.doc.setFont('helvetica');
    this.doc.setFontSize(this.config.fontSize);
  }

  private addHeader() {
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const isRTL = this.config.direction === 'rtl';

    // Clinic name
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    
    const clinicName = this.config.language === 'ar' 
      ? this.clinicInfo.nameAr 
      : this.clinicInfo.nameEn;
    
    if (isRTL) {
      this.doc.text(clinicName, pageWidth - 20, 25, { align: 'right' });
    } else {
      this.doc.text(clinicName, 20, 25);
    }

    // Clinic address
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    
    const address = this.config.language === 'ar'
      ? this.clinicInfo.addressAr
      : this.clinicInfo.addressEn;

    if (isRTL) {
      this.doc.text(address, pageWidth - 20, 35, { align: 'right' });
      this.doc.text(`${this.t('admin.clinic_phone')}: ${this.clinicInfo.phone}`, pageWidth - 20, 45, { align: 'right' });
      this.doc.text(`${this.t('admin.clinic_email')}: ${this.clinicInfo.email}`, pageWidth - 20, 55, { align: 'right' });
    } else {
      this.doc.text(address, 20, 35);
      this.doc.text(`${this.t('admin.clinic_phone')}: ${this.clinicInfo.phone}`, 20, 45);
      this.doc.text(`${this.t('admin.clinic_email')}: ${this.clinicInfo.email}`, 20, 55);
    }

    // Line separator
    this.doc.setLineWidth(0.5);
    this.doc.line(20, 65, pageWidth - 20, 65);

    return 75; // Return Y position after header
  }

  private addFooter() {
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const pageHeight = this.doc.internal.pageSize.getHeight();
    const isRTL = this.config.direction === 'rtl';

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');

    const footerText = this.t('print.document_footer');
    const printDate = `${this.t('print.print_date')}: ${formatDateTime(new Date(), this.config.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;

    if (isRTL) {
      this.doc.text(footerText, pageWidth - 20, pageHeight - 20, { align: 'right' });
      this.doc.text(printDate, pageWidth - 20, pageHeight - 10, { align: 'right' });
    } else {
      this.doc.text(footerText, 20, pageHeight - 20);
      this.doc.text(printDate, 20, pageHeight - 10);
    }
  }

  private addPatientInfo(patient: PatientInfo, startY: number): number {
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const isRTL = this.config.direction === 'rtl';
    let currentY = startY;

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');

    const patientInfoTitle = this.t('print.patient_info');
    if (isRTL) {
      this.doc.text(patientInfoTitle, pageWidth - 20, currentY, { align: 'right' });
    } else {
      this.doc.text(patientInfoTitle, 20, currentY);
    }

    currentY += 15;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');

    const patientData = [
      `${this.t('patients.full_name')}: ${patient.firstName} ${patient.lastName}`,
      `${this.t('patients.civil_id')}: ${patient.civilId || this.t('common.none')}`,
      `${this.t('patients.phone')}: ${patient.phone}`,
      `${this.t('patients.email')}: ${patient.email || this.t('common.none')}`,
    ];

    if (patient.dateOfBirth) {
      patientData.push(`${this.t('patients.date_of_birth')}: ${formatDateTime(patient.dateOfBirth, this.config.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`);
    }

    if (patient.gender) {
      const genderKey = patient.gender.toLowerCase() as 'male' | 'female';
      patientData.push(`${this.t('patients.gender')}: ${this.t(`gender.${genderKey}`)}`);
    }

    patientData.forEach(line => {
      if (isRTL) {
        this.doc.text(line, pageWidth - 20, currentY, { align: 'right' });
      } else {
        this.doc.text(line, 20, currentY);
      }
      currentY += 10;
    });

    return currentY + 10;
  }

  generateInvoice(invoiceData: InvoiceData): void {
    let currentY = this.addHeader();

    // Invoice title and number
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    const invoiceTitle = this.t('billing.invoice');
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const isRTL = this.config.direction === 'rtl';

    if (isRTL) {
      this.doc.text(invoiceTitle, pageWidth - 20, currentY, { align: 'right' });
      currentY += 15;
      this.doc.text(`${this.t('billing.invoice_number')}: ${invoiceData.invoiceNumber}`, pageWidth - 20, currentY, { align: 'right' });
    } else {
      this.doc.text(invoiceTitle, 20, currentY);
      currentY += 15;
      this.doc.text(`${this.t('billing.invoice_number')}: ${invoiceData.invoiceNumber}`, 20, currentY);
    }

    currentY += 20;

    // Patient information
    currentY = this.addPatientInfo(invoiceData.patient, currentY);

    // Invoice dates
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');

    const issueDate = `${this.t('billing.issue_date')}: ${formatDateTime(invoiceData.issueDate, this.config.language)}`;
    
    if (isRTL) {
      this.doc.text(issueDate, pageWidth - 20, currentY, { align: 'right' });
    } else {
      this.doc.text(issueDate, 20, currentY);
    }

    if (invoiceData.dueDate) {
      currentY += 10;
      const dueDate = `${this.t('billing.due_date')}: ${formatDateTime(invoiceData.dueDate, this.config.language)}`;
      if (isRTL) {
        this.doc.text(dueDate, pageWidth - 20, currentY, { align: 'right' });
      } else {
        this.doc.text(dueDate, 20, currentY);
      }
    }

    currentY += 20;

    // Invoice items table
    const tableData = invoiceData.items.map(item => [
      item.description,
      formatNumber(item.quantity, this.config.language),
      formatCurrency(item.unitPrice, this.config.language),
      formatCurrency(item.total, this.config.language)
    ]);

    (this.doc as any).autoTable({
      startY: currentY,
      head: [[
        this.t('billing.description'),
        this.t('billing.quantity'),
        this.t('billing.unit_price'),
        this.t('billing.line_total')
      ]],
      body: tableData,
      styles: {
        font: 'helvetica',
        fontSize: this.config.fontSize - 2,
        textColor: [0, 0, 0],
        halign: isRTL ? 'right' : 'left'
      },
      headStyles: {
        fillColor: [240, 240, 240],
        fontStyle: 'bold',
        halign: isRTL ? 'right' : 'left'
      },
      bodyStyles: {
        halign: isRTL ? 'right' : 'left'
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      margin: { top: 10, right: 20, bottom: 10, left: 20 },
      theme: 'grid'
    });

    // Get the final Y position after the table
    currentY = (this.doc as any).lastAutoTable.finalY + 20;

    // Invoice totals
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');

    const totals = [
      `${this.t('billing.subtotal')}: ${formatCurrency(invoiceData.subtotal, this.config.language)}`,
      `${this.t('billing.discount')}: ${formatCurrency(invoiceData.discount, this.config.language)}`,
      `${this.t('billing.tax')}: ${formatCurrency(invoiceData.tax, this.config.language)}`,
      `${this.t('billing.total_amount')}: ${formatCurrency(invoiceData.total, this.config.language)}`,
      `${this.t('billing.paid_amount')}: ${formatCurrency(invoiceData.paidAmount, this.config.language)}`
    ];

    const remainingAmount = invoiceData.total - invoiceData.paidAmount;
    if (remainingAmount > 0) {
      totals.push(`${this.t('billing.remaining_amount')}: ${formatCurrency(remainingAmount, this.config.language)}`);
    }

    totals.forEach(total => {
      if (isRTL) {
        this.doc.text(total, pageWidth - 20, currentY, { align: 'right' });
      } else {
        this.doc.text(total, pageWidth / 2, currentY);
      }
      currentY += 10;
    });

    this.addFooter();
  }

  generateReceipt(invoiceData: InvoiceData, paymentData: PaymentData): void {
    let currentY = this.addHeader();

    // Receipt title
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    const receiptTitle = this.t('billing.receipt');
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const isRTL = this.config.direction === 'rtl';

    if (isRTL) {
      this.doc.text(receiptTitle, pageWidth - 20, currentY, { align: 'right' });
    } else {
      this.doc.text(receiptTitle, 20, currentY);
    }

    currentY += 20;

    // Payment information
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');

    const paymentInfo = [
      `${this.t('billing.payment_amount')}: ${formatCurrency(paymentData.amount, this.config.language)}`,
      `${this.t('billing.payment_date')}: ${formatDateTime(paymentData.paymentDate, this.config.language)}`,
      `${this.t('billing.payment_method')}: ${this.t(`payment_methods.${paymentData.method.toLowerCase()}`)}`
    ];

    if (paymentData.reference) {
      paymentInfo.push(`${this.t('billing.payment_reference')}: ${paymentData.reference}`);
    }

    paymentInfo.forEach(info => {
      if (isRTL) {
        this.doc.text(info, pageWidth - 20, currentY, { align: 'right' });
      } else {
        this.doc.text(info, 20, currentY);
      }
      currentY += 10;
    });

    currentY += 10;

    // Patient information
    currentY = this.addPatientInfo(invoiceData.patient, currentY);

    this.addFooter();
  }

  generateVisitSummary(visitData: VisitData): void {
    let currentY = this.addHeader();

    // Visit summary title
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    const visitTitle = this.t('print.visit_summary');
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const isRTL = this.config.direction === 'rtl';

    if (isRTL) {
      this.doc.text(visitTitle, pageWidth - 20, currentY, { align: 'right' });
    } else {
      this.doc.text(visitTitle, 20, currentY);
    }

    currentY += 20;

    // Visit date and doctor
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');

    const visitInfo = [
      `${this.t('visits.visit_date')}: ${formatDateTime(visitData.visitDate, this.config.language)}`,
      `${this.t('visits.doctor')}: ${visitData.doctor.fullName}`
    ];

    visitInfo.forEach(info => {
      if (isRTL) {
        this.doc.text(info, pageWidth - 20, currentY, { align: 'right' });
      } else {
        this.doc.text(info, 20, currentY);
      }
      currentY += 10;
    });

    currentY += 10;

    // Patient information
    currentY = this.addPatientInfo(visitData.patient, currentY);

    // Medical information
    if (visitData.chiefComplaint) {
      this.doc.setFont('helvetica', 'bold');
      const complaintTitle = this.t('visits.chief_complaint');
      if (isRTL) {
        this.doc.text(complaintTitle, pageWidth - 20, currentY, { align: 'right' });
      } else {
        this.doc.text(complaintTitle, 20, currentY);
      }
      currentY += 10;

      this.doc.setFont('helvetica', 'normal');
      // Split text for proper wrapping
      const complaintLines = this.doc.splitTextToSize(visitData.chiefComplaint, pageWidth - 40);
      complaintLines.forEach((line: string) => {
        if (isRTL) {
          this.doc.text(line, pageWidth - 20, currentY, { align: 'right' });
        } else {
          this.doc.text(line, 20, currentY);
        }
        currentY += 8;
      });
      currentY += 5;
    }

    if (visitData.diagnosis) {
      this.doc.setFont('helvetica', 'bold');
      const diagnosisTitle = this.t('visits.diagnosis');
      if (isRTL) {
        this.doc.text(diagnosisTitle, pageWidth - 20, currentY, { align: 'right' });
      } else {
        this.doc.text(diagnosisTitle, 20, currentY);
      }
      currentY += 10;

      this.doc.setFont('helvetica', 'normal');
      const diagnosisLines = this.doc.splitTextToSize(visitData.diagnosis, pageWidth - 40);
      diagnosisLines.forEach((line: string) => {
        if (isRTL) {
          this.doc.text(line, pageWidth - 20, currentY, { align: 'right' });
        } else {
          this.doc.text(line, 20, currentY);
        }
        currentY += 8;
      });
      currentY += 5;
    }

    // Procedures
    if (visitData.procedures && visitData.procedures.length > 0) {
      this.doc.setFont('helvetica', 'bold');
      const proceduresTitle = this.t('visits.procedures');
      if (isRTL) {
        this.doc.text(proceduresTitle, pageWidth - 20, currentY, { align: 'right' });
      } else {
        this.doc.text(proceduresTitle, 20, currentY);
      }
      currentY += 15;

      this.doc.setFont('helvetica', 'normal');
      visitData.procedures.forEach(procedure => {
        const procedureText = `• ${procedure.serviceName || procedure.description}`;
        if (isRTL) {
          this.doc.text(procedureText, pageWidth - 20, currentY, { align: 'right' });
        } else {
          this.doc.text(procedureText, 30, currentY);
        }
        currentY += 10;
      });
      currentY += 10;
    }

    // Doctor notes
    if (visitData.doctorNotes) {
      this.doc.setFont('helvetica', 'bold');
      const notesTitle = this.t('visits.notes');
      if (isRTL) {
        this.doc.text(notesTitle, pageWidth - 20, currentY, { align: 'right' });
      } else {
        this.doc.text(notesTitle, 20, currentY);
      }
      currentY += 10;

      this.doc.setFont('helvetica', 'normal');
      const notesLines = this.doc.splitTextToSize(visitData.doctorNotes, pageWidth - 40);
      notesLines.forEach((line: string) => {
        if (isRTL) {
          this.doc.text(line, pageWidth - 20, currentY, { align: 'right' });
        } else {
          this.doc.text(line, 20, currentY);
        }
        currentY += 8;
      });
      currentY += 10;
    }

    // Follow-up date
    if (visitData.followUpDate) {
      this.doc.setFont('helvetica', 'bold');
      const followUpText = `${this.t('visits.follow_up')}: ${formatDateTime(visitData.followUpDate, this.config.language)}`;
      if (isRTL) {
        this.doc.text(followUpText, pageWidth - 20, currentY, { align: 'right' });
      } else {
        this.doc.text(followUpText, 20, currentY);
      }
      currentY += 15;
    }

    // Signature area
    currentY += 20;
    this.doc.setFont('helvetica', 'normal');
    
    const signatureY = Math.max(currentY, 200);
    if (isRTL) {
      this.doc.text(`${this.t('print.doctor_signature')}: ____________________`, pageWidth - 20, signatureY, { align: 'right' });
    } else {
      this.doc.text(`${this.t('print.doctor_signature')}: ____________________`, 20, signatureY);
    }

    this.addFooter();
  }

  save(filename: string): void {
    this.doc.save(filename);
  }

  output(): string {
    return this.doc.output('datauristring');
  }
}

// Utility functions for generating PDFs
export const generateInvoicePDF = async (
  invoiceData: InvoiceData,
  language: Language,
  clinicInfo: ClinicInfo,
  t: (key: string) => string
): Promise<void> => {
  const pdf = new PDFGenerator(language, clinicInfo, t);
  pdf.generateInvoice(invoiceData);
  pdf.save(`invoice-${invoiceData.invoiceNumber}.pdf`);
};

export const generateReceiptPDF = async (
  invoiceData: InvoiceData,
  paymentData: PaymentData,
  language: Language,
  clinicInfo: ClinicInfo,
  t: (key: string) => string
): Promise<void> => {
  const pdf = new PDFGenerator(language, clinicInfo, t);
  pdf.generateReceipt(invoiceData, paymentData);
  pdf.save(`receipt-${paymentData.id}.pdf`);
};

export const generateVisitSummaryPDF = async (
  visitData: VisitData,
  language: Language,
  clinicInfo: ClinicInfo,
  t: (key: string) => string
): Promise<void> => {
  const pdf = new PDFGenerator(language, clinicInfo, t);
  pdf.generateVisitSummary(visitData);
  pdf.save(`visit-${visitData.id}.pdf`);
};