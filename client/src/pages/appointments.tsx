import { useContext } from "react";
import { LanguageContext } from "@/App";

export default function AppointmentsPage() {
  const { language } = useContext(LanguageContext);
  const isArabic = language === 'ar';

  return (
    <div className="p-6" data-testid="appointments-page">
      <h1 className="text-3xl font-bold mb-2" data-testid="text-appointments-title">
        {isArabic ? 'المواعيد' : 'Appointments'}
      </h1>
      <p className="text-muted-foreground">
        {isArabic ? 'إدارة مواعيد المرضى' : 'Manage patient appointments'}
      </p>
      <div className="mt-8 text-center text-muted-foreground">
        {isArabic ? 'قريباً...' : 'Coming soon...'}
      </div>
    </div>
  );
}