import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Send,
  Trash2,
  Minus,
  Plus,
  PackageCheck,
  ArrowRight,
  Barcode,
  CheckCircle2,
  Loader2,
  Building2,
  Calendar,
  Hash,
  ShoppingBag,
  Scan,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as z from "zod";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BoxScannerModal from "@/components/BoxScannerModal";

import {
  LoaderComponent,
  ErrorComponent,
} from "@/components/LoaderComponent/LoaderComponent";
import Page from "../dashboard/page";
import { useToast } from "@/hooks/use-toast";
import BASE_URL from "@/config/BaseUrl";

// Zod schema for validation
const formSchema = z.object({
  work_order_sa_dc_no: z.string().optional(),
  work_order_sa_dc_date: z.string().optional(),
  work_order_sa_box: z.union([z.string(), z.number()]).optional(),
  work_order_sa_pcs: z.union([
    z.string().min(1, "Pieces count is required"),
    z.number().min(1, "Pieces count is required"),
  ]),
  work_order_sa_fabric_sale: z.string().optional(),
  work_order_sa_remarks: z.string().optional(),
  work_order_sa_count: z.union([z.string(), z.number()]).optional(),
  workorder_sub_sa_data: z.array(
    z.object({
      id: z.union([z.string(), z.number()]).optional(),
      work_order_sa_sub_barcode: z.string().min(1, "T Code is required"),
    })
  ),
});

// Calculate total pieces and box count from a combination string like "42x1 + 48x1"
const computeComboTotal = (comboStr) => {
  if (!comboStr) return { pcs: 0, boxes: 0 };
  let totalPcs = 0;
  let totalBoxes = 0;

  const parts = String(comboStr).split("+");
  parts.forEach((part) => {
    const match = part.trim().match(/(\d+)\s*[xX*]\s*(\d+)/);
    if (match) {
      const size = parseInt(match[1], 10) || 0;
      const count = parseInt(match[2], 10) || 0;
      totalPcs += size * count;
      totalBoxes += count;
    } else {
      const num = parseInt(part.trim(), 10);
      if (!isNaN(num)) {
        totalPcs += num;
        totalBoxes += 1;
      }
    }
  });

  return { pcs: totalPcs, boxes: totalBoxes };
};

// Parse response from getboxcombination/{value} API
const parseBoxCombinationResponse = (data) => {
  if (!data) return { minCombo: null, maxCombo: null };

  const formatComboValue = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "string" || typeof v === "number") return String(v);
    if (Array.isArray(v)) {
      return v
        .map((item) => {
          if (typeof item === "object" && item !== null) {
            return item.box_name || item.name || item.size || JSON.stringify(item);
          }
          return String(item);
        })
        .join(" + ");
    }
    if (typeof v === "object") {
      if (v.combination) return formatComboValue(v.combination);
      if (v.combo) return formatComboValue(v.combo);
      return Object.entries(v)
        .map(([k, val]) => `${k}x${val}`)
        .join(" + ");
    }
    return String(v);
  };

  const payload =
    data.data ||
    data.box_combination ||
    data.boxCombination ||
    data.combination ||
    data.combinations ||
    data;

  const minRaw =
    payload.closest_min_combo ??
    payload.closest_min ??
    payload.minCombo ??
    payload.min_combo ??
    payload.min ??
    payload.min_combination ??
    payload.minimum ??
    payload.min_box ??
    payload.minBox;

  const maxRaw =
    payload.closest_max_combo ??
    payload.closest_max ??
    payload.maxCombo ??
    payload.max_combo ??
    payload.max ??
    payload.max_combination ??
    payload.maximum ??
    payload.max_box ??
    payload.maxBox;

  const minFormatted = formatComboValue(minRaw);
  const maxFormatted = formatComboValue(maxRaw);

  return {
    minCombo: minFormatted,
    maxCombo: maxFormatted,
  };
};

// Helper function to calculate closest min and max box combinations based on pieces
const calculateBoxCombos = (totalPcs) => {
  const n = parseInt(totalPcs, 10);
  if (!n || n <= 0) return { minCombo: null, maxCombo: null };

  const standardSizes = [32, 30, 28, 24, 20, 18, 16, 14, 12];

  const findExactCombos = (target) => {
    const results = [];
    const search = (remaining, startIndex, current) => {
      if (remaining === 0) {
        results.push([...current]);
        return;
      }
      if (remaining < 0) return;

      for (let i = startIndex; i < standardSizes.length; i++) {
        const size = standardSizes[i];
        if (remaining >= size) {
          current.push(size);
          search(remaining - size, i, current);
          current.pop();
        }
      }
    };
    search(target, 0, []);
    return results;
  };

  const formatCombo = (boxList) => {
    if (!boxList || boxList.length === 0) return null;
    const counts = {};
    boxList.forEach((size) => {
      counts[size] = (counts[size] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([size, count]) => `${size}x${count}`)
      .join(" + ");
  };

  const exactCombos = findExactCombos(n);

  if (exactCombos.length > 0) {
    const sortedCombos = [...exactCombos].sort((a, b) => a.length - b.length);
    const maxComboBoxes = sortedCombos[0];
    const minComboBoxes = sortedCombos[sortedCombos.length - 1];

    const maxComboStr = formatCombo(maxComboBoxes);
    const minComboStr =
      minComboBoxes.length !== maxComboBoxes.length
        ? formatCombo(minComboBoxes)
        : null;

    return {
      minCombo: minComboStr,
      maxCombo: maxComboStr,
    };
  }

  if (n % 16 === 0) {
    return {
      minCombo: null,
      maxCombo: `16x${n / 16}`,
    };
  }

  const base16Count = Math.floor(n / 16);
  const remainder = n % 16;
  if (base16Count > 0 && remainder > 0) {
    return {
      minCombo: null,
      maxCombo: `16x${base16Count} + ${remainder}x1`,
    };
  }

  return {
    minCombo: null,
    maxCombo: `${n}x1`,
  };
};

const EditSales = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef(null);

  const [workorder, setWorkOrderSales] = useState({
    work_order_sa_date: "",
    work_order_sa_retailer_id: "",
    work_order_sa_dc_no: "",
    work_order_sa_dc_date: "",
    work_order_sa_retailer_name: "",
    work_order_sa_box: "",
    work_order_sa_pcs: "",
    work_order_sa_fabric_sale: "",
    work_order_sa_count: "",
    work_order_sa_remarks: "",
  });

  // Array of items: { id: string | number | null, barcode: string }
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentInputValue, setCurrentInputValue] = useState("");
  const [boxScannerOpen, setBoxScannerOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  // Track IDs of database records that should be deleted only when the user clicks Update
  const [pendingDeletedSubIds, setPendingDeletedSubIds] = useState([]);

  useEffect(() => {
    setPendingDeletedSubIds([]);
  }, [id]);

  // Update confirmation dialog state
  const [confirmUpdateDialog, setConfirmUpdateDialog] = useState({
    isOpen: false,
    initialCount: 0,
    currentCount: 0,
    addedCount: 0,
    pendingData: null,
  });

  // Fetch initial sales data by ID
  const {
    data: workOrderData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["workOrderSales", id],
    queryFn: async () => {
      if (!id) {
        throw new Error("No ID provided");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      try {
        const response = await axios.get(
          `${BASE_URL}/api/fetch-work-order-sales-by-id/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        let data = response.data || {};
        console.log("fetch-work-order-sales-by-id response:", data);

        // Check if sub barcodes exist in the by-id response
        const hasSub =
          (Array.isArray(data.workordersalessub) && data.workordersalessub.length > 0) ||
          (Array.isArray(data.workordersalessubNew) && data.workordersalessubNew.length > 0) ||
          (Array.isArray(data.workordersalessub_new) && data.workordersalessub_new.length > 0) ||
          (Array.isArray(data.workordersales_sub) && data.workordersales_sub.length > 0) ||
          (Array.isArray(data.workorder_sub_sa_data) && data.workorder_sub_sa_data.length > 0) ||
          (Array.isArray(data.sub_data) && data.sub_data.length > 0);

        // If no sub items found in by-id, fallback to view-by-id which often has the sub items joined
        if (!hasSub) {
          try {
            const viewRes = await axios.get(
              `${BASE_URL}/api/fetch-work-order-sales-view-by-id/${id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            console.log("fetch-work-order-sales-view-by-id fallback response:", viewRes.data);
            if (viewRes.data) {
              const viewSub =
                viewRes.data.workordersalessub ||
                viewRes.data.workordersalessubNew ||
                viewRes.data.workordersalessub_new ||
                viewRes.data.workordersales_sub ||
                viewRes.data.workorder_sub_sa_data ||
                viewRes.data.sub_data ||
                (Array.isArray(viewRes.data) ? viewRes.data : []);

              data = {
                ...viewRes.data,
                ...data,
                workordersales: data.workordersales || viewRes.data.workordersales,
                workordersalessub:
                  (Array.isArray(data.workordersalessub) && data.workordersalessub.length > 0)
                    ? data.workordersalessub
                    : viewSub,
              };
            }
          } catch (viewErr) {
            console.warn("fetch-work-order-sales-view-by-id fallback error:", viewErr);
          }
        }

        return data;
      } catch (error) {
        console.error("API Error:", error.response?.data || error.response?.data?.message);
        throw error;
      }
    },
    enabled: !!id,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  // Initialize state once data is loaded
  useEffect(() => {
    if (workOrderData) {
      console.log("EditSales workOrderData loaded:", workOrderData);

      const workordersales =
        workOrderData.workordersales ||
        workOrderData.workorder_sales ||
        workOrderData.sales ||
        workOrderData.data?.workordersales ||
        (workOrderData.work_order_sa_dc_no ? workOrderData : null);

      if (workordersales) {
        setWorkOrderSales({
          work_order_sa_date: workordersales.work_order_sa_date || "",
          work_order_sa_retailer_id: workordersales.work_order_sa_retailer_id || "",
          work_order_sa_dc_no: workordersales.work_order_sa_dc_no || "",
          work_order_sa_dc_date: workordersales.work_order_sa_dc_date || "",
          work_order_sa_retailer_name: workordersales.work_order_sa_retailer_name || "",
          work_order_sa_box: workordersales.work_order_sa_box || "",
          work_order_sa_pcs: workordersales.work_order_sa_pcs || "",
          work_order_sa_fabric_sale: workordersales.work_order_sa_fabric_sale || "",
          work_order_sa_count: workordersales.work_order_sa_count || "",
          work_order_sa_remarks: workordersales.work_order_sa_remarks || "",
        });
      }

      // Find sub items from all potential keys
      let rawSub =
        workOrderData.workordersalessub ||
        workOrderData.workordersalessubNew ||
        workOrderData.workordersalessub_new ||
        workOrderData.workordersales_sub ||
        workOrderData.workorder_sub_sa_data ||
        workOrderData.sales_sub ||
        workOrderData.salessub ||
        workOrderData.sub_data ||
        workOrderData.barcodes ||
        workOrderData.data?.workordersalessub ||
        workOrderData.data?.workorder_sub_sa_data ||
        workOrderData.workordersales?.workordersalessub ||
        [];

      // If rawSub is still empty, search all array properties on workOrderData
      if (!Array.isArray(rawSub) || rawSub.length === 0) {
        if (workOrderData && typeof workOrderData === "object") {
          const allArrays = Object.values(workOrderData).filter(Array.isArray);
          const found = allArrays.find((arr) =>
            arr.some(
              (item) =>
                item &&
                (typeof item === "string" ||
                  item.work_order_sa_sub_barcode ||
                  item.barcode ||
                  item.work_order_sub_barcode ||
                  item.work_order_sa_barcode ||
                  item.tcode ||
                  item.t_code ||
                  item.sub_barcode)
            )
          );
          if (found) {
            rawSub = found;
          }
        }
      }

      if (Array.isArray(rawSub) && rawSub.length > 0) {
        const parsedItems = rawSub
          .map((item) => {
            if (typeof item === "string") {
              return { id: null, barcode: item.trim() };
            }
            const barcodeVal =
              item.work_order_sa_sub_barcode ||
              item.barcode ||
              item.work_order_sub_barcode ||
              item.work_order_sa_barcode ||
              item.tcode ||
              item.t_code ||
              item.sub_barcode ||
              item.code ||
              "";
            return {
              id: item.id || null,
              barcode: String(barcodeVal).trim(),
            };
          })
          .filter((it) => it.barcode !== "");

        console.log("EditSales parsed items count:", parsedItems.length, parsedItems);
        setItems(parsedItems);
      } else {
        setItems([]);
      }
    }
  }, [workOrderData]);

  // Debounce pieces input to prevent firing API on every single keystroke/arrow step
  const [debouncedPcs, setDebouncedPcs] = useState(workorder.work_order_sa_pcs);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPcs(workorder.work_order_sa_pcs);
    }, 450);
    return () => clearTimeout(timer);
  }, [workorder.work_order_sa_pcs]);

  // Query backend getboxcombination/{value} API using debounced value
  const { data: apiBoxCombo, isLoading: isBoxComboLoading } = useQuery({
    queryKey: ["boxCombination", debouncedPcs],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const pcs = debouncedPcs;
      if (!pcs || parseInt(pcs, 10) <= 0) return null;
      try {
        const response = await axios.get(
          `${BASE_URL}/api/getboxcombination/${pcs}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        return response.data;
      } catch (err) {
        console.warn("getboxcombination API error:", err);
        return null;
      }
    },
    enabled: !!(debouncedPcs && parseInt(debouncedPcs, 10) > 0),
    staleTime: 60 * 1000,
  });

  const isComboLoading =
    isBoxComboLoading ||
    (workorder.work_order_sa_pcs !== debouncedPcs &&
      parseInt(workorder.work_order_sa_pcs, 10) > 0);

  const boxCombos = useMemo(() => {
    if (apiBoxCombo) {
      const parsed = parseBoxCombinationResponse(apiBoxCombo);
      if (parsed.minCombo || parsed.maxCombo) {
        return parsed;
      }
    }
    return calculateBoxCombos(workorder.work_order_sa_pcs);
  }, [apiBoxCombo, workorder.work_order_sa_pcs]);

  // Group barcodes and calculate count per unique barcode
  const uniqueBarcodes = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const b = item.barcode;
      if (!b) return;
      if (!map.has(b)) {
        map.set(b, { barcode: b, count: 0, items: [] });
      }
      const entry = map.get(b);
      entry.count += 1;
      entry.items.push(item);
    });
    return Array.from(map.values()).map((entry, idx) => ({
      index: idx + 1,
      barcode: entry.barcode,
      count: entry.count,
      items: entry.items,
    }));
  }, [items]);

  const maxPcs = parseInt(workorder.work_order_sa_pcs || 0, 10);
  const isComplete = maxPcs > 0 && items.length === maxPcs;
  const isInputDisabled = maxPcs > 0 && items.length >= maxPcs;

  const onInputChange = (e) => {
    const { name, value } = e.target;
    setWorkOrderSales((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBarcodeInputChange = (e) => {
    setCurrentInputValue(e.target.value);
  };

  // Add barcode with verification API check
  const addBarcode = async () => {
    if (!currentInputValue.trim()) return;

    if (!maxPcs || maxPcs <= 0) {
      toast({
        title: "Total Pieces Required",
        description: "Please enter the 'Total No of Pcs' before scanning barcodes.",
        variant: "destructive",
      });
      return;
    }

    if (items.length >= maxPcs) {
      toast({
        title: "Limit reached",
        description: `You have reached the maximum of ${maxPcs} T-codes specified in Total Pieces.`,
        variant: "destructive",
      });
      return;
    }

    const barcode = currentInputValue.trim();
    if (barcode.length < 4) {
      toast({
        title: "Invalid format",
        description: "T-Code must be at least 4 digits",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BASE_URL}/api/fetch-work-order-receive-check/${barcode}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Barcode validation failed");
      const data = await response.json();

      if (data?.code === 200) {
        setItems((prev) => [...prev, { id: null, barcode }]);
        setCurrentInputValue("");

        toast({
          title: "T-Code Verified",
          description: `Barcode ${barcode} added to sales dispatch.`,
          variant: "default",
        });

        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      } else {
        toast({
          title: "Validation Failed",
          description: data?.msg || "Barcode not found in received orders",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error communicating with barcode verification service",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBarcode();
    }
  };

  // Handler for adding items from BoxScannerModal
  const handleAddBoxItems = ({ barcodes: newBarcodes, boxLabel, totalPcs, orderRef, boxCount }) => {
    if (!newBarcodes || newBarcodes.length === 0) return;

    const currentPcs = parseInt(workorder.work_order_sa_pcs, 10) || 0;
    const newItems = newBarcodes.map((b) => ({ id: null, barcode: b.trim() }));
    const updatedItems = [...items, ...newItems];
    setItems(updatedItems);

    // If current pieces is less than total barcodes, auto-update pieces so validation passes
    const newTargetPcs = currentPcs < updatedItems.length ? updatedItems.length : currentPcs;
    const currentBox = parseInt(workorder.work_order_sa_box, 10) || 0;

    setWorkOrderSales((prev) => ({
      ...prev,
      work_order_sa_pcs: newTargetPcs,
      work_order_sa_box: currentBox + (boxCount || 1),
    }));

    toast({
      title: "Box Items Added",
      description: `Added ${newBarcodes.length} T-Code barcodes from ${boxLabel} (${orderRef}). Total: ${updatedItems.length} pcs.`,
      variant: "default",
    });
  };

  // Decrease count of barcode by 1 (local state only; queues DB ID for deletion upon Update)
  const removeOneBarcode = useCallback((barcodeToRemove) => {
    setItems((prev) => {
      const idx = prev.map((it) => it.barcode).lastIndexOf(barcodeToRemove);
      if (idx === -1) return prev;
      const itemToRemove = prev[idx];
      if (itemToRemove?.id) {
        setPendingDeletedSubIds((dPrev) => [...dPrev, itemToRemove.id]);
      }
      const newItems = [...prev];
      newItems.splice(idx, 1);
      return newItems;
    });
  }, []);

  // Increase count of barcode by 1
  const addOneBarcode = useCallback(
    (barcodeToAdd) => {
      if (items.length >= maxPcs) {
        toast({
          title: "Limit reached",
          description: `You have reached the maximum of ${maxPcs} T-codes specified in Total Pieces.`,
          variant: "destructive",
        });
        return;
      }
      setItems((prev) => [...prev, { id: null, barcode: barcodeToAdd }]);
    },
    [items.length, maxPcs, toast]
  );

  // Remove all pieces of this barcode (local state only; queues DB IDs for deletion upon Update)
  const removeAllOfBarcode = useCallback(
    (barcodeToRemove) => {
      setItems((prev) => {
        const matchingItems = prev.filter((it) => it.barcode === barcodeToRemove);
        const dbIds = matchingItems.filter((it) => it.id).map((it) => it.id);
        if (dbIds.length > 0) {
          setPendingDeletedSubIds((dPrev) => [...dPrev, ...dbIds]);
        }
        return prev.filter((it) => it.barcode !== barcodeToRemove);
      });
      toast({
        title: "Removed",
        description: `Removed all instances of barcode ${barcodeToRemove}. Changes will take effect on Update.`,
        variant: "default",
      });
    },
    [toast]
  );

  // Clear all barcodes from form (local state only; does NOT delete from DB unless Update is clicked)
  const handleConfirmClearAll = () => {
    const dbIds = items.filter((it) => it.id).map((it) => it.id);
    if (dbIds.length > 0) {
      setPendingDeletedSubIds((prev) => [...prev, ...dbIds]);
    }

    setItems([]);
    setCurrentInputValue("");
    setClearAllDialogOpen(false);
    toast({
      title: "Cleared",
      description: "All barcodes cleared. Changes will only take effect if you add the required T-codes and click Update.",
    });
  };

  const updateOrderSalesMutation = useMutation({
    mutationFn: async (data) => {
      const token = localStorage.getItem("token");

      // 1. Delete removed barcodes from database only now that Update has been confirmed
      if (pendingDeletedSubIds.length > 0) {
        try {
          await Promise.allSettled(
            pendingDeletedSubIds.map((bid) =>
              axios.delete(`${BASE_URL}/api/delete-work-order-sales-sub/${bid}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
            )
          );
        } catch (delErr) {
          console.warn("Failed to delete removed sub items:", delErr);
        }
      }

      // 2. Send PUT request to update sales order
      const response = await axios.put(
        `${BASE_URL}/api/update-work-orders-sales/${id}`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.code === "200" || data?.code === 200) {
        setPendingDeletedSubIds([]);
        queryClient.invalidateQueries({ queryKey: ["workOrderSalesList"] });
        queryClient.refetchQueries({ queryKey: ["workOrderSalesList"] });
        queryClient.invalidateQueries({ queryKey: ["workOrderSales", id] });
        queryClient.invalidateQueries({ queryKey: ["salesPackingListView", id] });
        queryClient.invalidateQueries({ queryKey: ["workOrderSales"] });

        toast({
          title: "Success",
          description: "Work Order Sales Updated Successfully",
        });
        navigate("/sales");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data?.msg || data?.message || "Error while editing the order sales",
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "API Error occurred",
      });
    },
  });

  const executeSubmit = (dataToSubmit) => {
    updateOrderSalesMutation.mutate(dataToSubmit);
  };

  const getCleanSubData = () => {
    return items
      .filter((it) => it.barcode && it.barcode.trim() !== "")
      .map((it) => {
        const entry = {
          work_order_sa_sub_barcode: it.barcode.trim(),
        };
        if (it.id) {
          entry.id = it.id;
        }
        return entry;
      });
  };

  const onSubmit = async (e) => {
    if (e) e.preventDefault();

    const cleanSubData = getCleanSubData();
    const currentCount = cleanSubData.length;
    const currentPcs = parseInt(workorder.work_order_sa_pcs, 10) || 0;

    // 1. Validate that pieces count is entered and positive
    if (!currentPcs || currentPcs <= 0) {
      toast({
        variant: "destructive",
        title: "Total Pieces Required",
        description: "Please enter a valid Total No of Pcs (greater than 0).",
      });
      return;
    }

    // 2. Validate that barcodes are present (cannot be empty or cleared to 0)
    if (currentCount === 0) {
      toast({
        variant: "destructive",
        title: "T-Codes Required",
        description: `Total No of Pcs is set to ${currentPcs}. Please add all ${currentPcs} T-Code barcodes before updating, or adjust Total No of Pcs.`,
      });
      return;
    }

    // 3. Strict match requirement: T-Codes count must match Total No of Pcs exactly!
    if (currentCount !== currentPcs) {
      toast({
        variant: "destructive",
        title: "Pieces Count Mismatch",
        description: `Total No of Pcs is set to ${currentPcs}, but you have ${currentCount} T-Code barcode${currentCount === 1 ? "" : "s"
          }. Please ${currentCount < currentPcs
            ? `add ${currentPcs - currentCount} more T-Code${currentPcs - currentCount > 1 ? "s" : ""}`
            : `remove ${currentCount - currentPcs} T-Code${currentCount - currentPcs > 1 ? "s" : ""}`
          } before updating, or adjust Total No of Pcs to ${currentCount}.`,
      });
      return;
    }

    const data = {
      ...workorder,
      work_order_sa_dc_no: workorder.work_order_sa_dc_no,
      work_order_sa_dc_date: workorder.work_order_sa_dc_date,
      work_order_sa_box: parseInt(workorder.work_order_sa_box) || 0,
      work_order_sa_pcs: currentPcs,
      work_order_sa_fabric_sale: workorder.work_order_sa_fabric_sale,
      work_order_sa_remarks: workorder.work_order_sa_remarks,
      workorder_sub_sa_data: cleanSubData,
      barcodes: cleanSubData.map((s) => s.work_order_sa_sub_barcode),
      work_order_sa_count: currentCount,
    };

    const validation = formSchema.safeParse(data);
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Please fix the following:",
        description: (
          <div className="grid gap-1">
            {validation.error.errors.map((error, i) => {
              const field = error.path[0].toString().replace(/_/g, " ");
              const label = field.charAt(0).toUpperCase() + field.slice(1);
              return (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex items-center justify-center h-4 w-4 mt-0.5 flex-shrink-0 rounded-full bg-red-100 text-red-700 text-xs">
                    {i + 1}
                  </div>
                  <p className="text-xs">
                    <span className="font-medium">{label}:</span>{" "}
                    {error.message}
                  </p>
                </div>
              );
            })}
          </div>
        ),
      });
      return;
    }

    const initialCount =
      parseInt(workOrderData?.workordersales?.work_order_sa_count) ||
      parseInt(workOrderData?.workordersales?.work_order_sa_pcs) ||
      workOrderData?.workordersalessub?.length ||
      0;
    const diff = currentCount - initialCount;

    // If total pieces changed from the previous saved value, ask for confirmation
    if (currentCount !== initialCount) {
      setConfirmUpdateDialog({
        isOpen: true,
        initialCount,
        currentCount,
        addedCount: diff,
        pendingData: data,
      });
      return;
    }

    executeSubmit(data);
  };

  const handleConfirmedUpdate = () => {
    if (!confirmUpdateDialog.pendingData) return;

    const dataToSubmit = confirmUpdateDialog.pendingData;

    setWorkOrderSales((prev) => ({
      ...prev,
      work_order_sa_pcs: confirmUpdateDialog.currentCount,
      work_order_sa_count: confirmUpdateDialog.currentCount,
    }));

    setConfirmUpdateDialog({
      isOpen: false,
      initialCount: 0,
      currentCount: 0,
      addedCount: 0,
      pendingData: null,
    });

    executeSubmit(dataToSubmit);
  };

  if (isLoading) {
    return <LoaderComponent name="Work Order Sales Data" />;
  }

  if (isError) {
    return (
      <ErrorComponent
        message={`Error Fetching Work Order Sales Data: ${error?.message || "Unknown error"
          }`}
        refetch={refetch}
      />
    );
  }

  return (
    <Page>
      <div className="w-full space-y-4 max-w-7xl mx-auto pt-1">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FDFBF7] border border-stone-200/80 px-5 py-3 rounded-2xl shadow-2xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#A27B5C] flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" />
              Sales Packing
            </span>
            <h1 className="font-heading text-lg font-bold text-stone-800 tracking-tight leading-tight mt-0.5">
              Update Work Order Sales
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              Update delivery outward sales packing and manage verified product barcodes.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 border-stone-200 text-stone-700 hover:bg-[#F5F2EB] rounded-xl text-xs shadow-2xs font-semibold"
          >
            <Link to="/sales" className="flex items-center gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>

        {/* Section 1: Sales & Dispatch Information Form */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Retailer */}
            <div className="space-y-1.5">
              <Label
                htmlFor="work_order_sa_retailer_name"
                className="text-xs font-semibold text-stone-700 flex items-center gap-1"
              >
                <Building2 className="h-3.5 w-3.5 text-stone-400" />
                Retailer
              </Label>
              <Input
                id="work_order_sa_retailer_name"
                name="work_order_sa_retailer_name"
                value={workorder.work_order_sa_retailer_name}
                disabled
                className="h-10 text-xs bg-stone-50 border-stone-200 rounded-xl text-stone-800 shadow-2xs font-medium cursor-not-allowed"
              />
            </div>

            {/* Packing Date */}
            <div className="space-y-1.5">
              <Label
                htmlFor="work_order_sa_date"
                className="text-xs font-semibold text-stone-700 flex items-center gap-1"
              >
                <Calendar className="h-3.5 w-3.5 text-stone-400" />
                Packing Date
              </Label>
              <Input
                type="date"
                id="work_order_sa_date"
                name="work_order_sa_date"
                value={workorder.work_order_sa_date}
                disabled
                className="h-10 text-xs bg-stone-50 border-stone-200 rounded-xl text-stone-800 shadow-2xs font-medium cursor-not-allowed"
              />
            </div>

            {/* Total No of Pcs */}
            <div className="space-y-1.5">
              <Label
                htmlFor="work_order_sa_pcs"
                className="text-xs font-semibold text-stone-700 flex items-center gap-1"
              >
                <PackageCheck className="h-3.5 w-3.5 text-stone-400" />
                Total No of Pcs <span className="text-red-500">*</span>
              </Label>
              <Input
                id="work_order_sa_pcs"
                type="number"
                placeholder="e.g. 50"
                name="work_order_sa_pcs"
                value={workorder.work_order_sa_pcs}
                onChange={onInputChange}
                className="h-10 text-xs bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800 shadow-2xs font-medium"
              />
              {workorder.work_order_sa_pcs && parseInt(workorder.work_order_sa_pcs, 10) > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] pt-0.5">
                  {isComboLoading ? (
                    <span className="text-stone-400 flex items-center gap-1 py-0.5 font-medium">
                      <Loader2 className="h-3 w-3 animate-spin text-[#A27B5C]" /> Loading combinations...
                    </span>
                  ) : (() => {
                    const minStr = boxCombos.minCombo?.trim();
                    const maxStr = boxCombos.maxCombo?.trim();
                    const isMatched =
                      (minStr && maxStr && minStr.replace(/\s+/g, "") === maxStr.replace(/\s+/g, "")) ||
                      (!minStr && maxStr) ||
                      (minStr && !maxStr);

                    if (isMatched) {
                      const matchedStr = (maxStr || minStr || "").trim();
                      const calc = computeComboTotal(matchedStr);
                      const sumVal =
                        apiBoxCombo?.total ||
                        apiBoxCombo?.total_pcs ||
                        calc.pcs ||
                        workorder.work_order_sa_pcs;
                      const displayMatched = matchedStr
                        ? matchedStr.includes("=")
                          ? matchedStr
                          : `${matchedStr}${sumVal ? ` = ${sumVal}` : ""}`
                        : "N/A";

                      return (
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className="bg-[#E5D7C3]/70 text-[#543D2B] px-2.5 py-0.5 rounded-md font-bold border border-[#D8C7B0]">
                            <strong className="text-stone-800">Matched:</strong> {displayMatched}
                          </span>
                        </div>
                      );
                    }

                    const minCalc = computeComboTotal(minStr);
                    const maxCalc = computeComboTotal(maxStr);

                    const minDisplay = minStr
                      ? minStr.includes("=")
                        ? minStr
                        : `${minStr}${minCalc.pcs ? ` = ${minCalc.pcs}` : ""}`
                      : "N/A";

                    const maxDisplay = maxStr
                      ? maxStr.includes("=")
                        ? maxStr
                        : `${maxStr}${maxCalc.pcs ? ` = ${maxCalc.pcs}` : ""}`
                      : "N/A";

                    return (
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="bg-[#E5D7C3]/70 text-[#543D2B] px-2 py-0.5 rounded-md font-bold border border-[#D8C7B0]">
                          <strong className="text-stone-800">Min:</strong> {minDisplay}
                        </span>
                        <span className="bg-[#E5D7C3]/70 text-[#543D2B] px-2 py-0.5 rounded-md font-bold border border-[#D8C7B0]">
                          <strong className="text-stone-800">Max:</strong> {maxDisplay}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Temp Manual Packing No */}
            <div className="space-y-1.5">
              <Label
                htmlFor="work_order_sa_dc_no"
                className="text-xs font-semibold text-stone-700 flex items-center gap-1"
              >
                <Hash className="h-3.5 w-3.5 text-stone-400" />
                Manual Packing Slip No
              </Label>
              <Input
                id="work_order_sa_dc_no"
                placeholder="Enter  Manual Packing slip No"
                name="work_order_sa_dc_no"
                value={workorder.work_order_sa_dc_no}
                onChange={onInputChange}
                className="h-10 text-xs bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800 shadow-2xs font-medium"
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1.5 col-span-full">
              <Label
                htmlFor="work_order_sa_remarks"
                className="text-xs font-semibold text-stone-700"
              >
                Remarks / Dispatch Notes
              </Label>
              <Input
                id="work_order_sa_remarks"
                placeholder="Optional notes or dispatch remarks..."
                name="work_order_sa_remarks"
                value={workorder.work_order_sa_remarks}
                onChange={onInputChange}
                className="h-10 text-xs bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800 shadow-2xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Interactive T-Code Barcode Scanning & Verification Panel */}
        <div className="bg-[#FDFBF7] border border-stone-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          {/* Header with Live Progress Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/70 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#543D2B] text-white">
                <Barcode className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Product Barcode
                </h2>
                <p className="text-[11px] text-stone-500">
                  Scan or enter the unique product barcode for each garment piece.
                </p>
              </div>
            </div>

            {/* Status Counter Badge & Clear All */}
            <div className="flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${isComplete
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                    : items.length > 0
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-stone-100 text-stone-600 border-stone-200"
                  }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Barcode className="h-3.5 w-3.5 text-amber-600" />
                )}
                <span>
                  Scanned: {items.length} / {maxPcs || 0} Pcs
                </span>
              </div>

              {items.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setClearAllDialogOpen(true)}
                  className="h-7 px-2.5 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                  title="Clear all scanned barcodes"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Scanner Input Row */}
          <div className="flex items-center gap-2.5 max-w-xl">
            <div className="relative flex-1">
              <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
              <Input
                ref={inputRef}
                value={currentInputValue}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/\s/g, "");
                  handleBarcodeInputChange({ target: { value } });
                }}
                onKeyPress={handleKeyPress}
                onPaste={(e) => {
                  const pastedText = e.clipboardData
                    .getData("text")
                    .toUpperCase()
                    .replace(/\s/g, "");
                  e.preventDefault();
                  document.execCommand("insertText", false, pastedText);
                  handleBarcodeInputChange({ target: { value: pastedText } });
                }}
                placeholder={
                  isInputDisabled
                    ? "Target pieces count reached"
                    : "SCAN OR ENTER PRODUCT BARCODE..."
                }
                className="h-10 pl-10 pr-3 font-mono text-xs uppercase tracking-wider bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-900 shadow-2xs font-semibold placeholder:font-sans placeholder:normal-case"
                disabled={isInputDisabled}
              />
            </div>

            <Button
              type="button"
              onClick={addBarcode}
              disabled={isInputDisabled || !currentInputValue.trim() || loading}
              className="h-10 px-5 bg-[#543D2B] hover:bg-[#412E20] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </Button>

            <Button
              type="button"
              onClick={() => setBoxScannerOpen(true)}
              className="h-10 px-4 bg-[#A27B5C] hover:bg-[#8D6B4F] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Scan and add complete box items"
            >
              <Scan className="h-4 w-4" />
              Scan Box
            </Button>
          </div>

          {/* Scanned Barcodes Grid Area */}
          <div className="rounded-xl border border-stone-200 bg-white/80 p-3 min-h-[140px] max-h-[300px] overflow-y-auto shadow-inner">
            {uniqueBarcodes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {uniqueBarcodes.map((item) => {
                  const isLimitReached = items.length >= maxPcs;

                  return (
                    <div
                      key={item.barcode}
                      className="group relative rounded-xl border border-[#E6DEC9] bg-[#FAF8F5] hover:bg-white p-2.5 text-xs flex items-center justify-between shadow-2xs hover:border-[#A27B5C] transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#543D2B]/10 text-[10px] font-bold text-[#543D2B]">
                          {item.index}
                        </span>
                        <span className="font-mono font-bold truncate text-xs text-stone-800" title={item.barcode}>
                          {item.barcode}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 pl-1.5 shrink-0">
                        {/* Multiplier Badge */}
                        <span
                          className="rounded-md bg-[#543D2B] text-white px-2 py-0.5 text-[11px] font-extrabold tracking-tight shadow-2xs"
                          title={`${item.count} piece${item.count > 1 ? "s" : ""}`}
                        >
                          *{item.count}
                        </span>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-0.5 bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                          <button
                            type="button"
                            onClick={() => removeOneBarcode(item.barcode)}
                            className="flex h-5 w-5 items-center justify-center rounded-md text-stone-600 hover:bg-white hover:text-stone-900 transition-colors cursor-pointer"
                            title="Decrease count by 1"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => addOneBarcode(item.barcode)}
                            disabled={isLimitReached}
                            className="flex h-5 w-5 items-center justify-center rounded-md text-stone-600 hover:bg-white hover:text-stone-900 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isLimitReached ? "Target pieces count reached" : "Increase count by 1"}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAllOfBarcode(item.barcode)}
                            className="flex h-5 w-5 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer ml-0.5"
                            title="Remove this barcode"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F2EB] text-[#A27B5C] mb-2">
                  <Barcode className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-stone-700">
                  No product barcodes added yet
                </p>
                <p className="text-[11px] text-stone-400 max-w-xs mt-0.5">
                  Type or scan barcode numbers in the box above to link them to this delivery order.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-6">
          <Button
            variant="outline"
            asChild
            className="h-10 px-5 border-stone-200 text-stone-700 hover:bg-[#F5F2EB] rounded-xl text-xs font-semibold shadow-2xs"
          >
            <Link to="/sales">Cancel</Link>
          </Button>

          <Button
            type="button"
            onClick={onSubmit}
            disabled={updateOrderSalesMutation.isPending}
            className="h-10 px-6 bg-[#543D2B] hover:bg-[#412E20] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-75"
          >
            {updateOrderSalesMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Update</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Update Count Confirmation Dialog */}
      <AlertDialog
        open={confirmUpdateDialog.isOpen}
        onOpenChange={(open) =>
          !open &&
          setConfirmUpdateDialog({
            isOpen: false,
            initialCount: 0,
            currentCount: 0,
            addedCount: 0,
            pendingData: null,
          })
        }
      >
        <AlertDialogContent className="max-w-md rounded-2xl p-6 bg-white border border-stone-200 shadow-xl">
          <AlertDialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5D7C3] text-[#543D2B]">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-stone-900">
                  Confirm Pcs & T-Code Update
                </AlertDialogTitle>
                <p className="text-xs text-stone-500">
                  Verify the updated number of pieces before saving
                </p>
              </div>
            </div>

            <div className="mt-3 p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E6DEC9] space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center items-center">
                <div className="bg-white p-2 rounded-lg border border-stone-200 shadow-2xs">
                  <p className="text-[10px] uppercase font-bold text-stone-400">Previous Pcs</p>
                  <p className="text-base font-extrabold text-stone-700">{confirmUpdateDialog.initialCount}</p>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${confirmUpdateDialog.addedCount >= 0
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-amber-100 text-amber-700 border border-amber-200"
                      }`}
                  >
                    {confirmUpdateDialog.addedCount >= 0
                      ? `+${confirmUpdateDialog.addedCount} Added`
                      : `${confirmUpdateDialog.addedCount} Removed`}
                  </span>
                  <ArrowRight className="h-4 w-4 text-stone-400 mt-1" />
                </div>

                <div className="bg-[#E5D7C3]/60 p-2 rounded-lg border border-[#D8C7B0] shadow-2xs">
                  <p className="text-[10px] uppercase font-bold text-[#543D2B]">New Total Pcs</p>
                  <p className="text-base font-black text-[#543D2B]">{confirmUpdateDialog.currentCount}</p>
                </div>
              </div>

              <AlertDialogDescription className="text-xs text-stone-600 leading-relaxed text-left">
                Earlier, the Total No of Pcs was{" "}
                <strong className="text-stone-900 font-bold">{confirmUpdateDialog.initialCount}</strong>.
                {confirmUpdateDialog.addedCount > 0 ? (
                  <>
                    {" "}You have added{" "}
                    <strong className="text-[#543D2B] font-bold">
                      {confirmUpdateDialog.addedCount} new T-Code{confirmUpdateDialog.addedCount > 1 ? "s" : ""}
                    </strong> (Total: <strong className="text-stone-900">{confirmUpdateDialog.currentCount}</strong>).
                  </>
                ) : (
                  <>
                    {" "}You have modified the T-Codes to a total of{" "}
                    <strong className="text-stone-900 font-bold">{confirmUpdateDialog.currentCount}</strong>.
                  </>
                )}
                <br />
                Do you want to update the <span className="font-semibold text-stone-900">Total No of Pcs</span> to{" "}
                <strong className="text-[#543D2B] font-extrabold">{confirmUpdateDialog.currentCount}</strong> and proceed with updating this sale?
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-9 rounded-xl text-xs font-semibold cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedUpdate}
              className="h-9 px-4 bg-[#543D2B] hover:bg-[#412E20] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              Yes, Update to {confirmUpdateDialog.currentCount} Pcs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Box Scanner Modal for Complete Box Scanning */}
      <BoxScannerModal
        open={boxScannerOpen}
        onOpenChange={setBoxScannerOpen}
        onAddBoxItems={handleAddBoxItems}
      />

      {/* Clear All Confirmation Dialog */}
      <AlertDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Barcodes?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all{" "}
              <strong>{items.length}</strong> barcode
              {items.length > 1 ? "s" : ""}? These changes will only be saved when you click Update. If you click Cancel or leave this page, your existing barcodes will remain safe and untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClearAll}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
};

export default EditSales;