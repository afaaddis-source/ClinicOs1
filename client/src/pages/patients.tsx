import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye } from "lucide-react";
import { PatientForm } from "@/components/patient-form";
import { apiRequest } from "@/lib/queryClient";
import type { Patient } from "@shared/schema";

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["/api/patients", searchTerm],
    queryFn: async () => {
      const url = searchTerm 
        ? `/api/patients?search=${encodeURIComponent(searchTerm)}`
        : "/api/patients";
      const response = await apiRequest(url);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
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
            Patients
          </h1>
          <p className="text-muted-foreground">
            Manage patient records and information
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-patient">
              <Plus className="mr-2 h-4 w-4" />
              Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Patient</DialogTitle>
            </DialogHeader>
            <PatientForm onSuccess={() => setIsCreateOpen(false)} onCancel={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Patient List</CardTitle>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
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
                  <TableHead>Name</TableHead>
                  <TableHead>Civil ID</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
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
                      {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "N/A"}
                    </TableCell>
                    <TableCell data-testid={`patient-gender-${patient.id}`}>
                      {patient.gender || "N/A"}
                    </TableCell>
                    <TableCell data-testid={`patient-status-${patient.id}`}>
                      <Badge variant={patient.isActive ? "default" : "secondary"}>
                        {patient.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/patients/${patient.id}`}>
                        <Button size="sm" variant="outline" data-testid={`button-view-${patient.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
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