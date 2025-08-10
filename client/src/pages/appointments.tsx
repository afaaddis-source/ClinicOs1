import { useContext, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LanguageContext } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, startOfWeek, addWeeks, subWeeks, isFriday, isToday } from "date-fns";
import { CalendarIcon, Plus, Search, Clock, User, Phone, ChevronLeft, ChevronRight, Edit, CheckCircle, XCircle, AlertCircle, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Types
interface Patient {
  id: string;
  civilId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

interface Service {
  id: string;
  nameAr: string;
  nameEn: string;
  price: string;
  duration: number;
  isActive: boolean;
}

interface Doctor {
  id: string;
  fullName: string;
  username: string;
  isActive: boolean;
}

interface Appointment {
  id: string;
  appointmentDate: string;
  duration: number;
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes?: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    civilId: string;
  };
  doctor: {
    id: string;
    fullName: string;
    username: string;
  };
  service?: {
    id: string;
    nameAr: string;
    nameEn: string;
    price: string;
  };
}

// Schemas
const appointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  serviceId: z.string().optional(),
  appointmentDate: z.date({
    required_error: "Appointment date is required",
  }),
  timeSlot: z.string().min(1, "Time slot is required"),
  duration: z.number().min(15, "Duration must be at least 15 minutes"),
  notes: z.string().optional(),
});

const patientSchema = z.object({
  civilId: z.string().min(12).max(12).regex(/^\d{12}$/, "Civil ID must be exactly 12 digits"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(8, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
});

export default function AppointmentsPage() {
  const { language } = useContext(LanguageContext);
  const isArabic = language === 'ar';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 6 })); // Saturday
  const [viewMode, setViewMode] = useState<"week" | "day" | "today">("week");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPatientCreateOpen, setIsPatientCreateOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [civilIdLookup, setCivilIdLookup] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [statusUpdateData, setStatusUpdateData] = useState<{id: string, status: string} | null>(null);

  // Forms
  const appointmentForm = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      duration: 30,
      appointmentDate: selectedDate,
    },
  });

  const patientForm = useForm<z.infer<typeof patientSchema>>({
    resolver: zodResolver(patientSchema),
  });

  // Queries
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments', viewMode === 'week' ? 'week' : 'date', 
      viewMode === 'week' ? currentWeek.toISOString() : selectedDate.toISOString()],
    queryFn: () => {
      if (viewMode === 'week') {
        return apiRequest(`/api/appointments/week?startDate=${currentWeek.toISOString()}`);
      } else {
        return apiRequest(`/api/appointments?date=${selectedDate.toISOString()}`);
      }
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['/api/services'],
    queryFn: () => apiRequest('/api/services'),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['/api/doctors'],
    queryFn: () => apiRequest('/api/doctors'),
  });

  const { data: availableSlots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['/api/appointments/available-slots', selectedDate.toISOString(), appointmentForm.watch('doctorId')],
    queryFn: () => {
      const doctorId = appointmentForm.watch('doctorId');
      return apiRequest(`/api/appointments/available-slots?date=${selectedDate.toISOString()}${doctorId ? `&doctorId=${doctorId}` : ''}`);
    },
    enabled: !!selectedDate && !isFriday(selectedDate),
  });

  // Mutations
  const createAppointmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/appointments', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: isArabic ? "تم إنشاء الموعد" : "Appointment Created",
        description: isArabic ? "تم إنشاء الموعد بنجاح" : "Appointment created successfully",
      });
      setIsCreateOpen(false);
      appointmentForm.reset();
      setSelectedPatient(null);
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
    mutationFn: (data: any) => apiRequest('/api/patients', { method: 'POST', body: data }),
    onSuccess: (patient: Patient) => {
      setSelectedPatient(patient);
      setIsPatientCreateOpen(false);
      patientForm.reset();
      toast({
        title: isArabic ? "تم إنشاء المريض" : "Patient Created",
        description: isArabic ? "تم إنشاء المريض بنجاح" : "Patient created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message || (isArabic ? "فشل في إنشاء المريض" : "Failed to create patient"),
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({id, status, reason}: {id: string, status: string, reason?: string}) => 
      apiRequest(`/api/appointments/${id}/status`, { method: 'PATCH', body: { status, reason } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: isArabic ? "تم تحديث الحالة" : "Status Updated",
        description: isArabic ? "تم تحديث حالة الموعد بنجاح" : "Appointment status updated successfully",
      });
      setStatusUpdateData(null);
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error", 
        description: error.message || (isArabic ? "فشل في تحديث الحالة" : "Failed to update status"),
        variant: "destructive",
      });
    },
  });

  const completeAppointmentMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/appointments/${id}/complete`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: isArabic ? "تم إكمال الموعد" : "Appointment Completed",
        description: isArabic ? "تم إكمال الموعد وإنشاء زيارة جديدة" : "Appointment completed and visit created",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message || (isArabic ? "فشل في إكمال الموعد" : "Failed to complete appointment"),
        variant: "destructive",
      });
    },
  });

  const startVisitMutation = useMutation({
    mutationFn: (appointmentId: string) => apiRequest(`/api/visits/start/${appointmentId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/visits'] });
      toast({
        title: isArabic ? "تم بدء الزيارة" : "Visit Started",
        description: isArabic ? "تم بدء الزيارة الطبية بنجاح" : "Medical visit started successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message || (isArabic ? "فشل في بدء الزيارة" : "Failed to start visit"),
        variant: "destructive",
      });
    },
  });

  // Patient lookup
  const lookupPatient = async (civilId: string) => {
    try {
      const patient = await apiRequest(`/api/patients/lookup/${civilId}`) as Patient;
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

  // Time formatting helper
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'HH:mm');
  };

  const formatAppointmentTime = (dateString: string, duration: number) => {
    const start = new Date(dateString);
    const end = new Date(start.getTime() + duration * 60000);
    return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
  };

  // Calendar component for week view
  const WeekCalendar = () => {
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(currentWeek, i);
      weekDays.push(day);
    }

    // Filter appointments for current week
    const weekAppointments = (appointments as Appointment[]).filter((apt: Appointment) => {
      const aptDate = new Date(apt.appointmentDate);
      const startOfCurrentWeek = currentWeek;
      const endOfCurrentWeek = addDays(currentWeek, 6);
      return aptDate >= startOfCurrentWeek && aptDate <= endOfCurrentWeek;
    });

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {isArabic ? "عرض الأسبوع" : "Week View"}
              </CardTitle>
              <CardDescription>
                {format(currentWeek, 'MMM dd')} - {format(addDays(currentWeek, 6), 'MMM dd, yyyy')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                data-testid="button-prev-week"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 6 }))}
                data-testid="button-today"
              >
                {isArabic ? "اليوم" : "Today"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                data-testid="button-next-week"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => {
              const dayAppointments = weekAppointments.filter((apt: Appointment) => {
                const aptDate = new Date(apt.appointmentDate);
                return aptDate.toDateString() === day.toDateString();
              });

              const isFridayDay = index === 5; // Friday
              const isDayToday = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[200px] border rounded-lg p-2",
                    isFridayDay && "bg-gray-50 dark:bg-gray-800",
                    isDayToday && "ring-2 ring-primary"
                  )}
                  data-testid={`day-column-${index}`}
                >
                  <div className="font-semibold text-sm mb-2">
                    <div>{format(day, 'EEE')}</div>
                    <div className={cn(isDayToday && "text-primary font-bold")}>
                      {format(day, 'dd')}
                    </div>
                  </div>
                  {isFridayDay ? (
                    <div className="text-xs text-muted-foreground text-center mt-4">
                      {isArabic ? "يوم عطلة" : "Day Off"}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {dayAppointments.map((apt: Appointment) => (
                        <div
                          key={apt.id}
                          className="bg-primary/10 border border-primary/20 rounded p-1 text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                          onClick={() => setSelectedAppointment(apt)}
                          data-testid={`appointment-${apt.id}`}
                        >
                          <div className="font-medium">
                            {formatAppointmentTime(apt.appointmentDate, apt.duration)}
                          </div>
                          <div className="truncate">
                            {apt.patient.firstName} {apt.patient.lastName}
                          </div>
                          <div className="truncate text-muted-foreground">
                            {apt.doctor.fullName}
                          </div>
                          <StatusBadge status={apt.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Today's appointments view - printable
  const TodayView = () => {
    const todayAppointments = (appointments as Appointment[]).filter((apt: Appointment) => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate.toDateString() === new Date().toDateString();
    });

    return (
      <Card className="print:shadow-none">
        <CardHeader className="print:pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {isArabic ? "مواعيد اليوم" : "Today's Appointments"}
              </CardTitle>
              <CardDescription>
                {format(new Date(), 'EEEE, MMMM dd, yyyy')}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="print:hidden"
              data-testid="button-print"
            >
              {isArabic ? "طباعة" : "Print"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isArabic ? "لا توجد مواعيد اليوم" : "No appointments today"}
            </div>
          ) : (
            <div className="space-y-4">
              {todayAppointments
                .sort((a: Appointment, b: Appointment) => 
                  new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
                )
                .map((apt: Appointment) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-4 border rounded-lg print:border-gray-300"
                    data-testid={`today-appointment-${apt.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-semibold">
                          {formatAppointmentTime(apt.appointmentDate, apt.duration)}
                        </div>
                        <StatusBadge status={apt.status} />
                      </div>
                      <div className="mt-2">
                        <div className="font-medium">
                          {apt.patient.firstName} {apt.patient.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {apt.patient.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {apt.doctor.fullName}
                          </span>
                          {apt.service && (
                            <span>
                              {isArabic ? apt.service.nameAr : apt.service.nameEn}
                            </span>
                          )}
                        </div>
                      </div>
                      {apt.notes && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {apt.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 print:hidden">
                      {apt.status === "SCHEDULED" || apt.status === "CONFIRMED" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => completeAppointmentMutation.mutate(apt.id)}
                          data-testid={`button-complete-${apt.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAppointment(apt)}
                        data-testid={`button-edit-${apt.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {apt.status !== "COMPLETED" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => startVisitMutation.mutate(apt.id)}
                          disabled={startVisitMutation.isPending}
                          data-testid={`button-start-visit-${apt.id}`}
                        >
                          <Stethoscope className="w-4 h-4 mr-2" />
                          {isArabic ? "بدء الزيارة" : "Start Visit"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6" data-testid="appointments-page" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-appointments-title">
            {isArabic ? 'المواعيد' : 'Appointments'}
          </h1>
          <p className="text-muted-foreground">
            {isArabic ? 'إدارة مواعيد المرضى' : 'Manage patient appointments'}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-appointment">
                <Plus className="h-4 w-4 mr-2" />
                {isArabic ? 'موعد جديد' : 'New Appointment'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isArabic ? 'إنشاء موعد جديد' : 'Create New Appointment'}</DialogTitle>
                <DialogDescription>
                  {isArabic ? 'أدخل تفاصيل الموعد الجديد' : 'Enter the details for the new appointment'}
                </DialogDescription>
              </DialogHeader>
              <Form {...appointmentForm}>
                <form
                  onSubmit={appointmentForm.handleSubmit((data) => {
                    const appointmentDateTime = new Date(data.appointmentDate);
                    const [hours, minutes] = data.timeSlot.split(':').map(Number);
                    appointmentDateTime.setHours(hours, minutes, 0, 0);

                    createAppointmentMutation.mutate({
                      ...data,
                      appointmentDate: appointmentDateTime.toISOString(),
                    });
                  })}
                  className="space-y-4"
                >
                  {/* Patient Lookup */}
                  <div className="space-y-4 border rounded-lg p-4">
                    <h3 className="font-medium">{isArabic ? 'بيانات المريض' : 'Patient Information'}</h3>
                    
                    {!selectedPatient ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder={isArabic ? 'الرقم المدني' : 'Civil ID'}
                            value={civilIdLookup}
                            onChange={(e) => setCivilIdLookup(e.target.value)}
                            maxLength={12}
                            data-testid="input-civil-id"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => lookupPatient(civilIdLookup)}
                            disabled={civilIdLookup.length !== 12}
                            data-testid="button-lookup-patient"
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-center">
                          <span className="text-sm text-muted-foreground">
                            {isArabic ? 'أو' : 'or'}
                          </span>
                        </div>
                        <Dialog open={isPatientCreateOpen} onOpenChange={setIsPatientCreateOpen}>
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              data-testid="button-create-patient"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {isArabic ? 'إنشاء مريض جديد' : 'Create New Patient'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{isArabic ? 'إنشاء مريض جديد' : 'Create New Patient'}</DialogTitle>
                            </DialogHeader>
                            <Form {...patientForm}>
                              <form
                                onSubmit={patientForm.handleSubmit((data) => {
                                  createPatientMutation.mutate(data);
                                })}
                                className="space-y-4"
                              >
                                <FormField
                                  control={patientForm.control}
                                  name="civilId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{isArabic ? 'الرقم المدني' : 'Civil ID'}</FormLabel>
                                      <FormControl>
                                        <Input {...field} maxLength={12} data-testid="input-new-patient-civil-id" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={patientForm.control}
                                    name="firstName"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>{isArabic ? 'الاسم الأول' : 'First Name'}</FormLabel>
                                        <FormControl>
                                          <Input {...field} data-testid="input-first-name" />
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
                                        <FormLabel>{isArabic ? 'اسم العائلة' : 'Last Name'}</FormLabel>
                                        <FormControl>
                                          <Input {...field} data-testid="input-last-name" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <FormField
                                  control={patientForm.control}
                                  name="phone"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{isArabic ? 'رقم الهاتف' : 'Phone Number'}</FormLabel>
                                      <FormControl>
                                        <Input {...field} data-testid="input-phone" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={patientForm.control}
                                  name="email"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{isArabic ? 'البريد الإلكتروني' : 'Email'}</FormLabel>
                                      <FormControl>
                                        <Input {...field} type="email" data-testid="input-email" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button
                                  type="submit"
                                  disabled={createPatientMutation.isPending}
                                  data-testid="button-save-patient"
                                >
                                  {createPatientMutation.isPending
                                    ? (isArabic ? 'جاري الحفظ...' : 'Saving...')
                                    : (isArabic ? 'حفظ' : 'Save')
                                  }
                                </Button>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ) : (
                      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {selectedPatient.firstName} {selectedPatient.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {isArabic ? 'رقم مدني:' : 'Civil ID:'} {selectedPatient.civilId} | 
                              {isArabic ? ' هاتف:' : ' Phone:'} {selectedPatient.phone}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPatient(null);
                              setCivilIdLookup("");
                            }}
                            data-testid="button-clear-patient"
                          >
                            {isArabic ? 'تغيير' : 'Change'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Appointment Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={appointmentForm.control}
                      name="doctorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? 'الطبيب' : 'Doctor'}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-doctor">
                                <SelectValue placeholder={isArabic ? 'اختر الطبيب' : 'Select Doctor'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(doctors as Doctor[]).filter((doc: Doctor) => doc.isActive).map((doctor: Doctor) => (
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
                    <FormField
                      control={appointmentForm.control}
                      name="serviceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? 'الخدمة' : 'Service'} ({isArabic ? 'اختياري' : 'Optional'})</FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            const service = (services as Service[]).find((s: Service) => s.id === value);
                            if (service) {
                              appointmentForm.setValue('duration', service.duration);
                            }
                          }} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-service">
                                <SelectValue placeholder={isArabic ? 'اختر الخدمة' : 'Select Service'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(services as Service[]).filter((service: Service) => service.isActive).map((service: Service) => (
                                <SelectItem key={service.id} value={service.id}>
                                  {isArabic ? service.nameAr : service.nameEn} ({service.duration} {isArabic ? 'دقيقة' : 'min'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={appointmentForm.control}
                      name="appointmentDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>{isArabic ? 'التاريخ' : 'Date'}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-select-date"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>{isArabic ? 'اختر التاريخ' : 'Pick a date'}</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  setSelectedDate(date || new Date());
                                }}
                                disabled={(date) => isFriday(date) || date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={appointmentForm.control}
                      name="timeSlot"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? 'الوقت' : 'Time'}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-time-slot">
                                <SelectValue placeholder={isArabic ? 'اختر الوقت' : 'Select Time'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {slotsLoading ? (
                                <SelectItem value="" disabled>
                                  {isArabic ? 'جاري التحميل...' : 'Loading...'}
                                </SelectItem>
                              ) : (availableSlots as any)?.slots?.length ? (
                                (availableSlots as any).slots.map((slot: string) => (
                                  <SelectItem key={slot} value={slot}>
                                    {slot}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="" disabled>
                                  {isArabic ? 'لا توجد أوقات متاحة' : 'No available slots'}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={appointmentForm.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? 'المدة (دقيقة)' : 'Duration (min)'}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={15}
                              max={180}
                              step={15}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-duration"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={appointmentForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isArabic ? 'ملاحظات' : 'Notes'}</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="textarea-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                      data-testid="button-cancel"
                    >
                      {isArabic ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                      type="submit"
                      disabled={createAppointmentMutation.isPending || !selectedPatient}
                      data-testid="button-save-appointment"
                    >
                      {createAppointmentMutation.isPending
                        ? (isArabic ? 'جاري الحفظ...' : 'Saving...')
                        : (isArabic ? 'حفظ الموعد' : 'Save Appointment')
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === "week" ? "default" : "outline"}
          onClick={() => setViewMode("week")}
          data-testid="button-week-view"
        >
          {isArabic ? 'عرض الأسبوع' : 'Week View'}
        </Button>
        <Button
          variant={viewMode === "today" ? "default" : "outline"}
          onClick={() => setViewMode("today")}
          data-testid="button-today-view"
        >
          {isArabic ? 'مواعيد اليوم' : "Today's View"}
        </Button>
      </div>

      {/* Main Content */}
      {appointmentsLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              {isArabic ? 'جاري التحميل...' : 'Loading...'}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "week" ? (
        <WeekCalendar />
      ) : (
        <TodayView />
      )}

      {/* Appointment Details Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isArabic ? 'تفاصيل الموعد' : 'Appointment Details'}</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">{isArabic ? 'المريض:' : 'Patient:'}</span>
                  <div>{selectedAppointment.patient.firstName} {selectedAppointment.patient.lastName}</div>
                </div>
                <div>
                  <span className="font-medium">{isArabic ? 'الطبيب:' : 'Doctor:'}</span>
                  <div>{selectedAppointment.doctor.fullName}</div>
                </div>
                <div>
                  <span className="font-medium">{isArabic ? 'التاريخ والوقت:' : 'Date & Time:'}</span>
                  <div>{format(new Date(selectedAppointment.appointmentDate), 'PPp')}</div>
                </div>
                <div>
                  <span className="font-medium">{isArabic ? 'المدة:' : 'Duration:'}</span>
                  <div>{selectedAppointment.duration} {isArabic ? 'دقيقة' : 'minutes'}</div>
                </div>
                <div className="col-span-2">
                  <span className="font-medium">{isArabic ? 'الحالة:' : 'Status:'}</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedAppointment.status} />
                  </div>
                </div>
                {selectedAppointment.service && (
                  <div className="col-span-2">
                    <span className="font-medium">{isArabic ? 'الخدمة:' : 'Service:'}</span>
                    <div>{isArabic ? selectedAppointment.service.nameAr : selectedAppointment.service.nameEn}</div>
                  </div>
                )}
                {selectedAppointment.notes && (
                  <div className="col-span-2">
                    <span className="font-medium">{isArabic ? 'ملاحظات:' : 'Notes:'}</span>
                    <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      {selectedAppointment.notes}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Status Update Buttons */}
              <div className="flex gap-2 flex-wrap">
                {selectedAppointment.status === "SCHEDULED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({
                      id: selectedAppointment.id,
                      status: "CONFIRMED"
                    })}
                    data-testid="button-confirm"
                  >
                    {isArabic ? 'تأكيد' : 'Confirm'}
                  </Button>
                )}
                {(selectedAppointment.status === "SCHEDULED" || selectedAppointment.status === "CONFIRMED") && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => completeAppointmentMutation.mutate(selectedAppointment.id)}
                      data-testid="button-complete"
                    >
                      {isArabic ? 'إكمال' : 'Complete'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({
                        id: selectedAppointment.id,
                        status: "NO_SHOW"
                      })}
                      data-testid="button-no-show"
                    >
                      {isArabic ? 'لم يحضر' : 'No Show'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({
                        id: selectedAppointment.id,
                        status: "CANCELLED",
                        reason: "Cancelled by staff"
                      })}
                      data-testid="button-cancel-appointment"
                    >
                      {isArabic ? 'إلغاء' : 'Cancel'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}