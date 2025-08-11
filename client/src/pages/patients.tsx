import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Loader2 } from "lucide-react";
import { PatientForm } from "@/components/patient-form";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/components/language-provider";
import type { Patient } from "@shared/schema";

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();
  const isArabic = language === 'ar';

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Setting debounced search term:', searchTerm);
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: patients = [], isLoading, error, refetch } = useQuery({
    queryKey: ["/api/patients", debouncedSearchTerm],
    queryFn: async () => {
      const url = debouncedSearchTerm.trim()
        ? `/api/patients?search=${encodeURIComponent(debouncedSearchTerm.trim())}`
        : "/api/patients";
      
      console.log('Making request to:', url);
      const response = await apiRequest(url);
      
      if (!response.ok) {
        console.error('API request failed:', response.status, response.statusText);
        throw new Error('Failed to fetch patients');
      }
      
      const data = await response.json();
      console.log('Search term:', debouncedSearchTerm);
      console.log('Search results:', data);
      console.log('Number of results:', data.length);
      return Array.isArray(data) ? data : [];
    },
    enabled: true,
    staleTime: 5000, // 5 seconds
    gcTime: 10000, // 10 seconds (was cacheTime in v4)
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6" data-testid="patients-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-patients-title">
            {isArabic ? 'المرضى' : 'Patients'}
          </h1>
          <p className="text-muted-foreground">
            {isArabic ? 'إدارة سجلات ومعلومات المرضى' : 'Manage patient records and information'}
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-patient">
              <Plus className="mr-2 h-4 w-4" />
              {isArabic ? 'إضافة مريض' : 'Add Patient'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isArabic ? 'إضافة مريض جديد' : 'Add New Patient'}</DialogTitle>
            </DialogHeader>
            <PatientForm onSuccess={() => setIsCreateOpen(false)} onCancel={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{isArabic ? 'قائمة المرضى' : 'Patient List'}</CardTitle>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isArabic ? 'البحث في المرضى...' : 'Search patients...'}
                value={searchTerm}
                onChange={(e) => {
                  console.log('Search input changed:', e.target.value);
                  setSearchTerm(e.target.value);
                }}
                className="w-64"
                data-testid="input-search"
                dir={isArabic ? 'rtl' : 'ltr'}
              />
              {searchTerm !== debouncedSearchTerm && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {debouncedSearchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedSearchTerm('');
                  }}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="flex justify-center p-8 text-red-500">
              {isArabic ? 'خطأ في تحميل المرضى' : 'Error loading patients'}
            </div>
          ) : patients.length === 0 ? (
            <div className="flex justify-center p-8 text-muted-foreground">
              {debouncedSearchTerm 
                ? (isArabic ? 'لا توجد نتائج للبحث' : 'No search results found')
                : (isArabic ? 'لا يوجد مرضى' : 'No patients found')
              }
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
                  <TableHead>{isArabic ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{isArabic ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient: Patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium" data-testid={`patient-name-${patient.id}`}>
                      {patient.firstName} {patient.lastName}
                    </TableCell>
                    <TableCell data-testid={`patient-civil-id-${patient.id}`}>
                      {patient.civilId || "N/A"}
                    </TableCell>
                    <TableCell data-testid={`patient-phone-${patient.id}`}>
                      {patient.phone}
                    </TableCell>
                    <TableCell data-testid={`patient-dob-${patient.id}`}>
                      {patient.dateOfBirth ? formatDate(patient.dateOfBirth.toString()) : "N/A"}
                    </TableCell>
                    <TableCell data-testid={`patient-gender-${patient.id}`}>
                      {patient.gender || "N/A"}
                    </TableCell>
                    <TableCell data-testid={`patient-status-${patient.id}`}>
                      <Badge variant={patient.isActive ? "default" : "secondary"}>
                        {patient.isActive 
                          ? (isArabic ? "نشط" : "Active") 
                          : (isArabic ? "غير نشط" : "Inactive")
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/patients/${patient.id}`}>
                        <Button size="sm" variant="outline" data-testid={`button-view-${patient.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          {isArabic ? 'عرض' : 'View'}
                        </Button>
                      </Link>
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