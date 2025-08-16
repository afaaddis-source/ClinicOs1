import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  Eye, 
  Loader2, 
  Filter, 
  Users, 
  UserCheck, 
  UserX, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  AlertTriangle,
  Activity,
  FileText,
  Edit,
  Trash2,
  MoreHorizontal,
  Download,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Heart,
  Stethoscope,
  Clock,
  User
} from "lucide-react";
import { PatientForm } from "@/components/patient-form";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/components/language-provider";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Patient, Appointment, Visit } from "@shared/schema";

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isArabic = language === 'ar';

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Setting debounced search term:', searchTerm);
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Helper functions
  const calculateAge = (dateOfBirth: string | Date) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy', { locale: isArabic ? ar : undefined });
  };

  const getAgeGroup = (age: number | null) => {
    if (age === null) return 'unknown';
    if (age < 18) return 'child';
    if (age < 35) return 'young';
    if (age < 60) return 'middle';
    return 'senior';
  };

  // Queries
  const { data: patients = [], isLoading, error, refetch } = useQuery({
    queryKey: ["/api/patients", debouncedSearchTerm],
    queryFn: async () => {
      const url = debouncedSearchTerm.trim()
        ? `/api/patients?search=${encodeURIComponent(debouncedSearchTerm.trim())}`
        : "/api/patients";
      
      console.log('Making request to:', url);
      const response = await apiRequest(url);
      
      if (!response.ok) {
        console.error('API request failed:', response.status, response.statusText);
        throw new Error('Failed to fetch patients');
      }
      
      const data = await response.json();
      console.log('Search term:', debouncedSearchTerm);
      console.log('Search results:', data);
      console.log('Number of results:', data.length);
      return Array.isArray(data) ? data : [];
    },
    enabled: true,
    staleTime: 5000, // 5 seconds
    gcTime: 10000, // 10 seconds (was cacheTime in v4)
  });

  // Dashboard statistics
  const { data: patientStats } = useQuery({
    queryKey: ["/api/dashboard/patients-stats"],
    queryFn: async () => {
      const response = await apiRequest("/api/dashboard/patients-stats");
      if (!response.ok) throw new Error('Failed to fetch patient statistics');
      return response.json();
    },
    staleTime: 30000,
  });

  // Patient appointments and visits for profile view
  const { data: patientAppointments = [] } = useQuery({
    queryKey: ["/api/appointments", selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient?.id) return [];
      const response = await apiRequest(`/api/appointments?patientId=${selectedPatient.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedPatient?.id,
  });

  const { data: patientVisits = [] } = useQuery({
    queryKey: ["/api/visits", selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient?.id) return [];
      const response = await apiRequest(`/api/visits?patientId=${selectedPatient.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedPatient?.id,
  });

  // Filtering logic
  const filteredPatients = patients.filter((patient: Patient) => {
    const age = calculateAge(patient.dateOfBirth);
    const ageGroup = getAgeGroup(age);

    // Gender filter
    if (genderFilter !== "all" && patient.gender !== genderFilter) return false;

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active" && !patient.isActive) return false;
      if (statusFilter === "inactive" && patient.isActive) return false;
    }

    // Age filter
    if (ageFilter !== "all") {
      if (ageFilter === "child" && ageGroup !== "child") return false;
      if (ageFilter === "young" && ageGroup !== "young") return false;
      if (ageFilter === "middle" && ageGroup !== "middle") return false;
      if (ageFilter === "senior" && ageGroup !== "senior") return false;
    }

    return true;
  });

  // Stats calculations
  const totalPatients = patients.length;
  const activePatients = patients.filter(p => p.isActive).length;
  const inactivePatients = totalPatients - activePatients;
  const malePatients = patients.filter(p => p.gender === 'MALE').length;
  const femalePatients = patients.filter(p => p.gender === 'FEMALE').length;
  const newThisMonth = patients.filter(p => {
    if (!p.createdAt) return false;
    const created = new Date(p.createdAt);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="p-6" data-testid="patients-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-patients-title">
            {isArabic ? 'المرضى' : 'Patients'}
          </h1>
          <p className="text-muted-foreground">
            {isArabic ? 'إدارة سجلات ومعلومات المرضى' : 'Manage patient records and information'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            data-testid="button-toggle-stats"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showStats ? (isArabic ? 'إخفاء الإحصائيات' : 'Hide Stats') : (isArabic ? 'عرض الإحصائيات' : 'Show Stats')}
          </Button>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-patient">
                <Plus className="mr-2 h-4 w-4" />
                {isArabic ? 'إضافة مريض' : 'Add Patient'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isArabic ? 'إضافة مريض جديد' : 'Add New Patient'}</DialogTitle>
                <DialogDescription>
                  {isArabic ? 'قم بملء المعلومات المطلوبة لإضافة مريض جديد' : 'Fill in the required information to add a new patient'}
                </DialogDescription>
              </DialogHeader>
              <PatientForm onSuccess={() => setIsCreateOpen(false)} onCancel={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard Statistics */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {isArabic ? "إجمالي المرضى" : "Total Patients"}
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {totalPatients}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    {isArabic ? "المرضى النشطون" : "Active Patients"}
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {activePatients}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    {isArabic ? "غير نشط" : "Inactive"}
                  </p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {inactivePatients}
                  </p>
                </div>
                <UserX className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    {isArabic ? "ذكور" : "Male"}
                  </p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {malePatients}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900 border-pink-200 dark:border-pink-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-pink-600 dark:text-pink-400">
                    {isArabic ? "إناث" : "Female"}
                  </p>
                  <p className="text-2xl font-bold text-pink-900 dark:text-pink-100">
                    {femalePatients}
                  </p>
                </div>
                <Heart className="h-8 w-8 text-pink-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900 border-cyan-200 dark:border-cyan-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                    {isArabic ? "جديد هذا الشهر" : "New This Month"}
                  </p>
                  <p className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">
                    {newThisMonth}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-cyan-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {isArabic ? 'إدارة المرضى' : 'Patient Management'}
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex items-center">
                <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
                <Input
                  placeholder={isArabic ? 'البحث في المرضى...' : 'Search patients...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search"
                  dir={isArabic ? 'rtl' : 'ltr'}
                />
                {searchTerm !== debouncedSearchTerm && (
                  <Loader2 className="h-4 w-4 absolute right-3 animate-spin text-muted-foreground" />
                )}
                {debouncedSearchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setDebouncedSearchTerm('');
                    }}
                    className="absolute right-3 h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                {isArabic ? 'فلاتر' : 'Filters'}
                {showFilters && <span className="ml-2 text-xs">({[genderFilter, statusFilter, ageFilter].filter(f => f !== 'all').length})</span>}
              </Button>

              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === "cards" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  data-testid="button-view-cards"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  data-testid="button-view-table"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Advanced Filters */}
        {showFilters && (
          <CardContent className="pt-0">
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {isArabic ? "الجنس" : "Gender"}
                </Label>
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isArabic ? "الكل" : "All"}</SelectItem>
                    <SelectItem value="MALE">{isArabic ? "ذكر" : "Male"}</SelectItem>
                    <SelectItem value="FEMALE">{isArabic ? "أنثى" : "Female"}</SelectItem>
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
                    <SelectItem value="all">{isArabic ? "الكل" : "All"}</SelectItem>
                    <SelectItem value="active">{isArabic ? "نشط" : "Active"}</SelectItem>
                    <SelectItem value="inactive">{isArabic ? "غير نشط" : "Inactive"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {isArabic ? "الفئة العمرية" : "Age Group"}
                </Label>
                <Select value={ageFilter} onValueChange={setAgeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isArabic ? "الكل" : "All Ages"}</SelectItem>
                    <SelectItem value="child">{isArabic ? "أطفال (< 18)" : "Children (< 18)"}</SelectItem>
                    <SelectItem value="young">{isArabic ? "شباب (18-34)" : "Young Adults (18-34)"}</SelectItem>
                    <SelectItem value="middle">{isArabic ? "متوسط العمر (35-59)" : "Middle Age (35-59)"}</SelectItem>
                    <SelectItem value="senior">{isArabic ? "كبار السن (60+)" : "Seniors (60+)"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {isArabic 
            ? `عرض ${filteredPatients.length} من أصل ${totalPatients} مريض`
            : `Showing ${filteredPatients.length} of ${totalPatients} patients`
          }
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          data-testid="button-refresh"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          {isArabic ? "تحديث" : "Refresh"}
        </Button>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-muted-foreground">
                  {isArabic ? "جاري تحميل المرضى..." : "Loading patients..."}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {isArabic ? "خطأ في تحميل المرضى" : "Error Loading Patients"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isArabic ? "حدث خطأ أثناء جلب بيانات المرضى" : "An error occurred while fetching patient data"}
              </p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {isArabic ? "إعادة المحاولة" : "Try Again"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {debouncedSearchTerm 
                  ? (isArabic ? "لا توجد نتائج للبحث" : "No search results found")
                  : (isArabic ? "لا يوجد مرضى" : "No patients found")
                }
              </h3>
              <p className="text-muted-foreground">
                {debouncedSearchTerm 
                  ? (isArabic ? "جرب البحث بكلمات مختلفة أو تعديل الفلاتر" : "Try different search terms or adjust filters")
                  : (isArabic ? "ابدأ بإضافة أول مريض" : "Start by adding your first patient")
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient: Patient) => {
            const age = calculateAge(patient.dateOfBirth);
            return (
              <Card 
                key={patient.id} 
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => {
                  setSelectedPatient(patient);
                  setIsProfileOpen(true);
                }}
                data-testid={`patient-card-${patient.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold">
                        {patient.firstName} {patient.lastName}
                      </CardTitle>
                      {patient.civilId && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {isArabic ? "الرقم المدني: " : "Civil ID: "}{patient.civilId}
                        </p>
                      )}
                    </div>
                    <Badge variant={patient.isActive ? "default" : "secondary"} className="shrink-0">
                      {patient.isActive ? (isArabic ? "نشط" : "Active") : (isArabic ? "غير نشط" : "Inactive")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.phone}</span>
                  </div>
                  
                  {patient.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{patient.email}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {age !== null ? (
                          isArabic ? `${age} سنة` : `${age} years old`
                        ) : (
                          isArabic ? "العمر غير محدد" : "Age not specified"
                        )}
                      </span>
                    </div>
                    
                    {patient.gender && (
                      <Badge variant="outline" className="text-xs">
                        {patient.gender === 'MALE' 
                          ? (isArabic ? "ذكر" : "Male") 
                          : (isArabic ? "أنثى" : "Female")
                        }
                      </Badge>
                    )}
                  </div>

                  {patient.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{patient.address}</span>
                    </div>
                  )}

                  {patient.allergies && patient.allergies.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-orange-600 dark:text-orange-400 font-medium">
                        {isArabic ? "حساسية" : "Allergies"}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{isArabic ? 'الرقم المدني' : 'Civil ID'}</TableHead>
                  <TableHead>{isArabic ? 'الهاتف' : 'Phone'}</TableHead>
                  <TableHead>{isArabic ? 'العمر' : 'Age'}</TableHead>
                  <TableHead>{isArabic ? 'الجنس' : 'Gender'}</TableHead>
                  <TableHead>{isArabic ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{isArabic ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient: Patient) => {
                  const age = calculateAge(patient.dateOfBirth);
                  return (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium" data-testid={`patient-name-${patient.id}`}>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-semibold">{patient.firstName} {patient.lastName}</div>
                            {patient.allergies && patient.allergies.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-orange-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span>{isArabic ? "حساسية" : "Allergies"}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`patient-civil-id-${patient.id}`}>
                        {patient.civilId || "—"}
                      </TableCell>
                      <TableCell data-testid={`patient-phone-${patient.id}`}>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {patient.phone}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`patient-age-${patient.id}`}>
                        {age !== null ? (
                          isArabic ? `${age} سنة` : `${age} years`
                        ) : "—"}
                      </TableCell>
                      <TableCell data-testid={`patient-gender-${patient.id}`}>
                        {patient.gender ? (
                          <Badge variant="outline" className="text-xs">
                            {patient.gender === 'MALE' 
                              ? (isArabic ? "ذكر" : "Male") 
                              : (isArabic ? "أنثى" : "Female")
                            }
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell data-testid={`patient-status-${patient.id}`}>
                        <Badge variant={patient.isActive ? "default" : "secondary"}>
                          {patient.isActive 
                            ? (isArabic ? "نشط" : "Active") 
                            : (isArabic ? "غير نشط" : "Inactive")
                          }
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>
                              {isArabic ? "الإجراءات" : "Actions"}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPatient(patient);
                                setIsProfileOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {isArabic ? "عرض الملف الشخصي" : "View Profile"}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              {isArabic ? "تعديل" : "Edit"}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="h-4 w-4 mr-2" />
                              {isArabic ? "حجز موعد" : "Book Appointment"}
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
      )}

      {/* Patient Profile Dialog */}
      <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "Patient Profile"}
            </SheetTitle>
            <SheetDescription>
              {isArabic ? "عرض تفاصيل المريض والتاريخ الطبي" : "View patient details and medical history"}
            </SheetDescription>
          </SheetHeader>

          {selectedPatient && (
            <div className="mt-6 space-y-6">
              {/* Patient Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {isArabic ? "المعلومات الشخصية" : "Personal Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {isArabic ? "الاسم الأول" : "First Name"}
                      </Label>
                      <p className="font-medium">{selectedPatient.firstName}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {isArabic ? "الاسم الأخير" : "Last Name"}
                      </Label>
                      <p className="font-medium">{selectedPatient.lastName}</p>
                    </div>
                  </div>

                  {selectedPatient.civilId && (
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {isArabic ? "الرقم المدني" : "Civil ID"}
                      </Label>
                      <p className="font-medium">{selectedPatient.civilId}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {isArabic ? "الهاتف" : "Phone"}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{selectedPatient.phone}</p>
                      </div>
                    </div>
                    {selectedPatient.email && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          {isArabic ? "البريد الإلكتروني" : "Email"}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium truncate">{selectedPatient.email}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {selectedPatient.dateOfBirth && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          {isArabic ? "العمر" : "Age"}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">
                            {calculateAge(selectedPatient.dateOfBirth)} {isArabic ? "سنة" : "years old"}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedPatient.gender && (
                      <div>
                        <Label className="text-sm text-muted-foreground">
                          {isArabic ? "الجنس" : "Gender"}
                        </Label>
                        <p className="font-medium">
                          {selectedPatient.gender === 'MALE' 
                            ? (isArabic ? "ذكر" : "Male") 
                            : (isArabic ? "أنثى" : "Female")
                          }
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedPatient.address && (
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {isArabic ? "العنوان" : "Address"}
                      </Label>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{selectedPatient.address}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm text-muted-foreground">
                      {isArabic ? "الحالة" : "Status"}
                    </Label>
                    <div className="mt-1">
                      <Badge variant={selectedPatient.isActive ? "default" : "secondary"}>
                        {selectedPatient.isActive 
                          ? (isArabic ? "نشط" : "Active") 
                          : (isArabic ? "غير نشط" : "Inactive")
                        }
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Medical Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    {isArabic ? "المعلومات الطبية" : "Medical Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                    <div>
                      <Label className="text-sm text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        {isArabic ? "الحساسية" : "Allergies"}
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedPatient.allergies.map((allergy, index) => (
                          <Badge key={index} variant="destructive" className="text-xs">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPatient.medicalHistory && (
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {isArabic ? "التاريخ الطبي" : "Medical History"}
                      </Label>
                      <p className="mt-1 p-3 bg-muted rounded-md text-sm">
                        {selectedPatient.medicalHistory}
                      </p>
                    </div>
                  )}

                  {selectedPatient.notes && (
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {isArabic ? "ملاحظات" : "Notes"}
                      </Label>
                      <p className="mt-1 p-3 bg-muted rounded-md text-sm">
                        {selectedPatient.notes}
                      </p>
                    </div>
                  )}

                  {selectedPatient.emergencyContact && (
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        {isArabic ? "جهة الاتصال في حالات الطوارئ" : "Emergency Contact"}
                      </Label>
                      <div className="mt-1 space-y-2">
                        <p className="font-medium">{selectedPatient.emergencyContact}</p>
                        {selectedPatient.emergencyPhone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {selectedPatient.emergencyPhone}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Appointments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {isArabic ? "المواعيد الأخيرة" : "Recent Appointments"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {patientAppointments.length > 0 ? (
                    <div className="space-y-3">
                      {patientAppointments.slice(0, 5).map((appointment: any) => (
                        <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">
                              {formatDate(appointment.appointmentDate)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {appointment.doctor?.fullName}
                            </p>
                          </div>
                          <Badge variant={
                            appointment.status === 'COMPLETED' ? 'default' :
                            appointment.status === 'CONFIRMED' ? 'secondary' : 'outline'
                          }>
                            {appointment.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {isArabic ? "لا توجد مواعيد" : "No appointments found"}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Visits */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {isArabic ? "الزيارات الأخيرة" : "Recent Visits"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {patientVisits.length > 0 ? (
                    <div className="space-y-3">
                      {patientVisits.slice(0, 5).map((visit: any) => (
                        <div key={visit.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">
                              {formatDate(visit.visitDate)}
                            </p>
                            <Badge variant="outline">
                              {visit.doctor?.fullName}
                            </Badge>
                          </div>
                          {visit.diagnosis && (
                            <p className="text-sm text-muted-foreground">
                              <strong>{isArabic ? "التشخيص: " : "Diagnosis: "}</strong>
                              {visit.diagnosis}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {isArabic ? "لا توجد زيارات" : "No visits found"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}