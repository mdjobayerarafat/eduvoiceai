
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Ticket, PlusCircle, MoreHorizontal, Edit, Trash2, Percent, CalendarDays, XCircle, CheckCircle, Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { account, databases, ID, Permission, Role, APPWRITE_DATABASE_ID, VOUCHERS_COLLECTION_ID, AppwriteException } from "@/lib/appwrite";
import type { Voucher } from "@/types/voucher";

interface VoucherFormData {
  code: string;
  discountPercent: string;
  expiryDate: string; // Store as yyyy-MM-dd string for input
  maxUses: string; 
}

// Function to determine voucher status based on expiry date and maxUses
const getVoucherStatus = (voucher: Voucher): "Active" | "Expired" | "Inactive" | "Used Up" => {
    if (voucher.status === "Inactive") return "Inactive"; // If explicitly inactive
    if (new Date(voucher.expiryDate) < new Date()) return "Expired";
    if (voucher.maxUses !== null && voucher.uses >= voucher.maxUses) return "Used Up";
    return "Active";
};


export default function ManageVouchersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<VoucherFormData>({
    code: "",
    discountPercent: "",
    expiryDate: "",
    maxUses: "",
  });

  useEffect(() => {
    const fetchVouchersAndCheckAdmin = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const currentUser = await account.get();
        if (!currentUser.labels || !currentUser.labels.includes("admin")) {
          router.push("/dashboard");
          return;
        }

        if (!APPWRITE_DATABASE_ID || !VOUCHERS_COLLECTION_ID) {
          throw new Error("Voucher collection configuration is missing.");
        }

        const response = await databases.listDocuments(APPWRITE_DATABASE_ID, VOUCHERS_COLLECTION_ID);
        setVouchers(response.documents as Voucher[]);
      } catch (err: any) {
        console.error("Error fetching vouchers or admin check:", err);
        let specificError = "Failed to load voucher data. You may not have permissions or there was a server issue.";
        if (err instanceof AppwriteException) {
            specificError = `Appwrite Error: ${err.message}.`;
        } else if (err instanceof Error) {
            specificError = err.message;
        }
        setError(specificError);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVouchersAndCheckAdmin();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.discountPercent || !formData.expiryDate) {
      toast({ title: "Missing Fields", description: "Please fill in code, discount, and expiry date.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const currentUser = await account.get(); // For user ID for permissions
       if (!APPWRITE_DATABASE_ID || !VOUCHERS_COLLECTION_ID) {
        throw new Error("Voucher collection configuration is missing for creation.");
      }

      const newVoucherData: Omit<Voucher, keyof Models.Document | '$databaseId' | '$collectionId' | '$permissions' | 'status' | 'uses'> = {
        code: formData.code.toUpperCase(),
        discountPercent: parseInt(formData.discountPercent),
        expiryDate: new Date(formData.expiryDate).toISOString(), // Store as ISO string
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
      };
      
      // Add status and uses for new voucher
      const fullNewVoucher = {
        ...newVoucherData,
        status: "Active" as "Active", // Set initial status
        uses: 0,
      }

      const createdDocument = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        VOUCHERS_COLLECTION_ID,
        ID.unique(),
        fullNewVoucher,
        [
          Permission.read(Role.any()), // Or Role.users() if only logged-in users can see/use vouchers
          Permission.update(Role.team("admins")), // Assuming an "admins" team
          Permission.delete(Role.team("admins"))
        ]
      );
      
      setVouchers(prev => [createdDocument as Voucher, ...prev]);
      toast({ title: "Voucher Created", description: `Voucher ${createdDocument.code} added.`, className: "bg-green-100 border-green-300 text-green-800"});
      setFormData({ code: "", discountPercent: "", expiryDate: "", maxUses: "" }); // Reset form
    } catch (err: any) {
      console.error("Error creating voucher:", err);
      let specificError = "Failed to create voucher.";
       if (err instanceof AppwriteException) {
            specificError = `Appwrite Error: ${err.message}. Ensure 'vouchers' collection exists and has correct permissions.`;
        } else if (err instanceof Error) {
            specificError = err.message;
        }
      toast({ title: "Creation Failed", description: specificError, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteVoucher = async (voucherId: string, voucherCode: string) => {
     if (!confirm(`Are you sure you want to delete voucher "${voucherCode}"? This action cannot be undone.`)) {
        return;
    }
    try {
        if (!APPWRITE_DATABASE_ID || !VOUCHERS_COLLECTION_ID) {
            throw new Error("Voucher collection configuration is missing for deletion.");
        }
        await databases.deleteDocument(APPWRITE_DATABASE_ID, VOUCHERS_COLLECTION_ID, voucherId);
        setVouchers(prev => prev.filter(v => v.$id !== voucherId));
        toast({ title: "Voucher Deleted", description: `Voucher ${voucherCode} has been deleted.`, className: "bg-red-100 border-red-300 text-red-800" });
    } catch (err:any) {
        console.error("Error deleting voucher:", err);
        toast({ title: "Deletion Failed", description: err.message || "Could not delete voucher.", variant: "destructive" });
    }
  };


  if (isLoading && !error) { // Show loading only if no error yet
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading Voucher Management...</p>
      </div>
    );
  }

  if (error) {
     return (
      <div className="space-y-8 p-4">
         <h1 className="font-headline text-3xl font-semibold flex items-center">
          <Ticket className="mr-3 h-8 w-8 text-destructive" /> Manage Vouchers Error
        </h1>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/> Data Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">{error}</p>
            <Button onClick={() => router.push('/admindashboard')} variant="outline" className="mt-4">Back to Admin Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            Define a new voucher code. Ensure your Appwrite 'vouchers' collection is set up with appropriate attributes (code, discountPercent, expiryDate, maxUses, uses, status) and permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateVoucher} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="code">Voucher Code</Label>
              <Input id="code" name="code" placeholder="e.g., EDU25OFF" value={formData.code} onChange={handleInputChange} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountPercent">Discount (%)</Label>
              <Input id="discountPercent" name="discountPercent" type="number" placeholder="e.g., 25" value={formData.discountPercent} onChange={handleInputChange} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
               <Input 
                  id="expiryDate" 
                  name="expiryDate" 
                  type="date" 
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                />
            </div>
             <div className="space-y-2">
              <Label htmlFor="maxUses">Max Uses (Optional)</Label>
              <Input id="maxUses" name="maxUses" type="number" placeholder="e.g., 100" value={formData.maxUses} onChange={handleInputChange} disabled={isSubmitting} />
            </div>
            <Button type="submit" className="w-full lg:col-span-4" disabled={isSubmitting || isLoading}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Voucher"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl">Existing Vouchers ({vouchers.length})</CardTitle>
          <CardDescription>
            List of all created vouchers. Status is determined by expiry date and usage.
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
              {vouchers.map((voucher) => {
                const status = getVoucherStatus(voucher);
                return (
                <TableRow key={voucher.$id}>
                  <TableCell className="font-medium">{voucher.code}</TableCell>
                  <TableCell>{voucher.discountPercent}%</TableCell>
                  <TableCell>{format(parseISO(voucher.expiryDate), "PPP")}</TableCell>
                  <TableCell>
                     <Badge variant={status === "Active" ? "default" : (status === "Expired" || status === "Used Up") ? "destructive" : "secondary"}
                            className={status === "Active" ? "bg-green-500/20 text-green-700 border-green-500/30" : 
                                       (status === "Expired" || status === "Used Up") ? "bg-red-500/20 text-red-700 border-red-500/30" : 
                                       "bg-gray-500/20 text-gray-700 border-gray-500/30"}
                     >
                        {status === "Active" && <CheckCircle className="mr-1 h-3 w-3" />}
                        {(status === "Expired" || status === "Used Up" || status === "Inactive") && <XCircle className="mr-1 h-3 w-3" />}
                        {status}
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
                        <DropdownMenuItem onClick={() => alert("Edit voucher: Functionality to be implemented. This would typically involve a modal/form pre-filled with voucher data and an Appwrite updateDocument call.")}>
                          <Edit className="mr-2 h-4 w-4" /> Edit (Conceptual)
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleDeleteVoucher(voucher.$id, voucher.code)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
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
            Note: Voucher data is fetched from Appwrite. Create and Delete actions interact with Appwrite. Edit is conceptual. Ensure your Appwrite setup and permissions allow these operations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
