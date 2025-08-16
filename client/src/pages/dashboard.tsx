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
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
      iconBg: 'bg-blue-500',
      trend: '+12%',
      trendColor: 'text-green-600'
    },
    {
      title: isArabic ? 'إجمالي المواعيد' : 'Total Appointments',
      value: stats?.totalAppointments || 0,
      icon: Calendar,
      color: 'text-emerald-600',
      bgColor: 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900',
      iconBg: 'bg-emerald-500',
      trend: '+8%',
      trendColor: 'text-green-600'
    },
    {
      title: isArabic ? 'الإيرادات الشهرية' : 'Monthly Revenue',
      value: formatCurrency(stats?.monthlyRevenue || 0),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900',
      iconBg: 'bg-purple-500',
      trend: '+15%',
      trendColor: 'text-green-600'
    },
    {
      title: isArabic ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: DollarSign,
      color: 'text-indigo-600',
      bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900',
      iconBg: 'bg-indigo-500',
      trend: '+22%',
      trendColor: 'text-green-600'
    },
    {
      title: isArabic ? 'مواعيد اليوم' : 'Today\'s Appointments',
      value: stats?.todayAppointments || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900',
      iconBg: 'bg-orange-500',
      trend: '6 pending',
      trendColor: 'text-orange-600'
    },
    {
      title: isArabic ? 'المدفوعات المعلقة' : 'Pending Payments',
      value: formatCurrency(stats?.pendingPayments || 0),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900',
      iconBg: 'bg-red-500',
      trend: '3 overdue',
      trendColor: 'text-red-600'
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
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {statsCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} data-testid={`card-stat-${index}`} className={`relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${stat.bgColor}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {stat.title}
                </CardTitle>
                <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid={`text-stat-value-${index}`}>
                  {stat.value}
                </div>
                <div className={`text-xs font-medium ${stat.trendColor} flex items-center gap-1`}>
                  <TrendingUp className="h-3 w-3" />
                  {stat.trend}
                </div>
              </div>
              <div className={`p-3 rounded-xl ${stat.iconBg} shadow-lg`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );

  const renderReceptionDashboard = () => (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            {isArabic ? 'مواعيد اليوم' : "Today's Schedule"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todayAppointments?.slice(0, 5).map((appointment: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{appointment.patientName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(appointment.appointmentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
                <Badge variant={appointment.status === 'CONFIRMED' ? 'default' : 'secondary'} className="shadow-sm">
                  {appointment.status}
                </Badge>
              </div>
            )) || (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {isArabic ? 'لا توجد مواعيد اليوم' : 'No appointments today'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Search className="h-5 w-5 text-emerald-500" />
            {isArabic ? 'البحث عن مريض' : 'Patient Search'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{isArabic ? 'رقم الهوية المدنية' : 'Civil ID'}</Label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input 
                  placeholder={isArabic ? 'أدخل رقم الهوية' : 'Enter Civil ID'} 
                  className="flex-1 h-11 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-400 rounded-lg"
                />
                <Button size={isMobile ? "default" : "default"} className="bg-emerald-500 hover:bg-emerald-600 h-11 px-6 rounded-lg shadow-sm">
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
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-purple-500" />
            {isArabic ? 'مواعيدي اليوم' : 'My Appointments Today'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todayAppointments?.filter((apt: any) => apt.doctorId === user?.id).map((appointment: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{appointment.patientName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(appointment.appointmentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {appointment.serviceName}
                    </p>
                  </div>
                </div>
                <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-white shadow-sm">
                  <Play className="h-4 w-4 mr-2" />
                  {isArabic ? 'بدء الزيارة' : 'Start Visit'}
                </Button>
              </div>
            )) || (
              <div className="text-center py-8">
                <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {isArabic ? 'لا توجد مواعيد اليوم' : 'No appointments today'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            {isArabic ? 'الإحصائيات السريعة' : 'Quick Stats'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isArabic ? 'مواعيد اليوم' : 'Today\'s Appointments'}
              </span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200">{stats?.todayAppointments || 0}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isArabic ? 'المرضى الجدد هذا الشهر' : 'New Patients This Month'}
              </span>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200">12</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAccountantDashboard = () => (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-500" />
            {isArabic ? 'فواتير اليوم' : "Today's Invoices"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingInvoices?.slice(0, 5).map((invoice: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{invoice.patientName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {isArabic ? 'فاتورة رقم' : 'Invoice'} #{invoice.invoiceNumber}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.totalAmount)}</p>
                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {isArabic ? 'إضافة دفعة' : 'Add Payment'}
                  </Button>
                </div>
              </div>
            )) || (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {isArabic ? 'لا توجد فواتير معلقة' : 'No pending invoices'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-indigo-500" />
            {isArabic ? 'الملخص المالي' : 'Financial Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isArabic ? 'إجمالي غير مدفوع' : 'Total Unpaid'}
              </span>
              <Badge className="bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200 font-bold">{formatCurrency(stats?.pendingPayments || 0)}</Badge>
            </div>
            <div className="flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isArabic ? 'إيرادات الشهر' : 'Monthly Revenue'}
              </span>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200 font-bold">{formatCurrency(stats?.monthlyRevenue || 0)}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800" data-testid="dashboard-page">
      <div className="p-6 sm:p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent" data-testid="text-dashboard-title">
                {isArabic ? 'لوحة التحكم' : 'Dashboard'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {user?.role === 'ADMIN' ? (isArabic ? 'نظرة عامة على أداء العيادة' : 'Overview of clinic performance') :
                 user?.role === 'DOCTOR' ? (isArabic ? 'مواعيدك وإحصائياتك' : 'Your appointments and statistics') :
                 user?.role === 'RECEPTION' ? (isArabic ? 'جدول المواعيد والبحث عن المرضى' : 'Appointment schedule and patient search') :
                 user?.role === 'ACCOUNTANT' ? (isArabic ? 'الفواتير والمدفوعات' : 'Invoices and payments') :
                 (isArabic ? 'نظرة عامة' : 'Overview')}
              </p>
            </div>
          </div>
        </div>

        {user?.role === 'ADMIN' && renderAdminDashboard()}
        {user?.role === 'RECEPTION' && renderReceptionDashboard()}
        {user?.role === 'DOCTOR' && renderDoctorDashboard()}
        {user?.role === 'ACCOUNTANT' && renderAccountantDashboard()}

        <div className="mt-8 grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                {isArabic ? 'الأنشطة الأخيرة' : 'Recent Activities'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {isArabic ? 'موعد جديد محجوز' : 'New appointment scheduled'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isArabic ? 'منذ 5 دقائق' : '5 minutes ago'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {isArabic ? 'مريض جديد مسجل' : 'New patient registered'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isArabic ? 'منذ 15 دقيقة' : '15 minutes ago'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {isArabic ? 'دفعة مستلمة' : 'Payment received'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isArabic ? 'منذ 30 دقيقة' : '30 minutes ago'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                {isArabic ? 'الإحصائيات السريعة' : 'Quick Stats'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isArabic ? 'معدل الحضور' : 'Attendance Rate'}
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200 font-bold text-lg">92%</Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isArabic ? 'متوسط وقت الانتظار' : 'Avg. Wait Time'}
                  </span>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 font-bold">
                    {isArabic ? '12 دقيقة' : '12 min'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isArabic ? 'رضا المرضى' : 'Patient Satisfaction'}
                  </span>
                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200 font-bold text-lg">4.8/5</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}