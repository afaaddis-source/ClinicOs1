import { useContext } from "react";
import { LanguageContext } from "@/App";

export default function VisitsPage() {
  const { language } = useContext(LanguageContext);
  const isArabic = language === 'ar';

  return (
    <div className="p-6" data-testid="visits-page">
      <h1 className="text-3xl font-bold mb-2" data-testid="text-visits-title">
        {isArabic ? 'الزيارات' : 'Visits'}
      </h1>
      <p className="text-muted-foreground">
        {isArabic ? 'إدارة سجلات الزيارات الطبية' : 'Manage medical visit records'}
      </p>
      <div className="mt-8 text-center text-muted-foreground">
        {isArabic ? 'قريباً...' : 'Coming soon...'}
      </div>
    </div>
  );
}