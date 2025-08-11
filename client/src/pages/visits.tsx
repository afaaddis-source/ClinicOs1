import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, FileText, Plus, Eye, Edit, Receipt, Printer } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertVisitSchema, type Visit, type Patient, type Service, type User, type VisitProcedure } from "@shared/schema";

const visitFormSchema = insertVisitSchema.extend({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  visitDate: z.date(),
  proceduresJson: z.array(z.object({
    serviceId: z.string(),
    tooth: z.string().optional(),
    surfaces: z.array(z.string()).optional(),
    notes: z.string().optional()
  })).optional()
});

type VisitForm = z.infer<typeof visitFormSchema>;

const TeethMap = ({ selectedTeeth, onTeethChange }: { 
  selectedTeeth: Record<string, any>, 
  onTeethChange: (teeth: Record<string, any>) => void 
}) => {
  const teeth = Array.from({ length: 32 }, (_, i) => i + 1);
  
  const handleToothClick = (toothNumber: number) => {
    const toothKey = `tooth-${toothNumber}`;
    const newTeeth = { ...selectedTeeth };
    
    if (newTeeth[toothKey]) {
      delete newTeeth[toothKey];
    } else {
      newTeeth[toothKey] = {
        condition: "selected",
        notes: ""
      };
    }
    
    onTeethChange(newTeeth);
  };

  return (
    <div className="grid grid-cols-8 gap-2 p-4 border rounded-lg">
      <div className="col-span-8 text-center text-sm font-medium mb-2">
        خريطة الأسنان - اضغط لتحديد السن
      </div>
      {teeth.map((tooth) => (
        <button
          key={tooth}
          type="button"
          onClick={() => handleToothClick(tooth)}
          className={`
            w-8 h-8 rounded border text-xs font-medium transition-colors
            ${selectedTeeth[`tooth-${tooth}`] 
              ? 'bg-blue-500 text-white border-blue-600' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          {tooth}
        </button>
      ))}
    </div>
  );
};

export default function VisitsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [procedures, setProcedures] = useState<VisitProcedure[]>([]);
  const [selectedTeeth, setSelectedTeeth] = useState<Record<string, any>>({});
  
  const { toast } = useToast();
  
  // Check if user is Arabic
  const isArabic = true; // This would come from language context

  const visitForm = useForm<VisitForm>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      visitDate: new Date(),
      chiefComplaint: "",
      diagnosis: "",
      doctorNotes: "",
      status: "IN_PROGRESS",
      proceduresJson: []
    },
  });

  // Queries
  const { data: visitsData, isLoading } = useQuery({
    queryKey: ["/api/visits"],
  });

  const { data: patientsData } = useQuery({
    queryKey: ["/api/patients"],
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["/api/doctors"],
  });

  const { data: servicesData } = useQuery({
    queryKey: ["/api/services"],
  });

  // Ensure data is arrays
  const visits = Array.isArray(visitsData) ? visitsData : [];
  const patients = Array.isArray(patientsData) ? patientsData : [];
  const doctors = Array.isArray(doctorsData) ? doctorsData : [];
  const services = Array.isArray(servicesData) ? servicesData : [];

  const { data: visitDetails, isLoading: visitDetailsLoading } = useQuery({
    queryKey: ["/api/visits", selectedVisitId],
    enabled: !!selectedVisitId,
  });

  // Mutations
  const createVisitMutation = useMutation({
    mutationFn: async (data: VisitForm) => {
      return apiRequest("/api/visits", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          proceduresJson: procedures,
          toothMapJson: selectedTeeth
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: isArabic ? "تم إنشاء الزيارة بنجاح" : "Visit created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ في إنشاء الزيارة" : "Error creating visit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: async (data: VisitForm) => {
      return apiRequest(`/api/visits/${editingVisit?.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...data,
          proceduresJson: procedures,
          toothMapJson: selectedTeeth
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: isArabic ? "تم تحديث الزيارة بنجاح" : "Visit updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ في تحديث الزيارة" : "Error updating visit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (visitId: string) => {
      return apiRequest(`/api/visits/${visitId}/invoice`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: isArabic ? "تم إنشاء الفاتورة بنجاح" : "Invoice created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isArabic ? "خطأ في إنشاء الفاتورة" : "Error creating invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    visitForm.reset();
    setEditingVisit(null);
    setSelectedPatient(null);
    setProcedures([]);
    setSelectedTeeth({});
  };

  const openEditDialog = (visit: Visit) => {
    setEditingVisit(visit);
    visitForm.reset({
      patientId: visit.patientId,
      doctorId: visit.doctorId,
      visitDate: new Date(visit.visitDate),
      chiefComplaint: visit.chiefComplaint || "",
      diagnosis: visit.diagnosis || "",
      doctorNotes: visit.doctorNotes || "",
      status: visit.status,
    });
    
    if (visit.proceduresJson) {
      setProcedures(visit.proceduresJson as VisitProcedure[]);
    }
    
    if (visit.toothMapJson) {
      setSelectedTeeth(visit.toothMapJson as Record<string, any>);
    }
    
    setIsDialogOpen(true);
  };

  const addProcedure = () => {
    setProcedures([...procedures, { serviceId: "", notes: "" }]);
  };

  const updateProcedure = (index: number, field: keyof VisitProcedure, value: any) => {
    const newProcedures = [...procedures];
    newProcedures[index] = { ...newProcedures[index], [field]: value };
    setProcedures(newProcedures);
  };

  const removeProcedure = (index: number) => {
    setProcedures(procedures.filter((_, i) => i !== index));
  };

  const onSubmit = (data: VisitForm) => {
    if (editingVisit) {
      updateVisitMutation.mutate(data);
    } else {
      createVisitMutation.mutate(data);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      "IN_PROGRESS": "bg-yellow-100 text-yellow-800",
      "COMPLETED": "bg-green-100 text-green-800",
      "CANCELLED": "bg-red-100 text-red-800"
    };
    
    const statusLabels = {
      "IN_PROGRESS": isArabic ? "قيد التنفيذ" : "In Progress",
      "COMPLETED": isArabic ? "مكتمل" : "Completed",
      "CANCELLED": isArabic ? "ملغي" : "Cancelled"
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors]}>
        {statusLabels[status as keyof typeof statusLabels]}
      </Badge>
    );
  };

  const printVisitSummary = (visit: Visit) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const patient = (patients as Patient[])?.find(p => p.id === visit.patientId);
    const doctor = (doctors as User[])?.find(d => d.id === visit.doctorId);
    
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>ملخص الزيارة</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .section { margin: 20px 0; }
            .label { font-weight: bold; }
            .procedures { margin-top: 10px; }
            .procedure-item { margin: 5px 0; padding: 5px; border-left: 3px solid #007bff; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ملخص الزيارة الطبية</h1>
            <h2>عيادة الأسنان</h2>
          </div>
          
          <div class="section">
            <div><span class="label">اسم المريض:</span> ${patient?.firstName} ${patient?.lastName}</div>
            <div><span class="label">الرقم المدني:</span> ${patient?.civilId}</div>
            <div><span class="label">رقم الهاتف:</span> ${patient?.phone}</div>
          </div>
          
          <div class="section">
            <div><span class="label">الطبيب المعالج:</span> ${doctor?.fullName}</div>
            <div><span class="label">تاريخ الزيارة:</span> ${format(new Date(visit.visitDate), 'dd/MM/yyyy', { locale: ar })}</div>
            <div><span class="label">وقت الزيارة:</span> ${format(new Date(visit.visitDate), 'HH:mm')}</div>
          </div>
          
          <div class="section">
            <div><span class="label">الشكوى الرئيسية:</span></div>
            <div>${visit.chiefComplaint || 'غير محدد'}</div>
          </div>
          
          <div class="section">
            <div><span class="label">التشخيص:</span></div>
            <div>${visit.diagnosis || 'غير محدد'}</div>
          </div>
          
          ${visit.proceduresJson && (visit.proceduresJson as VisitProcedure[]).length > 0 ? `
            <div class="section">
              <div class="label">الإجراءات المنجزة:</div>
              <div class="procedures">
                ${(visit.proceduresJson as VisitProcedure[]).map(procedure => {
                  const service = (services as Service[])?.find(s => s.id === procedure.serviceId);
                  return `
                    <div class="procedure-item">
                      <div>${service?.nameAr || 'خدمة غير محددة'}</div>
                      ${procedure.tooth ? `<div>السن: ${procedure.tooth}</div>` : ''}
                      ${procedure.notes ? `<div>ملاحظات: ${procedure.notes}</div>` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
          
          <div class="section">
            <div><span class="label">ملاحظات الطبيب:</span></div>
            <div>${visit.doctorNotes || 'لا توجد ملاحظات'}</div>
          </div>
          
          <div class="section">
            <div><span class="label">المبلغ الإجمالي:</span> ${visit.totalAmount || '0'} د.ك</div>
          </div>
          
          <div style="margin-top: 50px; text-align: center; font-size: 12px;">
            تم طباعة هذا التقرير في ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  if (isLoading) {
    return <div className="p-6">{isArabic ? "جاري التحميل..." : "Loading..."}</div>;
  }

  return (
    <div className="p-6 space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{isArabic ? "الزيارات الطبية" : "Medical Visits"}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} data-testid="button-new-visit">
              <Plus className="w-4 h-4 mr-2" />
              {isArabic ? "زيارة جديدة" : "New Visit"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVisit 
                  ? (isArabic ? "تعديل الزيارة" : "Edit Visit")
                  : (isArabic ? "زيارة جديدة" : "New Visit")
                }
              </DialogTitle>
            </DialogHeader>
            
            <Form {...visitForm}>
              <form onSubmit={visitForm.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">{isArabic ? "البيانات الأساسية" : "Basic Info"}</TabsTrigger>
                    <TabsTrigger value="procedures">{isArabic ? "الإجراءات" : "Procedures"}</TabsTrigger>
                    <TabsTrigger value="teeth">{isArabic ? "خريطة الأسنان" : "Teeth Map"}</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={visitForm.control}
                        name="patientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? "المريض" : "Patient"}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-patient">
                                  <SelectValue placeholder={isArabic ? "اختر المريض" : "Select Patient"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(patients as Patient[])?.map((patient) => (
                                  <SelectItem key={patient.id} value={patient.id}>
                                    {patient.firstName} {patient.lastName} - {patient.civilId}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={visitForm.control}
                        name="doctorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{isArabic ? "الطبيب" : "Doctor"}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-doctor">
                                  <SelectValue placeholder={isArabic ? "اختر الطبيب" : "Select Doctor"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(doctors as User[])?.map((doctor) => (
                                  <SelectItem key={doctor.id} value={doctor.id}>
                                    {doctor.fullName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={visitForm.control}
                      name="chiefComplaint"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "الشكوى الرئيسية" : "Chief Complaint"}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={isArabic ? "اوصف الشكوى الرئيسية للمريض..." : "Describe the patient's main complaint..."}
                              {...field}
                              data-testid="textarea-complaint"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={visitForm.control}
                      name="diagnosis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "التشخيص" : "Diagnosis"}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={isArabic ? "اكتب التشخيص..." : "Enter diagnosis..."}
                              {...field}
                              data-testid="textarea-diagnosis"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={visitForm.control}
                      name="doctorNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "ملاحظات الطبيب" : "Doctor Notes"}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={isArabic ? "ملاحظات إضافية..." : "Additional notes..."}
                              {...field}
                              data-testid="textarea-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={visitForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isArabic ? "حالة الزيارة" : "Visit Status"}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="IN_PROGRESS">{isArabic ? "قيد التنفيذ" : "In Progress"}</SelectItem>
                              <SelectItem value="COMPLETED">{isArabic ? "مكتمل" : "Completed"}</SelectItem>
                              <SelectItem value="CANCELLED">{isArabic ? "ملغي" : "Cancelled"}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="procedures" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">{isArabic ? "الإجراءات المنجزة" : "Performed Procedures"}</h3>
                      <Button type="button" onClick={addProcedure} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        {isArabic ? "إضافة إجراء" : "Add Procedure"}
                      </Button>
                    </div>
                    
                    {procedures.map((procedure, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>{isArabic ? "الخدمة" : "Service"}</Label>
                            <Select
                              value={procedure.serviceId}
                              onValueChange={(value) => updateProcedure(index, "serviceId", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={isArabic ? "اختر الخدمة" : "Select Service"} />
                              </SelectTrigger>
                              <SelectContent>
                                {(services as Service[])?.map((service) => (
                                  <SelectItem key={service.id} value={service.id}>
                                    {isArabic ? service.nameAr : service.nameEn}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>{isArabic ? "رقم السن" : "Tooth Number"}</Label>
                            <Input
                              placeholder={isArabic ? "رقم السن (اختياري)" : "Tooth number (optional)"}
                              value={procedure.tooth || ""}
                              onChange={(e) => updateProcedure(index, "tooth", e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <Label>{isArabic ? "ملاحظات" : "Notes"}</Label>
                          <Textarea
                            placeholder={isArabic ? "ملاحظات حول الإجراء..." : "Notes about the procedure..."}
                            value={procedure.notes || ""}
                            onChange={(e) => updateProcedure(index, "notes", e.target.value)}
                          />
                        </div>
                        
                        <div className="mt-2">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeProcedure(index)}
                          >
                            {isArabic ? "حذف الإجراء" : "Remove Procedure"}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="teeth" className="space-y-4">
                    <h3 className="text-lg font-medium">{isArabic ? "خريطة الأسنان" : "Teeth Map"}</h3>
                    <TeethMap 
                      selectedTeeth={selectedTeeth} 
                      onTeethChange={setSelectedTeeth} 
                    />
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    type="submit" 
                    disabled={createVisitMutation.isPending || updateVisitMutation.isPending}
                    data-testid="button-submit-visit"
                  >
                    {createVisitMutation.isPending || updateVisitMutation.isPending
                      ? (isArabic ? "جاري الحفظ..." : "Saving...")
                      : (editingVisit 
                          ? (isArabic ? "تحديث الزيارة" : "Update Visit")
                          : (isArabic ? "حفظ الزيارة" : "Save Visit")
                        )
                    }
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {isArabic ? "إلغاء" : "Cancel"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isArabic ? "قائمة الزيارات" : "Visits List"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isArabic ? "المريض" : "Patient"}</TableHead>
                <TableHead>{isArabic ? "الطبيب" : "Doctor"}</TableHead>
                <TableHead>{isArabic ? "تاريخ الزيارة" : "Visit Date"}</TableHead>
                <TableHead>{isArabic ? "الحالة" : "Status"}</TableHead>
                <TableHead>{isArabic ? "المبلغ" : "Amount"}</TableHead>
                <TableHead>{isArabic ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(visits as any[])?.map((visit) => (
                <TableRow key={visit.id}>
                  <TableCell data-testid={`text-patient-${visit.id}`}>
                    {visit.patientName || `${visit.patient?.firstName} ${visit.patient?.lastName}`}
                  </TableCell>
                  <TableCell data-testid={`text-doctor-${visit.id}`}>
                    {visit.doctorName}
                  </TableCell>
                  <TableCell data-testid={`text-date-${visit.id}`}>
                    {format(new Date(visit.visitDate), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell data-testid={`status-${visit.id}`}>
                    {getStatusBadge(visit.status)}
                  </TableCell>
                  <TableCell data-testid={`text-amount-${visit.id}`}>
                    {visit.totalAmount || "0"} {isArabic ? "د.ك" : "KD"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedVisitId(visit.id)}
                        data-testid={`button-view-${visit.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(visit)}
                        data-testid={`button-edit-${visit.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => printVisitSummary(visit)}
                        data-testid={`button-print-${visit.id}`}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => createInvoiceMutation.mutate(visit.id)}
                        disabled={createInvoiceMutation.isPending}
                        data-testid={`button-invoice-${visit.id}`}
                      >
                        <Receipt className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}