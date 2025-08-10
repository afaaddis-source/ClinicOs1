import { useState, useContext } from "react";
import { useLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Languages } from "lucide-react";
import { LanguageContext } from "@/App";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { language, setLanguage } = useContext(LanguageContext);
  const login = useLogin();

  const isArabic = language === 'ar';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ username, password });
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center w-full">
            <h1 className="text-3xl font-bold text-primary mb-2">
              {isArabic ? 'عيادة أوس' : 'ClinicOS'}
            </h1>
            <p className="text-muted-foreground">
              {isArabic ? 'نظام إدارة العيادات' : 'Clinic Management System'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="ml-2"
            data-testid="button-language-toggle"
          >
            <Languages className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {isArabic ? 'تسجيل الدخول' : 'Sign in'}
            </CardTitle>
            <CardDescription className="text-center">
              {isArabic 
                ? 'أدخل اسم المستخدم وكلمة المرور للوصول إلى حسابك'
                : 'Enter your username and password to access your account'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">
                  {isArabic ? 'اسم المستخدم' : 'Username'}
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={login.isPending}
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  {isArabic ? 'كلمة المرور' : 'Password'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={login.isPending}
                  data-testid="input-password"
                />
              </div>
              
              {login.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {login.error.message}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={login.isPending}
                data-testid="button-login"
              >
                {login.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isArabic ? 'تسجيل الدخول' : 'Sign in'}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p className="mb-2">
                {isArabic ? 'حسابات تجريبية:' : 'Demo Accounts:'}
              </p>
              <div className="space-y-1">
                <p><strong>{isArabic ? 'المدير:' : 'Admin:'}</strong> admin / admin123</p>
                <p><strong>{isArabic ? 'الطبيب:' : 'Doctor:'}</strong> doctor / doctor123</p>
                <p><strong>{isArabic ? 'الاستقبال:' : 'Reception:'}</strong> reception / reception123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}