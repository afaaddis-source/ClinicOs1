import { useContext, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/language-provider";
import { useUser } from "@/hooks/use-auth";
import { 
  Plus, 
  Edit, 
  KeyRound, 
  Loader2, 
  Shield, 
  Trash2, 
  Settings, 
  BarChart3, 
  Download,
  Clock,
  MapPin,
  Phone,
  Mail,
  Building
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schemas
const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  role: z.enum(["ADMIN", "DOCTOR", "RECEPTION", "ACCOUNTANT"]),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

const serviceSchema = z.object({
  code: z.string().min(1, "Service code is required"),
  nameAr: z.string().min(1, "Arabic name is required"),
  nameEn: z.string().min(1, "English name is required"),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  duration: z.number().min(5, "Duration must be at least 5 minutes"),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
});

const settingSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
  description: z.string().optional(),
  category: z.string().default("GENERAL"),
});

const clinicInfoSchema = z.object({
  nameAr: z.string().min(1, "Arabic name is required"),
  nameEn: z.string().min(1, "English name is required"),
  phone: z.string().min(1, "Phone is required"),
  addressAr: z.string().min(1, "Arabic address is required"),
  addressEn: z.string().min(1, "English address is required"),
  email: z.string().email().optional(),
  website: z.string().optional(),
});

interface Service {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  price: string;
  duration: number;
  category?: string;
  isActive: boolean;
}

interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: string;
}

interface ClinicInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  addressAr: string;
  addressEn: string;
  email?: string;
  website?: string;
}

export default function AdminPage() {
  const { language, t, isRTL } = useLanguage();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const isArabic = language === 'ar';

  const [activeTab, setActiveTab] = useState("services");
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [settingDialogOpen, setSettingDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Check if current user is admin
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="p-6 text-center">
        <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">
          {isArabic ? 'غير مصرح' : 'Unauthorized'}
        </h1>
        <p className="text-muted-foreground">
          {isArabic ? 'ليس لديك صلاحية للوصول إلى هذه الصفحة' : 'You do not have permission to access this page'}
        </p>
      </div>
    );
  }

  // Data queries
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/admin/services"],
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: clinicInfo } = useQuery({
    queryKey: ["/api/admin/clinic-info"],
  });

  const { data: revenueData } = useQuery({
    queryKey: ["/api/admin/reports/revenue-by-month"],
  });

  const { data: visitsData } = useQuery({
    queryKey: ["/api/admin/reports/visits-by-service"],
  });

  const { data: noShowData } = useQuery({
    queryKey: ["/api/admin/reports/no-shows"],
  });

  const { data: agingData } = useQuery({
    queryKey: ["/api/admin/reports/aging-receivables"],
  });

  // Form setup
  const serviceForm = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      code: "",
      nameAr: "",
      nameEn: "",
      descriptionAr: "",
      descriptionEn: "",
      price: "",
      duration: 30,
      category: "",
      isActive: true,
    },
  });

  const settingForm = useForm({
    resolver: zodResolver(settingSchema),
    defaultValues: {
      key: "",
      value: "",
      description: "",
      category: "GENERAL",
    },
  });

  const clinicForm = useForm({
    resolver: zodResolver(clinicInfoSchema),
    defaultValues: {
      nameAr: clinicInfo?.nameAr || "",
      nameEn: clinicInfo?.nameEn || "",
      phone: clinicInfo?.phone || "",
      addressAr: clinicInfo?.addressAr || "",
      addressEn: clinicInfo?.addressEn || "",
      email: clinicInfo?.email || "",
      website: clinicInfo?.website || "",
    },
  });

  const userForm = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      fullName: "",
      role: "RECEPTION",
      phone: "",
      isActive: true,
    },
  });

  // Mutations
  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/admin/services", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      setServiceDialogOpen(false);
      setEditingService(null);
      serviceForm.reset();
      toast({
        title: isArabic ? "تم الإنشاء بنجاح" : "Created successfully",
      });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/admin/services/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      setServiceDialogOpen(false);
      setEditingService(null);
      serviceForm.reset();
      toast({
        title: isArabic ? "تم التحديث بنجاح" : "Updated successfully",
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/services/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      toast({
        title: isArabic ? "تم الحذف بنجاح" : "Deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // User mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserDialogOpen(false);
      setEditingUser(null);
      userForm.reset();
      toast({
        title: isArabic ? "تم إنشاء المستخدم بنجاح" : "User created successfully",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserDialogOpen(false);
      setEditingUser(null);
      userForm.reset();
      toast({
        title: isArabic ? "تم تحديث المستخدم بنجاح" : "User updated successfully",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/users/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: isArabic ? "تم حذف المستخدم بنجاح" : "User deleted successfully",
      });
    },
  });

  const saveClinicInfoMutation = useMutation({
    mutationFn: async (data: any) => {
      if (clinicInfo?.id) {
        return await apiRequest(`/api/admin/clinic-info/${clinicInfo.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      } else {
        return await apiRequest("/api/admin/clinic-info", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clinic-info"] });
      toast({
        title: isArabic ? "تم الحفظ بنجاح" : "Saved successfully",
      });
    },
  });

  // Handlers
  const handleEditService = (service: Service) => {
    setEditingService(service);
    serviceForm.reset({
      code: service.code,
      nameAr: service.nameAr,
      nameEn: service.nameEn,
      descriptionAr: service.descriptionAr || "",
      descriptionEn: service.descriptionEn || "",
      price: service.price,
      duration: service.duration,
      category: service.category || "",
      isActive: service.isActive,
    });
    setServiceDialogOpen(true);
  };

  const handleDeleteService = (id: string) => {
    if (confirm(isArabic ? 'هل أنت متأكد من حذف هذه الخدمة؟' : 'Are you sure you want to delete this service?')) {
      deleteServiceMutation.mutate(id);
    }
  };

  const handleBackup = () => {
    window.open('/api/admin/backup', '_blank');
  };

  return (
    <div className="p-6" data-testid="admin-page">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-admin-title">
          {isArabic ? 'لوحة الإدارة' : 'Admin Panel'}
        </h1>
        <p className="text-muted-foreground">
          {isArabic ? 'إدارة النظام والإعدادات' : 'Manage system and settings'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {isArabic ? 'الخدمات' : 'Services'}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {isArabic ? 'الإعدادات' : 'Settings'}
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {isArabic ? 'التقارير' : 'Reports'}
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {isArabic ? 'المستخدمون' : 'Users'}
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            {isArabic ? 'النسخ الاحتياطي' : 'Backup'}
          </TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">
                {isArabic ? 'إدارة الخدمات' : 'Services Management'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isArabic ? 'إضافة وتعديل وحذف خدمات العيادة' : 'Add, edit, and delete clinic services'}
              </p>
            </div>
            <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {isArabic ? 'إضافة خدمة' : 'Add Service'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? 
                      (isArabic ? 'تعديل الخدمة' : 'Edit Service') : 
                      (isArabic ? 'إضافة خدمة جديدة' : 'Add New Service')
                    }
                  </DialogTitle>
                </DialogHeader>
                <Form {...serviceForm}>
                  <form onSubmit={serviceForm.handleSubmit((data) => {
                    if (editingService) {
                      updateServiceMutation.mutate({ id: editingService.id, data });
                    } else {
                      createServiceMutation.mutate(data);
                    }
                  })} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={serviceForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? 'رمز الخدمة' : 'Service Code'}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={serviceForm.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? 'المدة (بالدقائق)' : 'Duration (minutes)'}</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={serviceForm.control}
                        name="nameAr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? 'الاسم بالعربية' : 'Arabic Name'}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={serviceForm.control}
                        name="nameEn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? 'الاسم بالإنجليزية' : 'English Name'}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={serviceForm.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? 'السعر' : 'Price'}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={serviceForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? 'الفئة' : 'Category'}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={serviceForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              {isArabic ? 'نشط' : 'Active'}
                            </FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="submit" disabled={createServiceMutation.isPending || updateServiceMutation.isPending}>
                        {(createServiceMutation.isPending || updateServiceMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingService ? (isArabic ? 'تحديث' : 'Update') : (isArabic ? 'إنشاء' : 'Create')}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent>
              {servicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? 'الرمز' : 'Code'}</TableHead>
                      <TableHead>{isArabic ? 'الاسم' : 'Name'}</TableHead>
                      <TableHead>{isArabic ? 'السعر' : 'Price'}</TableHead>
                      <TableHead>{isArabic ? 'المدة' : 'Duration'}</TableHead>
                      <TableHead>{isArabic ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead className="text-right">{isArabic ? 'الإجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services?.map((service: Service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.code}</TableCell>
                        <TableCell>{isArabic ? service.nameAr : service.nameEn}</TableCell>
                        <TableCell>{service.price}</TableCell>
                        <TableCell>{service.duration} {isArabic ? 'دقيقة' : 'min'}</TableCell>
                        <TableCell>
                          <Badge variant={service.isActive ? 'default' : 'secondary'}>
                            {service.isActive ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditService(service)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteService(service.id)}
                              disabled={deleteServiceMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Working Hours Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {isArabic ? 'ساعات العمل' : 'Working Hours'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{isArabic ? 'بداية العمل' : 'Start Time'}</Label>
                    <Input type="time" defaultValue="09:00" />
                  </div>
                  <div>
                    <Label>{isArabic ? 'نهاية العمل' : 'End Time'}</Label>
                    <Input type="time" defaultValue="21:00" />
                  </div>
                </div>
                <div>
                  <Label>{isArabic ? 'مدة الموعد (بالدقائق)' : 'Slot Length (minutes)'}</Label>
                  <Input type="number" defaultValue="30" />
                </div>
                <div>
                  <Label>{isArabic ? 'أيام الإجازة' : 'Days Closed'}</Label>
                  <Select defaultValue="friday">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friday">{isArabic ? 'الجمعة' : 'Friday'}</SelectItem>
                      <SelectItem value="weekend">{isArabic ? 'نهاية الأسبوع' : 'Weekend'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">
                  {isArabic ? 'حفظ الإعدادات' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>

            {/* Clinic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {isArabic ? 'معلومات العيادة' : 'Clinic Information'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...clinicForm}>
                  <form onSubmit={clinicForm.handleSubmit((data) => saveClinicInfoMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={clinicForm.control}
                        name="nameAr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? 'اسم العيادة (عربي)' : 'Clinic Name (Arabic)'}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={clinicForm.control}
                        name="nameEn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? 'اسم العيادة (إنجليزي)' : 'Clinic Name (English)'}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={clinicForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? 'رقم الهاتف' : 'Phone'}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={clinicForm.control}
                        name="addressAr"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? 'العنوان (عربي)' : 'Address (Arabic)'}</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={clinicForm.control}
                        name="addressEn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? 'العنوان (إنجليزي)' : 'Address (English)'}</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" disabled={saveClinicInfoMutation.isPending} className="w-full">
                      {saveClinicInfoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isArabic ? 'حفظ المعلومات' : 'Save Information'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {isArabic ? 'إدارة المستخدمين' : 'User Management'}
            </h2>
            <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingUser(null);
                  userForm.reset();
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {isArabic ? 'إضافة مستخدم' : 'Add User'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser 
                      ? (isArabic ? 'تعديل مستخدم' : 'Edit User')
                      : (isArabic ? 'إضافة مستخدم جديد' : 'Add New User')
                    }
                  </DialogTitle>
                </DialogHeader>
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit((data) => {
                    if (editingUser) {
                      updateUserMutation.mutate({ id: editingUser.id, data });
                    } else {
                      createUserMutation.mutate(data);
                    }
                  })} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={userForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? 'اسم المستخدم' : 'Username'}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={userForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? 'الاسم الكامل' : 'Full Name'}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={userForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? 'كلمة المرور' : 'Password'}</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={userForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? 'البريد الإلكتروني' : 'Email'}</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={userForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? 'الهاتف' : 'Phone'}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={userForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? 'الدور' : 'Role'}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ADMIN">{isArabic ? 'مدير' : 'Admin'}</SelectItem>
                              <SelectItem value="DOCTOR">{isArabic ? 'طبيب' : 'Doctor'}</SelectItem>
                              <SelectItem value="RECEPTION">{isArabic ? 'استقبال' : 'Reception'}</SelectItem>
                              <SelectItem value="ACCOUNTANT">{isArabic ? 'محاسب' : 'Accountant'}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={userForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              {isArabic ? 'نشط' : 'Active'}
                            </FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createUserMutation.isPending || updateUserMutation.isPending}>
                        {(createUserMutation.isPending || updateUserMutation.isPending) && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {editingUser 
                          ? (isArabic ? 'تحديث' : 'Update')
                          : (isArabic ? 'إضافة' : 'Add')
                        }
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{isArabic ? 'قائمة المستخدمين' : 'Users List'}</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isArabic ? 'اسم المستخدم' : 'Username'}</TableHead>
                      <TableHead>{isArabic ? 'الاسم الكامل' : 'Full Name'}</TableHead>
                      <TableHead>{isArabic ? 'الدور' : 'Role'}</TableHead>
                      <TableHead>{isArabic ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead className="text-right">{isArabic ? 'الإجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.fullName || user.username}</TableCell>
                        <TableCell>
                          <Badge variant={
                            user.role === 'ADMIN' ? 'default' :
                            user.role === 'DOCTOR' ? 'secondary' :
                            user.role === 'RECEPTION' ? 'outline' : 'destructive'
                          }>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user);
                                userForm.reset({
                                  username: user.username,
                                  email: user.email || '',
                                  fullName: user.fullName || user.username,
                                  role: user.role,
                                  phone: user.phone || '',
                                  isActive: user.isActive ?? true,
                                  password: '', // Don't prefill password
                                });
                                setUserDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {user.id !== currentUser?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteUserMutation.mutate(user.id)}
                                disabled={deleteUserMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue by Month */}
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'الإيرادات الشهرية' : 'Monthly Revenue'}</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueData && revenueData.length > 0 ? (
                  <div className="space-y-2">
                    {revenueData.map((item: any) => (
                      <div key={item.month} className="flex justify-between">
                        <span>{item.month}</span>
                        <span className="font-semibold">{item.revenue}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {isArabic ? 'لا توجد بيانات متاحة' : 'No data available'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Visits by Service */}
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'الزيارات حسب الخدمة' : 'Visits by Service'}</CardTitle>
              </CardHeader>
              <CardContent>
                {visitsData && visitsData.length > 0 ? (
                  <div className="space-y-2">
                    {visitsData.slice(0, 10).map((item: any) => (
                      <div key={item.serviceName} className="flex justify-between">
                        <span>{isArabic ? item.serviceNameAr : item.serviceName}</span>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {isArabic ? 'لا توجد بيانات متاحة' : 'No data available'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* No-shows */}
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'إحصائيات عدم الحضور' : 'No-Show Statistics'}</CardTitle>
              </CardHeader>
              <CardContent>
                {noShowData ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{isArabic ? 'إجمالي المواعيد' : 'Total Appointments'}</span>
                      <span className="font-semibold">{noShowData.totalAppointments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isArabic ? 'عدد عدم الحضور' : 'No Shows'}</span>
                      <span className="font-semibold">{noShowData.noShows}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isArabic ? 'معدل عدم الحضور' : 'No Show Rate'}</span>
                      <Badge variant="outline">{noShowData.noShowRate}%</Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {isArabic ? 'لا توجد بيانات متاحة' : 'No data available'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Aging Receivables */}
            <Card>
              <CardHeader>
                <CardTitle>{isArabic ? 'المستحقات المتقادمة' : 'Aging Receivables'}</CardTitle>
              </CardHeader>
              <CardContent>
                {agingData ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>0-30 {isArabic ? 'يوم' : 'days'}</span>
                      <span className="font-semibold">{agingData['0-30']}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>31-60 {isArabic ? 'يوم' : 'days'}</span>
                      <span className="font-semibold">{agingData['31-60']}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>61-90 {isArabic ? 'يوم' : 'days'}</span>
                      <span className="font-semibold">{agingData['61-90']}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>90+ {isArabic ? 'يوم' : 'days'}</span>
                      <span className="font-semibold">{agingData['90+']}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {isArabic ? 'لا توجد بيانات متاحة' : 'No data available'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                {isArabic ? 'النسخ الاحتياطي' : 'Database Backup'}
              </CardTitle>
              <CardDescription>
                {isArabic ? 'تحميل نسخة احتياطية من قاعدة البيانات' : 'Download a timestamped copy of the database'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">
                  {isArabic ? 'النسخ الاحتياطي التلقائي' : 'Automated Daily Backups'}
                </h4>
                <p className="text-sm text-yellow-700">
                  {isArabic ? 
                    'يوصى بإعداد النسخ الاحتياطي التلقائي اليومي لضمان أمان البيانات. يمكنك استخدام لوحة قاعدة البيانات لإعداد هذا.' :
                    'It is recommended to set up automated daily backups to ensure data safety. You can use the database panel to configure this.'
                  }
                </p>
              </div>
              
              <Button onClick={handleBackup} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                {isArabic ? 'تحميل النسخة الاحتياطية' : 'Download Backup'}
              </Button>
              
              <div className="text-sm text-muted-foreground">
                <p>
                  {isArabic ? 
                    'ملاحظة: سيتم تحميل ملف SQL يحتوي على بنية قاعدة البيانات والبيانات.' :
                    'Note: This will download a SQL file containing the database structure and data.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}