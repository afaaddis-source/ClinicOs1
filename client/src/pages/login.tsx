import { useState, useContext, useEffect, memo, useCallback } from "react";
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
import { LogIn, Loader2, Languages, AlertCircle, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage = memo(function LoginPage() {
  const { language, t, isRTL } = useLanguage();
  const { toast } = useToast();
  const { user } = useUser();
  const [, navigate] = useLocation();
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

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
      let errorMsg = error.message || (isArabic ? 'خطأ غير معروف' : 'Unknown error');
      
      console.log("Showing toast with message:", errorMsg);
      setErrorMessage(errorMsg);
      
      toast({
        title: isArabic ? "خطأ في تسجيل الدخول" : "Login Error",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  const onSubmit = useCallback((data: LoginFormData) => {
    setErrorMessage(''); // Clear any previous error message
    loginMutation.mutate(data);
  }, [loginMutation]);



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
                    <div>admin/123456</div>
                    <div>doctor/123456</div>
                    <div>reception/123456</div>
                    <div>accountant/123456</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Error Message Display */}
            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Quick Login Buttons */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-3 text-center">
                {isArabic ? 'تسجيل دخول سريع:' : 'Quick Login:'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    form.setValue('username', 'admin');
                    form.setValue('password', '123456');
                    form.handleSubmit(onSubmit)();
                  }}
                  data-testid="quick-login-admin"
                >
                  <Shield className="h-4 w-4 mr-1" />
                  {isArabic ? 'إداري' : 'Admin'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    form.setValue('username', 'doctor');
                    form.setValue('password', '123456');
                    form.handleSubmit(onSubmit)();
                  }}
                  data-testid="quick-login-doctor"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  {isArabic ? 'طبيب' : 'Doctor'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    form.setValue('username', 'reception');
                    form.setValue('password', '123456');
                    form.handleSubmit(onSubmit)();
                  }}
                  data-testid="quick-login-reception"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {isArabic ? 'استقبال' : 'Reception'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    form.setValue('username', 'accountant');
                    form.setValue('password', '123456');
                    form.handleSubmit(onSubmit)();
                  }}
                  data-testid="quick-login-accountant"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isArabic ? 'محاسب' : 'Accountant'}
                </Button>
              </div>
            </div>

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
});

export default LoginPage;