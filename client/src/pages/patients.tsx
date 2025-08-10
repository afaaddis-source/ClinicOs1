import { useState, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Eye } from "lucide-react";
import { LanguageContext } from "@/App";
import { useToast } from "@/hooks/use-toast";

interface Patient {
  id: string;
  civilId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE";
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  allergies?: string[];
  medicalHistory?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const { language } = useContext(LanguageContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isArabic = language === 'ar';

  const [formData, setFormData] = useState({
    civilId: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    gender: "" as "MALE" | "FEMALE" | "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    allergies: [] as string[],
    medicalHistory: "",
    notes: "",
  });

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["/api/patients", searchTerm],
    queryFn: async (): Promise<Patient[]> => {
      const url = searchTerm 
        ? `/api/patients?search=${encodeURIComponent(searchTerm)}`
        : "/api/patients";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
  });

  const createPatient = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          allergies: data.allergies.filter(a => a.trim()),
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        }),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create patient");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: isArabic ? "تم إنشاء المريض" : "Patient Created",
        description: isArabic ? "تم إضافة المريض بنجاح" : "Patient has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: isArabic ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      civilId: "",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      gender: "",
      address: "",
      emergencyContact: "",
      emergencyPhone: "",
      allergies: [],
      medicalHistory: "",
      notes: "",
    });
    setSelectedPatient(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPatient.mutate(formData);
  };

  const addAllergy = () => {
    setFormData(prev => ({
      ...prev,
      allergies: [...prev.allergies, ""]
    }));
  };

  const updateAllergy = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.map((allergy, i) => i === index ? value : allergy)
    }));
  };

  const removeAllergy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(isArabic ? 'ar-KW' : 'en-US');
  };

  return (
    <div className="p-6" data-testid="patients-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-patients-title">
            {isArabic ? 'المرضى' : 'Patients'}
          </h1>
          <p className="text-muted-foreground">
            {isArabic ? 'إدارة بيانات المرضى' : 'Manage patient records'}
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} data-testid="button-add-patient">
              <Plus className="mr-2 h-4 w-4" />
              {isArabic ? 'إضافة مريض' : 'Add Patient'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isArabic ? 'إضافة مريض جديد' : 'Add New Patient'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">
                    {isArabic ? 'الاسم الأول' : 'First Name'} *
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">
                    {isArabic ? 'اسم العائلة' : 'Last Name'} *
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="civilId">
                    {isArabic ? 'الرقم المدني' : 'Civil ID'}
                  </Label>
                  <Input
                    id="civilId"
                    value={formData.civilId}
                    onChange={(e) => setFormData(prev => ({ ...prev, civilId: e.target.value }))}
                    data-testid="input-civil-id"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">
                    {isArabic ? 'رقم الهاتف' : 'Phone Number'} *
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">
                    {isArabic ? 'البريد الإلكتروني' : 'Email'}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">
                    {isArabic ? 'تاريخ الميلاد' : 'Date of Birth'}
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    data-testid="input-date-of-birth"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="gender">
                  {isArabic ? 'الجنس' : 'Gender'}
                </Label>
                <Select value={formData.gender} onValueChange={(value: "MALE" | "FEMALE") => 
                  setFormData(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger data-testid="select-gender">
                    <SelectValue placeholder={isArabic ? 'اختر الجنس' : 'Select gender'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">{isArabic ? 'ذكر' : 'Male'}</SelectItem>
                    <SelectItem value="FEMALE">{isArabic ? 'أنثى' : 'Female'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="address">
                  {isArabic ? 'العنوان' : 'Address'}
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  data-testid="textarea-address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyContact">
                    {isArabic ? 'جهة الاتصال للطوارئ' : 'Emergency Contact'}
                  </Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                    data-testid="input-emergency-contact"
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyPhone">
                    {isArabic ? 'هاتف الطوارئ' : 'Emergency Phone'}
                  </Label>
                  <Input
                    id="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                    data-testid="input-emergency-phone"
                  />
                </div>
              </div>

              <div>
                <Label>{isArabic ? 'الحساسيات' : 'Allergies'}</Label>
                <div className="space-y-2">
                  {formData.allergies.map((allergy, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={allergy}
                        onChange={(e) => updateAllergy(index, e.target.value)}
                        placeholder={isArabic ? 'أدخل الحساسية' : 'Enter allergy'}
                        data-testid={`input-allergy-${index}`}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => removeAllergy(index)}
                        data-testid={`button-remove-allergy-${index}`}
                      >
                        {isArabic ? 'إزالة' : 'Remove'}
                      </Button>
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addAllergy}
                    data-testid="button-add-allergy"
                  >
                    {isArabic ? 'إضافة حساسية' : 'Add Allergy'}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="medicalHistory">
                  {isArabic ? 'التاريخ الطبي' : 'Medical History'}
                </Label>
                <Textarea
                  id="medicalHistory"
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData(prev => ({ ...prev, medicalHistory: e.target.value }))}
                  data-testid="textarea-medical-history"
                />
              </div>

              <div>
                <Label htmlFor="notes">
                  {isArabic ? 'ملاحظات' : 'Notes'}
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  data-testid="textarea-notes"
                />
              </div>

              <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPatient.isPending}
                  data-testid="button-submit"
                >
                  {createPatient.isPending 
                    ? (isArabic ? 'جاري الحفظ...' : 'Saving...') 
                    : (isArabic ? 'حفظ' : 'Save')
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {isArabic ? 'قائمة المرضى' : 'Patient List'}
            </CardTitle>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isArabic ? 'البحث في المرضى...' : 'Search patients...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{isArabic ? 'الرقم المدني' : 'Civil ID'}</TableHead>
                  <TableHead>{isArabic ? 'الهاتف' : 'Phone'}</TableHead>
                  <TableHead>{isArabic ? 'تاريخ الميلاد' : 'Date of Birth'}</TableHead>
                  <TableHead>{isArabic ? 'الجنس' : 'Gender'}</TableHead>
                  <TableHead>{isArabic ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id} data-testid={`row-patient-${patient.id}`}>
                    <TableCell className="font-medium">
                      {patient.firstName} {patient.lastName}
                    </TableCell>
                    <TableCell>{patient.civilId || '-'}</TableCell>
                    <TableCell>{patient.phone}</TableCell>
                    <TableCell>{formatDate(patient.dateOfBirth || '')}</TableCell>
                    <TableCell>
                      {patient.gender && (
                        <Badge variant="secondary">
                          {patient.gender === 'MALE' 
                            ? (isArabic ? 'ذكر' : 'Male') 
                            : (isArabic ? 'أنثى' : 'Female')
                          }
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2 rtl:space-x-reverse">
                        <Button 
                          size="sm" 
                          variant="outline"
                          data-testid={`button-view-patient-${patient.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          data-testid={`button-edit-patient-${patient.id}`}
                        >
                          <Edit className="h-4 w-4" />
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
    </div>
  );
}