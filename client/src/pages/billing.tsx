import { useContext } from "react";
import { LanguageContext } from "@/App";

export default function BillingPage() {
  const { language } = useContext(LanguageContext);
  const isArabic = language === 'ar';

  return (
    <div className="p-6" data-testid="billing-page">
      <h1 className="text-3xl font-bold mb-2" data-testid="text-billing-title">
        {isArabic ? 'الفواتير والمدفوعات' : 'Billing & Payments'}
      </h1>
      <p className="text-muted-foreground">
        {isArabic ? 'إدارة الفواتير والمدفوعات' : 'Manage invoices and payments'}
      </p>
      <div className="mt-8 text-center text-muted-foreground">
        {isArabic ? 'قريباً...' : 'Coming soon...'}
      </div>
    </div>
  );
}