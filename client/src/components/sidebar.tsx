import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Stethoscope, 
  CreditCard, 
  Settings, 
  LogOut,
  Globe,
  Menu,
  X
} from "lucide-react";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useLanguage, LanguageToggle } from "@/components/language-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, memo, useMemo, useCallback } from "react";

const Sidebar = memo(function Sidebar() {
  const [location] = useLocation();
  const { t, language, isRTL } = useLanguage();
  const { user } = useUser();
  const logout = useLogout();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Define role-based navigation items (memoized)
  const getRoleBasedNavigation = useMemo(() => {
    const allNavItems = [
      {
        name: language === 'ar' ? 'لوحة التحكم' : t('nav.dashboard'),
        href: '/dashboard',
        icon: LayoutDashboard,
        current: location === '/' || location === '/dashboard',
        roles: ['ADMIN', 'DOCTOR', 'RECEPTION', 'ACCOUNTANT'],
      },
      {
        name: language === 'ar' ? 'المرضى' : t('nav.patients'),
        href: '/patients',
        icon: Users,
        current: location === '/patients',
        roles: ['ADMIN', 'DOCTOR', 'RECEPTION'], // Accountants have limited patient access
      },
      {
        name: language === 'ar' ? 'المواعيد' : t('nav.appointments'),
        href: '/appointments',
        icon: Calendar,
        current: location === '/appointments',
        roles: ['ADMIN', 'DOCTOR', 'RECEPTION'], // Accountants don't manage appointments
      },
      {
        name: language === 'ar' ? 'الزيارات' : t('nav.visits'),
        href: '/visits',
        icon: Stethoscope,
        current: location === '/visits',
        roles: ['ADMIN', 'DOCTOR'], // Only medical staff handle visits
      },
      {
        name: language === 'ar' ? 'الفواتير' : t('nav.billing'),
        href: '/billing',
        icon: CreditCard,
        current: location === '/billing',
        roles: ['ADMIN', 'ACCOUNTANT', 'RECEPTION'], // Reception can view basic billing
      },
    ];

    // Filter navigation based on user role
    return allNavItems.filter(item => 
      !user?.role || item.roles.includes(user.role)
    );
  }, [user?.role, language, location]);

  const navigation = getRoleBasedNavigation;

  // Add admin section for admin users
  if (user?.role === 'ADMIN') {
    navigation.push({
      name: language === 'ar' ? 'الإدارة' : t('nav.admin'),
      href: '/admin',
      icon: Settings,
      current: location === '/admin',
      roles: ['ADMIN'],
    });
  }

  const handleLogout = useCallback(() => {
    logout.mutate();
  }, [logout]);

  const userRoleTranslation = useMemo(() => 
    user?.role ? t(`roles.${user.role.toLowerCase()}`) : '',
    [user?.role, t]
  );

  const SidebarContent = () => (
    <div className="sidebar flex h-full w-full flex-col" data-testid="sidebar">
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
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white hover:bg-opacity-10 lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "nav-link",
                  item.current && "active"
                )}
                data-testid={`link-${item.href.slice(1)}`}
                onClick={() => isMobile && setIsOpen(false)}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="nav-text">{item.name}</span>
              </Link>
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

  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <div className="fixed top-4 left-4 z-50 lg:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsOpen(true)}
            className="bg-white shadow-lg"
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile Sheet */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side={isRTL ? "right" : "left"} className="p-0 w-64">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div className="w-64 hidden lg:flex">
      <SidebarContent />
    </div>
  );
});

export default Sidebar;