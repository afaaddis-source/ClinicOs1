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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { LanguageContext } from "@/App";
import { useUser } from "@/hooks/use-auth";
import { Plus, Edit, KeyRound, Loader2, Shield } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  role: z.enum(["ADMIN", "DOCTOR", "RECEPTION", "ACCOUNTANT"]),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updateUserSchema = userSchema.partial().omit({ password: true });
const passwordResetSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

interface User {
  id: string;
  username: string;
  email?: string;
  fullName: string;
  role: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPage() {
  const { language } = useContext(LanguageContext);
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const isArabic = language === 'ar';

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async (): Promise<User[]> => {
      const response = await fetch("/api/users", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const createForm = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      fullName: "",
      role: "RECEPTION" as const,
      phone: "",
      isActive: true,
    },
  });

  const editForm = useForm({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      username: "",
      email: "",
      fullName: "",
      role: "RECEPTION" as const,
      phone: "",
      isActive: true,
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      password: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: isArabic ? "تم الإنشاء بنجاح" : "Created successfully",
        description: isArabic ? "تم إنشاء المستخدم بنجاح" : "User created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message || (isArabic ? "حدث خطأ أثناء إنشاء المستخدم" : "Failed to create user"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditDialogOpen(false);
      setSelectedUser(null);
      editForm.reset();
      toast({
        title: isArabic ? "تم التحديث بنجاح" : "Updated successfully",
        description: isArabic ? "تم تحديث المستخدم بنجاح" : "User updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message || (isArabic ? "حدث خطأ أثناء تحديث المستخدم" : "Failed to update user"),
        variant: "destructive",
      });
    },
  });

  const passwordResetMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      return await apiRequest(`/api/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
    },
    onSuccess: () => {
      setPasswordDialogOpen(false);
      setSelectedUser(null);
      passwordForm.reset();
      toast({
        title: isArabic ? "تم إعادة تعيين كلمة المرور" : "Password reset",
        description: isArabic ? "تم إعادة تعيين كلمة المرور بنجاح" : "Password reset successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message || (isArabic ? "حدث خطأ أثناء إعادة تعيين كلمة المرور" : "Failed to reset password"),
        variant: "destructive",
      });
    },
  });

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      username: user.username,
      email: user.email || "",
      fullName: user.fullName,
      role: user.role as any,
      phone: user.phone || "",
      isActive: user.isActive,
    });
    setEditDialogOpen(true);
  };

  const handlePasswordReset = (user: User) => {
    setSelectedUser(user);
    passwordForm.reset({ password: "" });
    setPasswordDialogOpen(true);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return isArabic ? 'مدير' : 'Admin';
      case 'DOCTOR': return isArabic ? 'طبيب' : 'Doctor';
      case 'RECEPTION': return isArabic ? 'استقبال' : 'Reception';
      case 'ACCOUNTANT': return isArabic ? 'محاسب' : 'Accountant';
      default: return role;
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'destructive';
      case 'DOCTOR': return 'default';
      case 'RECEPTION': return 'secondary';
      case 'ACCOUNTANT': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="p-6" data-testid="admin-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-admin-title">
            {isArabic ? 'إدارة المستخدمين' : 'User Management'}
          </h1>
          <p className="text-muted-foreground">
            {isArabic ? 'إدارة حسابات المستخدمين والصلاحيات' : 'Manage user accounts and permissions'}
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {isArabic ? 'إضافة مستخدم' : 'Add User'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {isArabic ? 'إضافة مستخدم جديد' : 'Add New User'}
              </DialogTitle>
              <DialogDescription>
                {isArabic ? 'أدخل بيانات المستخدم الجديد' : 'Enter the new user details'}
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={createForm.control}
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
                  control={createForm.control}
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

                <FormField
                  control={createForm.control}
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

                <FormField
                  control={createForm.control}
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
                  control={createForm.control}
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

                <FormField
                  control={createForm.control}
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

                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isArabic ? 'إنشاء' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isArabic ? 'المستخدمين' : 'Users'}</CardTitle>
          <CardDescription>
            {isArabic ? 'قائمة بجميع المستخدمين في النظام' : 'List of all users in the system'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? 'اسم المستخدم' : 'Username'}</TableHead>
                  <TableHead>{isArabic ? 'الاسم الكامل' : 'Full Name'}</TableHead>
                  <TableHead>{isArabic ? 'البريد الإلكتروني' : 'Email'}</TableHead>
                  <TableHead>{isArabic ? 'الدور' : 'Role'}</TableHead>
                  <TableHead>{isArabic ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-right">{isArabic ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleVariant(user.role) as any}>
                        {getRoleLabel(user.role)}
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
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePasswordReset(user)}
                        >
                          <KeyRound className="h-4 w-4" />
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

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isArabic ? 'تعديل المستخدم' : 'Edit User'}
            </DialogTitle>
            <DialogDescription>
              {isArabic ? 'تعديل بيانات المستخدم' : 'Update user information'}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => 
              updateMutation.mutate({ id: selectedUser!.id, data })
            )} className="space-y-4">
              <FormField
                control={editForm.control}
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
                control={editForm.control}
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

              <FormField
                control={editForm.control}
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
                control={editForm.control}
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

              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isArabic ? 'الدور' : 'Role'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isArabic ? 'حفظ' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isArabic ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
            </DialogTitle>
            <DialogDescription>
              {isArabic ? `إعادة تعيين كلمة المرور للمستخدم: ${selectedUser?.fullName}` : 
                       `Reset password for user: ${selectedUser?.fullName}`}
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit((data) => 
              passwordResetMutation.mutate({ id: selectedUser!.id, password: data.password })
            )} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isArabic ? 'كلمة المرور الجديدة' : 'New Password'}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={passwordResetMutation.isPending}>
                  {passwordResetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isArabic ? 'إعادة تعيين' : 'Reset'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}