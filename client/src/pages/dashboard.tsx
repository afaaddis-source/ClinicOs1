import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Clock,
  AlertTriangle,
  Search,
  Play,
  Plus
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useUser } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardStats {
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  monthlyRevenue: number;
  todayAppointments: number;
  pendingPayments: number;
}

export default function DashboardPage() {
  const { language, t, isRTL } = useLanguage();
  const { user } = useUser();
  const isMobile = useIsMobile();
  const isArabic = language === 'ar';

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const response = await fetch("/api/dashboard/stats", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const { data: todayAppointments } = useQuery({
    queryKey: ["/api/appointments/today"],
    queryFn: async () => {
      const response = await fetch("/api/appointments/today", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch today's appointments");
      return response.json();
    },
    enabled: user?.role === 'DOCTOR' || user?.role === 'RECEPTION',
  });

  const { data: pendingInvoices } = useQuery({
    queryKey: ["/api/invoices/pending"],
    queryFn: async () => {
      const response = await fetch("/api/invoices/pending", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch pending invoices");
      return response.json();
    },
    enabled: user?.role === 'ACCOUNTANT',
  });

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('ar-KW', {
      style: 'currency',
      currency: 'KWD',
    }).format(amount);
    return isArabic ? formatted : `KWD ${amount.toFixed(2)}`;
  };

  const statsCards = [
    {
      title: isArabic ? 'إجمالي المرضى' : 'Total Patients',
      value: stats?.totalPatients || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: isArabic ? 'إجمالي المواعيد' : 'Total Appointments',
      value: stats?.totalAppointments || 0,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      title: isArabic ? 'الإيرادات الشهرية' : 'Monthly Revenue',
      value: formatCurrency(stats?.monthlyRevenue || 0),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      title: isArabic ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    },
    {
      title: isArabic ? 'مواعيد اليوم' : 'Today\'s Appointments',
      value: stats?.todayAppointments || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      title: isArabic ? 'المدفوعات المعلقة' : 'Pending Payments',
      value: formatCurrency(stats?.pendingPayments || 0),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950',
    },
  ];

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {isArabic ? 'لوحة التحكم' : 'Dashboard'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isArabic ? 'نظرة عامة على أداء العيادة' : 'Overview of clinic performance'}
          </p>
        </div>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Role-specific dashboard rendering
  const renderAdminDashboard = () => (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {statsCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} data-testid={`card-stat-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-value-${index}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderReceptionDashboard = () => (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{isArabic ? 'مواعيد اليوم' : "Today's Schedule"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todayAppointments?.slice(0, 5).map((appointment: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{appointment.patientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(appointment.appointmentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                <Badge variant={appointment.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                  {appointment.status}
                </Badge>
              </div>
            )) || (
              <p className="text-muted-foreground text-center py-4">
                {isArabic ? 'لا توجد مواعيد اليوم' : 'No appointments today'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>{isArabic ? 'البحث عن مريض' : 'Patient Search'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isArabic ? 'رقم الهوية المدنية' : 'Civil ID'}</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input 
                  placeholder={isArabic ? 'أدخل رقم الهوية' : 'Enter Civil ID'} 
                  className="flex-1"
                />
                <Button size={isMobile ? "default" : "icon"} className="w-full sm:w-auto">
                  <Search className="h-4 w-4" />
                  {isMobile && (isArabic ? ' بحث' : ' Search')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDoctorDashboard = () => (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{isArabic ? 'مواعيدي اليوم' : 'My Appointments Today'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todayAppointments?.filter((apt: any) => apt.doctorId === user?.id).map((appointment: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{appointment.patientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(appointment.appointmentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {appointment.serviceName}
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  <Play className="h-4 w-4 mr-2" />
                  {isArabic ? 'بدء الزيارة' : 'Start Visit'}
                </Button>
              </div>
            )) || (
              <p className="text-muted-foreground text-center py-4">
                {isArabic ? 'لا توجد مواعيد اليوم' : 'No appointments today'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>{isArabic ? 'الإحصائيات السريعة' : 'Quick Stats'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {isArabic ? 'مواعيد اليوم' : 'Today\'s Appointments'}
              </span>
              <Badge variant="secondary">{stats?.todayAppointments || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {isArabic ? 'المرضى الجدد هذا الشهر' : 'New Patients This Month'}
              </span>
              <Badge variant="secondary">12</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAccountantDashboard = () => (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{isArabic ? 'فواتير اليوم' : "Today's Invoices"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingInvoices?.slice(0, 5).map((invoice: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{invoice.patientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? 'فاتورة رقم' : 'Invoice'} #{invoice.invoiceNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(invoice.totalAmount)}</p>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    {isArabic ? 'إضافة دفعة' : 'Add Payment'}
                  </Button>
                </div>
              </div>
            )) || (
              <p className="text-muted-foreground text-center py-4">
                {isArabic ? 'لا توجد فواتير معلقة' : 'No pending invoices'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>{isArabic ? 'الملخص المالي' : 'Financial Summary'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {isArabic ? 'إجمالي غير مدفوع' : 'Total Unpaid'}
              </span>
              <Badge variant="destructive">{formatCurrency(stats?.pendingPayments || 0)}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {isArabic ? 'إيرادات الشهر' : 'Monthly Revenue'}
              </span>
              <Badge variant="secondary">{formatCurrency(stats?.monthlyRevenue || 0)}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-4 sm:p-6" data-testid="dashboard-page">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2" data-testid="text-dashboard-title">
          {isArabic ? 'لوحة التحكم' : 'Dashboard'}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {user?.role === 'ADMIN' ? (isArabic ? 'نظرة عامة على أداء العيادة' : 'Overview of clinic performance') :
           user?.role === 'DOCTOR' ? (isArabic ? 'مواعيدك وإحصائياتك' : 'Your appointments and statistics') :
           user?.role === 'RECEPTION' ? (isArabic ? 'جدول المواعيد والبحث عن المرضى' : 'Appointment schedule and patient search') :
           user?.role === 'ACCOUNTANT' ? (isArabic ? 'الفواتير والمدفوعات' : 'Invoices and payments') :
           (isArabic ? 'نظرة عامة' : 'Overview')}
        </p>
      </div>

      {user?.role === 'ADMIN' && renderAdminDashboard()}
      {user?.role === 'RECEPTION' && renderReceptionDashboard()}
      {user?.role === 'DOCTOR' && renderDoctorDashboard()}
      {user?.role === 'ACCOUNTANT' && renderAccountantDashboard()}

      <div className="mt-6 sm:mt-8 grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {isArabic ? 'الأنشطة الأخيرة' : 'Recent Activities'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    {isArabic ? 'موعد جديد محجوز' : 'New appointment scheduled'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? 'منذ 5 دقائق' : '5 minutes ago'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    {isArabic ? 'مريض جديد مسجل' : 'New patient registered'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? 'منذ 15 دقيقة' : '15 minutes ago'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    {isArabic ? 'دفعة مستلمة' : 'Payment received'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? 'منذ 30 دقيقة' : '30 minutes ago'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {isArabic ? 'الإحصائيات السريعة' : 'Quick Stats'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {isArabic ? 'معدل الحضور' : 'Attendance Rate'}
                </span>
                <Badge variant="secondary">92%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {isArabic ? 'متوسط وقت الانتظار' : 'Avg. Wait Time'}
                </span>
                <Badge variant="secondary">
                  {isArabic ? '12 دقيقة' : '12 min'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {isArabic ? 'رضا المرضى' : 'Patient Satisfaction'}
                </span>
                <Badge variant="secondary">4.8/5</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}