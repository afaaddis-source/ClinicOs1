import { useState, useContext, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-auth";
import { useLanguage, LanguageToggle } from "@/components/language-provider";
import { LogIn, Loader2, Languages, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { language, t, isRTL } = useLanguage();
  const { toast } = useToast();
  const { user } = useUser();
  const [, navigate] = useLocation();
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const isArabic = language === 'ar';

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Fetch CSRF token
  const { data: csrfData } = useQuery({
    queryKey: ["/api/csrf-token"],
    queryFn: async () => {
      const response = await fetch("/api/csrf-token", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch CSRF token");
      return response.json();
    },
  });

  useEffect(() => {
    if (csrfData?.csrfToken) {
      setCsrfToken(csrfData.csrfToken);
    }
  }, [csrfData]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.log("Login failed with status:", response.status, "Error:", result.error);
        throw new Error(result.error || "Login failed");
      }

      return result;
    },
    onSuccess: (data) => {
      console.log("Login successful:", data);
      toast({
        title: isArabic ? "تم تسجيل الدخول بنجاح" : "Login successful",
        description: isArabic ? `مرحباً ${data.user.fullName}` : `Welcome ${data.user.fullName}`,
      });
      
      // Force refresh user data
      window.location.href = "/dashboard";
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      console.log("Error message:", error.message);
      
      // Get the error message from the Error object
      let errorMessage = error.message || (isArabic ? 'خطأ غير معروف' : 'Unknown error');
      
      toast({
        title: isArabic ? "خطأ في تسجيل الدخول" : "Login Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };



  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            {isArabic ? 'عيادة أوس' : 'ClinicOS'}
          </h1>
          <p className="text-muted-foreground">
            {isArabic ? 'نظام إدارة العيادات' : 'Clinic Management System'}
          </p>
          <div className="mt-4 flex justify-center">
            <LanguageToggle />
          </div>
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
            {/* Demo Credentials Alert */}
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">
                    {isArabic ? 'حسابات التجربة:' : 'Demo Accounts:'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>admin/admin123</div>
                    <div>doctor/doctor123</div>
                    <div>reception/reception123</div>
                    <div>accountant/accountant123</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {isArabic ? 'اسم المستخدم' : 'Username'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={loginMutation.isPending}
                          autoComplete="username"
                          dir={isArabic ? 'rtl' : 'ltr'}
                          data-testid="input-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {isArabic ? 'كلمة المرور' : 'Password'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          disabled={loginMutation.isPending}
                          autoComplete="current-password"
                          dir={isArabic ? 'rtl' : 'ltr'}
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isArabic ? 'جاري تسجيل الدخول...' : 'Signing in...'}
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      {isArabic ? 'تسجيل الدخول' : 'Sign in'}
                    </>
                  )}
                </Button>


              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            {isArabic 
              ? 'نظام إدارة عيادات شامل مع دعم كامل للغة العربية'
              : 'Comprehensive clinic management system with full Arabic support'
            }
          </p>
        </div>
      </div>
    </div>
  );
}