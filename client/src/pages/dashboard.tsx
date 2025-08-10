import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Clock,
  AlertTriangle
} from "lucide-react";
import { LanguageContext } from "@/App";

interface DashboardStats {
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  monthlyRevenue: number;
  todayAppointments: number;
  pendingPayments: number;
}

export default function DashboardPage() {
  const { language } = useContext(LanguageContext);
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
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            {isArabic ? 'لوحة التحكم' : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {isArabic ? 'نظرة عامة على أداء العيادة' : 'Overview of clinic performance'}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

  return (
    <div className="p-6" data-testid="dashboard-page">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-dashboard-title">
          {isArabic ? 'لوحة التحكم' : 'Dashboard'}
        </h1>
        <p className="text-muted-foreground">
          {isArabic ? 'نظرة عامة على أداء العيادة' : 'Overview of clinic performance'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

      <div className="mt-8 grid gap-6 md:grid-cols-2">
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