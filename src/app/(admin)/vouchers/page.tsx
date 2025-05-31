
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Ticket, PlusCircle, MoreHorizontal, Edit, Trash2, Percent, CalendarDays, XCircle, CheckCircle } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker"; // Assuming a simple date picker component exists or will be created
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Placeholder voucher data - in a real app, this would come from Appwrite
const placeholderVouchers = [
  { id: "1", code: "SUMMER20", discountPercent: 20, expiryDate: new Date(2024, 7, 31), status: "Active", uses: 15, maxUses: 100 },
  { id: "2", code: "WELCOME10", discountPercent: 10, expiryDate: new Date(2024, 11, 31), status: "Active", uses: 50, maxUses: null },
  { id: "3", code: "EXPIRED50", discountPercent: 50, expiryDate: new Date(2023, 0, 1), status: "Expired", uses: 5, maxUses: 5 },
  { id: "4", code: "LIMITED15", discountPercent: 15, expiryDate: new Date(2024, 6, 30), status: "Inactive", uses: 0, maxUses: 20 },
];

interface VoucherFormData {
  code: string;
  discountPercent: string; // string for form input
  expiryDate: Date | undefined;
  maxUses: string; // string for form input
}

export default function ManageVouchersPage() {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState(placeholderVouchers);
  const [formData, setFormData] = useState<VoucherFormData>({
    code: "",
    discountPercent: "",
    expiryDate: undefined,
    maxUses: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, expiryDate: date }));
  };
  
  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation (more robust validation with Zod would be better)
    if (!formData.code || !formData.discountPercent || !formData.expiryDate) {
      toast({ title: "Missing Fields", description: "Please fill in code, discount, and expiry date.", variant: "destructive" });
      return;
    }
    const newVoucher = {
      id: String(vouchers.length + 1 + Math.random()), // conceptual ID
      code: formData.code.toUpperCase(),
      discountPercent: parseInt(formData.discountPercent),
      expiryDate: formData.expiryDate,
      status: "Active",
      uses: 0,
      maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
    };
    // In a real app, this would be an API call to Appwrite
    setVouchers(prev => [newVoucher, ...prev]);
    toast({ title: "Voucher Created (Conceptual)", description: `Voucher ${newVoucher.code} added.`, className: "bg-green-100 border-green-300 text-green-800"});
    setFormData({ code: "", discountPercent: "", expiryDate: undefined, maxUses: "" }); // Reset form
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-semibold flex items-center">
          <Ticket className="mr-3 h-8 w-8 text-primary" /> Manage Vouchers
        </h1>
        <p className="text-muted-foreground mt-1">
          Create, view, and manage discount vouchers for EduVoice AI subscriptions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <PlusCircle className="mr-2 h-5 w-5 text-accent" /> Create New Voucher
          </CardTitle>
          <CardDescription>
            Define a new voucher code for users. Backend implementation needed for actual creation and validation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateVoucher} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="code">Voucher Code</Label>
              <Input id="code" name="code" placeholder="e.g., EDU25OFF" value={formData.code} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountPercent">Discount (%)</Label>
              <Input id="discountPercent" name="discountPercent" type="number" placeholder="e.g., 25" value={formData.discountPercent} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              {/* Replace with actual DatePicker component if available */}
               <Input 
                  id="expiryDate" 
                  name="expiryDate" 
                  type="date" 
                  value={formData.expiryDate ? format(formData.expiryDate, 'yyyy-MM-dd') : ""}
                  onChange={(e) => handleDateChange(e.target.value ? new Date(e.target.value) : undefined)}
                />
               {/* <DatePicker date={formData.expiryDate} onDateChange={handleDateChange} /> */}
            </div>
             <div className="space-y-2">
              <Label htmlFor="maxUses">Max Uses (Optional)</Label>
              <Input id="maxUses" name="maxUses" type="number" placeholder="e.g., 100" value={formData.maxUses} onChange={handleInputChange} />
            </div>
            <Button type="submit" className="w-full lg:col-span-4">Create Voucher</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl">Existing Vouchers</CardTitle>
          <CardDescription>
            List of all created vouchers. Status and usage tracking requires backend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead><Percent className="inline h-4 w-4 mr-1" /> Discount</TableHead>
                <TableHead><CalendarDays className="inline h-4 w-4 mr-1" /> Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Uses / Max</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map((voucher) => (
                <TableRow key={voucher.id}>
                  <TableCell className="font-medium">{voucher.code}</TableCell>
                  <TableCell>{voucher.discountPercent}%</TableCell>
                  <TableCell>{format(voucher.expiryDate, "PPP")}</TableCell>
                  <TableCell>
                     <Badge variant={voucher.status === "Active" ? "default" : voucher.status === "Expired" ? "destructive" : "secondary"}
                            className={voucher.status === "Active" ? "bg-green-500/20 text-green-700 border-green-500/30" : 
                                       voucher.status === "Expired" ? "bg-red-500/20 text-red-700 border-red-500/30" : 
                                       "bg-gray-500/20 text-gray-700 border-gray-500/30"}
                     >
                        {voucher.status === "Active" && <CheckCircle className="mr-1 h-3 w-3" />}
                        {voucher.status === "Expired" && <XCircle className="mr-1 h-3 w-3" />}
                        {voucher.status === "Inactive" && <XCircle className="mr-1 h-3 w-3" />}
                        {voucher.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{voucher.uses} / {voucher.maxUses || "∞"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {vouchers.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No vouchers created yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-destructive">
            Note: Voucher data is placeholder. Full creation, validation, usage tracking, and status updates require backend integration with Appwrite (e.g., database collections for vouchers and Appwrite Functions for logic).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Basic DatePicker component placeholder (replace with a real one if needed from shadcn/ui or other library)
// For now, using a simple input type="date"
// const DatePicker = ({ date, onDateChange }: { date: Date | undefined, onDateChange: (date?: Date) => void }) => {
//   return (
//     <Input 
//       type="date" 
//       value={date ? format(date, 'yyyy-MM-dd') : ""}
//       onChange={(e) => onDateChange(e.target.value ? new Date(e.target.value) : undefined)}
//     />
//   );
// };
