import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye,
  Edit,
  Trash2,
  Download,
  DollarSign,
  Receipt,
  FileText,
  Calendar,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  MoreHorizontal,
  RefreshCw,
  Calculator
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Patient, Service, Visit, Invoice, Payment, InvoiceItem } from "@shared/schema";

// Types
interface InvoiceWithDetails extends Invoice {
  patientName?: string;
  items?: InvoiceItem[];
  payments?: Payment[];
  remainingAmount?: number;
}

interface InvoiceItemFormData {
  serviceId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Validation schemas
const invoiceItemSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  total: z.number().min(0, "Total cannot be negative"),
});

const invoiceSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  visitId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  discountType: z.enum(["FLAT", "PERCENTAGE"]).default("FLAT"),
  discountValue: z.number().min(0).default(0),
  taxPercentage: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
});

const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  method: z.enum(["CASH", "KNET", "CARD", "OTHER"]),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;
type PaymentFormData = z.infer<typeof paymentSchema>;

export default function BillingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isArabic = document.documentElement.dir === "rtl";
  
  // State management
  const [currentTab, setCurrentTab] = useState("invoices");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isViewInvoiceDialogOpen, setIsViewInvoiceDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<{from: Date; to: Date}>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  // Forms
  const invoiceForm = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      items: [{ serviceId: "", quantity: 1, unitPrice: 0, total: 0 }],
      discountType: "FLAT",
      discountValue: 0,
      taxPercentage: 0,
    },
  });

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      method: "CASH",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: invoiceForm.control,
    name: "items",
  });

  // Queries
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices", statusFilter],
    queryFn: () => apiRequest(`/api/invoices${statusFilter !== "ALL" ? `?status=${statusFilter}` : ""}`),
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/payments", dateRange],
    queryFn: () => apiRequest(`/api/payments?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: () => apiRequest("/api/patients"),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["/api/services"],
    queryFn: () => apiRequest("/api/services"),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ["/api/visits"],
    queryFn: () => apiRequest("/api/visits"),
  });

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: (data: InvoiceFormData) => apiRequest("/api/invoices", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsInvoiceDialogOpen(false);
      invoiceForm.reset();
      toast({
        title: isArabic ? "تم إنشاء الفاتورة" : "Invoice Created",
        description: isArabic ? "تم إنشاء الفاتورة بنجاح" : "Invoice has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message || (isArabic ? "فشل في إنشاء الفاتورة" : "Failed to create invoice"),
        variant: "destructive",
      });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) => apiRequest("/api/payments", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      setIsPaymentDialogOpen(false);
      paymentForm.reset();
      toast({
        title: isArabic ? "تم تسجيل الدفع" : "Payment Recorded",
        description: isArabic ? "تم تسجيل الدفع بنجاح" : "Payment has been recorded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message || (isArabic ? "فشل في تسجيل الدفع" : "Failed to record payment"),
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const calculateSubtotal = (items: InvoiceItemFormData[]): number => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateDiscount = (subtotal: number, discountType: "FLAT" | "PERCENTAGE", discountValue: number): number => {
    if (discountType === "PERCENTAGE") {
      return subtotal * (discountValue / 100);
    }
    return discountValue;
  };

  const calculateTax = (amount: number, taxPercentage: number): number => {
    return amount * (taxPercentage / 100);
  };

  const calculateTotal = (subtotal: number, discount: number, tax: number): number => {
    return subtotal - discount + tax;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "PARTIAL":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "UNPAID":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "CASH":
        return Banknote;
      case "KNET":
        return Smartphone;
      case "CARD":
        return CreditCard;
      default:
        return DollarSign;
    }
  };

  // Generate invoice number
  const generateInvoiceNumber = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const sequence = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
    return `INV-${year}${month}-${sequence}`;
  };

  // Watch for item changes to calculate totals
  useEffect(() => {
    const subscription = invoiceForm.watch((value, { name, type }) => {
      if (name?.startsWith("items")) {
        const items = value.items || [];
        items.forEach((item, index) => {
          if (item && item.quantity && item.unitPrice) {
            const total = item.quantity * item.unitPrice;
            if (total !== item.total) {
              invoiceForm.setValue(`items.${index}.total`, total);
            }
          }
        });
      }
    });
    
    return () => subscription.unsubscribe();
  }, [invoiceForm]);

  // Export functions
  const exportInvoicesCSV = () => {
    const csvContent = [
      ["Invoice Number", "Patient", "Date", "Subtotal", "Discount", "Tax", "Total", "Status"].join(","),
      ...invoices.map((invoice: InvoiceWithDetails) => [
        invoice.invoiceNumber,
        invoice.patientName || "",
        format(new Date(invoice.issueDate), "yyyy-MM-dd"),
        invoice.subtotalAmount.toFixed(3),
        invoice.discountAmount.toFixed(3),
        invoice.taxAmount.toFixed(3),
        invoice.totalAmount.toFixed(3),
        invoice.status
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const exportPaymentsCSV = () => {
    const csvContent = [
      ["Date", "Invoice", "Patient", "Amount", "Method", "Reference", "Received By"].join(","),
      ...payments.map((payment: Payment) => [
        format(new Date(payment.paidAt), "yyyy-MM-dd HH:mm"),
        payment.invoiceNumber || "",
        payment.patientName || "",
        payment.amount.toFixed(3),
        payment.method,
        payment.transactionReference || "",
        payment.receivedByName || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {isArabic ? "الفوترة والمدفوعات" : "Billing & Payments"}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportInvoicesCSV}>
            <Download className="h-4 w-4 mr-2" />
            {isArabic ? "تصدير الفواتير" : "Export Invoices"}
          </Button>
          <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {isArabic ? "فاتورة جديدة" : "New Invoice"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isArabic ? "إنشاء فاتورة جديدة" : "Create New Invoice"}</DialogTitle>
                <DialogDescription>
                  {isArabic ? "قم بملء تفاصيل الفاتورة والخدمات" : "Fill in the invoice details and services"}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...invoiceForm}>
                <form onSubmit={invoiceForm.handleSubmit((data) => createInvoiceMutation.mutate(data))} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Patient Selection */}
                    <FormField
                      control={invoiceForm.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "المريض" : "Patient"}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isArabic ? "اختر المريض" : "Select patient"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {patients.map((patient: Patient) => (
                                <SelectItem key={patient.id} value={patient.id}>
                                  {patient.firstName} {patient.lastName} - {patient.civilId}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Visit Selection (Optional) */}
                    <FormField
                      control={invoiceForm.control}
                      name="visitId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "الزيارة (اختياري)" : "Visit (Optional)"}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isArabic ? "اختر الزيارة" : "Select visit"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">{isArabic ? "فاتورة يدوية" : "Manual invoice"}</SelectItem>
                              {visits.map((visit: Visit) => (
                                <SelectItem key={visit.id} value={visit.id}>
                                  {format(new Date(visit.visitDate), "PPp")} - {visit.patientName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Invoice Items */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-lg font-medium">{isArabic ? "بنود الفاتورة" : "Invoice Items"}</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ serviceId: "", quantity: 1, unitPrice: 0, total: 0 })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {isArabic ? "إضافة بند" : "Add Item"}
                      </Button>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{isArabic ? "الخدمة" : "Service"}</TableHead>
                            <TableHead>{isArabic ? "الكمية" : "Qty"}</TableHead>
                            <TableHead>{isArabic ? "سعر الوحدة" : "Unit Price"}</TableHead>
                            <TableHead>{isArabic ? "الإجمالي" : "Total"}</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell>
                                <FormField
                                  control={invoiceForm.control}
                                  name={`items.${index}.serviceId`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Select 
                                        onValueChange={(value) => {
                                          field.onChange(value);
                                          const service = services.find((s: Service) => s.id === value);
                                          if (service) {
                                            invoiceForm.setValue(`items.${index}.unitPrice`, service.price);
                                          }
                                        }}
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder={isArabic ? "اختر الخدمة" : "Select service"} />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {services.map((service: Service) => (
                                            <SelectItem key={service.id} value={service.id}>
                                              {isArabic ? service.nameAr : service.nameEn} - {service.price.toFixed(3)} KWD
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={invoiceForm.control}
                                  name={`items.${index}.quantity`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          type="number" 
                                          min="1" 
                                          {...field} 
                                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={invoiceForm.control}
                                  name={`items.${index}.unitPrice`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          type="number" 
                                          step="0.001" 
                                          min="0" 
                                          {...field} 
                                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={invoiceForm.control}
                                  name={`items.${index}.total`}
                                  render={({ field }) => (
                                    <div className="font-medium">
                                      {field.value.toFixed(3)} KWD
                                    </div>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                {fields.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => remove(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Discount and Tax */}
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={invoiceForm.control}
                      name="discountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "نوع الخصم" : "Discount Type"}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FLAT">{isArabic ? "مبلغ ثابت" : "Flat Amount"}</SelectItem>
                              <SelectItem value="PERCENTAGE">{isArabic ? "نسبة مئوية" : "Percentage"}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={invoiceForm.control}
                      name="discountValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {isArabic ? "قيمة الخصم" : "Discount Value"} 
                            {invoiceForm.watch("discountType") === "PERCENTAGE" ? " (%)" : " (KWD)"}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.001" 
                              min="0" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={invoiceForm.control}
                      name="taxPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "نسبة الضريبة (%)" : "Tax Percentage (%)"}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1" 
                              min="0" 
                              max="100" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Invoice Summary */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h3 className="font-medium mb-3">{isArabic ? "ملخص الفاتورة" : "Invoice Summary"}</h3>
                    {(() => {
                      const items = invoiceForm.watch("items") || [];
                      const discountType = invoiceForm.watch("discountType") || "FLAT";
                      const discountValue = invoiceForm.watch("discountValue") || 0;
                      const taxPercentage = invoiceForm.watch("taxPercentage") || 0;
                      
                      const subtotal = calculateSubtotal(items);
                      const discount = calculateDiscount(subtotal, discountType, discountValue);
                      const tax = calculateTax(subtotal - discount, taxPercentage);
                      const total = calculateTotal(subtotal, discount, tax);

                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>{isArabic ? "المجموع الفرعي:" : "Subtotal:"}</span>
                            <span>{subtotal.toFixed(3)} KWD</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>{isArabic ? "الخصم:" : "Discount:"}</span>
                              <span>-{discount.toFixed(3)} KWD</span>
                            </div>
                          )}
                          {tax > 0 && (
                            <div className="flex justify-between">
                              <span>{isArabic ? "الضريبة:" : "Tax:"}</span>
                              <span>{tax.toFixed(3)} KWD</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-lg border-t pt-2">
                            <span>{isArabic ? "الإجمالي:" : "Total:"}</span>
                            <span>{total.toFixed(3)} KWD</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Notes */}
                  <FormField
                    control={invoiceForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isArabic ? "ملاحظات" : "Notes"}</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>
                      {isArabic ? "إلغاء" : "Cancel"}
                    </Button>
                    <Button type="submit" disabled={createInvoiceMutation.isPending}>
                      {createInvoiceMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                      {isArabic ? "إنشاء الفاتورة" : "Create Invoice"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices">{isArabic ? "الفواتير" : "Invoices"}</TabsTrigger>
          <TabsTrigger value="payments">{isArabic ? "المدفوعات" : "Payments"}</TabsTrigger>
          <TabsTrigger value="reports">{isArabic ? "التقارير" : "Reports"}</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{isArabic ? "جميع الحالات" : "All Status"}</SelectItem>
                <SelectItem value="UNPAID">{isArabic ? "غير مدفوع" : "Unpaid"}</SelectItem>
                <SelectItem value="PARTIAL">{isArabic ? "مدفوع جزئياً" : "Partial"}</SelectItem>
                <SelectItem value="PAID">{isArabic ? "مدفوع" : "Paid"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoices Table */}
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? "الفواتير" : "Invoices"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isArabic ? "رقم الفاتورة" : "Invoice Number"}</TableHead>
                    <TableHead>{isArabic ? "المريض" : "Patient"}</TableHead>
                    <TableHead>{isArabic ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isArabic ? "المبلغ" : "Amount"}</TableHead>
                    <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice: InvoiceWithDetails) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.patientName}</TableCell>
                      <TableCell>{format(new Date(invoice.issueDate), "PPp", { locale: isArabic ? ar : undefined })}</TableCell>
                      <TableCell>{invoice.totalAmount.toFixed(3)} KWD</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {isArabic ? (
                            invoice.status === "PAID" ? "مدفوع" :
                            invoice.status === "PARTIAL" ? "جزئي" : "غير مدفوع"
                          ) : invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsViewInvoiceDialogOpen(true);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              {isArabic ? "عرض" : "View"}
                            </DropdownMenuItem>
                            {invoice.status !== "PAID" && (
                              <DropdownMenuItem onClick={() => {
                                setSelectedInvoice(invoice);
                                paymentForm.setValue("invoiceId", invoice.id);
                                setIsPaymentDialogOpen(true);
                              }}>
                                <DollarSign className="h-4 w-4 mr-2" />
                                {isArabic ? "إضافة دفعة" : "Add Payment"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <FileText className="h-4 w-4 mr-2" />
                              {isArabic ? "طباعة" : "Print"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          {/* Date Range Filter */}
          <div className="flex items-center gap-4">
            <Label>{isArabic ? "من تاريخ:" : "From:"}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(dateRange.from, "PPP", { locale: isArabic ? ar : undefined })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: startOfDay(date) }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Label>{isArabic ? "إلى تاريخ:" : "To:"}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(dateRange.to, "PPP", { locale: isArabic ? ar : undefined })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: endOfDay(date) }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" onClick={exportPaymentsCSV}>
              <Download className="h-4 w-4 mr-2" />
              {isArabic ? "تصدير" : "Export"}
            </Button>
          </div>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? "المدفوعات" : "Payments"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isArabic ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{isArabic ? "الفاتورة" : "Invoice"}</TableHead>
                    <TableHead>{isArabic ? "المريض" : "Patient"}</TableHead>
                    <TableHead>{isArabic ? "المبلغ" : "Amount"}</TableHead>
                    <TableHead>{isArabic ? "الطريقة" : "Method"}</TableHead>
                    <TableHead>{isArabic ? "المرجع" : "Reference"}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment: Payment) => {
                    const PaymentIcon = getPaymentMethodIcon(payment.method);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>{format(new Date(payment.paidAt), "PPp", { locale: isArabic ? ar : undefined })}</TableCell>
                        <TableCell>{payment.invoiceNumber}</TableCell>
                        <TableCell>{payment.patientName}</TableCell>
                        <TableCell>{payment.amount.toFixed(3)} KWD</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PaymentIcon className="h-4 w-4" />
                            {payment.method}
                          </div>
                        </TableCell>
                        <TableCell>{payment.transactionReference || "-"}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Receipt className="h-4 w-4 mr-2" />
                                {isArabic ? "طباعة إيصال" : "Print Receipt"}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                {isArabic ? "تعديل" : "Edit"}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                {isArabic ? "حذف" : "Delete"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{isArabic ? "إجمالي المبيعات" : "Total Sales"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {invoices.reduce((sum: number, inv: InvoiceWithDetails) => sum + inv.totalAmount, 0).toFixed(3)} KWD
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{isArabic ? "المدفوعات اليوم" : "Today's Payments"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {payments.reduce((sum: number, pay: Payment) => sum + pay.amount, 0).toFixed(3)} KWD
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{isArabic ? "الفواتير المعلقة" : "Outstanding Invoices"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {invoices.filter((inv: InvoiceWithDetails) => inv.status !== "PAID").length}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isArabic ? "تسجيل دفعة" : "Record Payment"}</DialogTitle>
            <DialogDescription>
              {selectedInvoice && (
                <div>
                  {isArabic ? "فاتورة رقم: " : "Invoice: "}{selectedInvoice.invoiceNumber}
                  <br />
                  {isArabic ? "المبلغ المستحق: " : "Amount Due: "}{selectedInvoice.remainingAmount?.toFixed(3)} KWD
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit((data) => createPaymentMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={paymentForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isArabic ? "المبلغ (KWD)" : "Amount (KWD)"}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.001" 
                          min="0.001"
                          max={selectedInvoice?.remainingAmount}
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isArabic ? "طريقة الدفع" : "Payment Method"}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CASH">{isArabic ? "نقداً" : "Cash"}</SelectItem>
                          <SelectItem value="KNET">{isArabic ? "كي نت" : "KNET"}</SelectItem>
                          <SelectItem value="CARD">{isArabic ? "بطاقة ائتمان" : "Credit Card"}</SelectItem>
                          <SelectItem value="OTHER">{isArabic ? "أخرى" : "Other"}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={paymentForm.control}
                name="transactionReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isArabic ? "المرجع (اختياري)" : "Reference (Optional)"}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={paymentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isArabic ? "ملاحظات" : "Notes"}</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                  {isArabic ? "إلغاء" : "Cancel"}
                </Button>
                <Button type="submit" disabled={createPaymentMutation.isPending}>
                  {createPaymentMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  {isArabic ? "تسجيل الدفعة" : "Record Payment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={isViewInvoiceDialogOpen} onOpenChange={setIsViewInvoiceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isArabic ? "تفاصيل الفاتورة" : "Invoice Details"}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-900 p-6 border rounded-lg printable-invoice">
                {/* Invoice Header */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold">{isArabic ? "عيادة الأسنان" : "Dental Clinic"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? "الكويت - شارع الخليج العربي - هاتف: 22345678" : "Kuwait - Arabian Gulf Street - Tel: 22345678"}
                  </p>
                </div>

                {/* Invoice Info */}
                <div className="flex justify-between mb-6">
                  <div>
                    <h3 className="font-semibold">{isArabic ? "إلى:" : "Bill To:"}</h3>
                    <p>{selectedInvoice.patientName}</p>
                  </div>
                  <div className="text-right">
                    <p><strong>{isArabic ? "رقم الفاتورة:" : "Invoice Number:"}</strong> {selectedInvoice.invoiceNumber}</p>
                    <p><strong>{isArabic ? "التاريخ:" : "Date:"}</strong> {format(new Date(selectedInvoice.issueDate), "PPP", { locale: isArabic ? ar : undefined })}</p>
                  </div>
                </div>

                {/* Invoice Items */}
                <Table className="mb-6">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? "الخدمة" : "Service"}</TableHead>
                      <TableHead>{isArabic ? "الكمية" : "Qty"}</TableHead>
                      <TableHead>{isArabic ? "سعر الوحدة" : "Unit Price"}</TableHead>
                      <TableHead>{isArabic ? "الإجمالي" : "Total"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.serviceName}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unitPrice.toFixed(3)} KWD</TableCell>
                        <TableCell>{(item.quantity * item.unitPrice).toFixed(3)} KWD</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Totals */}
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between">
                        <span>{isArabic ? "المجموع الفرعي:" : "Subtotal:"}</span>
                        <span>{selectedInvoice.subtotalAmount.toFixed(3)} KWD</span>
                      </div>
                      {selectedInvoice.discountAmount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>{isArabic ? "الخصم:" : "Discount:"}</span>
                          <span>-{selectedInvoice.discountAmount.toFixed(3)} KWD</span>
                        </div>
                      )}
                      {selectedInvoice.taxAmount > 0 && (
                        <div className="flex justify-between">
                          <span>{isArabic ? "الضريبة:" : "Tax:"}</span>
                          <span>{selectedInvoice.taxAmount.toFixed(3)} KWD</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>{isArabic ? "الإجمالي:" : "Total:"}</span>
                        <span>{selectedInvoice.totalAmount.toFixed(3)} KWD</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div className="mt-4 text-sm">
                    <strong>{isArabic ? "ملاحظات:" : "Notes:"}</strong> {selectedInvoice.notes}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print styles */}
      <style>{`
        @media print {
          .printable-invoice {
            font-size: 12pt;
            line-height: 1.4;
          }
          .printable-invoice * {
            color: black !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}