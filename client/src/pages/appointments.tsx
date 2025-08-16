import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, startOfWeek, endOfWeek, isFriday, parseISO, isToday, isSameWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Edit,
  Trash2,
  UserPlus,
  RefreshCw,
  Grid3X3,
  List,
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  FileText,
  Download,
  Bell,
  Eye,
  Copy
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Patient, Service, User as UserType, Appointment, InsertPatient } from "@shared/schema";

// Working hours configuration (constants for now, editable in admin later)
const WORKING_DAYS = [6, 0, 1, 2, 3]; // Sat-Thu (Saturday = 6, Sunday = 0, etc.)
const WORKING_HOURS = {
  start: "09:00",
  end: "21:00",
  slotDuration: 30 // minutes
};

// Types
interface AppointmentWithDetails extends Appointment {
  patientName?: string;
  serviceName?: string;
  doctorName?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  appointmentId?: string;
}

// Validation schemas
const appointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().optional(),
  serviceId: z.string().min(1, "Service is required"),
  appointmentDate: z.string().min(1, "Date and time is required"),
  duration: z.number().min(15).max(180),
  notes: z.string().optional(),
});

const patientSchema = z.object({
  civilId: z.string().min(12).max(12).regex(/^\d{12}$/, "Civil ID must be exactly 12 digits"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(8, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  allergies: z.array(z.string()).optional().default([]),
  medicalHistory: z.string().optional(),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;
type PatientFormData = z.infer<typeof patientSchema>;

export default function AppointmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isArabic = document.documentElement.dir === "rtl";
  
  // State management
  const [currentView, setCurrentView] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 6 }));
  const [currentMonthStart, setCurrentMonthStart] = useState(startOfMonth(new Date()));
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [selectedService, setSelectedService] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{start: Date, end: Date} | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [civilIdInput, setCivilIdInput] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Forms
  const appointmentForm = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      notes: "",
      duration: 30,
    },
  });

  const patientForm = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      civilId: "",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      gender: undefined,
      address: "",
      emergencyContact: "",
      emergencyPhone: "",
      allergies: [],
      medicalHistory: "",
      notes: "",
    },
  });

  // Queries
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments/week", format(currentWeekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await apiRequest(`/api/appointments/week?startDate=${format(currentWeekStart, "yyyy-MM-dd")}`);
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      return await response.json();
    },
  });

  const { data: todayAppointments = [] } = useQuery({
    queryKey: ["/api/appointments/today"],
    queryFn: async () => {
      const response = await apiRequest("/api/appointments/today");
      if (!response.ok) {
        throw new Error('Failed to fetch today appointments');
      }
      return await response.json();
    },
  });

  const { data: patientsData } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await apiRequest("/api/patients");
      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }
      return await response.json();
    },
  });

  const { data: servicesData } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await apiRequest("/api/services");
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      return await response.json();
    },
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["/api/doctors"],
    queryFn: async () => {
      const response = await apiRequest("/api/doctors");
      if (!response.ok) {
        throw new Error('Failed to fetch doctors');
      }
      return await response.json();
    },
  });

  // Ensure data is arrays
  const patients = Array.isArray(patientsData) ? patientsData : [];
  const services = Array.isArray(servicesData) ? servicesData : [];
  const doctors = Array.isArray(doctorsData) ? doctorsData : [];

  // Dashboard statistics query
  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/appointments-stats"],
    queryFn: async () => {
      const response = await apiRequest("/api/dashboard/appointments-stats");
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      return await response.json();
    },
  });

  // Monthly appointments query for calendar view
  const { data: monthlyAppointments = [] } = useQuery({
    queryKey: ["/api/appointments/month", format(currentMonthStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await apiRequest(`/api/appointments/month?startDate=${format(currentMonthStart, "yyyy-MM-dd")}`);
      if (!response.ok) {
        throw new Error('Failed to fetch monthly appointments');
      }
      return await response.json();
    },
    enabled: currentView === "month"
  });

  const { data: availableSlots = [] } = useQuery({
    queryKey: ["/api/appointments/available-slots", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await apiRequest(`/api/appointments/available-slots?date=${format(selectedDate, "yyyy-MM-dd")}&doctorId=${appointmentForm.watch("doctorId") || ""}`);
      if (!response.ok) {
        throw new Error('Failed to fetch available slots');
      }
      const data = await response.json();
      return data.slots || [];
    },
    enabled: isCreateDialogOpen || isRescheduleDialogOpen,
  });

  // Mutations
  const createAppointmentMutation = useMutation({
    mutationFn: (data: AppointmentFormData) => apiRequest("/api/appointments", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setIsCreateDialogOpen(false);
      appointmentForm.reset();
      setSelectedPatient(null);
      toast({
        title: isArabic ? "تم إنشاء الموعد" : "Appointment Created",
        description: isArabic ? "تم حجز الموعد بنجاح" : "Appointment has been scheduled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message || (isArabic ? "فشل في إنشاء الموعد" : "Failed to create appointment"),
        variant: "destructive",
      });
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: PatientFormData): Promise<Patient> => {
      const response = await apiRequest("/api/patients", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error('Failed to create patient');
      }
      return await response.json();
    },
    onSuccess: (patient: Patient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setSelectedPatient(patient);
      appointmentForm.setValue('patientId', patient.id);
      setIsPatientDialogOpen(false);
      patientForm.reset();
      toast({
        title: isArabic ? "تم إنشاء المريض" : "Patient Created",
        description: isArabic ? "تم إضافة المريض بنجاح" : "Patient has been added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message || (isArabic ? "فشل في إضافة المريض" : "Failed to create patient"),
        variant: "destructive",
      });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest(`/api/appointments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: isArabic ? "تم تحديث الموعد" : "Appointment Updated",
        description: isArabic ? "تم تحديث الموعد بنجاح" : "Appointment has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message || (isArabic ? "فشل في تحديث الموعد" : "Failed to update appointment"),
        variant: "destructive",
      });
    },
  });

  // Patient lookup
  const lookupPatient = async (civilId: string) => {
    if (!civilId || civilId.length !== 12) {
      toast({
        title: isArabic ? "خطأ في الرقم المدني" : "Invalid Civil ID",
        description: isArabic ? "الرقم المدني يجب أن يكون 12 رقم" : "Civil ID must be 12 digits",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest(`/api/patients/lookup/${civilId}`);
      if (!response.ok) {
        throw new Error('Patient not found');
      }
      const patient = await response.json();
      setSelectedPatient(patient);
      appointmentForm.setValue('patientId', patient.id);
      toast({
        title: isArabic ? "تم العثور على المريض" : "Patient Found",
        description: `${patient.firstName} ${patient.lastName}`,
      });
    } catch (error) {
      toast({
        title: isArabic ? "لم يتم العثور على المريض" : "Patient Not Found", 
        description: isArabic ? "لم يتم العثور على مريض بهذا الرقم المدني" : "No patient found with this Civil ID",
        variant: "destructive",
      });
      setSelectedPatient(null);
    }
  };

  // Status transitions
  const updateAppointmentStatus = (appointmentId: string, status: string, reason?: string) => {
    const updateData: any = { status };
    if (reason) {
      updateData.notes = reason;
    }

    updateAppointmentMutation.mutate({ 
      id: appointmentId, 
      data: updateData
    });
  };

  // Generate time slots
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const [startHour, startMin] = WORKING_HOURS.start.split(":").map(Number);
    const [endHour, endMin] = WORKING_HOURS.end.split(":").map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    for (let time = startTime; time < endTime; time += WORKING_HOURS.slotDuration) {
      const hour = Math.floor(time / 60);
      const min = time % 60;
      const timeStr = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      
      slots.push({
        time: timeStr,
        available: Array.isArray(availableSlots) ? availableSlots.includes(timeStr) : false,
      });
    }
    
    return slots;
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      SCHEDULED: { 
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        label: isArabic ? "مجدول" : "Scheduled",
        icon: Clock
      },
      CONFIRMED: { 
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        label: isArabic ? "مؤكد" : "Confirmed",
        icon: CheckCircle
      },
      COMPLETED: { 
        color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
        label: isArabic ? "مكتمل" : "Completed",
        icon: CheckCircle
      },
      CANCELLED: { 
        color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        label: isArabic ? "ملغي" : "Cancelled",
        icon: XCircle
      },
      NO_SHOW: { 
        color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
        label: isArabic ? "لم يحضر" : "No Show",
        icon: AlertCircle
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;

    return (
      <Badge className={cn("gap-1", config?.color)}>
        <Icon className="h-3 w-3" />
        {config?.label || status}
      </Badge>
    );
  };

  // Week calendar component
  const WeekCalendar = () => {
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push(addDays(currentWeekStart, i));
    }

    const filteredAppointments = Array.isArray(appointments) ? appointments.filter((apt: AppointmentWithDetails) => {
      // Status filter
      if (statusFilter !== "ALL" && apt.status !== statusFilter) return false;
      
      // Doctor filter
      if (selectedDoctor !== "all" && apt.doctorId !== selectedDoctor) return false;
      
      // Service filter
      if (selectedService !== "all" && apt.serviceId !== selectedService) return false;
      
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesPatient = apt.patientName?.toLowerCase().includes(searchLower);
        const matchesService = apt.serviceName?.toLowerCase().includes(searchLower);
        const matchesDoctor = apt.doctorName?.toLowerCase().includes(searchLower);
        const matchesNotes = apt.notes?.toLowerCase().includes(searchLower);
        
        if (!matchesPatient && !matchesService && !matchesDoctor && !matchesNotes) return false;
      }
      
      return true;
    }) : [];

    const getDayAppointments = (date: Date) => {
      return filteredAppointments.filter((apt: AppointmentWithDetails) => 
        isSameWeek(parseISO(apt.appointmentDate.toString()), date) && 
        format(parseISO(apt.appointmentDate.toString()), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
    };

    return (
      <div className="grid grid-cols-7 gap-2 mt-4">
        {weekDays.map((day, index) => {
          const dayAppointments = getDayAppointments(day);
          const isDisabled = isFriday(day);
          
          return (
            <Card key={index} className={cn(
              "min-h-[200px]",
              isDisabled && "bg-gray-50 dark:bg-gray-900 opacity-50",
              isToday(day) && "ring-2 ring-blue-500"
            )}>
              <CardHeader className="pb-2">
                <CardTitle className={cn(
                  "text-sm font-medium text-center",
                  isToday(day) && "text-blue-600 dark:text-blue-400"
                )}>
                  {format(day, "EEE", { locale: isArabic ? ar : undefined })}
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(day, "MMM dd")}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {dayAppointments.map((apt: AppointmentWithDetails) => (
                  <div
                    key={apt.id}
                    className={cn(
                      "p-2 rounded-md text-xs cursor-pointer hover:opacity-80 transition-opacity",
                      apt.status === "SCHEDULED" && "bg-blue-100 dark:bg-blue-900",
                      apt.status === "CONFIRMED" && "bg-green-100 dark:bg-green-900",
                      apt.status === "COMPLETED" && "bg-emerald-100 dark:bg-emerald-900",
                      apt.status === "CANCELLED" && "bg-red-100 dark:bg-red-900",
                      apt.status === "NO_SHOW" && "bg-orange-100 dark:bg-orange-900"
                    )}
                    onClick={() => setSelectedAppointment(apt)}
                  >
                    <div className="font-medium truncate">
                      {format(parseISO(apt.appointmentDate.toString()), "HH:mm")}
                    </div>
                    <div className="truncate text-muted-foreground">
                      {apt.patientName}
                    </div>
                    <div className="truncate text-xs">
                      {apt.serviceName}
                    </div>
                  </div>
                ))}
                {dayAppointments.length === 0 && !isDisabled && (
                  <div className="text-center text-xs text-muted-foreground py-4">
                    {isArabic ? "لا توجد مواعيد" : "No appointments"}
                  </div>
                )}
                {isDisabled && (
                  <div className="text-center text-xs text-muted-foreground py-4">
                    {isArabic ? "يوم عطلة" : "Day off"}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Today view for printing
  // Enhanced Dashboard Statistics Component
  const DashboardStats = () => {
    const stats = dashboardStats || {
      totalToday: 0,
      totalWeek: 0,
      totalMonth: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      upcoming: 0
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isArabic ? "مواعيد اليوم" : "Today's Appointments"}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalToday}</div>
            <p className="text-xs text-muted-foreground">
              {isArabic ? "موعد مجدول لليوم" : "appointments scheduled"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isArabic ? "هذا الأسبوع" : "This Week"}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWeek}</div>
            <p className="text-xs text-muted-foreground">
              {isArabic ? "موعد هذا الأسبوع" : "appointments this week"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isArabic ? "مكتملة" : "Completed"}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {isArabic ? "موعد مكتمل" : "completed appointments"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isArabic ? "قادمة" : "Upcoming"}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">
              {isArabic ? "موعد قادم" : "upcoming appointments"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Enhanced Monthly Calendar Component
  const MonthCalendar = () => {
    const monthStart = startOfMonth(currentMonthStart);
    const monthEnd = endOfMonth(monthStart);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const filteredAppointments = Array.isArray(monthlyAppointments) ? monthlyAppointments.filter((apt: AppointmentWithDetails) => {
      if (statusFilter === "ALL") return true;
      return apt.status === statusFilter;
    }) : [];

    const getDayAppointments = (date: Date) => {
      return filteredAppointments.filter((apt: AppointmentWithDetails) => 
        format(parseISO(apt.appointmentDate.toString()), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
    };

    return (
      <div className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {format(currentMonthStart, "MMMM yyyy", { locale: isArabic ? ar : undefined })}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonthStart(subMonths(currentMonthStart, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonthStart(new Date())}
            >
              {isArabic ? "اليوم" : "Today"}
            </Button>
            <Button
              variant="outline" 
              size="sm"
              onClick={() => setCurrentMonthStart(addMonths(currentMonthStart, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day Headers */}
          {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {isArabic ? 
                ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'][['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(day)]
                : day
              }
            </div>
          ))}
          
          {/* Calendar Days */}
          {calendarDays.map((day) => {
            const dayAppointments = getDayAppointments(day);
            const isDisabled = isFriday(day);
            
            return (
              <Card key={day.toString()} className={cn(
                "min-h-[100px] cursor-pointer hover:shadow-md transition-shadow",
                isDisabled && "bg-gray-50 dark:bg-gray-900 opacity-50",
                isToday(day) && "ring-2 ring-blue-500",
                !isSameMonth(day, currentMonthStart) && "opacity-30"
              )}
              onClick={() => {
                setSelectedDate(day);
                setCurrentView("day");
              }}>
                <CardHeader className="p-2">
                  <div className={cn(
                    "text-sm font-medium",
                    isToday(day) && "text-blue-600 dark:text-blue-400"
                  )}>
                    {format(day, "d")}
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 2).map((apt: AppointmentWithDetails) => (
                      <div
                        key={apt.id}
                        className={cn(
                          "text-xs p-1 rounded truncate",
                          apt.status === "SCHEDULED" && "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
                          apt.status === "CONFIRMED" && "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
                          apt.status === "COMPLETED" && "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
                        )}
                      >
                        {format(parseISO(apt.appointmentDate.toString()), "HH:mm")} {apt.patientName}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayAppointments.length - 2} {isArabic ? "موعد أخرى" : "more"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const TodayView = () => {
    const todayFormatted = format(selectedDate, "yyyy-MM-dd");
    const todayAppointmentsList = Array.isArray(appointments) ? appointments.filter((apt: AppointmentWithDetails) => {
      // Date filter
      if (format(parseISO(apt.appointmentDate.toString()), 'yyyy-MM-dd') !== todayFormatted) return false;
      
      // Status filter
      if (statusFilter !== "ALL" && apt.status !== statusFilter) return false;
      
      // Doctor filter
      if (selectedDoctor !== "all" && apt.doctorId !== selectedDoctor) return false;
      
      // Service filter
      if (selectedService !== "all" && apt.serviceId !== selectedService) return false;
      
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesPatient = apt.patientName?.toLowerCase().includes(searchLower);
        const matchesService = apt.serviceName?.toLowerCase().includes(searchLower);
        const matchesDoctor = apt.doctorName?.toLowerCase().includes(searchLower);
        const matchesNotes = apt.notes?.toLowerCase().includes(searchLower);
        
        if (!matchesPatient && !matchesService && !matchesDoctor && !matchesNotes) return false;
      }
      
      return true;
    }).sort((a, b) => new Date(a.appointmentDate.toString()).getTime() - new Date(b.appointmentDate.toString()).getTime()) : [];

    return (
      <div className="printable-today bg-white dark:bg-gray-900 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">
            {isArabic ? "مواعيد اليوم" : "Today's Appointments"}
          </h1>
          <p className="text-lg text-muted-foreground">
            {format(new Date(), isArabic ? "EEEE، dd MMMM yyyy" : "EEEE, MMMM dd, yyyy", { 
              locale: isArabic ? ar : undefined 
            })}
          </p>
        </div>

        <div className="space-y-4">
          {todayAppointmentsList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isArabic ? "لا توجد مواعيد اليوم" : "No appointments today"}
            </div>
          ) : (
            todayAppointmentsList.map((apt: AppointmentWithDetails, index) => (
              <Card key={apt.id} className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold">{apt.patientName}</p>
                        <p className="text-sm text-muted-foreground">{apt.serviceName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg">
                        {format(parseISO(apt.appointmentDate.toString()), "HH:mm")}
                      </p>
                      <StatusBadge status={apt.status} />
                    </div>
                  </div>
                  {apt.doctorName && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {isArabic ? "الطبيب: " : "Doctor: "}{apt.doctorName}
                    </p>
                  )}
                  {apt.notes && (
                    <p className="text-sm text-muted-foreground">
                      {isArabic ? "ملاحظات: " : "Notes: "}{apt.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Dashboard Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">
            {isArabic ? "المواعيد" : "Appointments"}
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            {showStats ? (isArabic ? "إخفاء الإحصائيات" : "Hide Stats") : (isArabic ? "عرض الإحصائيات" : "Show Stats")}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {isArabic ? "فلاتر" : "Filters"}
          </Button>
          <Select value={currentView} onValueChange={(value: "day" | "week" | "month") => setCurrentView(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">{isArabic ? "مواعيد اليوم" : "Day View"}</SelectItem>
              <SelectItem value="week">{isArabic ? "عرض أسبوعي" : "Week View"}</SelectItem>
              <SelectItem value="month">{isArabic ? "عرض شهري" : "Month View"}</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {isArabic ? "موعد جديد" : "New Appointment"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isArabic ? "إنشاء موعد جديد" : "Create New Appointment"}</DialogTitle>
                <DialogDescription>
                  {isArabic ? "قم بملء المعلومات المطلوبة لحجز موعد جديد" : "Fill in the required information to schedule a new appointment"}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...appointmentForm}>
                <form onSubmit={appointmentForm.handleSubmit((data) => createAppointmentMutation.mutate(data))} className="space-y-4">
                  {/* Patient Lookup */}
                  <div className="space-y-2">
                    <Label>{isArabic ? "البحث عن المريض" : "Find Patient"}</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder={isArabic ? "الرقم المدني (12 رقم)" : "Civil ID (12 digits)"}
                        value={civilIdInput}
                        onChange={(e) => setCivilIdInput(e.target.value)}
                        maxLength={12}
                      />
                      <Button type="button" onClick={() => lookupPatient(civilIdInput)}>
                        <Search className="h-4 w-4" />
                      </Button>
                      <Dialog open={isPatientDialogOpen} onOpenChange={setIsPatientDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline">
                            <UserPlus className="h-4 w-4 mr-2" />
                            {isArabic ? "مريض جديد" : "New Patient"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{isArabic ? "إضافة مريض جديد" : "Add New Patient"}</DialogTitle>
                            <DialogDescription>
                              {isArabic ? "إدخال معلومات المريض الجديد" : "Enter new patient information"}
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...patientForm}>
                            <form onSubmit={patientForm.handleSubmit((data) => createPatientMutation.mutate(data))} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={patientForm.control}
                                  name="civilId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{isArabic ? "الرقم المدني" : "Civil ID"}</FormLabel>
                                      <FormControl>
                                        <Input {...field} maxLength={12} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={patientForm.control}
                                  name="phone"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{isArabic ? "رقم الهاتف" : "Phone"}</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={patientForm.control}
                                  name="firstName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{isArabic ? "الاسم الأول" : "First Name"}</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={patientForm.control}
                                  name="lastName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{isArabic ? "اسم العائلة" : "Last Name"}</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={patientForm.control}
                                  name="email"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{isArabic ? "البريد الإلكتروني" : "Email"}</FormLabel>
                                      <FormControl>
                                        <Input type="email" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={patientForm.control}
                                  name="gender"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{isArabic ? "الجنس" : "Gender"}</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder={isArabic ? "اختر الجنس" : "Select gender"} />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="MALE">{isArabic ? "ذكر" : "Male"}</SelectItem>
                                          <SelectItem value="FEMALE">{isArabic ? "أنثى" : "Female"}</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsPatientDialogOpen(false)}>
                                  {isArabic ? "إلغاء" : "Cancel"}
                                </Button>
                                <Button type="submit" disabled={createPatientMutation.isPending}>
                                  {createPatientMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                                  {isArabic ? "إضافة المريض" : "Add Patient"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    {selectedPatient && (
                      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {selectedPatient.phone}
                            </span>
                            {selectedPatient.civilId && (
                              <span>{isArabic ? "الرقم المدني: " : "Civil ID: "}{selectedPatient.civilId}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Service Selection */}
                  <FormField
                    control={appointmentForm.control}
                    name="serviceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isArabic ? "الخدمة" : "Service"}</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            const service = services.find((s: Service) => s.id === value);
                            if (service) {
                              appointmentForm.setValue('duration', service.duration);
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
                                {isArabic ? service.nameAr : service.nameEn} - {service.duration} {isArabic ? "دقيقة" : "min"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Doctor Assignment (Optional) */}
                  <FormField
                    control={appointmentForm.control}
                    name="doctorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isArabic ? "الطبيب (اختياري)" : "Doctor (Optional)"}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isArabic ? "اختر الطبيب" : "Select doctor"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="any">{isArabic ? "أي طبيب متاح" : "Any available doctor"}</SelectItem>
                            {doctors.map((doctor: UserType) => (
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

                  {/* Date Selection */}
                  <div className="space-y-2">
                    <Label>{isArabic ? "التاريخ" : "Date"}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarDays className="h-4 w-4 mr-2" />
                          {selectedDate ? format(selectedDate, "PPP", { locale: isArabic ? ar : undefined }) : (
                            isArabic ? "اختر التاريخ" : "Pick a date"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          disabled={(date) => isFriday(date) || date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time Selection */}
                  {selectedDate && (
                    <div className="space-y-2">
                      <Label>{isArabic ? "الوقت" : "Time"}</Label>
                      <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                        {generateTimeSlots().map((slot) => (
                          <Button
                            key={slot.time}
                            type="button"
                            variant={appointmentForm.watch("appointmentDate") === `${format(selectedDate, "yyyy-MM-dd")}T${slot.time}:00` ? "default" : "outline"}
                            size="sm"
                            disabled={!slot.available}
                            onClick={() => appointmentForm.setValue("appointmentDate", `${format(selectedDate, "yyyy-MM-dd")}T${slot.time}:00`)}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <FormField
                    control={appointmentForm.control}
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
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      {isArabic ? "إلغاء" : "Cancel"}
                    </Button>
                    <Button type="submit" disabled={createAppointmentMutation.isPending || !selectedPatient}>
                      {createAppointmentMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                      {isArabic ? "حجز الموعد" : "Book Appointment"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      {currentView === "week" && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium">
              {format(currentWeekStart, "MMM dd", { locale: isArabic ? ar : undefined })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 6 }), "MMM dd, yyyy", { locale: isArabic ? ar : undefined })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{isArabic ? "جميع الحالات" : "All Status"}</SelectItem>
              <SelectItem value="SCHEDULED">{isArabic ? "مجدول" : "Scheduled"}</SelectItem>
              <SelectItem value="CONFIRMED">{isArabic ? "مؤكد" : "Confirmed"}</SelectItem>
              <SelectItem value="COMPLETED">{isArabic ? "مكتمل" : "Completed"}</SelectItem>
              <SelectItem value="CANCELLED">{isArabic ? "ملغي" : "Cancelled"}</SelectItem>
              <SelectItem value="NO_SHOW">{isArabic ? "لم يحضر" : "No Show"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Dashboard Statistics */}
      {showStats && <DashboardStats />}

      {/* Enhanced Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {isArabic ? "البحث" : "Search"}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isArabic ? "البحث في المواعيد..." : "Search appointments..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                {isArabic ? "الطبيب" : "Doctor"}
              </Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder={isArabic ? "اختر طبيب" : "Select Doctor"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? "جميع الأطباء" : "All Doctors"}</SelectItem>
                  {doctors.map((doctor: UserType) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                {isArabic ? "الخدمة" : "Service"}
              </Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder={isArabic ? "اختر خدمة" : "Select Service"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isArabic ? "جميع الخدمات" : "All Services"}</SelectItem>
                  {services.map((service: Service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                {isArabic ? "الحالة" : "Status"}
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{isArabic ? "جميع الحالات" : "All Status"}</SelectItem>
                  <SelectItem value="SCHEDULED">{isArabic ? "مجدول" : "Scheduled"}</SelectItem>
                  <SelectItem value="CONFIRMED">{isArabic ? "مؤكد" : "Confirmed"}</SelectItem>
                  <SelectItem value="COMPLETED">{isArabic ? "مكتمل" : "Completed"}</SelectItem>
                  <SelectItem value="CANCELLED">{isArabic ? "ملغي" : "Cancelled"}</SelectItem>
                  <SelectItem value="NO_SHOW">{isArabic ? "لم يحضر" : "No Show"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content */}
      {currentView === "day" && <TodayView />}
      {currentView === "week" && <WeekCalendar />}
      {currentView === "month" && <MonthCalendar />}

      {/* Appointment Details Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isArabic ? "تفاصيل الموعد" : "Appointment Details"}</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{selectedAppointment.patientName}</h3>
                  <p className="text-muted-foreground">{selectedAppointment.serviceName}</p>
                </div>
                <StatusBadge status={selectedAppointment.status} />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{format(parseISO(selectedAppointment.appointmentDate.toString()), "PPp", { locale: isArabic ? ar : undefined })}</span>
                </div>
                {selectedAppointment.doctorName && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{selectedAppointment.doctorName}</span>
                  </div>
                )}
                {selectedAppointment.notes && (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span className="text-sm">{selectedAppointment.notes}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                {selectedAppointment.status === "SCHEDULED" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, "CONFIRMED")}
                    >
                      {isArabic ? "تأكيد" : "Confirm"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, "CANCELLED", "Cancelled by user")}
                    >
                      {isArabic ? "إلغاء" : "Cancel"}
                    </Button>
                  </>
                )}
                {selectedAppointment.status === "CONFIRMED" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, "COMPLETED")}
                    >
                      {isArabic ? "إكمال" : "Complete"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, "NO_SHOW")}
                    >
                      {isArabic ? "لم يحضر" : "No Show"}
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsRescheduleDialogOpen(true);
                    setSelectedAppointment(null);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isArabic ? "إعادة جدولة" : "Reschedule"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print styles */}
      <style>{`
        @media print {
          .printable-today {
            font-size: 12pt;
            line-height: 1.4;
          }
          .printable-today * {
            color: black !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}