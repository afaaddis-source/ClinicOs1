import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireRole } from "../middleware/auth";
import { insertVisitSchema, VisitProcedure } from "../../shared/schema";
import { z } from "zod";

const router = Router();

// Get all visits (Admin/Reception can see all, Doctor sees own)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { user } = req.session;
    if (!user) return res.status(401).json({ error: "Authentication required" });
    if (!user) return res.status(401).json({ error: "Authentication required" });
    let visits;

    if (user.role === "DOCTOR") {
      visits = await storage.getVisitsByDoctor(user.id);
    } else {
      visits = await storage.getAllVisits();
    }

    res.json(visits);
  } catch (error) {
    console.error("Error fetching visits:", error);
    res.status(500).json({ error: "Failed to fetch visits" });
  }
});

// Get visit by ID with details
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.session;
    if (!user) return res.status(401).json({ error: "Authentication required" });
    
    const visit = await storage.getVisitWithDetails(id);
    if (!visit) {
      return res.status(404).json({ error: "Visit not found" });
    }

    // Check permissions - doctors can only see their own visits
    if (user.role === "DOCTOR" && visit.doctorId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(visit);
  } catch (error) {
    console.error("Error fetching visit:", error);
    res.status(500).json({ error: "Failed to fetch visit" });
  }
});

// Get visits by patient ID
router.get("/patient/:patientId", requireAuth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { user } = req.session;
    if (!user) return res.status(401).json({ error: "Authentication required" });
    
    let visits;
    if (user.role === "DOCTOR") {
      // Filter to only show this doctor's visits for this patient
      const allVisits = await storage.getVisitsByPatient(patientId);
      visits = allVisits.filter(visit => visit.doctorId === user.id);
    } else {
      visits = await storage.getVisitsByPatient(patientId);
    }

    res.json(visits);
  } catch (error) {
    console.error("Error fetching patient visits:", error);
    res.status(500).json({ error: "Failed to fetch patient visits" });
  }
});

// Create new visit
router.post("/", requireAuth, requireRole(["ADMIN", "DOCTOR", "RECEPTION"]), async (req, res) => {
  try {
    const { user } = req.session;
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const visitData = insertVisitSchema.parse(req.body);

    // If appointment ID is provided, verify it exists and mark as completed
    if (visitData.appointmentId) {
      const appointment = await storage.getAppointment(visitData.appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Update appointment status to completed
      await storage.updateAppointment(visitData.appointmentId, { status: "COMPLETED" });
    }

    // Calculate total amount from procedures
    let totalAmount = "0";
    if (visitData.proceduresJson && Array.isArray(visitData.proceduresJson)) {
      let total = 0;
      for (const procedure of visitData.proceduresJson as VisitProcedure[]) {
        const service = await storage.getService(procedure.serviceId);
        if (service) {
          total += parseFloat(service.price);
        }
      }
      totalAmount = total.toFixed(3);
    }

    const visit = await storage.createVisit({
      ...visitData,
      totalAmount,
      doctorId: user.role === "DOCTOR" ? user.id : visitData.doctorId
    });

    // Log audit
    await storage.createAuditLog({
      userId: user.id,
      action: "CREATE",
      tableName: "visits",
      recordId: visit.id,
      newValues: visit
    });

    res.status(201).json(visit);
  } catch (error) {
    console.error("Error creating visit:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create visit" });
  }
});

// Update visit
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.session;
    if (!user) return res.status(401).json({ error: "Authentication required" });
    
    const existingVisit = await storage.getVisit(id);
    if (!existingVisit) {
      return res.status(404).json({ error: "Visit not found" });
    }

    // Check permissions - doctors can only edit their own visits
    if (user.role === "DOCTOR" && existingVisit.doctorId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updateData = req.body;

    // Recalculate total amount if procedures changed
    if (updateData.proceduresJson && Array.isArray(updateData.proceduresJson)) {
      let total = 0;
      for (const procedure of updateData.proceduresJson as VisitProcedure[]) {
        const service = await storage.getService(procedure.serviceId);
        if (service) {
          total += parseFloat(service.price);
        }
      }
      updateData.totalAmount = total.toFixed(3);
    }

    const visit = await storage.updateVisit(id, updateData);

    // Log audit
    await storage.createAuditLog({
      userId: user.id,
      action: "UPDATE",
      tableName: "visits",
      recordId: id,
      oldValues: existingVisit,
      newValues: visit
    });

    res.json(visit);
  } catch (error) {
    console.error("Error updating visit:", error);
    res.status(500).json({ error: "Failed to update visit" });
  }
});

// Delete visit (Admin only)
router.delete("/:id", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.session;
    if (!user) return res.status(401).json({ error: "Authentication required" });
    
    const existingVisit = await storage.getVisit(id);
    if (!existingVisit) {
      return res.status(404).json({ error: "Visit not found" });
    }

    const success = await storage.deleteVisit(id);
    if (!success) {
      return res.status(404).json({ error: "Visit not found" });
    }

    // Log audit
    await storage.createAuditLog({
      userId: user.id,
      action: "DELETE",
      tableName: "visits",
      recordId: id,
      oldValues: existingVisit
    });

    res.json({ message: "Visit deleted successfully" });
  } catch (error) {
    console.error("Error deleting visit:", error);
    res.status(500).json({ error: "Failed to delete visit" });
  }
});

// Start visit from appointment
router.post("/start/:appointmentId", requireAuth, requireRole(["ADMIN", "DOCTOR", "RECEPTION"]), async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { user } = req.session;
    if (!user) return res.status(401).json({ error: "Authentication required" });
    
    const appointment = await storage.getAppointmentWithDetails(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Check if appointment is already completed or has a visit
    if (appointment.status === "COMPLETED") {
      return res.status(400).json({ error: "Appointment already completed" });
    }

    // Create visit from appointment
    const visit = await storage.createVisit({
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      visitDate: new Date(),
      status: "IN_PROGRESS",
      proceduresJson: appointment.serviceId ? [{
        serviceId: appointment.serviceId,
        notes: `Started from appointment: ${appointment.notes || ''}`
      }] : []
    });

    // Update appointment status to completed
    await storage.updateAppointment(appointmentId, { status: "COMPLETED" });

    // Log audit
    await storage.createAuditLog({
      userId: user.id,
      action: "CREATE",
      tableName: "visits",
      recordId: visit.id,
      newValues: visit
    });

    res.status(201).json(visit);
  } catch (error) {
    console.error("Error starting visit from appointment:", error);
    res.status(500).json({ error: "Failed to start visit" });
  }
});

// Create invoice from visit
router.post("/:id/invoice", requireAuth, requireRole(["ADMIN", "RECEPTION", "ACCOUNTANT"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.session;
    if (!user) return res.status(401).json({ error: "Authentication required" });
    
    const visit = await storage.getVisitWithDetails(id);
    if (!visit) {
      return res.status(404).json({ error: "Visit not found" });
    }

    // Check if invoice already exists for this visit
    const existingInvoices = await storage.getInvoicesByPatient(visit.patientId);
    const existingInvoice = existingInvoices.find(inv => inv.visitId === id);
    if (existingInvoice) {
      return res.status(400).json({ error: "Invoice already exists for this visit" });
    }

    // Generate invoice number
    const invoiceCount = existingInvoices.length + 1;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${invoiceCount.toString().padStart(3, '0')}`;

    // Calculate totals from procedures
    let subtotal = 0;
    const items = [];
    
    if (visit.proceduresJson && Array.isArray(visit.proceduresJson)) {
      for (const procedure of visit.proceduresJson as VisitProcedure[]) {
        const service = await storage.getService(procedure.serviceId);
        if (service) {
          const itemPrice = parseFloat(service.price);
          subtotal += itemPrice;
          items.push({
            serviceId: service.id,
            description: `${service.nameAr} ${procedure.tooth ? `- السن ${procedure.tooth}` : ''}${procedure.notes ? ` (${procedure.notes})` : ''}`,
            quantity: 1,
            unitPrice: service.price,
            totalPrice: service.price
          });
        }
      }
    }

    const totalAmount = subtotal; // No tax or discount for now

    // Create invoice
    const invoice = await storage.createInvoice({
      invoiceNumber,
      patientId: visit.patientId,
      visitId: id,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      subtotal: subtotal.toFixed(3),
      taxAmount: "0.000",
      discountAmount: "0.000", 
      totalAmount: totalAmount.toFixed(3),
      paidAmount: "0.000",
      paymentStatus: "PENDING",
      notes: `فاتورة للزيارة بتاريخ ${visit.visitDate.toLocaleDateString('ar-SA')}`,
      createdBy: user.id
    });

    // Create invoice items
    for (const item of items) {
      await storage.createInvoiceItem({
        invoiceId: invoice.id,
        ...item
      });
    }

    // Log audit
    await storage.createAuditLog({
      userId: user.id,
      action: "CREATE",
      tableName: "invoices",
      recordId: invoice.id,
      newValues: invoice
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error("Error creating invoice from visit:", error);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

export default router;