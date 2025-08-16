import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from "date-fns";
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
  Calculator,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  X
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// Enhanced types
interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  civilId?: string;
  phone: string;
}

interface Service {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  price: string;
  duration: number;
}

interface InvoiceItem {
  id: string;
  serviceId: string;
  serviceName?: string;
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: string;
  method: string;
  transactionReference?: string;
  notes?: string;
  createdAt: Date;
}

interface Invoice {
  id: string;
  patientId: string;
  patientName?: string;
  invoiceNumber: string;
  totalAmount: string;
  discountAmount?: string;
  taxAmount?: string;
  subtotalAmount?: string;
  status: string;
  items?: InvoiceItem[];
  payments?: Payment[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BillingStats {
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
  outstandingAmount: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
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

export default function EnhancedBillingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isArabic = document.documentElement.dir === "rtl";
  
  // Enhanced state management
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isViewInvoiceDialogOpen, setIsViewInvoiceDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{from: Date; to: Date}>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Forms with enhanced validation
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

  const { fields: itemFields, append: addItem, remove: removeItem } = useFieldArray({
    control: invoiceForm.control,
    name: "items",
  });

  // Enhanced data fetching
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["/api/invoices", statusFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      params.append("from", dateRange.from.toISOString());
      params.append("to", dateRange.to.toISOString());
      return apiRequest(`/api/invoices?${params}`);
    },
  });

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ["/api/payments", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("from", dateRange.from.toISOString());
      params.append("to", dateRange.to.toISOString());
      return apiRequest(`/api/payments?${params}`);
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: () => apiRequest("/api/patients"),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["/api/services"],
    queryFn: () => apiRequest("/api/services"),
  });

  // Enhanced billing statistics
  const billingStats: BillingStats = {
    totalRevenue: Array.isArray(invoices) ? invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || "0"), 0) : 0,
    todayRevenue: Array.isArray(payments) ? payments
      .filter(p => format(new Date(p.createdAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
      .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0) : 0,
    monthlyRevenue: Array.isArray(payments) ? payments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0) : 0,
    outstandingAmount: Array.isArray(invoices) ? invoices
      .filter(inv => inv.status !== "PAID")
      .reduce((sum, inv) => sum + parseFloat(inv.totalAmount || "0"), 0) : 0,
    totalInvoices: Array.isArray(invoices) ? invoices.length : 0,
    paidInvoices: Array.isArray(invoices) ? invoices.filter(inv => inv.status === "PAID").length : 0,
    pendingInvoices: Array.isArray(invoices) ? invoices.filter(inv => inv.status === "PENDING").length : 0,
    overdueInvoices: Array.isArray(invoices) ? invoices.filter(inv => inv.status === "OVERDUE").length : 0,
  };

  // Enhanced mutations
  const createInvoiceMutation = useMutation({
    mutationFn: (data: InvoiceFormData) => apiRequest("/api/invoices", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsInvoiceDialogOpen(false);
      invoiceForm.reset();
      toast({
        title: isArabic ? "تم إنشاء الفاتورة بنجاح" : "Invoice created successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ في إنشاء الفاتورة" : "Error creating invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) => apiRequest("/api/payments", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsPaymentDialogOpen(false);
      paymentForm.reset();
      toast({
        title: isArabic ? "تم تسجيل الدفعة بنجاح" : "Payment recorded successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ في تسجيل الدفعة" : "Error recording payment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enhanced utility functions
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `${num.toFixed(3)} KWD`;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      PAID: "default",
      PENDING: "secondary", 
      OVERDUE: "destructive",
      PARTIAL: "outline"
    } as const;
    
    const labels = {
      PAID: isArabic ? "مدفوع" : "Paid",
      PENDING: isArabic ? "معلق" : "Pending",
      OVERDUE: isArabic ? "متأخر" : "Overdue", 
      PARTIAL: isArabic ? "جزئي" : "Partial"
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "CASH":
        return <Banknote className="h-4 w-4" />;
      case "KNET":
        return <Smartphone className="h-4 w-4" />;
      case "CARD":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <MoreHorizontal className="h-4 w-4" />;
    }
  };

  const filteredInvoices = Array.isArray(invoices) ? invoices.filter(invoice => {
    const matchesSearch = !searchTerm || 
      invoice.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  // Watch form changes for calculations
  const watchedItems = invoiceForm.watch("items");
  const discountType = invoiceForm.watch("discountType");
  const discountValue = invoiceForm.watch("discountValue");
  const taxPercentage = invoiceForm.watch("taxPercentage");

  useEffect(() => {
    const subtotal = watchedItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const discount = discountType === "PERCENTAGE" ? (subtotal * discountValue / 100) : discountValue;
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * taxPercentage / 100;
    const total = afterDiscount + tax;
    
    // Auto-update totals in form
    invoiceForm.setValue("subtotal", subtotal);
    invoiceForm.setValue("discount", discount);
    invoiceForm.setValue("tax", tax);
    invoiceForm.setValue("total", total);
  }, [watchedItems, discountType, discountValue, taxPercentage, invoiceForm]);

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="enhanced-billing-page">
      {/* Enhanced Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
            {isArabic ? "إدارة الفواتير المتقدمة" : "Enhanced Billing Management"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isArabic ? "إدارة شاملة للفواتير والمدفوعات مع تقارير تفصيلية" : "Comprehensive invoice and payment management with detailed reporting"}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setIsInvoiceDialogOpen(true)}
            className="bg-primary hover:bg-primary/90"
            data-testid="create-invoice-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isArabic ? "فاتورة جديدة" : "New Invoice"}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              const csv = filteredInvoices.map(inv => 
                `${inv.invoiceNumber},${inv.patientName},${inv.totalAmount},${inv.status},${format(new Date(inv.createdAt), 'yyyy-MM-dd')}`
              ).join('\n');
              const blob = new Blob([`Invoice Number,Patient,Amount,Status,Date\n${csv}`], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'invoices.csv';
              a.click();
            }}
            data-testid="export-button"
          >
            <Download className="h-4 w-4 mr-2" />
            {isArabic ? "تصدير" : "Export"}
          </Button>
        </div>
      </div>

      {/* Enhanced Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isArabic ? "البحث في الفواتير..." : "Search invoices..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{isArabic ? "جميع الحالات" : "All Status"}</SelectItem>
                <SelectItem value="PAID">{isArabic ? "مدفوع" : "Paid"}</SelectItem>
                <SelectItem value="PENDING">{isArabic ? "معلق" : "Pending"}</SelectItem>
                <SelectItem value="OVERDUE">{isArabic ? "متأخر" : "Overdue"}</SelectItem>
                <SelectItem value="PARTIAL">{isArabic ? "جزئي" : "Partial"}</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: startOfDay(new Date()),
                        to: endOfDay(new Date())
                      })}
                    >
                      {isArabic ? "اليوم" : "Today"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: startOfMonth(new Date()),
                        to: endOfMonth(new Date())
                      })}
                    >
                      {isArabic ? "هذا الشهر" : "This Month"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange({
                        from: startOfMonth(subMonths(new Date(), 1)),
                        to: endOfMonth(subMonths(new Date(), 1))
                      })}
                    >
                      {isArabic ? "الشهر الماضي" : "Last Month"}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" data-testid="dashboard-tab">
            <TrendingUp className="h-4 w-4 mr-2" />
            {isArabic ? "لوحة التحكم" : "Dashboard"}
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="invoices-tab">
            <FileText className="h-4 w-4 mr-2" />
            {isArabic ? "الفواتير" : "Invoices"}
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="payments-tab">
            <CreditCard className="h-4 w-4 mr-2" />
            {isArabic ? "المدفوعات" : "Payments"}
          </TabsTrigger>
          <TabsTrigger value="reports" data-testid="reports-tab">
            <Calculator className="h-4 w-4 mr-2" />
            {isArabic ? "التقارير" : "Reports"}
          </TabsTrigger>
        </TabsList>

        {/* Enhanced Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">
                  {isArabic ? "إجمالي الإيرادات" : "Total Revenue"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(billingStats.totalRevenue)}</div>
                <div className="text-xs opacity-80 mt-1">
                  {isArabic ? "لهذا الشهر" : "This month"}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">
                  {isArabic ? "إيرادات اليوم" : "Today's Revenue"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(billingStats.todayRevenue)}</div>
                <div className="text-xs opacity-80 mt-1">
                  {format(new Date(), 'dd/MM/yyyy')}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">
                  {isArabic ? "المبالغ المستحقة" : "Outstanding Amount"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(billingStats.outstandingAmount)}</div>
                <div className="text-xs opacity-80 mt-1">
                  {billingStats.pendingInvoices} {isArabic ? "فاتورة معلقة" : "pending invoices"}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90">
                  {isArabic ? "معدل التحصيل" : "Collection Rate"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {billingStats.totalInvoices > 0 ? Math.round((billingStats.paidInvoices / billingStats.totalInvoices) * 100) : 0}%
                </div>
                <div className="text-xs opacity-80 mt-1">
                  {billingStats.paidInvoices}/{billingStats.totalInvoices} {isArabic ? "فواتير" : "invoices"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Status Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? "حالة الفواتير" : "Invoice Status Overview"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{isArabic ? "مدفوع" : "Paid"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{billingStats.paidInvoices}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${billingStats.totalInvoices > 0 ? (billingStats.paidInvoices / billingStats.totalInvoices) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">{isArabic ? "معلق" : "Pending"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{billingStats.pendingInvoices}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-600 h-2 rounded-full" 
                          style={{ width: `${billingStats.totalInvoices > 0 ? (billingStats.pendingInvoices / billingStats.totalInvoices) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">{isArabic ? "متأخر" : "Overdue"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{billingStats.overdueInvoices}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ width: `${billingStats.totalInvoices > 0 ? (billingStats.overdueInvoices / billingStats.totalInvoices) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? "أحدث المدفوعات" : "Recent Payments"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(payments) && payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div className="flex items-center space-x-3">
                        {getPaymentMethodIcon(payment.method)}
                        <div>
                          <div className="text-sm font-medium">
                            {formatCurrency(payment.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(payment.createdAt), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {payment.method}
                      </Badge>
                    </div>
                  ))}
                  
                  {(!Array.isArray(payments) || payments.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{isArabic ? "لا توجد مدفوعات اليوم" : "No payments today"}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Enhanced Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {isArabic ? "قائمة الفواتير" : "Invoices List"}
                  <Badge variant="secondary" className="ml-2">
                    {filteredInvoices.length}
                  </Badge>
                </CardTitle>
                <Button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/invoices"] })}
                  variant="outline"
                  size="sm"
                  data-testid="refresh-invoices"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingInvoices ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>{isArabic ? "جاري التحميل..." : "Loading..."}</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                      <TableHead>{isArabic ? "المريض" : "Patient"}</TableHead>
                      <TableHead>{isArabic ? "التاريخ" : "Date"}</TableHead>
                      <TableHead>{isArabic ? "المبلغ" : "Amount"}</TableHead>
                      <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                      <TableHead className="text-right">{isArabic ? "الإجراءات" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.patientName}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.createdAt), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(invoice.totalAmount)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(invoice.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setIsViewInvoiceDialogOpen(true);
                                }}
                                data-testid={`view-invoice-${invoice.id}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {isArabic ? "عرض" : "View"}
                              </DropdownMenuItem>
                              {invoice.status !== "PAID" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedInvoice(invoice);
                                    paymentForm.setValue("invoiceId", invoice.id);
                                    setIsPaymentDialogOpen(true);
                                  }}
                                  data-testid={`record-payment-${invoice.id}`}
                                >
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  {isArabic ? "تسجيل دفعة" : "Record Payment"}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Receipt className="h-4 w-4 mr-2" />
                                {isArabic ? "طباعة" : "Print"}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                {isArabic ? "تعديل" : "Edit"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                {isArabic ? "حذف" : "Delete"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {filteredInvoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-muted-foreground">
                            {isArabic ? "لا توجد فواتير" : "No invoices found"}
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enhanced Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {isArabic ? "سجل المدفوعات" : "Payment Records"}
                <Badge variant="secondary" className="ml-2">
                  {Array.isArray(payments) ? payments.length : 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPayments ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>{isArabic ? "جاري التحميل..." : "Loading..."}</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? "التاريخ" : "Date"}</TableHead>
                      <TableHead>{isArabic ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                      <TableHead>{isArabic ? "المبلغ" : "Amount"}</TableHead>
                      <TableHead>{isArabic ? "طريقة الدفع" : "Payment Method"}</TableHead>
                      <TableHead>{isArabic ? "المرجع" : "Reference"}</TableHead>
                      <TableHead className="text-right">{isArabic ? "الإجراءات" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(payments) && payments.map((payment) => (
                      <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
                        <TableCell>
                          {format(new Date(payment.createdAt), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium">
                          #{payment.invoiceId?.slice(-8)}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getPaymentMethodIcon(payment.method)}
                            <span>{payment.method}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment.transactionReference || "-"}
                        </TableCell>
                        <TableCell className="text-right">
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
                    ))}
                    
                    {(!Array.isArray(payments) || payments.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-muted-foreground">
                            {isArabic ? "لا توجد مدفوعات" : "No payments found"}
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enhanced Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>{isArabic ? "ملخص مالي" : "Financial Summary"}</CardTitle>
                <CardDescription>
                  {isArabic ? 
                    `تقرير من ${format(dateRange.from, 'dd/MM/yyyy')} إلى ${format(dateRange.to, 'dd/MM/yyyy')}` :
                    `Report from ${format(dateRange.from, 'dd/MM/yyyy')} to ${format(dateRange.to, 'dd/MM/yyyy')}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{isArabic ? "إجمالي الفواتير" : "Total Invoices"}</p>
                    <p className="text-2xl font-bold">{formatCurrency(billingStats.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {billingStats.totalInvoices} {isArabic ? "فاتورة" : "invoices"}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{isArabic ? "إجمالي المدفوعات" : "Total Payments"}</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(billingStats.monthlyRevenue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {Array.isArray(payments) ? payments.length : 0} {isArabic ? "دفعة" : "payments"}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{isArabic ? "المبالغ المستحقة" : "Outstanding"}</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(billingStats.outstandingAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {billingStats.pendingInvoices + billingStats.overdueInvoices} {isArabic ? "فاتورة معلقة" : "pending invoices"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced Dialogs - Payment */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isArabic ? "تسجيل دفعة جديدة" : "Record New Payment"}</DialogTitle>
            <DialogDescription>
              {selectedInvoice && (
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <div className="space-y-1 text-sm">
                    <div><strong>{isArabic ? "فاتورة رقم:" : "Invoice:"}</strong> {selectedInvoice.invoiceNumber}</div>
                    <div><strong>{isArabic ? "المريض:" : "Patient:"}</strong> {selectedInvoice.patientName}</div>
                    <div><strong>{isArabic ? "المبلغ الإجمالي:" : "Total Amount:"}</strong> {formatCurrency(selectedInvoice.totalAmount)}</div>
                    <div><strong>{isArabic ? "المبلغ المستحق:" : "Amount Due:"}</strong> {formatCurrency(selectedInvoice.totalAmount)}</div>
                  </div>
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
                          placeholder="0.000"
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="payment-amount-input"
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
                          <SelectTrigger data-testid="payment-method-select">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CASH">
                            <div className="flex items-center space-x-2">
                              <Banknote className="h-4 w-4" />
                              <span>{isArabic ? "نقداً" : "Cash"}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="KNET">
                            <div className="flex items-center space-x-2">
                              <Smartphone className="h-4 w-4" />
                              <span>{isArabic ? "كي نت" : "KNET"}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="CARD">
                            <div className="flex items-center space-x-2">
                              <CreditCard className="h-4 w-4" />
                              <span>{isArabic ? "بطاقة ائتمان" : "Credit Card"}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="OTHER">
                            <div className="flex items-center space-x-2">
                              <MoreHorizontal className="h-4 w-4" />
                              <span>{isArabic ? "أخرى" : "Other"}</span>
                            </div>
                          </SelectItem>
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
                    <FormLabel>{isArabic ? "مرجع المعاملة (اختياري)" : "Transaction Reference (Optional)"}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={isArabic ? "رقم المرجع أو رقم التأكيد" : "Reference or confirmation number"}
                        {...field} 
                        data-testid="payment-reference-input"
                      />
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
                    <FormLabel>{isArabic ? "ملاحظات (اختياري)" : "Notes (Optional)"}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={isArabic ? "ملاحظات إضافية..." : "Additional notes..."}
                        {...field} 
                        data-testid="payment-notes-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                  data-testid="cancel-payment-button"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  disabled={createPaymentMutation.isPending}
                  data-testid="submit-payment-button"
                >
                  {createPaymentMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {isArabic ? "جاري التسجيل..." : "Recording..."}
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      {isArabic ? "تسجيل الدفعة" : "Record Payment"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Enhanced View Invoice Dialog */}
      <Dialog open={isViewInvoiceDialogOpen} onOpenChange={setIsViewInvoiceDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{isArabic ? "تفاصيل الفاتورة" : "Invoice Details"}</span>
              {selectedInvoice && (
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedInvoice.status)}
                  <Button variant="outline" size="sm">
                    <Receipt className="h-4 w-4 mr-2" />
                    {isArabic ? "طباعة" : "Print"}
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{isArabic ? "رقم الفاتورة" : "Invoice Number"}</div>
                  <div className="font-semibold">{selectedInvoice.invoiceNumber}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{isArabic ? "تاريخ الإصدار" : "Issue Date"}</div>
                  <div className="font-semibold">{format(new Date(selectedInvoice.createdAt), 'dd/MM/yyyy')}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{isArabic ? "المريض" : "Patient"}</div>
                  <div className="font-semibold">{selectedInvoice.patientName}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{isArabic ? "الحالة" : "Status"}</div>
                  <div>{getStatusBadge(selectedInvoice.status)}</div>
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <h4 className="font-semibold mb-3">{isArabic ? "تفاصيل الخدمات" : "Service Details"}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? "الخدمة" : "Service"}</TableHead>
                      <TableHead className="text-center">{isArabic ? "الكمية" : "Qty"}</TableHead>
                      <TableHead className="text-right">{isArabic ? "سعر الوحدة" : "Unit Price"}</TableHead>
                      <TableHead className="text-right">{isArabic ? "الإجمالي" : "Total"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items && selectedInvoice.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.serviceName || item.description}</div>
                            {item.description !== item.serviceName && (
                              <div className="text-sm text-muted-foreground">{item.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Invoice Totals */}
              <div className="space-y-3">
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{isArabic ? "المجموع الفرعي:" : "Subtotal:"}</span>
                    <span className="font-medium">{formatCurrency(selectedInvoice.subtotalAmount || selectedInvoice.totalAmount)}</span>
                  </div>
                  
                  {selectedInvoice.discountAmount && parseFloat(selectedInvoice.discountAmount) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>{isArabic ? "الخصم:" : "Discount:"}</span>
                      <span>-{formatCurrency(selectedInvoice.discountAmount)}</span>
                    </div>
                  )}
                  
                  {selectedInvoice.taxAmount && parseFloat(selectedInvoice.taxAmount) > 0 && (
                    <div className="flex justify-between">
                      <span>{isArabic ? "الضريبة:" : "Tax:"}</span>
                      <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>{isArabic ? "الإجمالي:" : "Total:"}</span>
                    <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">{isArabic ? "سجل المدفوعات" : "Payment History"}</h4>
                  <div className="space-y-2">
                    {selectedInvoice.payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getPaymentMethodIcon(payment.method)}
                          <div>
                            <div className="font-medium">{formatCurrency(payment.amount)}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(payment.createdAt), 'dd/MM/yyyy HH:mm')}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">{payment.method}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedInvoice.notes && (
                <div>
                  <h4 className="font-semibold mb-2">{isArabic ? "ملاحظات:" : "Notes:"}</h4>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {selectedInvoice.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}