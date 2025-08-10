import { useContext } from "react";
import { LanguageContext } from "@/App";

export default function AdminPage() {
  const { language } = useContext(LanguageContext);
  const isArabic = language === 'ar';

  return (
    <div className="p-6" data-testid="admin-page">
      <h1 className="text-3xl font-bold mb-2" data-testid="text-admin-title">
        {isArabic ? 'الإدارة' : 'Administration'}
      </h1>
      <p className="text-muted-foreground">
        {isArabic ? 'إدارة المستخدمين والخدمات' : 'Manage users and services'}
      </p>
      <div className="mt-8 text-center text-muted-foreground">
        {isArabic ? 'قريباً...' : 'Coming soon...'}
      </div>
    </div>
  );
}