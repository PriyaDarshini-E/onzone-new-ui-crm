import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";

import {
  Trash2,
  ChevronLeft,
  Plus,
  Minus,
  Loader2,
  Camera,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

import Select from "react-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import BASE_URL from "@/config/BaseUrl";
import Page from "../dashboard/page";
import { getTodayDate } from "@/utils/currentDate";
import dateyear from "@/utils/DateYear";
import { useFetchFactory } from "@/hooks/useApi";
import { LoaderComponent } from "@/components/LoaderComponent/LoaderComponent";
import ScannerModel from "@/components/ScannerModel";

// ---------- Validation Schema (unchanged) ----------
const orderSchema = z.object({
  work_order_rc_year: z.string(),
  work_order_rc_date: z.string().min(1, "Date is required"),
  work_order_rc_id: z.number().min(1, "Work Order ID is required"),
  work_order_rc_dc_no: z.string().min(1, "DC No is required"),
  work_order_rc_dc_date: z.string().min(1, "DC Date is required"),
  work_order_rc_brand: z.string().min(1, "Brand is required"),
  work_order_rc_box: z.string().min(1, "Box count is required"),
  work_order_rc_pcs: z.string().min(1, "Pieces count is required"),
  work_order_rc_received_by: z.string().optional(),
  work_order_rc_fabric_received: z
    .string()
    .min(1, "Fabric received is required"),
  work_order_rc_fabric_count: z.string().optional(),
  work_order_rc_remarks: z.string().optional(),
});

const FactoryOrderReceived = () => {
  const navigate = useNavigate();
  const inputRefs = useRef([]);
  const { toast } = useToast();

  // ---------- Multi‑step state ----------
  const [step, setStep] = useState(1); // 1 = header, 2 = barcodes

  // ---------- Factory ----------
  const storedFactoryName = localStorage.getItem("name");
  const [selectedFactory, setSelectedFactory] = useState(null);
  const [isFactoryLoading, setIsFactoryLoading] = useState(true);

  const [workorder, setWorkorder] = useState({
    work_order_rc_year: dateyear || "",
    work_order_rc_date: getTodayDate() || "",
    work_order_rc_factory_no: localStorage.getItem("factory_id"),
    work_order_rc_id: "",
    work_order_no: "",
    work_order_rc_dc_no: "",
    work_order_rc_dc_date: getTodayDate() || "",
    work_order_rc_brand: "",
    work_order_rc_box: "",
    work_order_rc_pcs: "",
    work_order_rc_received_by: "",
    work_order_rc_fabric_received: "Yes",
    work_order_rc_fabric_count: "",
    work_order_rc_remarks: "",
  });

  const [users, setUsers] = useState([
    { work_order_rc_sub_barcode: "", work_order_rc_sub_box: 1, barcodes: [] },
  ]);
  const [loadingStates, setLoadingStates] = useState({});
  const [duplicateBarcodes, setDuplicateBarcodes] = useState({});
  const [activeInputIndex, setActiveInputIndex] = useState(null);
  const [currentInputValue, setCurrentInputValue] = useState("");
  const [highlightedItem, setHighlightedItem] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const { data: factoryData, isFetching } = useFetchFactory();

  // ---------- Effects ----------
  useEffect(() => {
    if (factoryData?.factory && storedFactoryName) {
      const matchedFactory = factoryData.factory.find(
        (factory) => factory.factory_name === storedFactoryName,
      );
      if (matchedFactory) {
        setSelectedFactory(matchedFactory);
        setWorkorder((prev) => ({
          ...prev,
          work_order_rc_factory_no: matchedFactory.factory_no.toString(),
        }));
      }
      setIsFactoryLoading(false);
    } else if (factoryData?.factory) {
      setIsFactoryLoading(false);
    }
  }, [factoryData, storedFactoryName]);

  useEffect(() => {
    setWorkorder((prev) => ({
      ...prev,
      work_order_rc_box: users.length.toString(),
      work_order_rc_pcs: users
        .reduce((total, u) => total + u.barcodes.length, 0)
        .toString(),
    }));
  }, [users]);

  const { data: workOrders = [] } = useQuery({
    queryKey: ["workOrders", workorder.work_order_rc_factory_no],
    queryFn: async () => {
      if (!workorder.work_order_rc_factory_no) return [];
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BASE_URL}/api/fetch-work-order/${workorder.work_order_rc_factory_no}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to fetch work orders");
      const data = await res.json();
      return (data.workorder || []).sort(
        (a, b) => b.work_order_no - a.work_order_no,
      );
    },
    enabled: !!workorder.work_order_rc_factory_no,
  });

  const { data: brandData } = useQuery({
    queryKey: ["brand", workorder.work_order_rc_id],
    queryFn: async () => {
      if (!workorder.work_order_rc_id) return { work_order_brand: "" };
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BASE_URL}/api/fetch-work-order-brand/${workorder.work_order_rc_id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to fetch brand");
      const data = await res.json();
      return data.workorderbrand || { work_order_brand: "" };
    },
    enabled: !!workorder.work_order_rc_id,
  });

  useEffect(() => {
    if (brandData?.work_order_brand) {
      setWorkorder((prev) => ({
        ...prev,
        work_order_rc_brand: brandData.work_order_brand,
      }));
    }
  }, [brandData]);

  // ---------- Mutations ----------
  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const token = localStorage.getItem("token");
      const submissionData = {
        ...data,
        workorder_sub_rc_data: data.workorder_sub_rc_data.map((user) => ({
          ...user,
          work_order_rc_sub_barcode: user.barcodes.join(","),
        })),
      };
      const res = await fetch(`${BASE_URL}/api/create-work-order-received`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submissionData),
      });
      if (!res.ok) throw new Error("Failed to create order");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Order received successfully" });
      navigate("/work-order");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ---------- Handlers ----------
  const onInputChange = (e) => {
    const { name, value } = e.target;
    setWorkorder((prev) => ({ ...prev, [name]: value }));
  };

  const addBarcodeToBox = async (index, barcodeOverride = null) => {
    const barcode =
      barcodeOverride !== null
        ? barcodeOverride.toUpperCase().trim()
        : currentInputValue.trim();
    if (!barcode) return;

    setLoadingStates((prev) => ({ ...prev, [index]: true }));
    try {
      if (barcode.length !== 6) {
        toast({
          title: "Invalid format",
          description: "Barcode must be exactly 6 digits",
          variant: "destructive",
        });
        return;
      }
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BASE_URL}/api/fetch-work-order-finish-check/${workorder.work_order_no}/${barcode}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Barcode validation failed");
      const data = await res.json();
      if (data?.code === 200) {
        const newUsers = [...users];
        newUsers[index].barcodes.push(barcode);
        setUsers(newUsers);
        if (barcodeOverride === null) setCurrentInputValue("");
        toast({ title: "Success", description: "Barcode added" });
      } else {
        toast({
          title: "Error",
          description: data?.msg || "Barcode not found in work order",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error validating barcode",
        variant: "destructive",
      });
    } finally {
      setLoadingStates((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBarcodeToBox(index);
    }
  };

  const removeBarcode = useCallback(
    (boxIndex, barcodeIndex) => {
      const newUsers = [...users];
      newUsers[boxIndex].barcodes.splice(barcodeIndex, 1);
      setUsers(newUsers);
    },
    [users],
  );

  const addItem = (e) => {
    e.preventDefault();
    setUsers((prev) => [
      ...prev,
      {
        work_order_rc_sub_barcode: "",
        work_order_rc_sub_box: prev.length + 1,
        barcodes: [],
      },
    ]);
  };

  const removeUser = (index) => {
    setUsers((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((u, i) => ({ ...u, work_order_rc_sub_box: i + 1 }));
    });
  };

  // ---------- Step navigation ----------
  const goToStep2 = (e) => {
    e.preventDefault();
    // Quick required‑field check for Step 1
    if (
      !workorder.work_order_rc_id ||
      !workorder.work_order_rc_dc_no ||
      !workorder.work_order_rc_dc_date ||
      !workorder.work_order_rc_date
    ) {
      toast({
        title: "Missing fields",
        description: "Please fill all required fields in Step 1.",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const goToStep1 = () => setStep(1);

  // ---------- Final submit ----------
  const onSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...workorder,
      work_order_rc_year: dateyear,
      work_order_rc_count: users.length,
      workorder_sub_rc_data: users,
      work_order_rc_id: workorder.work_order_no,
      work_order_rc_brand: brandData?.work_order_brand || "",
    };

    const validation = orderSchema.safeParse(data);
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validation.error.errors.map((e) => e.message).join(", "),
      });
      return;
    }

    const totalBarcodes = users.reduce((t, u) => t + u.barcodes.length, 0);
    if (totalBarcodes === 0) {
      toast({
        variant: "destructive",
        title: "No Barcodes",
        description: "Please add at least one barcode.",
      });
      return;
    }

    submitMutation.mutate(data);
  };

  // ---------- Scanner helpers ----------
  const openScannerForBox = (index) => {
    setActiveInputIndex(index);
    setCurrentInputValue("");
    setIsScannerOpen(true);
  };

  const closeScanner = () => setIsScannerOpen(false);

  const handleScannerScan = (value) => {
    if (activeInputIndex === null && activeInputIndex !== 0) return;
    addBarcodeToBox(activeInputIndex, value);
    // setIsScannerOpen(false);
  };

  // ---------- Derived values ----------
  const totalTCodes = users.reduce((t, u) => t + u.barcodes.length, 0);
  const totalBoxes = users.length;

  if (isFetching || isFactoryLoading) {
    return <LoaderComponent name="Data" />;
  }

  // ======================== RENDER ========================
  return (
    <Page defaultCollapsed={true}>
      <div className="max-w-full mx-auto">
        {/* ---------- Step indicator ---------- */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center space-x-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              1
            </div>
            <div className="w-12 h-0.5 bg-gray-300" />
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === 2
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              2
            </div>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {step === 1
                  ? "Add New Packing Slip – Details"
                  : "Add New Packing Slip – Barcodes"}
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/work-order" className="flex items-center gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            <form onSubmit={step === 1 ? goToStep2 : onSubmit}>
              {/* ============ STEP 1: HEADER FIELDS ============ */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Work Order ID */}
                    <div className="space-y-1">
                      <Label>
                        Work Order ID <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        options={workOrders.map((item) => ({
                          value: item.id,
                          label: String(item.work_order_no),
                        }))}
                        value={
                          workOrders
                            .filter(
                              (item) => item.id === workorder.work_order_rc_id,
                            )
                            .map((item) => ({
                              value: item.id,
                              label: String(item.work_order_no),
                            }))[0] || null
                        }
                        onChange={(selected) => {
                          if (!selected) {
                            setWorkorder((prev) => ({
                              ...prev,
                              work_order_rc_id: "",
                              work_order_no: "",
                            }));
                            return;
                          }
                          const wo = workOrders.find(
                            (w) => w.id === selected.value,
                          );
                          setWorkorder((prev) => ({
                            ...prev,
                            work_order_rc_id: wo.id,
                            work_order_no: wo.work_order_no,
                          }));
                        }}
                        isSearchable
                        isClearable
                        placeholder="Search Work Order"
                        filterOption={(option, input) =>
                          option.label.startsWith(input)
                        }
                      />
                    </div>

                    {/* Brand (read only) */}
                    <div className="space-y-1">
                      <Label>Brand (read only)</Label>
                      <Input value={workorder.work_order_rc_brand} readOnly />
                    </div>

                    {/* Receive Date */}
                    <div className="space-y-1">
                      <Label>
                        Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        name="work_order_rc_date"
                        value={workorder.work_order_rc_date}
                        onChange={onInputChange}
                      />
                    </div>

                    {/* DC No */}
                    <div className="space-y-1">
                      <Label>
                        DC No <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        name="work_order_rc_dc_no"
                        value={workorder.work_order_rc_dc_no}
                        onChange={onInputChange}
                      />
                    </div>

                    {/* DC Date */}
                    <div className="space-y-1">
                      <Label>
                        DC Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        name="work_order_rc_dc_date"
                        value={workorder.work_order_rc_dc_date}
                        onChange={onInputChange}
                      />
                    </div>

                    {/* Remarks */}
                    <div className="space-y-1 col-span-full">
                      <Label>Remarks</Label>
                      <Input
                        name="work_order_rc_remarks"
                        value={workorder.work_order_rc_remarks}
                        onChange={onInputChange}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" className="gap-2">
                      Next <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ============ STEP 2: BARCODE ENTRIES ============ */}
              {step === 2 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1">
                    <Label className="text-xs font-bold text-stone-900 tracking-tight flex items-center gap-2">
                      Barcode Entries
                      <span className="text-[10px] font-semibold bg-[#F5F2EB] text-[#543D2B] px-2 py-0.5 rounded-full border border-stone-200/80">
                        Total Boxes: {totalBoxes} • Total Pieces: {totalTCodes}
                      </span>
                    </Label>
                  </div>

                  <div className="space-y-2.5">
                    {users.map((user, index) => {
                      const boxDuplicates = {};
                      user.barcodes.forEach((b) => {
                        boxDuplicates[b] = (boxDuplicates[b] || 0) + 1;
                      });

                      const formatDuplicates = () =>
                        Object.entries(boxDuplicates)
                          .filter(([, count]) => count > 1)
                          .map(([code, c]) => `${code} × ${c}`)
                          .join(", ");

                      return (
                        <div
                          key={index}
                          className="bg-[#FDFBF7] border border-stone-200/80 rounded-2xl p-3.5 shadow-2xs space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-stone-800">
                                Box {index + 1}
                              </span>
                              <span className="text-[11px] font-medium text-stone-500 bg-[#F5F2EB] px-2 py-0.5 rounded-md">
                                {user.barcodes.length} pieces
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Input
                                ref={(el) => (inputRefs.current[index] = el)}
                                value={
                                  activeInputIndex === index
                                    ? currentInputValue
                                    : ""
                                }
                                onChange={(e) =>
                                  setCurrentInputValue(
                                    e.target.value
                                      .toUpperCase()
                                      .replace(/\s/g, ""),
                                  )
                                }
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                onFocus={() => {
                                  setActiveInputIndex(index);
                                  setCurrentInputValue("");
                                }}
                                placeholder="Enter barcode digits..."
                                className="h-8.5 text-xs px-3 uppercase bg-white border border-stone-200 focus:border-[#A27B5C] focus:ring-2 focus:ring-[#A27B5C]/15 rounded-xl text-stone-900 font-mono tracking-wider font-semibold placeholder:text-stone-400 placeholder:normal-case placeholder:font-sans placeholder:tracking-normal w-48 sm:w-56 shadow-2xs"
                              />

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8.5 w-8.5 border-stone-200 text-stone-700 hover:bg-[#F5F2EB] hover:text-[#543D2B] rounded-xl p-0"
                                onClick={() => openScannerForBox(index)}
                                title="Scan barcode"
                              >
                                <Camera className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                type="button"
                                onClick={() => addBarcodeToBox(index)}
                                disabled={
                                  !currentInputValue.trim() ||
                                  activeInputIndex !== index
                                }
                                size="sm"
                                className="h-8.5 w-8.5 bg-[#543D2B] hover:bg-[#412E20] text-white rounded-xl shadow-2xs flex items-center justify-center cursor-pointer transition-all disabled:opacity-40 p-0"
                              >
                                {loadingStates[index] ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Plus className="h-3.5 w-3.5" />
                                )}
                              </Button>

                              <Button
                                variant="outline"
                                size="icon"
                                type="button"
                                onClick={() => removeUser(index)}
                                className="h-8.5 w-8.5 border-stone-200 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                disabled={users.length <= 1}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div>
                            {user.barcodes.length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 pt-1">
                                {user.barcodes.map((barcode, bIdx) => (
                                  <div
                                    key={`${index}-${barcode}-${bIdx}`}
                                    className={`bg-white p-1.5 rounded-xl border border-stone-200/80 text-xs flex items-center justify-between shadow-2xs ${
                                      highlightedItem === barcode
                                        ? "border-[#A27B5C] bg-[#FAF8F5] ring-2 ring-[#A27B5C]/20"
                                        : ""
                                    }`}
                                  >
                                    <div className="flex items-center min-w-0 flex-1">
                                      <span className="text-stone-400 mr-1 text-[10px] w-4 text-right shrink-0">
                                        {bIdx + 1}.
                                      </span>
                                      <span
                                        className="font-mono text-xs font-semibold text-stone-800 truncate"
                                        title={barcode}
                                      >
                                        {barcode}
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      type="button"
                                      onClick={() =>
                                        removeBarcode(index, bIdx)
                                      }
                                      className="h-5 w-5 hover:bg-red-50 text-red-500 rounded-md p-0"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-stone-400 py-1">
                                No barcodes added yet
                              </p>
                            )}
                              {Object.keys(boxDuplicates).filter(
                                (code) => boxDuplicates[code] > 1,
                              ).length > 0 && (
                                <div className="mt-1 text-amber-600 text-xs font-medium">
                                  Duplicates: {formatDuplicates()}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addItem}
                      disabled={
                        users.length >= totalBoxes ||
                        users.reduce(
                          (total, user) => total + user.barcodes.length,
                          0,
                        ) >= totalTCodes
                      }
                      size="sm"
                      className="h-9 border border-stone-300 text-stone-700 hover:bg-[#F5F2EB] hover:text-[#543D2B] rounded-xl text-xs font-bold px-4 shadow-2xs transition-all flex items-center gap-1.5 mt-2"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Box
                    </Button>

                    <div className="flex justify-between items-center pt-3 border-t border-stone-200">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goToStep1}
                        className="border-stone-200 text-stone-700 hover:bg-[#F5F2EB] rounded-xl text-xs font-semibold h-9 px-4 gap-1.5"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitMutation.isPending}
                        className="bg-[#543D2B] hover:bg-[#412E20] text-white rounded-xl text-xs font-bold h-9 px-6 shadow-sm transition-all gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {submitMutation.isPending ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                          </>
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
            </form>
          </CardContent>
        </Card>

        {/* Scanner Modal (same as before) */}
        {isScannerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-4 w-full max-w-md mx-4 relative">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Scan Barcode</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeScanner}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
              <ScannerModel barcodeScannerValue={handleScannerScan} />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Position the barcode inside the scanner view
              </p>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
};

export default FactoryOrderReceived;
