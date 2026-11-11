import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import * as z from "zod";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BASE_URL from "@/config/BaseUrl";
import { useToast } from "@/hooks/use-toast";
import Page from "@/app/dashboard/page";

const retailerTypes = [
  { value: "Retailer", label: "Retailer" },
  { value: "Wholesaler", label: "Wholesaler" },
  { value: "Distributor", label: "Distributor" },
  { value: "Individual", label: "Individual" },
];

const retailerSchema = z.object({
  customer_name: z.string()
    .trim()
    .min(1, "Retailer name is required")
    .regex(/^[A-Za-z ]+$/, "Only letters and spaces allowed"),
  company_code: z.string()
    .trim()
    .min(1, "Retailer code is required")
    .regex(/^[A-Za-z0-9]+$/, "Only letters and numbers allowed"),
  customer_type: z.string()
    .trim()
    .min(1, "Please select a type"),
  company_gst: z.string().trim().optional().or(z.literal("")),
  customer_group: z.string()
    .trim()
    .min(1, "Group is required"),
  customer_transport: z.string()
    .trim()
    .min(1, "Transport is required"),
  customer_referred_by: z.string().optional().or(z.literal("")),
  customer_remarks: z.string().optional().or(z.literal("")),
  customer_mobile: z.string()
    .trim()
    .min(1, "Mobile number is required")
    .regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  customer_email: z.string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Invalid email format",
    }),
  customer_address: z.string().optional().or(z.literal("")),
  customer_pincode: z.string()
    .trim()
    .min(1, "Pincode is required")
    .regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  customer_markdown: z.string().optional().or(z.literal("")),
  customer_discount: z.string().optional().or(z.literal("")),
  customer_incentive: z.string().optional().or(z.literal("")),
  customer_days_of_payment: z.string().optional().or(z.literal("")),
  company_prefix: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.customer_type !== "Individual") {
    if (!data.company_gst || data.company_gst.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GST number is required",
        path: ["company_gst"],
      });
    } else if (!/^[A-Za-z0-9]+$/.test(data.company_gst)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only letters and numbers allowed",
        path: ["company_gst"],
      });
    }
  } else if (data.company_gst && data.company_gst.trim() !== "") {
    if (!/^[A-Za-z0-9]+$/.test(data.company_gst)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only letters and numbers allowed",
        path: ["company_gst"],
      });
    }
  }
});

const AddRetailer = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [customer, setCustomer] = useState({
    customer_name: "",
    customer_type: "",
    customer_mobile: "",
    customer_email: "",
    customer_address: "",
    customer_pincode: "",
    company_prefix: "",
    company_code: "",
    company_gst: "",
    customer_group: "",
    customer_referred_by: "",
    customer_transport: "",
    customer_markdown: "",
    customer_discount: "",
    customer_incentive: "",
    customer_days_of_payment: "",
    customer_remarks: "",
  });

  const createRetailerMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios({
        url: `${BASE_URL}/api/create-customer`,
        method: "POST",
        data,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.code === 200) {
        toast({
          title: "Success",
          description: `${data.msg}`,
        });
        resetForm();
        navigate("/master/retailer");
      } else {
        throw new Error(data.msg || "Duplicate Entry");
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.msg?.includes("duplicate") 
          ? "Duplicate entry" 
          : "Error creating retailer",
      });
    },
  });

  const resetForm = () => {
    setCustomer({
      customer_name: "",
      customer_type: "",
      customer_mobile: "",
      customer_email: "",
      customer_address: "",
      customer_pincode: "",
      company_prefix: "",
      company_code: "",
      company_gst: "",
      customer_group: "",
      customer_referred_by: "",
      customer_transport: "",
      customer_markdown: "",
      customer_discount: "",
      customer_incentive: "",
      customer_days_of_payment: "",
      customer_remarks: "",
    });
    setErrors({});
  };

  const onInputChange = (e) => {
    const { name, value } = e.target;
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (name === "customer_mobile") {
      if (/^\d*$/.test(value) && value.length <= 10) {
        setCustomer((prev) => ({ ...prev, [name]: value }));
      }
    } else if (name === "customer_pincode") {
      if (/^\d*$/.test(value) && value.length <= 6) {
        setCustomer((prev) => ({ ...prev, [name]: value }));
      }
    } else if (
      name === "customer_markdown" ||
      name === "customer_discount" ||
      name === "customer_incentive"
    ) {
      if (/^\d*\.?\d*$/.test(value)) {
        setCustomer((prev) => ({ ...prev, [name]: value }));
      }
    } else if (name === "customer_days_of_payment") {
      if (/^\d*$/.test(value)) {
        setCustomer((prev) => ({ ...prev, [name]: value }));
      }
    } else {
      setCustomer((prev) => ({ ...prev, [name]: value }));
    }
  };

  const onSelectChange = (name, value) => {
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (name === "customer_type" && value === "Individual" && errors.company_gst) {
      setErrors((prev) => ({ ...prev, company_gst: null }));
    }
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    try {
      const validatedData = retailerSchema.parse(customer);
      createRetailerMutation.mutate(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0]] = err.message;
          }
        });
        setErrors(fieldErrors);

        // Auto-focus on the first field with an error
        const firstErrorField = error.errors[0]?.path[0];
        if (firstErrorField) {
          if (firstErrorField === "customer_type") {
            const firstTypeBtn = document.querySelector("#type-selection-group button");
            if (firstTypeBtn) {
              firstTypeBtn.focus();
              firstTypeBtn.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          } else {
            const el =
              document.getElementById(firstErrorField) ||
              document.querySelector(`[name="${firstErrorField}"]`);
            if (el) {
              el.focus();
              el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }
        }

        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0]?.message || "Please fill all required fields",
        });
      }
    }
  };

  return (
    <Page>
      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-stone-800 tracking-tight">
              Create Retailer
            </h1>
            <p className="text-xs md:text-sm text-stone-500 font-medium">
              Register a new retail store, wholesaler, or distribution client
            </p>
          </div>
          <Link to="/master/retailer">
            <Button variant="outline" className="border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl gap-2 shadow-2xs">
              <ArrowLeft className="h-4 w-4" /> Back to Retailers
            </Button>
          </Link>
        </div>

        <Card className="rounded-2xl border border-stone-200/80 bg-white shadow-xs overflow-hidden">
          <CardHeader className="bg-[#FBF9F5] border-b border-stone-200/80 px-6 py-4">
            <CardTitle className="font-heading text-lg font-bold text-stone-800">
              Retailer Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Retailer Name Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="customer_name" className="text-xs font-semibold text-stone-700">
                    Retailer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customer_name"
                    name="customer_name"
                    value={customer.customer_name}
                    onChange={onInputChange}
                    placeholder="Enter retailer name"
                    className={`bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800 ${
                      errors.customer_name ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                  {errors.customer_name && (
                    <p className="text-xs text-destructive">{errors.customer_name}</p>
                  )}
                </div>

                {/* Retailer Code Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="company_code" className="text-xs font-semibold text-stone-700">
                    Retailer Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company_code"
                    name="company_code"
                    value={customer.company_code}
                    onChange={onInputChange}
                    placeholder="Enter retailer code"
                    className={`bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800 uppercase ${
                      errors.company_code ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                  {errors.company_code && (
                    <p className="text-xs text-destructive">{errors.company_code}</p>
                  )}
                </div>

                {/* Type Field - Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-stone-700">Customer Type <span className="text-red-500">*</span></Label>
                  <div id="type-selection-group" className="flex flex-wrap gap-2 pt-1">
                    {retailerTypes.map((type) => {
                      const isSelected = customer.customer_type === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => onSelectChange("customer_type", type.value)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all duration-150 ${
                            isSelected
                              ? "bg-[#A27B5C] text-white border-[#A27B5C] shadow-sm font-semibold ring-2 ring-[#A27B5C]/20"
                              : errors.customer_type
                              ? "border-destructive text-destructive bg-destructive/10 hover:bg-destructive/20"
                              : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                          }`}
                        >
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.customer_type && (
                    <p className="text-xs text-destructive">{errors.customer_type}</p>
                  )}
                </div>

                {/* GST Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="company_gst" className="text-xs font-semibold text-stone-700">
                    GST Number {customer.customer_type !== "Individual" && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="company_gst"
                    name="company_gst"
                    value={customer.company_gst}
                    onChange={onInputChange}
                    placeholder={customer.customer_type === "Individual" ? "Enter GST number " : "Enter GST number"}
                    className={`bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800 uppercase ${
                      errors.company_gst ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                  {errors.company_gst && (
                    <p className="text-xs text-destructive">{errors.company_gst}</p>
                  )}
                </div>

                {/* Group, Transport & Referred By in 12-col grid */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Group Field */}
                  <div className="space-y-1.5 md:col-span-4">
                    <Label htmlFor="customer_group" className="text-xs font-semibold text-stone-700">
                      Group <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="customer_group"
                      name="customer_group"
                      value={customer.customer_group}
                      onChange={onInputChange}
                      placeholder="Enter group"
                      className={`bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800 ${
                        errors.customer_group ? "border-destructive focus-visible:ring-destructive" : ""
                      }`}
                    />
                    {errors.customer_group && (
                      <p className="text-xs text-destructive">{errors.customer_group}</p>
                    )}
                  </div>

                  {/* Transport Field */}
                  <div className="space-y-1.5 md:col-span-4">
                    <Label htmlFor="customer_transport" className="text-xs font-semibold text-stone-700">
                      Transport <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="customer_transport"
                      name="customer_transport"
                      value={customer.customer_transport}
                      onChange={onInputChange}
                      placeholder="Enter transport"
                      className={`bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800 ${
                        errors.customer_transport ? "border-destructive focus-visible:ring-destructive" : ""
                      }`}
                    />
                    {errors.customer_transport && (
                      <p className="text-xs text-destructive">{errors.customer_transport}</p>
                    )}
                  </div>

                  {/* Referred By Field */}
                  <div className="space-y-1.5 md:col-span-4">
                    <Label htmlFor="customer_referred_by" className="text-xs font-semibold text-stone-700">
                      Referred By
                    </Label>
                    <Input
                      id="customer_referred_by"
                      name="customer_referred_by"
                      value={customer.customer_referred_by}
                      onChange={onInputChange}
                      placeholder="Enter referred by"
                      className={`bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800 ${
                        errors.customer_referred_by ? "border-destructive focus-visible:ring-destructive" : ""
                      }`}
                    />
                    {errors.customer_referred_by && (
                      <p className="text-xs text-destructive">{errors.customer_referred_by}</p>
                    )}
                  </div>
                </div>

                {/* Mobile Number, Email, Pincode & Complete Address */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Mobile Number Field */}
                  <div className="space-y-1.5 md:col-span-4">
                    <Label htmlFor="customer_mobile" className="text-xs font-semibold text-stone-700">
                      Mobile Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="customer_mobile"
                      name="customer_mobile"
                      value={customer.customer_mobile}
                      onChange={onInputChange}
                      placeholder="10-digit mobile"
                      maxLength={10}
                      className={`bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800 ${
                        errors.customer_mobile ? "border-destructive focus-visible:ring-destructive" : ""
                      }`}
                    />
                    {errors.customer_mobile && (
                      <p className="text-xs text-destructive">{errors.customer_mobile}</p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div className="space-y-1.5 md:col-span-4">
                    <Label htmlFor="customer_email" className="text-xs font-semibold text-stone-700">
                      Email Address
                    </Label>
                    <Input
                      id="customer_email"
                      name="customer_email"
                      type="email"
                      value={customer.customer_email}
                      onChange={onInputChange}
                      placeholder="Enter email address"
                      className={`bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800 ${
                        errors.customer_email ? "border-destructive focus-visible:ring-destructive" : ""
                      }`}
                    />
                    {errors.customer_email && (
                      <p className="text-xs text-destructive">{errors.customer_email}</p>
                    )}
                  </div>

                  {/* Pincode Field */}
                  <div className="space-y-1.5 md:col-span-4">
                    <Label htmlFor="customer_pincode" className="text-xs font-semibold text-stone-700">
                      Pincode <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="customer_pincode"
                      name="customer_pincode"
                      value={customer.customer_pincode}
                      onChange={onInputChange}
                      placeholder="6-digit pincode"
                      maxLength={6}
                      className={`bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800 ${
                        errors.customer_pincode ? "border-destructive focus-visible:ring-destructive" : ""
                      }`}
                    />
                    {errors.customer_pincode && (
                      <p className="text-xs text-destructive">{errors.customer_pincode}</p>
                    )}
                  </div>

                  {/* Complete Address Field */}
                  <div className="space-y-1.5 md:col-span-12">
                    <Label htmlFor="customer_address" className="text-xs font-semibold text-stone-700">
                      Complete Address
                    </Label>
                    <Input
                      id="customer_address"
                      name="customer_address"
                      value={customer.customer_address}
                      onChange={onInputChange}
                      placeholder="Enter complete address"
                      className="bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800"
                    />
                  </div>
                </div>

                {/* Commercial Terms: Markdown, Discount, Incentive, Days of Payment */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {/* Markdown */}
                  <div className="space-y-1.5">
                    <Label htmlFor="customer_markdown" className="text-xs font-semibold text-stone-700">
                      Markdown (%)
                    </Label>
                    <Input
                      id="customer_markdown"
                      name="customer_markdown"
                      value={customer.customer_markdown}
                      onChange={onInputChange}
                      placeholder="e.g. 10"
                      className="bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800"
                    />
                  </div>

                  {/* Discount */}
                  <div className="space-y-1.5">
                    <Label htmlFor="customer_discount" className="text-xs font-semibold text-stone-700">
                      Discount (%)
                    </Label>
                    <Input
                      id="customer_discount"
                      name="customer_discount"
                      value={customer.customer_discount}
                      onChange={onInputChange}
                      placeholder="e.g. 5"
                      className="bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800"
                    />
                  </div>

                  {/* Incentive */}
                  <div className="space-y-1.5">
                    <Label htmlFor="customer_incentive" className="text-xs font-semibold text-stone-700">
                      Incentive (%)
                    </Label>
                    <Input
                      id="customer_incentive"
                      name="customer_incentive"
                      value={customer.customer_incentive}
                      onChange={onInputChange}
                      placeholder="e.g. 2"
                      className="bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800"
                    />
                  </div>

                  {/* Days of Payment */}
                  <div className="space-y-1.5">
                    <Label htmlFor="customer_days_of_payment" className="text-xs font-semibold text-stone-700">
                      Days of Payment
                    </Label>
                    <Input
                      id="customer_days_of_payment"
                      name="customer_days_of_payment"
                      value={customer.customer_days_of_payment}
                      onChange={onInputChange}
                      placeholder="e.g. 30"
                      className="bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800"
                    />
                  </div>
                </div>

                {/* Remarks Field */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="customer_remarks" className="text-xs font-semibold text-stone-700">Remarks / Notes</Label>
                  <Textarea
                    id="customer_remarks"
                    name="customer_remarks"
                    value={customer.customer_remarks}
                    onChange={onInputChange}
                    placeholder="Enter additional remarks or payment instructions..."
                    rows={3}
                    className={`bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800 ${
                      errors.customer_remarks ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                  {errors.customer_remarks && (
                    <p className="text-xs text-destructive">{errors.customer_remarks}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <Link to="/master/retailer">
                  <Button variant="outline" className="border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl px-5">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={createRetailerMutation.isPending}
                  className="bg-[#A27B5C] hover:bg-[#8C6547] text-white shadow-sm rounded-xl font-medium px-6 py-2.5 gap-2"
                >
                  {createRetailerMutation.isPending ? (
                    <>
                      <Send className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Create Retailer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
};

export default AddRetailer;