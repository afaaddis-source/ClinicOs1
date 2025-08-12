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
  Globe
} from "lucide-react";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useLanguage, LanguageToggle } from "@/components/language-provider";

export default function Sidebar() {
  const [location] = useLocation();
  const { t, language, isRTL } = useLanguage();
  const { user } = useUser();
  const logout = useLogout();

  const navigation = [
    {
      name: t('nav.dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      current: location === '/' || location === '/dashboard',
    },
    {
      name: t('nav.patients'),
      href: '/patients',
      icon: Users,
      current: location === '/patients',
    },
    {
      name: t('nav.appointments'),
      href: '/appointments',
      icon: Calendar,
      current: location === '/appointments',
    },
    {
      name: t('nav.visits'),
      href: '/visits',
      icon: Stethoscope,
      current: location === '/visits',
    },
    {
      name: t('nav.billing'),
      href: '/billing',
      icon: CreditCard,
      current: location === '/billing',
    },
  ];

  // Add admin section for admin users
  if (user?.role === 'ADMIN') {
    navigation.push({
      name: t('nav.admin'),
      href: '/admin',
      icon: Settings,
      current: location === '/admin',
    });
  }

  const handleLogout = () => {
    logout.mutate();
  };

  const userRoleTranslation = user?.role ? t(`roles.${user.role.toLowerCase()}`) : '';

  return (
    <div className="sidebar flex h-screen w-64 flex-col" data-testid="sidebar">
      {/* Header */}
      <div className="navbar-brand">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className={cn("flex-1", isRTL ? "mr-3" : "ml-3")}>
            <h1 className="text-xl font-bold text-white">
              {t('app.name')}
            </h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        {/* Debug info */}
        <div style={{ color: 'yellow', padding: '5px', fontSize: '12px', background: 'rgba(0,0,0,0.5)' }}>
          Lang: {language} | Items: {navigation.length} | RTL: {isRTL ? 'Yes' : 'No'}
          <br/>Nav Items: {JSON.stringify(navigation.map(n => n.name))}
        </div>
        
        <nav className="space-y-1" style={{ display: 'block !important', visibility: 'visible !important' }}>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: language === 'ar' ? 'row-reverse' : 'row',
                  gap: '12px',
                  padding: '12px 16px',
                  margin: '4px 8px',
                  borderRadius: '8px',
                  backgroundColor: item.current ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  cursor: 'pointer'
                }}
                onClick={() => window.location.href = item.href}
              >
                <Icon size={20} style={{ color: 'white', flexShrink: 0, order: language === 'ar' ? 2 : 1 }} />
                <div style={{ 
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: language === 'ar' ? "'Noto Sans Arabic', Arial, sans-serif" : 'inherit',
                  textAlign: language === 'ar' ? 'right' : 'left',
                  flex: 1,
                  order: language === 'ar' ? 1 : 2,
                  border: '1px solid red', // Debug border
                  minHeight: '20px',
                  padding: '2px'
                }}>
                  [{item.name}] - Len: {item.name?.length || 0}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Controls */}
      <div className="border-t border-white border-opacity-10 p-4 space-y-4">
        {/* User Info */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="h-10 w-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate" data-testid="text-user-name">
              {user?.fullName || user?.username}
            </p>
            <p className="text-xs text-white text-opacity-70 truncate">
              {userRoleTranslation}
            </p>
          </div>
        </div>
        
        {/* Language Toggle */}
        <div className="language-toggle">
          <LanguageToggle />
        </div>

        {/* Logout Button */}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-white hover:bg-white hover:bg-opacity-10 hover:text-white border-white border-opacity-20"
          data-testid="button-logout"
        >
          <LogOut className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
          {t('nav.logout')}
        </Button>
      </div>
    </div>
  );
}