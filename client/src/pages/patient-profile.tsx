import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Edit, Phone, Mail, Calendar, MapPin, AlertTriangle } from "lucide-react";
import { PatientForm } from "@/components/patient-form";
import { PatientFiles } from "@/components/patient-files";
import { apiRequest } from "@/lib/queryClient";
import type { Patient, Visit, Invoice } from "@shared/schema";

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  if (!id) {
    return <div>Patient ID not found</div>;
  }

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ["/api/patients", id],
    queryFn: () => apiRequest(`/api/patients/${id}`),
  });

  const { data: visits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ["/api/visits", "patient", id],
    queryFn: () => apiRequest(`/api/visits?patient=${id}`),
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices", "patient", id],
    queryFn: () => apiRequest(`/api/invoices?patient=${id}`),
  });

  if (patientLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!patient) {
    return <div>Patient not found</div>;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="patient-profile">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patients
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-2xl font-bold" data-testid="text-patient-name">
          {patient.firstName} {patient.lastName}
        </h1>
        <Badge variant="secondary" data-testid="badge-patient-id">
          ID: {patient.civilId || patient.id}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Patient Summary Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Patient Info</CardTitle>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" data-testid="button-edit-patient">
                  <Edit className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Patient</DialogTitle>
                </DialogHeader>
                <PatientForm 
                  patient={patient} 
                  onSuccess={() => setIsEditOpen(false)}
                  onCancel={() => setIsEditOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span data-testid="text-patient-phone">{patient.phone}</span>
              </div>
              
              {patient.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span data-testid="text-patient-email">{patient.email}</span>
                </div>
              )}
              
              {patient.dateOfBirth && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span data-testid="text-patient-dob">
                    {formatDate(patient.dateOfBirth)} ({calculateAge(patient.dateOfBirth)} years)
                  </span>
                </div>
              )}
              
              {patient.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span data-testid="text-patient-address">{patient.address}</span>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Basic Info</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Civil ID:</span>
                  <span data-testid="text-patient-civil-id">{patient.civilId || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gender:</span>
                  <span data-testid="text-patient-gender">{patient.gender || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active:</span>
                  <Badge variant={patient.isActive ? "default" : "secondary"} data-testid="badge-patient-status">
                    {patient.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            {patient.emergencyContact && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Emergency Contact</h4>
                  <div className="space-y-1 text-sm">
                    <div data-testid="text-emergency-contact">{patient.emergencyContact}</div>
                    {patient.emergencyPhone && (
                      <div className="text-muted-foreground" data-testid="text-emergency-phone">
                        {patient.emergencyPhone}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {patient.allergies && patient.allergies.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Allergies
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {patient.allergies.map((allergy, index) => (
                      <Badge key={index} variant="destructive" className="text-xs" data-testid={`allergy-${index}`}>
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
              <TabsTrigger value="visits" data-testid="tab-visits">Visits</TabsTrigger>
              <TabsTrigger value="files" data-testid="tab-files">Files</TabsTrigger>
              <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-6">
              <div className="grid gap-6">
                {patient.medicalHistory && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Medical History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-medical-history">
                        {patient.medicalHistory}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {patient.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-notes">
                        {patient.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600" data-testid="stat-visits-count">
                          {visits.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Visits</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600" data-testid="stat-invoices-count">
                          {invoices.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Invoices</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600" data-testid="stat-last-visit">
                          {visits.length > 0 ? formatDate(visits[0]?.visitDate) : "Never"}
                        </div>
                        <div className="text-sm text-muted-foreground">Last Visit</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="visits" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Visit History</CardTitle>
                </CardHeader>
                <CardContent>
                  {visitsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : visits.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No visits recorded yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {visits.map((visit: Visit) => (
                        <Card key={visit.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold" data-testid={`visit-date-${visit.id}`}>
                                  {formatDate(visit.visitDate)}
                                </h4>
                                <Badge variant="secondary" data-testid={`visit-status-${visit.id}`}>
                                  {visit.status}
                                </Badge>
                              </div>
                              {visit.totalAmount && (
                                <div className="text-right">
                                  <div className="font-semibold" data-testid={`visit-amount-${visit.id}`}>
                                    ${visit.totalAmount}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {visit.chiefComplaint && (
                              <div className="mb-2">
                                <span className="font-medium">Chief Complaint: </span>
                                <span data-testid={`visit-complaint-${visit.id}`}>{visit.chiefComplaint}</span>
                              </div>
                            )}
                            
                            {visit.diagnosis && (
                              <div className="mb-2">
                                <span className="font-medium">Diagnosis: </span>
                                <span data-testid={`visit-diagnosis-${visit.id}`}>{visit.diagnosis}</span>
                              </div>
                            )}
                            
                            {visit.treatment && (
                              <div className="mb-2">
                                <span className="font-medium">Treatment: </span>
                                <span data-testid={`visit-treatment-${visit.id}`}>{visit.treatment}</span>
                              </div>
                            )}

                            {visit.notes && (
                              <div className="text-sm text-muted-foreground" data-testid={`visit-notes-${visit.id}`}>
                                {visit.notes}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files" className="mt-6">
              <PatientFiles patientId={id} />
            </TabsContent>

            <TabsContent value="invoices" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Invoice History</CardTitle>
                </CardHeader>
                <CardContent>
                  {invoicesLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No invoices found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {invoices.map((invoice: Invoice) => (
                        <Card key={invoice.id} className="border-l-4 border-l-green-500">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold" data-testid={`invoice-number-${invoice.id}`}>
                                  Invoice #{invoice.invoiceNumber}
                                </h4>
                                <p className="text-sm text-muted-foreground" data-testid={`invoice-date-${invoice.id}`}>
                                  {formatDate(invoice.issueDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-lg" data-testid={`invoice-total-${invoice.id}`}>
                                  ${invoice.totalAmount}
                                </div>
                                <Badge 
                                  variant={invoice.paymentStatus === "PAID" ? "default" : 
                                           invoice.paymentStatus === "PARTIAL" ? "secondary" : "destructive"}
                                  data-testid={`invoice-status-${invoice.id}`}
                                >
                                  {invoice.paymentStatus}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">Subtotal: </span>
                                <span data-testid={`invoice-subtotal-${invoice.id}`}>${invoice.subtotal}</span>
                              </div>
                              <div>
                                <span className="font-medium">Paid: </span>
                                <span data-testid={`invoice-paid-${invoice.id}`}>${invoice.paidAmount}</span>
                              </div>
                              {invoice.taxAmount > 0 && (
                                <div>
                                  <span className="font-medium">Tax: </span>
                                  <span data-testid={`invoice-tax-${invoice.id}`}>${invoice.taxAmount}</span>
                                </div>
                              )}
                              {invoice.discountAmount > 0 && (
                                <div>
                                  <span className="font-medium">Discount: </span>
                                  <span data-testid={`invoice-discount-${invoice.id}`}>-${invoice.discountAmount}</span>
                                </div>
                              )}
                            </div>

                            {invoice.notes && (
                              <div className="mt-2 text-sm text-muted-foreground" data-testid={`invoice-notes-${invoice.id}`}>
                                {invoice.notes}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}