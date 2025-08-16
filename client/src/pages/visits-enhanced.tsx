import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, isSameDay, startOfMonth, endOfMonth } from "date-fns";
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
  Calendar,
  User,
  FileText,
  Clock,
  Activity,
  Stethoscope,
  Receipt,
  Printer,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Users,
  CalendarDays,
  Heart,
  Target
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  email?: string;
  dateOfBirth?: Date;
  gender?: string;
  allergies?: string[];
  medicalHistory?: string;
}

interface Doctor {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  phone?: string;
  specialization?: string;
}

interface Service {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  price: string;
  duration: number;
  category?: string;
}

interface VisitProcedure {
  id?: string;
  serviceId: string;
  serviceName?: string;
  tooth?: string;
  surfaces?: string[];
  notes?: string;
  price?: string;
}

interface Visit {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  appointmentId?: string;
  visitDate: Date;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  chiefComplaint?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  doctorNotes?: string;
  totalAmount?: string;
  procedures?: VisitProcedure[];
  toothMap?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface VisitStats {
  totalVisits: number;
  todayVisits: number;
  weeklyVisits: number;
  monthlyVisits: number;
  completedVisits: number;
  inProgressVisits: number;
  cancelledVisits: number;
  averageVisitDuration: number;
  totalRevenue: number;
  averageRevenue: number;
}

// Enhanced validation schemas
const procedureSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  tooth: z.string().optional(),
  surfaces: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const visitFormSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  visitDate: z.date(),
  chiefComplaint: z.string().optional(),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  doctorNotes: z.string().optional(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("IN_PROGRESS"),
  procedures: z.array(procedureSchema).optional(),
});

type VisitFormData = z.infer<typeof visitFormSchema>;

// Enhanced Teeth Map Component
const TeethMap = ({ 
  selectedTeeth, 
  onTeethChange,
  isArabic = false 
}: { 
  selectedTeeth: Record<string, any>; 
  onTeethChange: (teeth: Record<string, any>) => void;
  isArabic?: boolean;
}) => {
  const upperTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
  const lowerTeeth = Array.from({ length: 16 }, (_, i) => i + 17);
  
  const handleToothClick = (toothNumber: number) => {
    const toothKey = `tooth-${toothNumber}`;
    const newTeeth = { ...selectedTeeth };
    
    if (newTeeth[toothKey]) {
      delete newTeeth[toothKey];
    } else {
      newTeeth[toothKey] = {
        condition: "selected",
        notes: "",
        procedures: []
      };
    }
    
    onTeethChange(newTeeth);
  };

  const getToothColor = (toothNumber: number) => {
    const toothKey = `tooth-${toothNumber}`;
    const tooth = selectedTeeth[toothKey];
    
    if (!tooth) return "bg-white hover:bg-gray-50 border-gray-300";
    
    switch (tooth.condition) {
      case "selected":
        return "bg-blue-500 text-white border-blue-600";
      case "treated":
        return "bg-green-500 text-white border-green-600";
      case "problem":
        return "bg-red-500 text-white border-red-600";
      case "crown":
        return "bg-yellow-500 text-white border-yellow-600";
      default:
        return "bg-blue-500 text-white border-blue-600";
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="text-center">
        <h4 className="font-medium text-lg">
          {isArabic ? "خريطة الأسنان" : "Dental Chart"}
        </h4>
        <p className="text-sm text-muted-foreground">
          {isArabic ? "اضغط على الأسنان لتحديدها" : "Click on teeth to select them"}
        </p>
      </div>
      
      {/* Upper Teeth */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-center">
          {isArabic ? "الفك العلوي" : "Upper Jaw"}
        </div>
        <div className="grid grid-cols-8 gap-1">
          {upperTeeth.map((tooth) => (
            <button
              key={tooth}
              type="button"
              onClick={() => handleToothClick(tooth)}
              className={cn(
                "w-8 h-8 rounded border text-xs font-medium transition-all duration-200 hover:scale-105",
                getToothColor(tooth)
              )}
              title={`${isArabic ? "السن" : "Tooth"} ${tooth}`}
            >
              {tooth}
            </button>
          ))}
        </div>
      </div>
      
      {/* Lower Teeth */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-center">
          {isArabic ? "الفك السفلي" : "Lower Jaw"}
        </div>
        <div className="grid grid-cols-8 gap-1">
          {lowerTeeth.map((tooth) => (
            <button
              key={tooth}
              type="button"
              onClick={() => handleToothClick(tooth)}
              className={cn(
                "w-8 h-8 rounded border text-xs font-medium transition-all duration-200 hover:scale-105",
                getToothColor(tooth)
              )}
              title={`${isArabic ? "السن" : "Tooth"} ${tooth}`}
            >
              {tooth}
            </button>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded border"></div>
          <span>{isArabic ? "محدد" : "Selected"}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded border"></div>
          <span>{isArabic ? "معالج" : "Treated"}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded border"></div>
          <span>{isArabic ? "مشكلة" : "Problem"}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-500 rounded border"></div>
          <span>{isArabic ? "تاج" : "Crown"}</span>
        </div>
      </div>
    </div>
  );
};

export default function EnhancedVisitsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isArabic = document.documentElement.dir === "rtl";
  
  // Enhanced state management
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [currentView, setCurrentView] = useState("list"); // list, calendar, timeline
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeeth, setSelectedTeeth] = useState<Record<string, any>>({});
  const [dateRange, setDateRange] = useState<{from: Date; to: Date}>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });

  // Forms with enhanced validation
  const visitForm = useForm<VisitFormData>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: {
      status: "IN_PROGRESS",
      procedures: [],
    },
  });

  const { fields: procedureFields, append: addProcedure, remove: removeProcedure } = useFieldArray({
    control: visitForm.control,
    name: "procedures",
  });

  // Enhanced data fetching
  const { data: visits = [], isLoading: isLoadingVisits } = useQuery({
    queryKey: ["/api/visits", statusFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      params.append("from", dateRange.from.toISOString());
      params.append("to", dateRange.to.toISOString());
      return apiRequest(`/api/visits?${params}`);
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: () => apiRequest("/api/patients"),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["/api/doctors"],
    queryFn: () => apiRequest("/api/doctors"),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["/api/services"],
    queryFn: () => apiRequest("/api/services"),
  });

  // Enhanced visit statistics
  const visitStats: VisitStats = {
    totalVisits: Array.isArray(visits) ? visits.length : 0,
    todayVisits: Array.isArray(visits) ? visits.filter(v => 
      isSameDay(new Date(v.visitDate), new Date())
    ).length : 0,
    weeklyVisits: Array.isArray(visits) ? visits.filter(v => {
      const visitDate = new Date(v.visitDate);
      return visitDate >= startOfWeek(new Date()) && visitDate <= endOfWeek(new Date());
    }).length : 0,
    monthlyVisits: Array.isArray(visits) ? visits.filter(v => {
      const visitDate = new Date(v.visitDate);
      return visitDate >= startOfMonth(new Date()) && visitDate <= endOfMonth(new Date());
    }).length : 0,
    completedVisits: Array.isArray(visits) ? visits.filter(v => v.status === "COMPLETED").length : 0,
    inProgressVisits: Array.isArray(visits) ? visits.filter(v => v.status === "IN_PROGRESS").length : 0,
    cancelledVisits: Array.isArray(visits) ? visits.filter(v => v.status === "CANCELLED").length : 0,
    averageVisitDuration: 45, // This would be calculated from actual data
    totalRevenue: Array.isArray(visits) ? visits.reduce((sum, v) => sum + parseFloat(v.totalAmount || "0"), 0) : 0,
    averageRevenue: 0, // Calculated below
  };

  visitStats.averageRevenue = visitStats.completedVisits > 0 ? visitStats.totalRevenue / visitStats.completedVisits : 0;

  // Enhanced mutations
  const createVisitMutation = useMutation({
    mutationFn: (data: VisitFormData) => apiRequest("/api/visits", { 
      method: "POST", 
      body: { 
        ...data, 
        toothMap: selectedTeeth 
      } 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      setIsVisitDialogOpen(false);
      visitForm.reset();
      setSelectedTeeth({});
      toast({
        title: isArabic ? "تم إنشاء الزيارة بنجاح" : "Visit created successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ في إنشاء الزيارة" : "Error creating visit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: VisitFormData }) => 
      apiRequest(`/api/visits/${id}`, { 
        method: "PUT", 
        body: { 
          ...data, 
          toothMap: selectedTeeth 
        } 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      setIsVisitDialogOpen(false);
      setEditingVisit(null);
      visitForm.reset();
      setSelectedTeeth({});
      toast({
        title: isArabic ? "تم تحديث الزيارة بنجاح" : "Visit updated successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ في تحديث الزيارة" : "Error updating visit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (visitId: string) => apiRequest(`/api/visits/${visitId}/invoice`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
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

  // Enhanced utility functions
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `${num.toFixed(3)} KWD`;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      IN_PROGRESS: "secondary",
      COMPLETED: "default", 
      CANCELLED: "destructive"
    } as const;
    
    const labels = {
      IN_PROGRESS: isArabic ? "قيد التنفيذ" : "In Progress",
      COMPLETED: isArabic ? "مكتمل" : "Completed",
      CANCELLED: isArabic ? "ملغي" : "Cancelled"
    };

    const icons = {
      IN_PROGRESS: <Clock className="h-3 w-3" />,
      COMPLETED: <CheckCircle className="h-3 w-3" />,
      CANCELLED: <XCircle className="h-3 w-3" />
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"} className="flex items-center space-x-1">
        {icons[status as keyof typeof icons]}
        <span>{labels[status as keyof typeof labels] || status}</span>
      </Badge>
    );
  };

  const filteredVisits = Array.isArray(visits) ? visits.filter(visit => {
    const matchesSearch = !searchTerm || 
      visit.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.chiefComplaint?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || visit.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  const handleOpenEditDialog = (visit: Visit) => {
    setEditingVisit(visit);
    visitForm.reset({
      patientId: visit.patientId,
      doctorId: visit.doctorId,
      visitDate: new Date(visit.visitDate),
      chiefComplaint: visit.chiefComplaint || "",
      diagnosis: visit.diagnosis || "",
      treatmentPlan: visit.treatmentPlan || "",
      doctorNotes: visit.doctorNotes || "",
      status: visit.status,
      procedures: visit.procedures || [],
    });
    setSelectedTeeth(visit.toothMap || {});
    setIsVisitDialogOpen(true);
  };

  const handleSubmit = (data: VisitFormData) => {
    if (editingVisit) {
      updateVisitMutation.mutate({ id: editingVisit.id, data });
    } else {
      createVisitMutation.mutate(data);
    }
  };

  const printVisitSummary = (visit: Visit) => {
    const patient = Array.isArray(patients) ? patients.find(p => p.id === visit.patientId) : null;
    const doctor = Array.isArray(doctors) ? doctors.find(d => d.id === visit.doctorId) : null;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${isArabic ? 'ar' : 'en'}">
        <head>
          <meta charset="UTF-8">
          <title>${isArabic ? 'ملخص الزيارة' : 'Visit Summary'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin: 20px 0; }
            .label { font-weight: bold; display: inline-block; min-width: 120px; }
            .value { margin-left: 10px; }
            .procedures { margin-top: 10px; }
            .procedure-item { margin: 5px 0; padding: 10px; border-left: 3px solid #007bff; background: #f8f9fa; }
            .tooth-map { display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; margin: 10px 0; }
            .tooth { width: 30px; height: 30px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 12px; }
            .tooth.selected { background: #007bff; color: white; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${isArabic ? 'ملخص الزيارة الطبية' : 'Medical Visit Summary'}</h1>
            <h2>${isArabic ? 'عيادة الأسنان' : 'Dental Clinic'}</h2>
          </div>
          
          <div class="section">
            <div><span class="label">${isArabic ? 'اسم المريض:' : 'Patient Name:'}</span> <span class="value">${patient?.firstName || ''} ${patient?.lastName || ''}</span></div>
            <div><span class="label">${isArabic ? 'الرقم المدني:' : 'Civil ID:'}</span> <span class="value">${patient?.civilId || ''}</span></div>
            <div><span class="label">${isArabic ? 'رقم الهاتف:' : 'Phone:'}</span> <span class="value">${patient?.phone || ''}</span></div>
          </div>
          
          <div class="section">
            <div><span class="label">${isArabic ? 'الطبيب المعالج:' : 'Doctor:'}</span> <span class="value">${doctor?.fullName || ''}</span></div>
            <div><span class="label">${isArabic ? 'تاريخ الزيارة:' : 'Visit Date:'}</span> <span class="value">${format(new Date(visit.visitDate), 'dd/MM/yyyy HH:mm')}</span></div>
            <div><span class="label">${isArabic ? 'الحالة:' : 'Status:'}</span> <span class="value">${visit.status}</span></div>
          </div>
          
          <div class="section">
            <div><span class="label">${isArabic ? 'الشكوى الرئيسية:' : 'Chief Complaint:'}</span></div>
            <div class="value">${visit.chiefComplaint || (isArabic ? 'غير محدد' : 'Not specified')}</div>
          </div>
          
          <div class="section">
            <div><span class="label">${isArabic ? 'التشخيص:' : 'Diagnosis:'}</span></div>
            <div class="value">${visit.diagnosis || (isArabic ? 'غير محدد' : 'Not specified')}</div>
          </div>
          
          ${visit.procedures && visit.procedures.length > 0 ? `
          <div class="section">
            <div><span class="label">${isArabic ? 'الإجراءات:' : 'Procedures:'}</span></div>
            <div class="procedures">
              ${visit.procedures.map(proc => `
                <div class="procedure-item">
                  <strong>${proc.serviceName || ''}</strong>
                  ${proc.tooth ? `<br/>${isArabic ? 'السن:' : 'Tooth:'} ${proc.tooth}` : ''}
                  ${proc.notes ? `<br/>${isArabic ? 'ملاحظات:' : 'Notes:'} ${proc.notes}` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
          
          ${visit.doctorNotes ? `
          <div class="section">
            <div><span class="label">${isArabic ? 'ملاحظات الطبيب:' : 'Doctor Notes:'}</span></div>
            <div class="value">${visit.doctorNotes}</div>
          </div>
          ` : ''}
          
          <div class="section">
            <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #666;">
              ${isArabic ? 'طُبع في:' : 'Printed on:'} ${format(new Date(), 'dd/MM/yyyy HH:mm')}
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="enhanced-visits-page">
      {/* Enhanced Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
            {isArabic ? "إدارة الزيارات المتقدمة" : "Enhanced Visits Management"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isArabic ? "إدارة شاملة للزيارات الطبية مع خريطة الأسنان والإجراءات" : "Comprehensive medical visits management with dental charts and procedures"}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => {
              setEditingVisit(null);
              visitForm.reset();
              setSelectedTeeth({});
              setIsVisitDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90"
            data-testid="create-visit-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isArabic ? "زيارة جديدة" : "New Visit"}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              const csv = filteredVisits.map(visit => 
                `${visit.patientName},${visit.doctorName},${format(new Date(visit.visitDate), 'yyyy-MM-dd')},${visit.status},${visit.totalAmount || 0}`
              ).join('\n');
              const blob = new Blob([`Patient,Doctor,Date,Status,Amount\n${csv}`], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'visits.csv';
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
                  placeholder={isArabic ? "البحث في الزيارات..." : "Search visits..."}
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
                <SelectItem value="IN_PROGRESS">{isArabic ? "قيد التنفيذ" : "In Progress"}</SelectItem>
                <SelectItem value="COMPLETED">{isArabic ? "مكتمل" : "Completed"}</SelectItem>
                <SelectItem value="CANCELLED">{isArabic ? "ملغي" : "Cancelled"}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Button
                variant={currentView === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentView("list")}
                data-testid="list-view-button"
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                variant={currentView === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentView("calendar")}
                data-testid="calendar-view-button"
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </div>
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
          <TabsTrigger value="visits" data-testid="visits-tab">
            <Stethoscope className="h-4 w-4 mr-2" />
            {isArabic ? "الزيارات" : "Visits"}
          </TabsTrigger>
          <TabsTrigger value="calendar" data-testid="calendar-tab">
            <CalendarDays className="h-4 w-4 mr-2" />
            {isArabic ? "التقويم" : "Calendar"}
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="analytics-tab">
            <Activity className="h-4 w-4 mr-2" />
            {isArabic ? "التحليلات" : "Analytics"}
          </TabsTrigger>
        </TabsList>

        {/* Enhanced Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  {isArabic ? "إجمالي الزيارات" : "Total Visits"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{visitStats.totalVisits}</div>
                <div className="text-xs opacity-80 mt-1">
                  {isArabic ? "هذا الشهر" : "This month"}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isArabic ? "الزيارات المكتملة" : "Completed Visits"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{visitStats.completedVisits}</div>
                <div className="text-xs opacity-80 mt-1">
                  {visitStats.totalVisits > 0 ? Math.round((visitStats.completedVisits / visitStats.totalVisits) * 100) : 0}% {isArabic ? "معدل الإكمال" : "completion rate"}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  {isArabic ? "زيارات اليوم" : "Today's Visits"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{visitStats.todayVisits}</div>
                <div className="text-xs opacity-80 mt-1">
                  {format(new Date(), 'dd/MM/yyyy')}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90 flex items-center">
                  <Heart className="h-4 w-4 mr-2" />
                  {isArabic ? "الإيرادات" : "Revenue"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(visitStats.totalRevenue)}</div>
                <div className="text-xs opacity-80 mt-1">
                  {isArabic ? "متوسط" : "Average"}: {formatCurrency(visitStats.averageRevenue)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visit Status Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? "توزيع حالات الزيارات" : "Visit Status Distribution"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{isArabic ? "مكتمل" : "Completed"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{visitStats.completedVisits}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${visitStats.totalVisits > 0 ? (visitStats.completedVisits / visitStats.totalVisits) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">{isArabic ? "قيد التنفيذ" : "In Progress"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{visitStats.inProgressVisits}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-600 h-2 rounded-full" 
                          style={{ width: `${visitStats.totalVisits > 0 ? (visitStats.inProgressVisits / visitStats.totalVisits) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">{isArabic ? "ملغي" : "Cancelled"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{visitStats.cancelledVisits}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ width: `${visitStats.totalVisits > 0 ? (visitStats.cancelledVisits / visitStats.totalVisits) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? "أحدث الزيارات" : "Recent Visits"}</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {Array.isArray(visits) && visits.slice(0, 5).map((visit) => (
                      <div key={visit.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{visit.patientName}</div>
                          <div className="text-xs text-muted-foreground">
                            {visit.doctorName} • {format(new Date(visit.visitDate), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(visit.status)}
                        </div>
                      </div>
                    ))}
                    
                    {(!Array.isArray(visits) || visits.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{isArabic ? "لا توجد زيارات اليوم" : "No visits today"}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Enhanced Visits Tab */}
        <TabsContent value="visits" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {isArabic ? "قائمة الزيارات" : "Visits List"}
                  <Badge variant="secondary" className="ml-2">
                    {filteredVisits.length}
                  </Badge>
                </CardTitle>
                <Button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/visits"] })}
                  variant="outline"
                  size="sm"
                  data-testid="refresh-visits"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingVisits ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>{isArabic ? "جاري التحميل..." : "Loading..."}</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? "المريض" : "Patient"}</TableHead>
                      <TableHead>{isArabic ? "الطبيب" : "Doctor"}</TableHead>
                      <TableHead>{isArabic ? "التاريخ" : "Date"}</TableHead>
                      <TableHead>{isArabic ? "الشكوى" : "Complaint"}</TableHead>
                      <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                      <TableHead>{isArabic ? "المبلغ" : "Amount"}</TableHead>
                      <TableHead className="text-right">{isArabic ? "الإجراءات" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisits.map((visit) => (
                      <TableRow key={visit.id} data-testid={`visit-row-${visit.id}`}>
                        <TableCell>
                          <div className="font-medium">{visit.patientName}</div>
                        </TableCell>
                        <TableCell>{visit.doctorName}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{format(new Date(visit.visitDate), 'dd/MM/yyyy')}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(visit.visitDate), 'HH:mm')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate" title={visit.chiefComplaint}>
                            {visit.chiefComplaint || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(visit.status)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {visit.totalAmount ? formatCurrency(visit.totalAmount) : "-"}
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
                                  setSelectedVisit(visit);
                                  setIsViewDialogOpen(true);
                                }}
                                data-testid={`view-visit-${visit.id}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {isArabic ? "عرض" : "View"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenEditDialog(visit)}
                                data-testid={`edit-visit-${visit.id}`}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                {isArabic ? "تعديل" : "Edit"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => printVisitSummary(visit)}
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                {isArabic ? "طباعة" : "Print"}
                              </DropdownMenuItem>
                              {visit.status === "COMPLETED" && (
                                <DropdownMenuItem
                                  onClick={() => createInvoiceMutation.mutate(visit.id)}
                                  data-testid={`create-invoice-${visit.id}`}
                                >
                                  <Receipt className="h-4 w-4 mr-2" />
                                  {isArabic ? "إنشاء فاتورة" : "Create Invoice"}
                                </DropdownMenuItem>
                              )}
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
                    
                    {filteredVisits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-muted-foreground">
                            {isArabic ? "لا توجد زيارات" : "No visits found"}
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

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? "تقويم الزيارات" : "Visits Calendar"}</CardTitle>
              <CardDescription>
                {isArabic ? "عرض الزيارات في التقويم" : "View visits in calendar format"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{isArabic ? "عرض التقويم قيد التطوير" : "Calendar view coming soon"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? "تحليلات الزيارات" : "Visits Analytics"}</CardTitle>
              <CardDescription>
                {isArabic ? "إحصائيات وتقارير مفصلة" : "Detailed statistics and reports"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{isArabic ? "التحليلات قيد التطوير" : "Analytics coming soon"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced Visit Dialog */}
      <Dialog open={isVisitDialogOpen} onOpenChange={setIsVisitDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVisit 
                ? (isArabic ? "تعديل الزيارة" : "Edit Visit")
                : (isArabic ? "زيارة جديدة" : "New Visit")
              }
            </DialogTitle>
            <DialogDescription>
              {isArabic ? "قم بملء تفاصيل الزيارة والإجراءات المطلوبة" : "Fill in visit details and required procedures"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...visitForm}>
            <form onSubmit={visitForm.handleSubmit(handleSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">{isArabic ? "البيانات الأساسية" : "Basic Info"}</TabsTrigger>
                  <TabsTrigger value="procedures">{isArabic ? "الإجراءات" : "Procedures"}</TabsTrigger>
                  <TabsTrigger value="teeth">{isArabic ? "خريطة الأسنان" : "Dental Chart"}</TabsTrigger>
                  <TabsTrigger value="notes">{isArabic ? "الملاحظات" : "Notes"}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={visitForm.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "المريض" : "Patient"}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-patient">
                                <SelectValue placeholder={isArabic ? "اختر المريض" : "Select Patient"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.isArray(patients) && patients.map((patient) => (
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

                    <FormField
                      control={visitForm.control}
                      name="doctorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "الطبيب" : "Doctor"}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-doctor">
                                <SelectValue placeholder={isArabic ? "اختر الطبيب" : "Select Doctor"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.isArray(doctors) && doctors.map((doctor) => (
                                <SelectItem key={doctor.id} value={doctor.id}>
                                  {doctor.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={visitForm.control}
                      name="visitDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "تاريخ ووقت الزيارة" : "Visit Date & Time"}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP HH:mm")
                                  ) : (
                                    <span>{isArabic ? "اختر التاريخ والوقت" : "Pick date and time"}</span>
                                  )}
                                  <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                              <div className="p-3 border-t">
                                <Input
                                  type="time"
                                  value={field.value ? format(field.value, "HH:mm") : ""}
                                  onChange={(e) => {
                                    if (field.value && e.target.value) {
                                      const [hours, minutes] = e.target.value.split(":");
                                      const newDate = new Date(field.value);
                                      newDate.setHours(parseInt(hours), parseInt(minutes));
                                      field.onChange(newDate);
                                    }
                                  }}
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={visitForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "حالة الزيارة" : "Visit Status"}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="IN_PROGRESS">
                                {isArabic ? "قيد التنفيذ" : "In Progress"}
                              </SelectItem>
                              <SelectItem value="COMPLETED">
                                {isArabic ? "مكتمل" : "Completed"}
                              </SelectItem>
                              <SelectItem value="CANCELLED">
                                {isArabic ? "ملغي" : "Cancelled"}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={visitForm.control}
                    name="chiefComplaint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isArabic ? "الشكوى الرئيسية" : "Chief Complaint"}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={isArabic ? "وصف الشكوى الرئيسية..." : "Describe the main complaint..."}
                            {...field}
                            data-testid="chief-complaint-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="procedures" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-medium">
                        {isArabic ? "الإجراءات والخدمات" : "Procedures & Services"}
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addProcedure({ serviceId: "" })}
                        data-testid="add-procedure-button"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {isArabic ? "إضافة إجراء" : "Add Procedure"}
                      </Button>
                    </div>

                    {procedureFields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={visitForm.control}
                            name={`procedures.${index}.serviceId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isArabic ? "الخدمة" : "Service"}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={isArabic ? "اختر الخدمة" : "Select Service"} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Array.isArray(services) && services.map((service) => (
                                      <SelectItem key={service.id} value={service.id}>
                                        {isArabic ? service.nameAr : service.nameEn} - {formatCurrency(service.price)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={visitForm.control}
                            name={`procedures.${index}.tooth`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{isArabic ? "رقم السن" : "Tooth Number"}</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="1-32"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeProcedure(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <FormField
                          control={visitForm.control}
                          name={`procedures.${index}.notes`}
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>{isArabic ? "ملاحظات الإجراء" : "Procedure Notes"}</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={isArabic ? "ملاحظات إضافية..." : "Additional notes..."}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </Card>
                    ))}

                    {procedureFields.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{isArabic ? "لا توجد إجراءات مضافة" : "No procedures added"}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="teeth" className="space-y-4">
                  <TeethMap
                    selectedTeeth={selectedTeeth}
                    onTeethChange={setSelectedTeeth}
                    isArabic={isArabic}
                  />
                </TabsContent>
                
                <TabsContent value="notes" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={visitForm.control}
                      name="diagnosis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "التشخيص" : "Diagnosis"}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={isArabic ? "التشخيص المبدئي..." : "Initial diagnosis..."}
                              {...field}
                              data-testid="diagnosis-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={visitForm.control}
                      name="treatmentPlan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "خطة العلاج" : "Treatment Plan"}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={isArabic ? "خطة العلاج المقترحة..." : "Suggested treatment plan..."}
                              {...field}
                              data-testid="treatment-plan-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={visitForm.control}
                      name="doctorNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "ملاحظات الطبيب" : "Doctor Notes"}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={isArabic ? "ملاحظات إضافية من الطبيب..." : "Additional notes from doctor..."}
                              {...field}
                              data-testid="doctor-notes-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVisitDialogOpen(false)}
                  data-testid="cancel-visit-button"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  disabled={createVisitMutation.isPending || updateVisitMutation.isPending}
                  data-testid="submit-visit-button"
                >
                  {(createVisitMutation.isPending || updateVisitMutation.isPending) ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {isArabic ? "جاري الحفظ..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <Stethoscope className="h-4 w-4 mr-2" />
                      {editingVisit 
                        ? (isArabic ? "تحديث الزيارة" : "Update Visit")
                        : (isArabic ? "إنشاء الزيارة" : "Create Visit")
                      }
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Enhanced View Visit Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{isArabic ? "تفاصيل الزيارة" : "Visit Details"}</span>
              {selectedVisit && (
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedVisit.status)}
                  <Button variant="outline" size="sm" onClick={() => selectedVisit && printVisitSummary(selectedVisit)}>
                    <Printer className="h-4 w-4 mr-2" />
                    {isArabic ? "طباعة" : "Print"}
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedVisit && (
            <div className="space-y-6">
              {/* Visit Header */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{isArabic ? "المريض" : "Patient"}</div>
                  <div className="font-semibold">{selectedVisit.patientName}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{isArabic ? "الطبيب" : "Doctor"}</div>
                  <div className="font-semibold">{selectedVisit.doctorName}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{isArabic ? "تاريخ الزيارة" : "Visit Date"}</div>
                  <div className="font-semibold">{format(new Date(selectedVisit.visitDate), 'PPP HH:mm')}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{isArabic ? "الحالة" : "Status"}</div>
                  <div>{getStatusBadge(selectedVisit.status)}</div>
                </div>
              </div>

              {/* Chief Complaint */}
              {selectedVisit.chiefComplaint && (
                <div>
                  <h4 className="font-semibold mb-2">{isArabic ? "الشكوى الرئيسية:" : "Chief Complaint:"}</h4>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {selectedVisit.chiefComplaint}
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              {selectedVisit.diagnosis && (
                <div>
                  <h4 className="font-semibold mb-2">{isArabic ? "التشخيص:" : "Diagnosis:"}</h4>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {selectedVisit.diagnosis}
                  </div>
                </div>
              )}

              {/* Procedures */}
              {selectedVisit.procedures && selectedVisit.procedures.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">{isArabic ? "الإجراءات المنجزة:" : "Completed Procedures:"}</h4>
                  <div className="space-y-2">
                    {selectedVisit.procedures.map((procedure, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">{procedure.serviceName}</div>
                          {procedure.tooth && (
                            <div className="text-sm text-muted-foreground">
                              {isArabic ? "السن:" : "Tooth:"} {procedure.tooth}
                            </div>
                          )}
                          {procedure.notes && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {procedure.notes}
                            </div>
                          )}
                        </div>
                        {procedure.price && (
                          <div className="font-medium text-green-600">
                            {formatCurrency(procedure.price)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Treatment Plan */}
              {selectedVisit.treatmentPlan && (
                <div>
                  <h4 className="font-semibold mb-2">{isArabic ? "خطة العلاج:" : "Treatment Plan:"}</h4>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {selectedVisit.treatmentPlan}
                  </div>
                </div>
              )}

              {/* Doctor Notes */}
              {selectedVisit.doctorNotes && (
                <div>
                  <h4 className="font-semibold mb-2">{isArabic ? "ملاحظات الطبيب:" : "Doctor Notes:"}</h4>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {selectedVisit.doctorNotes}
                  </div>
                </div>
              )}

              {/* Total Amount */}
              {selectedVisit.totalAmount && (
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <span className="font-semibold">{isArabic ? "إجمالي المبلغ:" : "Total Amount:"}</span>
                  <span className="font-bold text-green-600 text-lg">
                    {formatCurrency(selectedVisit.totalAmount)}
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}