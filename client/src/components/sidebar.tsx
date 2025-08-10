import { useContext } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Stethoscope, 
  CreditCard, 
  Settings, 
  LogOut,
  Languages
} from "lucide-react";
import { LanguageContext } from "@/App";
import { useUser, useLogout } from "@/hooks/use-auth";

export default function Sidebar() {
  const [location] = useLocation();
  const { language, setLanguage } = useContext(LanguageContext);
  const { user } = useUser();
  const logout = useLogout();
  const isArabic = language === 'ar';

  const navigation = [
    {
      name: isArabic ? 'لوحة التحكم' : 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: location === '/' || location === '/dashboard',
    },
    {
      name: isArabic ? 'المرضى' : 'Patients',
      href: '/patients',
      icon: Users,
      current: location === '/patients',
    },
    {
      name: isArabic ? 'المواعيد' : 'Appointments',
      href: '/appointments',
      icon: Calendar,
      current: location === '/appointments',
    },
    {
      name: isArabic ? 'الزيارات' : 'Visits',
      href: '/visits',
      icon: Stethoscope,
      current: location === '/visits',
    },
    {
      name: isArabic ? 'الفواتير' : 'Billing',
      href: '/billing',
      icon: CreditCard,
      current: location === '/billing',
    },
  ];

  // Add admin section for admin users
  if (user?.role === 'ADMIN') {
    navigation.push({
      name: isArabic ? 'الإدارة' : 'Administration',
      href: '/admin',
      icon: Settings,
      current: location === '/admin',
    });
  }

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const handleLogout = () => {
    logout.mutate();
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700" data-testid="sidebar">
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isArabic ? 'عيادة أوس' : 'ClinicOS'}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <nav className="mt-5 space-y-1 px-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  item.current
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                )}
                data-testid={`link-${item.href.slice(1)}`}
              >
                <Icon
                  className={cn(
                    item.current
                      ? 'text-primary-foreground'
                      : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300',
                    'mr-3 flex-shrink-0 h-5 w-5'
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300" data-testid="text-user-name">
                {user?.fullName || user?.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.role === 'ADMIN' ? (isArabic ? 'مدير' : 'Admin') :
                 user?.role === 'DOCTOR' ? (isArabic ? 'طبيب' : 'Doctor') :
                 user?.role === 'RECEPTION' ? (isArabic ? 'استقبال' : 'Reception') :
                 user?.role === 'ACCOUNTANT' ? (isArabic ? 'محاسب' : 'Accountant') :
                 user?.role}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="flex-1"
            data-testid="button-language-toggle"
          >
            <Languages className="h-4 w-4 mr-2" />
            {isArabic ? 'EN' : 'عر'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex-1"
            disabled={logout.isPending}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isArabic ? 'خروج' : 'Logout'}
          </Button>
        </div>
      </div>
    </div>
  );
}