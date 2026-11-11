import React, { useRef, useState, useEffect, useMemo } from "react";
import Page from "../dashboard/page";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import moment from "moment";
import * as XLSX from "xlsx";
import ReactToPrint from "react-to-print";
import {
  Printer,
  Download,
  Plus,
  Minus,
  Loader2,
  CheckCircle,
  CheckCircle2,
  CheckCheck,
  XCircle,
  AlertCircle,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Barcode,
  AlertTriangle,
  Building2,
  Tag,
  Calendar,
  Hash,
  Package,
  Boxes,
  FileText,
  Layers,
  User,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ButtonConfig } from "@/config/ButtonConfig";
import {
  ErrorComponent,
  LoaderComponent,
} from "@/components/LoaderComponent/LoaderComponent";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import BASE_URL from "@/config/BaseUrl";
import BoxBarcodeScannerModal from "./BoxBarcodeScannerModal";

const DcReceiptReceived = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const componentRef = useRef(null);
  const navigate = useNavigate();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteWorkOrderId, setDeleteWorkOrderId] = useState(null);
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState(null);
  const [currentInputValue, setCurrentInputValue] = useState("");
  const [loadingStates, setLoadingStates] = useState({});
  const [validationStatus, setValidationStatus] = useState(null);
  const [receiveConfirmOpen, setReceiveConfirmOpen] = useState(false);
  const [selectedBoxToReceive, setSelectedBoxToReceive] = useState(null);
  const [receiveSelectedConfirmOpen, setReceiveSelectedConfirmOpen] = useState(false);
  const [notReceiveConfirmOpen, setNotReceiveConfirmOpen] = useState(false);
  const [selectedBoxToNotReceive, setSelectedBoxToNotReceive] = useState(null);
  const [notReceiveSelectedConfirmOpen, setNotReceiveSelectedConfirmOpen] = useState(false);
  const hasAutoClosedRef = useRef(false);
  const [barcodeFilter, setBarcodeFilter] = useState("all");
  const location = useLocation();
  const queryClient = useQueryClient();

  const [checkedBoxes, setCheckedBoxes] = useState(new Set());
  const [expandedBoxes, setExpandedBoxes] = useState(new Set());

  const { orderReceivedStatus, workOrderRow, workOrderRcNo } = location.state || {};

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dcreceipt", id],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/api/fetch-work-order-received-view-by-id/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return {
        workOrder: response.data.workorderrc || {},
        workOrderSub: response.data.workorderrcsub || [],
        workOrderFooter: response.data.workorderfooter || {},
      };
    },
  });

  const { workOrder = {}, workOrderSub = [] } = data || {};

  // Look up work_order_rc_no from multiple reliable sources:
  // 1. workOrder returned by the API
  // 2. React Router navigation state (workOrderRcNo or workOrderRow.work_order_rc_no)
  // 3. React Query cached "workorderrc" list
  // 4. Fallback fetch of work order list if needed
  const cachedList = queryClient.getQueryData(["workorderrc"]) || [];
  const cachedOrder = Array.isArray(cachedList)
    ? cachedList.find((item) => String(item.id) === String(id))
    : null;

  const { data: listData } = useQuery({
    queryKey: ["workorderrc"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BASE_URL}/api/fetch-work-order-received-list`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data.workorderrc || [];
    },
    enabled:
      !workOrder?.work_order_rc_no &&
      !workOrderRcNo &&
      !workOrderRow?.work_order_rc_no &&
      !cachedOrder?.work_order_rc_no,
    staleTime: 5 * 60 * 1000,
  });

  const listOrder = Array.isArray(listData)
    ? listData.find((item) => String(item.id) === String(id))
    : null;

  const displayWorkOrderNo =
    workOrder?.work_order_rc_no ||
    workOrderRcNo ||
    workOrderRow?.work_order_rc_no ||
    cachedOrder?.work_order_rc_no ||
    listOrder?.work_order_rc_no ||
    workOrder?.work_order_no ||
    workOrder?.work_order_rc_dc_no ||
    "-";

  const isOrderReceived =
    orderReceivedStatus?.toLowerCase() === "received" ||
    workOrder?.work_order_rc_status?.toLowerCase() === "received";


  // --- Build table rows (aggregated by box, barcode, size, rate) ---
  const tableRows = useMemo(() => {
    const rows = [];
    (workOrderSub || []).forEach((item) => {
      const box = item.work_order_rc_sub_box || "1";
      const barcodeStr = item.work_order_rc_sub_barcode || "";
      const barcodes = barcodeStr.split(",").filter((b) => b.trim());
      if (barcodes.length === 0) return;

      const size = item.finished_stock_size || "N/A";
      const amount = item.finished_stock_amount || "N/A";

      barcodes.forEach((barcode) => {
        rows.push({
          box,
          barcode: barcode.trim(),
          size,
          amount,
        });
      });
    });

    const aggregated = {};
    rows.forEach((row) => {
      const key = `${row.box}|${row.barcode}|${row.size}|${row.amount}`;
      if (!aggregated[key]) {
        aggregated[key] = { ...row, quantity: 0 };
      }
      aggregated[key].quantity += 1;
    });

    return Object.values(aggregated);
  }, [workOrderSub]);

  // Group by box for rendering
  const groupedRows = useMemo(() => {
    return tableRows.reduce((acc, row) => {
      if (!acc[row.box]) acc[row.box] = [];
      acc[row.box].push(row);
      return acc;
    }, {});
  }, [tableRows]);

  // Build grouped boxes for barcode dialog
  const groupedBoxesForDialog = useMemo(() => {
    return (workOrderSub || []).reduce((acc, item) => {
      const boxNumber = item.work_order_rc_sub_box;
      if (!acc[boxNumber]) {
        acc[boxNumber] = {
          barcodes: [],
          totalPcs: 0,
        };
      }

      if (item.work_order_rc_sub_barcode) {
        const barcodes = item.work_order_rc_sub_barcode
          .split(",")
          .filter((b) => b.trim());
        acc[boxNumber].barcodes.push(...barcodes);
        acc[boxNumber].totalPcs += barcodes.length;
      }
      return acc;
    }, {});
  }, [workOrderSub]);

  // Sort box numbers numerically from all sources
  const sortedBoxes = useMemo(() => {
    const boxSet = new Set();
    (workOrderSub || []).forEach((item) => {
      if (item.work_order_rc_sub_box) {
        boxSet.add(String(item.work_order_rc_sub_box));
      }
    });
    Object.keys(groupedRows).forEach((b) => boxSet.add(String(b)));
    Object.keys(groupedBoxesForDialog).forEach((b) => boxSet.add(String(b)));

    if (boxSet.size === 0 && workOrder?.work_order_rc_box) {
      const total = parseInt(workOrder.work_order_rc_box) || 0;
      for (let i = 1; i <= total; i++) {
        boxSet.add(String(i));
      }
    }

    return Array.from(boxSet).sort((a, b) => Number(a) - Number(b));
  }, [groupedRows, groupedBoxesForDialog, workOrderSub, workOrder?.work_order_rc_box]);

  // Baseline recording for initial expected box pieces
  useEffect(() => {
    if (Object.keys(groupedBoxesForDialog).length > 0) {
      Object.entries(groupedBoxesForDialog).forEach(([boxNum, bData]) => {
        const baselineKey = `box_baseline_${id}_${boxNum}`;
        if (!localStorage.getItem(baselineKey) && bData.totalPcs > 0) {
          localStorage.setItem(baselineKey, String(bData.totalPcs));
        }
      });
    }
  }, [groupedBoxesForDialog, id]);

  // Helper to derive breakdown (Expected, Extra, Missing, Scanned Counts, Items) for each box
  const getBoxBreakdown = (boxNumber, currentTotalPcs) => {
    try {
      const savedStr = localStorage.getItem(`box_breakdown_${id}_${boxNumber}`);
      if (savedStr) {
        const parsed = JSON.parse(savedStr);
        if (parsed && typeof parsed.expected === "number") {
          return {
            expected: parsed.expected,
            matched: parsed.matched || 0,
            missing: parsed.missing || 0,
            extra: parsed.extra || 0,
            total: parsed.total || currentTotalPcs,
            scannedCounts: parsed.scannedCounts || {},
            items: parsed.items || [],
            isVerified: true,
          };
        }
      }
    } catch (e) {
      // ignore
    }

    // Default: not verified yet, so no extra or missing
    return {
      expected: currentTotalPcs,
      matched: 0,
      extra: 0,
      missing: 0,
      total: currentTotalPcs,
      scannedCounts: {},
      items: [],
      isVerified: false,
    };
  };

  const generateFactoryCode = (factoryName) => {
    if (!factoryName) return "";
    return factoryName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  };

  const formatBoxNumber = (boxNumber) => {
    const factoryCode = generateFactoryCode(workOrder.work_order_rc_factory);
    return `${factoryCode}${id}${boxNumber}`;
  };

  // ----- Excel Download Function -----
  const downloadExcel = () => {
    const selectedBoxes = [...checkedBoxes];

    if (selectedBoxes.length === 0) {
      toast({
        title: "Info",
        description: "Please select at least one box to export.",
        variant: "default",
      });
      return;
    }

    const filteredRows = tableRows.filter((row) =>
      selectedBoxes.includes(row.box),
    );

    if (filteredRows.length === 0) {
      toast({
        title: "Info",
        description: "No data found for selected boxes.",
        variant: "default",
      });
      return;
    }

    const selectedBoxData = selectedBoxes
      .map((box) => groupedBoxesForDialog[box])
      .filter(Boolean);
    const totalBoxes = selectedBoxes.length;
    const totalPcs = selectedBoxData.reduce(
      (sum, box) => sum + box.totalPcs,
      0,
    );

    // Prepare array of arrays (worksheet data)
    const wsData = [];

    // TITLE
    wsData.push(["PACKING RECEIPT"]);
    wsData.push([]);

    // SUMMARY
    wsData.push(["SUMMARY"]);

    // Factory name as title (without "Factory" label)
    const factoryName = workOrder.work_order_rc_factory || "";

    // Two‑column summary – Work Order No on the right
    const leftFields = [
      [factoryName],
      ["Brand", workOrder.work_order_rc_brand || ""],
      ["Date", moment(workOrder.work_order_rc_date).format("DD-MM-YYYY")],
    ];
    const rightFields = [
      ["Work Order Ref", workOrder.work_order_rc_id || ""],

      ["No of Box", totalBoxes.toString()],
      ["Total Pcs", totalPcs.toString()],
    ];
    const maxRows = Math.max(leftFields.length, rightFields.length);

    for (let i = 0; i < maxRows; i++) {
      const left = leftFields[i] || ["", ""];
      const right = rightFields[i] || ["", ""];
      wsData.push([left[0], left[1], "", right[0], right[1]]);
    }

    // BLANK ROW BEFORE DETAILS
    wsData.push([]);
    wsData.push(["DETAILS"]);
    wsData.push([]);

    // DETAILS – grouped by box
    const grouped = filteredRows.reduce((acc, row) => {
      if (!acc[row.box]) acc[row.box] = [];
      acc[row.box].push(row);
      return acc;
    }, {});

    const sortedBoxesSelected = Object.keys(grouped).sort(
      (a, b) => Number(a) - Number(b),
    );

    // Keep track of row indices for styling box headers
    const styleMap = {};

    sortedBoxesSelected.forEach((box, index) => {
      const headerRowIndex = wsData.length;
      const boxData = groupedBoxesForDialog[box] || { totalPcs: 0 };
      const isBoxReceived = isBoxReceivedCheck(box);
      const breakdown = getBoxBreakdown(box, boxData.totalPcs);

      const boxExpectedPcs = boxData.totalPcs || 0;
      let boxReceivedPcs = 0;
      let boxMissingPcs = boxExpectedPcs;
      let boxHeaderTitle = `Box ${box}`;
      let boxOverallStatus = "Not Received";

      if (isBoxReceived) {
        if (!breakdown.isVerified) {
          boxReceivedPcs = boxExpectedPcs;
          boxMissingPcs = 0;
          boxOverallStatus = "Completely Received";
          boxHeaderTitle = `Box ${box} - Completely Received (${boxExpectedPcs}/${boxExpectedPcs} Pcs)`;
        } else {
          boxReceivedPcs = breakdown.matched || 0;
          boxMissingPcs = breakdown.missing || 0;
          if (boxMissingPcs > 0) {
            boxOverallStatus = `Partially Received (${boxMissingPcs} Missing)`;
            boxHeaderTitle = `Box ${box} - Partially Received (${boxReceivedPcs}/${boxExpectedPcs} Pcs Received, ${boxMissingPcs} Missing)`;
          } else if (breakdown.extra > 0) {
            boxOverallStatus = `Completely Received (+${breakdown.extra} Extra)`;
            boxHeaderTitle = `Box ${box} - Completely Received (+${breakdown.extra} Extra Pcs)`;
          } else {
            boxOverallStatus = "Completely Received";
            boxHeaderTitle = `Box ${box} - Completely Received (${boxExpectedPcs}/${boxExpectedPcs} Pcs)`;
          }
        }
      } else {
        boxHeaderTitle = `Box ${box} - Not Received`;
      }

      wsData.push([boxHeaderTitle]); // This cell will be styled
      styleMap[headerRowIndex] = { bold: true, fontSize: 14 };

      wsData.push([
        "Barcode",
        "Size",
        "MRP",
        "Quantity",
        "Received Qty",
        "Missing Qty",
        "Status",
      ]);

      grouped[box].forEach((row) => {
        const expectedQty = row.quantity || 0;
        let receivedQty = 0;
        let missingQty = expectedQty;
        let status = "Not Received";

        if (isBoxReceived) {
          if (!breakdown.isVerified) {
            receivedQty = expectedQty;
            missingQty = 0;
            status = "Received";
          } else {
            const scannedQty = breakdown.scannedCounts?.[row.barcode] ?? 0;
            receivedQty = scannedQty;
            missingQty = Math.max(0, expectedQty - scannedQty);
            if (scannedQty === expectedQty) {
              status = "Received";
            } else if (scannedQty === 0) {
              status = "Not Received";
            } else if (scannedQty < expectedQty) {
              status = `Partially Received (${scannedQty}/${expectedQty})`;
            } else {
              status = `Received (+${scannedQty - expectedQty} Extra)`;
            }
          }
        }

        wsData.push([
          row.barcode,
          row.size,
          row.amount,
          expectedQty,
          receivedQty,
          missingQty,
          status,
        ]);
      });

      // Extra items verified for this box that were not in the original list
      if (breakdown.isVerified && Array.isArray(breakdown.items)) {
        breakdown.items
          .filter(
            (item) =>
              (item.expectedQty === 0 || !item.expectedQty) &&
              item.scannedQty > 0 &&
              !grouped[box].some((r) => r.barcode === item.barcode),
          )
          .forEach((extraItem) => {
            wsData.push([
              extraItem.barcode,
              extraItem.size || "-",
              extraItem.amount || "-",
              0,
              extraItem.scannedQty,
              0,
              `Extra Added (+${extraItem.scannedQty})`,
            ]);
          });
      }

      // Box Total Summary Row
      const totalRowIndex = wsData.length;
      wsData.push([
        `Box ${box} Total`,
        "",
        "",
        boxExpectedPcs,
        boxReceivedPcs,
        boxMissingPcs,
        boxOverallStatus,
      ]);
      styleMap[totalRowIndex] = { bold: true, fontSize: 11 };

      if (index < sortedBoxesSelected.length - 1) {
        wsData.push([]); // blank row as separator
      }
    });

    // Create worksheet from the array data
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws["!cols"] = [
      { wch: 18 }, // Barcode / Key
      { wch: 18 }, // Size / Value
      { wch: 12 }, // MRP / Spacer
      { wch: 14 }, // Quantity / Right key
      { wch: 15 }, // Received Qty / Right value
      { wch: 14 }, // Missing Qty
      { wch: 28 }, // Status
    ];

    // --- Apply styling to box headers and totals ---
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let r = range.s.r; r <= range.e.r; r++) {
      if (styleMap[r]) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r: r, c: c });
          if (ws[cellAddress]) {
            if (!ws[cellAddress].s) ws[cellAddress].s = {};
            ws[cellAddress].s.font = {
              bold: true,
              sz: styleMap[r].fontSize === 14 ? 24 : 11,
            };
          }
        }
      }
    }

    // Increase row height for those rows
    if (!ws["!rows"]) ws["!rows"] = [];
    Object.keys(styleMap).forEach((rowIdx) => {
      const isHeader = styleMap[rowIdx]?.fontSize === 14;
      ws["!rows"][parseInt(rowIdx)] = { hpt: isHeader ? 26 : 20 };
    });

    // Create workbook and save
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Packing Receipt");

    const fileName = `Packing${workOrder.work_order_rc_id}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };
  // ---------------------------------

  const updateMutation = useMutation({
    mutationFn: async (workOrderId) => {
      const token = localStorage.getItem("token");
      return await axios.put(
        `${BASE_URL}/api/update-work-order-received-finish-by-id/${workOrderId}`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    },
    onSuccess: (response) => {
      refetch();
      setDeleteConfirmOpen(false);
      toast({
        title: "Success",
        description: `${response?.data?.msg}`,
      });
      navigate("/order-received");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error closing dc receipt order",
      });
    },
  });

  const saveBoxVerificationMutation = useMutation({
    mutationFn: async ({ boxNumber, breakdown, updatedBarcodesList }) => {
      const token = localStorage.getItem("token");
      const workOrderRcRef =
        workOrder?.work_order_rc_ref || workOrder?.work_order_rc_id || id;

      const response = await axios.put(
        `${BASE_URL}/api/update-work-orders-received-status-box`,
        {
          box: boxNumber,
          work_order_rc_ref: workOrderRcRef,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return { res: response.data, boxNumber, breakdown, updatedBarcodesList };
    },
    onSuccess: ({ boxNumber, breakdown, updatedBarcodesList }) => {
      if (breakdown) {
        try {
          const exp = Number(breakdown.expected) || 0;
          localStorage.setItem(
            `box_breakdown_${id}_${boxNumber}`,
            JSON.stringify({
              expected: exp,
              matched: breakdown.matched || 0,
              missing: Math.max(0, exp - (breakdown.matched || 0)),
              extra: breakdown.extra || 0,
              total: updatedBarcodesList.length,
              scannedCounts: breakdown.scannedCounts || {},
              items: breakdown.items || [],
            }),
          );
        } catch (e) {
          console.error("Error saving box breakdown", e);
        }
      }

      toast({
        title: "Box Verified & Updated",
        description: `Box #${boxNumber} has been verified and updated successfully.`,
      });

      setBarcodeDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Failed to update box status",
      });
    },
  });

  const confirmCloseWorkOrder = () => {
    if (deleteWorkOrderId) {
      updateMutation.mutate(deleteWorkOrderId);
      setDeleteWorkOrderId(null);
    }
  };

  const updateBoxStatusMutation = useMutation({
    mutationFn: async (boxNumber) => {
      const token = localStorage.getItem("token");
      const workOrderRcRef =
        workOrder?.work_order_rc_ref || workOrder?.work_order_rc_id || id;
      const payload = {
        box: boxNumber,
        work_order_rc_ref: workOrderRcRef,
      };

      const response = await axios.put(
        `${BASE_URL}/api/update-work-orders-received-status-box`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return response.data;
    },
    onSuccess: (data, boxNumber) => {
      setReceiveConfirmOpen(false);
      setSelectedBoxToReceive(null);

      const willAllBeReceived =
        sortedBoxes.length > 0 &&
        sortedBoxes.every(
          (box) => String(box) === String(boxNumber) || isBoxReceivedCheck(box),
        );

      if (willAllBeReceived && !hasAutoClosedRef.current) {
        hasAutoClosedRef.current = true;
        toast({
          title: "Success",
          description: "All boxes received! Closing and marking order as received...",
        });
        closeAllOrderReceivedMutation.mutate();
      } else {
        toast({
          title: "Success",
          description: data?.message || data?.msg || "Box marked as received successfully",
        });
        refetch();
      }
    },
    onError: (error) => {
      setReceiveConfirmOpen(false);
      setSelectedBoxToReceive(null);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Error updating box received status",
      });
    },
  });

  const handleReceiveBoxClick = (boxNumber) => {
    setSelectedBoxToReceive(boxNumber);
    setReceiveConfirmOpen(true);
  };

  const confirmReceiveBox = () => {
    if (selectedBoxToReceive) {
      updateBoxStatusMutation.mutate(selectedBoxToReceive);
    }
  };

  const isBoxReceivedCheck = (boxNumber) => {
    if (isOrderReceived) return true;
    const boxSubItems = workOrderSub.filter(
      (item) => String(item.work_order_rc_sub_box || "1") === String(boxNumber),
    );
    return (
      boxSubItems.length > 0 &&
      boxSubItems.every(
        (item) =>
          item.work_order_rc_sub_status?.toLowerCase() === "received" ||
          item.status?.toLowerCase() === "received" ||
          item.work_order_rc_status?.toLowerCase() === "received",
      )
    );
  };

  const updateSelectedBoxesStatusMutation = useMutation({
    mutationFn: async (boxesToUpdate) => {
      const token = localStorage.getItem("token");
      const workOrderRcRef =
        workOrder?.work_order_rc_ref || workOrder?.work_order_rc_id || id;

      const promises = boxesToUpdate.map((boxNumber) => {
        const payload = {
          box: boxNumber,
          work_order_rc_ref: workOrderRcRef,
        };
        return axios.put(
          `${BASE_URL}/api/update-work-orders-received-status-box`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      });

      return await Promise.all(promises);
    },
    onSuccess: (_, boxesToUpdate) => {
      setReceiveSelectedConfirmOpen(false);
      setCheckedBoxes(new Set());

      const updatedBoxesSet = new Set((boxesToUpdate || []).map(String));
      const willAllBeReceived =
        sortedBoxes.length > 0 &&
        sortedBoxes.every(
          (box) => updatedBoxesSet.has(String(box)) || isBoxReceivedCheck(box),
        );

      if (willAllBeReceived && !hasAutoClosedRef.current) {
        hasAutoClosedRef.current = true;
        toast({
          title: "Success",
          description: "All boxes received! Closing and marking order as received...",
        });
        closeAllOrderReceivedMutation.mutate();
      } else {
        toast({
          title: "Success",
          description: "Selected box(es) marked as received successfully",
        });
        refetch();
      }
    },
    onError: (error) => {
      setReceiveSelectedConfirmOpen(false);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data?.message || "Error updating selected boxes status",
      });
    },
  });

  const selectedBoxesToReceiveList = useMemo(() => {
    return Array.from(checkedBoxes)
      .filter((box) => !isBoxReceivedCheck(box))
      .sort((a, b) => Number(a) - Number(b));
  }, [checkedBoxes, workOrderSub]);

  const handleReceiveSelectedClick = () => {
    if (checkedBoxes.size === 0) {
      toast({
        title: "Info",
        description: "Please select at least one box to mark as received.",
        variant: "default",
      });
      return;
    }
    if (selectedBoxesToReceiveList.length === 0) {
      toast({
        title: "Info",
        description: "All selected boxes are already marked as received.",
        variant: "default",
      });
      return;
    }
    setReceiveSelectedConfirmOpen(true);
  };

  const confirmReceiveSelectedBoxes = () => {
    if (selectedBoxesToReceiveList.length > 0) {
      updateSelectedBoxesStatusMutation.mutate(selectedBoxesToReceiveList);
    }
  };

  const isAllBoxesReceived = useMemo(() => {
    return (
      sortedBoxes.length > 0 &&
      sortedBoxes.every((box) => isBoxReceivedCheck(box))
    );
  }, [sortedBoxes, workOrderSub]);

  const closeAllOrderReceivedMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${BASE_URL}/api/update-work-orders-all-received-status/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description:
          data?.message ||
          data?.msg ||
          "Order closed and marked as received successfully",
      });
      navigate("/factory-outlet/received");
    },
    onError: (error) => {
      hasAutoClosedRef.current = false;
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data?.message || "Error closing order received",
      });
    },
  });


  const updateBoxNotReceivedStatusMutation = useMutation({
    mutationFn: async (boxNumber) => {
      const token = localStorage.getItem("token");
      const workOrderRcRef = workOrder?.work_order_rc_ref || id;
      const payload = {
        box: boxNumber,
        work_order_rc_ref: workOrderRcRef,
      };

      const response = await axios.put(
        `${BASE_URL}/api/update-work-orders-notreceived-status-box`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    },
    onSuccess: (data) => {
      setNotReceiveConfirmOpen(false);
      setSelectedBoxToNotReceive(null);
      hasAutoClosedRef.current = false;
      toast({
        title: "Success",
        description: data?.message || data?.msg || "Box received status undone successfully",
      });
      refetch();
    },
    onError: (error) => {
      setNotReceiveConfirmOpen(false);
      setSelectedBoxToNotReceive(null);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Error undoing box received status",
      });
    },
  });

  const handleNotReceiveBoxClick = (boxNumber) => {
    setSelectedBoxToNotReceive(boxNumber);
    setNotReceiveConfirmOpen(true);
  };

  const confirmNotReceiveBox = () => {
    if (selectedBoxToNotReceive) {
      updateBoxNotReceivedStatusMutation.mutate(selectedBoxToNotReceive);
    }
  };

  const updateSelectedBoxesNotReceivedStatusMutation = useMutation({
    mutationFn: async (boxesToUpdate) => {
      const token = localStorage.getItem("token");
      const workOrderRcRef = workOrder?.work_order_rc_ref || id;

      const promises = boxesToUpdate.map((boxNumber) => {
        const payload = {
          box: boxNumber,
          work_order_rc_ref: workOrderRcRef,
        };
        return axios.put(
          `${BASE_URL}/api/update-work-orders-notreceived-status-box`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      });

      return await Promise.all(promises);
    },
    onSuccess: () => {
      setNotReceiveSelectedConfirmOpen(false);
      setCheckedBoxes(new Set());
      hasAutoClosedRef.current = false;
      toast({
        title: "Success",
        description: "Selected box(es) marked as not received (undone) successfully",
      });
      refetch();
    },
    onError: (error) => {
      setNotReceiveSelectedConfirmOpen(false);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data?.message || "Error undoing selected boxes status",
      });
    },
  });

  const selectedBoxesToNotReceiveList = useMemo(() => {
    return Array.from(checkedBoxes)
      .filter((box) => isBoxReceivedCheck(box))
      .sort((a, b) => Number(a) - Number(b));
  }, [checkedBoxes, workOrderSub]);

  const handleNotReceiveSelectedClick = () => {
    if (checkedBoxes.size === 0) {
      toast({
        title: "Info",
        description: "Please select at least one box to undo received status.",
        variant: "default",
      });
      return;
    }
    if (selectedBoxesToNotReceiveList.length === 0) {
      toast({
        title: "Info",
        description: "None of the selected boxes are marked as received.",
        variant: "default",
      });
      return;
    }
    setNotReceiveSelectedConfirmOpen(true);
  };

  const confirmNotReceiveSelectedBoxes = () => {
    if (selectedBoxesToNotReceiveList.length > 0) {
      updateSelectedBoxesNotReceivedStatusMutation.mutate(
        selectedBoxesToNotReceiveList,
      );
    }
  };

  const openBarcodeDialog = (boxNumber, boxData) => {
    const breakdown = getBoxBreakdown(boxNumber, boxData.totalPcs);
    setSelectedBox({
      boxNumber,
      originalBarcodes: [...boxData.barcodes],
      currentBarcodes: [...boxData.barcodes],
      savedScannedCounts: breakdown.isVerified ? breakdown.scannedCounts : null,
    });
    setBarcodeDialogOpen(true);
  };

  // Target box filter from URL query param (?box=2) or navigation state
  const targetBoxParam = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get("box");
    if (fromQuery) return String(fromQuery).trim();

    const fromState = location.state?.singleBox || location.state?.autoOpenBox;
    if (fromState !== undefined && fromState !== null && fromState !== "") {
      return String(fromState).trim();
    }
    return null;
  }, [location.state, location.search]);

  const [activeBoxFilter, setActiveBoxFilter] = useState(targetBoxParam);

  useEffect(() => {
    setActiveBoxFilter(targetBoxParam);
  }, [targetBoxParam]);

  const displayedBoxes = useMemo(() => {
    if (!activeBoxFilter) return sortedBoxes;
    const filtered = sortedBoxes.filter(
      (b) => String(b).trim() === String(activeBoxFilter).trim()
    );
    return filtered.length > 0 ? filtered : sortedBoxes;
  }, [sortedBoxes, activeBoxFilter]);

  // When activeBoxFilter is set, auto-expand that box and smoothly scroll to it
  useEffect(() => {
    if (!activeBoxFilter) return;
    setExpandedBoxes((prev) => new Set([...prev, String(activeBoxFilter)]));

    setTimeout(() => {
      const boxElem = document.getElementById(`box-container-${activeBoxFilter}`);
      if (boxElem) {
        boxElem.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 250);
  }, [activeBoxFilter, sortedBoxes]);

  const handleSaveBoxBarcodes = (updatedBarcodesList, breakdown) => {
    if (!selectedBox) return;

    saveBoxVerificationMutation.mutate({
      boxNumber: selectedBox.boxNumber,
      breakdown,
      updatedBarcodesList,
    });
  };

  // Accurate piece-by-piece match calculation
  const getOriginalItemStatus = (index, barcode) => {
    if (!selectedBox) return "missing";
    const origList = selectedBox.originalBarcodes || [];
    const countBefore = origList
      .slice(0, index + 1)
      .filter((b) => b === barcode).length;
    const currentCount = (selectedBox.currentBarcodes || []).filter(
      (b) => b === barcode,
    ).length;
    return currentCount >= countBefore ? "matched" : "missing";
  };

  const getCurrentItemStatus = (index, barcode) => {
    if (!selectedBox) return "extra";
    const currList = selectedBox.currentBarcodes || [];
    const countBefore = currList
      .slice(0, index + 1)
      .filter((b) => b === barcode).length;
    const originalCount = (selectedBox.originalBarcodes || []).filter(
      (b) => b === barcode,
    ).length;
    return countBefore <= originalCount ? "matched" : "extra";
  };

  const toggleBox = (box) => {
    setCheckedBoxes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(box)) {
        newSet.delete(box);
      } else {
        newSet.add(box);
      }
      return newSet;
    });
  };

  const toggleBoxExpand = (box) => {
    setExpandedBoxes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(box)) {
        newSet.delete(box);
      } else {
        newSet.add(box);
      }
      return newSet;
    });
  };

  const isAllChecked =
    displayedBoxes.length > 0 && displayedBoxes.every((box) => checkedBoxes.has(box));

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setCheckedBoxes(new Set(displayedBoxes));
    } else {
      setCheckedBoxes(new Set());
    }
  };

  if (isLoading) {
    return <LoaderComponent name="Work Order Dc Receipt Data" />;
  }

  if (isError) {
    return (
      <ErrorComponent
        message="Error Fetching Work Order Dc Receipt Data"
        refetch={refetch}
      />
    );
  }

  return (
    <Page>
      <div className="max-w-full mx-auto">
        <Card className="shadow-lg border border-stone-200/80 rounded-2xl overflow-hidden bg-white">
          {/* Header and Packing Summary Details Section */}
          <div className="bg-white border-b border-stone-200/80 print:border-none">
            <CardHeader className="border-b py-3 px-4 bg-[#FDFBF7]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <span>Packing Receipt</span>
                    {displayWorkOrderNo && displayWorkOrderNo !== "-" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#A27B5C] text-white shadow-2xs">
                        REC/OZ/{displayWorkOrderNo}
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-gray-600">Total No of Boxes:</span>
                      <span className="font-semibold text-gray-900">{sortedBoxes.length}</span>
                    </span>
                    {activeBoxFilter && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                        Filtering Box #{activeBoxFilter}
                      </span>
                    )}
                    <span className="text-gray-300">|</span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-gray-600">Selected:</span>
                      <span className="font-bold text-blue-600">{checkedBoxes.size}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 print-hidden-custom flex-wrap">
                  {displayedBoxes.length > 0 && (
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none border rounded-md px-2.5 py-1.5 hover:bg-gray-50 transition-colors bg-white">
                      <input
                        type="checkbox"
                        ref={(el) => {
                          if (el) {
                            el.indeterminate =
                              checkedBoxes.size > 0 &&
                              checkedBoxes.size < displayedBoxes.length;
                          }
                        }}
                        checked={isAllChecked}
                        onChange={handleSelectAll}
                        className="w-4 h-4 cursor-pointer accent-primary"
                      />
                      <span>Select All</span>
                    </label>
                  )}

                  {/* Status indicator when order is already in Received section */}
                  {isOrderReceived && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Order Received
                    </span>
                  )}

                  {!isOrderReceived && selectedBoxesToReceiveList.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReceiveSelectedClick}
                      disabled={updateSelectedBoxesStatusMutation.isPending}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold"
                    >
                      <div className="flex items-center gap-1.5 cursor-pointer">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Received ({selectedBoxesToReceiveList.length})
                      </div>
                    </Button>
                  )}

                  {!isOrderReceived && selectedBoxesToNotReceiveList.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNotReceiveSelectedClick}
                      disabled={updateSelectedBoxesNotReceivedStatusMutation.isPending}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 font-semibold"
                    >
                      <div className="flex items-center gap-1.5 cursor-pointer">
                        <RotateCcw className="h-3.5 w-3.5 text-amber-700" />
                        Undo Received ({selectedBoxesToNotReceiveList.length})
                      </div>
                    </Button>
                  )}

                  {/* Finalizing indicator when auto-closing order */}
                  {closeAllOrderReceivedMutation.isPending && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                      Finalizing Order...
                    </div>
                  )}

                  {/* Excel Download Button */}
                  {checkedBoxes.size > 0 && (
                    <Button variant="outline" size="sm" onClick={downloadExcel}>
                      <div className="flex items-center gap-2 cursor-pointer">
                        <Download className="h-4 w-4" />
                        Excel ({checkedBoxes.size})
                      </div>
                    </Button>
                  )}

                  {/* Print Button - visible only when at least one box is checked */}
                  {checkedBoxes.size > 0 && (
                    <ReactToPrint
                      trigger={() => (
                        <Button variant="outline" size="sm" asChild>
                          <div className="flex items-center gap-2 cursor-pointer">
                            <Printer className="h-4 w-4" />
                            Print ({checkedBoxes.size})
                          </div>
                        </Button>
                      )}
                      content={() => componentRef.current}
                    />
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Header Table */}
            <div className="p-4 bg-white print-hidden-custom">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {/* Line 1: Factory | Brand | RC No | Date */}
                  <tr className="border-t border-l border-r border-black">
                    <td className="font-semibold p-1.5 w-[7rem] border-r">
                      Factory
                    </td>
                    <td className="p-1.5 w-[14rem] border-r">
                      : {workOrder.work_order_rc_factory}
                    </td>
                    <td className="font-semibold p-1.5 w-[5.5rem] text-right border-r">
                      Brand
                    </td>
                    <td className="p-1.5 w-[10rem] border-r">
                      : {workOrder.work_order_rc_brand}
                    </td>
                    <td className="font-semibold p-1.5 w-[5.5rem] text-right border-r">
                      RC No
                    </td>
                    <td className="p-1.5 w-[9rem] border-r font-bold text-stone-900">
                      : {displayWorkOrderNo && displayWorkOrderNo !== "-" ? `REC/OZ/${displayWorkOrderNo}` : "-"}
                    </td>
                    <td className="font-semibold p-1.5 w-[5rem] text-right border-r">
                      Date
                    </td>
                    <td className="p-1.5 w-[9rem]">
                      :{" "}
                      {moment(workOrder.work_order_rc_date).format(
                        "DD-MM-YYYY",
                      )}
                    </td>
                  </tr>

                  {/* Line 2: Work Order Ref | No of Box | Total Pcs | Remarks */}
                  <tr className="border-l border-r border-b border-black">
                    <td className="font-semibold p-1.5 w-[7rem] border-r">
                      Work Order Ref
                    </td>
                    <td className="p-1.5 w-[14rem] border-r">
                      : {workOrder.work_order_rc_id}
                    </td>
                    <td className="font-semibold p-1.5 w-[5.5rem] text-right border-r">
                      No of Box
                    </td>
                    <td className="p-1.5 w-[10rem] border-r">
                      : {workOrder.work_order_rc_box}
                    </td>
                    <td className="font-semibold p-1.5 w-[5.5rem] text-right border-r">
                      Total Pcs
                    </td>
                    <td className="p-1.5 w-[9rem] border-r">
                      : {workOrder.work_order_rc_pcs}
                    </td>
                    <td className="font-semibold p-1.5 w-[5rem] text-right border-r">
                      Remarks
                    </td>
                    <td className="p-1.5 w-[9rem] break-words">
                      : {workOrder.work_order_rc_remarks || "-"}
                    </td>
                  </tr>

                  {/* Commented out as requested: Work Order No, Packing Date, Received By
                  <tr>
                    <td>Work Order No: {displayWorkOrderNo}</td>
                    <td>Packing Date: {moment(workOrder.work_order_rc_dc_date).format("DD-MM-YYYY")}</td>
                    <td>Received By: {workOrder.work_order_rc_received_by}</td>
                  </tr>
                  */}
                </tbody>
              </table>
            </div>
          </div>

          <CardContent className="p-3 sm:p-4 bg-stone-50/40">
            <div ref={componentRef} className="rounded-xl print:p-4 print:bg-white">
              <style>{`
                @media print {
                  .print-hidden-custom {
                    display: none !important;
                  }
                  .print-visible-table-custom {
                    display: table !important;
                  }
                  .print-box-container {
                    display: block !important;
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                  }
                  .print-page-break {
                    break-after: page !important;
                    page-break-after: always !important;
                  }
                }
                @media screen {
                  .print-visible-table-custom {
                    display: none !important;
                  }
                }
              `}</style>

              {/* Banner when viewing a specific box */}
              {activeBoxFilter && (
                <div className="flex items-center justify-between p-3.5 mb-3 bg-[#FDFBF7] border border-[#A27B5C]/40 rounded-xl shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-[#A27B5C] text-white shadow-2xs">
                      Box #{activeBoxFilter}
                    </span>
                    <span className="text-sm font-medium text-stone-800">
                      Showing details for <strong>Box #{activeBoxFilter}</strong> only (Total {sortedBoxes.length} boxes in this order)
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveBoxFilter(null);
                      navigate(`/order-received/dc-receipt/${id}`, { replace: true });
                    }}
                    className="text-xs font-semibold h-8 bg-white border-stone-300 hover:bg-stone-100 text-stone-800 cursor-pointer shadow-2xs"
                  >
                    View All Boxes ({sortedBoxes.length})
                  </Button>
                </div>
              )}

              {/* Table grouped by box – all boxes visible on screen, only checked printed */}
              <div className="space-y-2.5">
                {displayedBoxes.map((box) => {
                  const isChecked = checkedBoxes.has(box);
                  const isExpanded = expandedBoxes.has(box);
                  const rows = groupedRows[box] || [];
                  const boxData = groupedBoxesForDialog[box] || {
                    barcodes: [],
                    totalPcs: 0,
                  };
                  const totalAmount = rows.reduce(
                    (sum, row) =>
                      sum + (parseFloat(row.amount) || 0) * (row.quantity || 1),
                    0,
                  );

                  const isBoxReceived = isBoxReceivedCheck(box);
                  const breakdown = getBoxBreakdown(box, boxData.totalPcs);

                  return (
                    <React.Fragment key={`box-frag-${box}`}>
                      {/* Box Container: Screen card style vs Print format */}
                      <div
                        id={`box-container-${box}`}
                        className={`rounded-xl border transition-all duration-200 overflow-hidden ${isChecked
                            ? "print-box-container border-[#A27B5C] bg-[#FDFBF7]/50 shadow-xs ring-1 ring-[#A27B5C]/20"
                            : "print-hidden-custom border-stone-200/90 bg-white hover:border-stone-300 shadow-2xs"
                          }`}
                      >
                        {/* Header Table for print only - shows before every box in print */}
                        <table className="w-full mb-4 border-collapse text-sm print-visible-table-custom">
                          <tbody>
                            {/* Line 1: Factory | Brand | RC No | Date */}
                            <tr className="border-t border-l border-r border-black">
                              <td className="font-semibold p-1.5 w-[7rem] border-r">
                                Factory
                              </td>
                              <td className="p-1.5 w-[14rem] border-r">
                                : {workOrder.work_order_rc_factory}
                              </td>
                              <td className="font-semibold p-1.5 w-[5.5rem] text-right border-r">
                                Brand
                              </td>
                              <td className="p-1.5 w-[10rem] border-r">
                                : {workOrder.work_order_rc_brand}
                              </td>
                              <td className="font-semibold p-1.5 w-[5.5rem] text-right border-r">
                                RC No
                              </td>
                              <td className="p-1.5 w-[9rem] border-r font-bold">
                                : {displayWorkOrderNo && displayWorkOrderNo !== "-" ? `REC/OZ/${displayWorkOrderNo}` : "-"}
                              </td>
                              <td className="font-semibold p-1.5 w-[5rem] text-right border-r">
                                Date
                              </td>
                              <td className="p-1.5 w-[9rem]">
                                :{" "}
                                {moment(workOrder.work_order_rc_date).format(
                                  "DD-MM-YYYY",
                                )}
                              </td>
                            </tr>

                            {/* Line 2: Work Order Ref | No of Box | Total Pcs | Remarks */}
                            <tr className="border-l border-r border-b border-black">
                              <td className="font-semibold p-1.5 w-[7rem] border-r">
                                Work Order Ref
                              </td>
                              <td className="p-1.5 w-[14rem] border-r">
                                : {workOrder.work_order_rc_id}
                              </td>
                              <td className="font-semibold p-1.5 w-[5.5rem] text-right border-r">
                                No of Box
                              </td>
                              <td className="p-1.5 w-[10rem] border-r">
                                : {workOrder.work_order_rc_box}
                              </td>
                              <td className="font-semibold p-1.5 w-[5.5rem] text-right border-r">
                                Total Pcs
                              </td>
                              <td className="p-1.5 w-[9rem] border-r">
                                : {workOrder.work_order_rc_pcs}
                              </td>
                              <td className="font-semibold p-1.5 w-[5rem] text-right border-r">
                                Remarks
                              </td>
                              <td className="p-1.5 w-[9rem] break-words">
                                : {workOrder.work_order_rc_remarks || "-"}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Box Header Bar (Screen View) */}
                        <div className="py-2 px-3 sm:px-4 bg-white border-b border-stone-100 flex items-center justify-between flex-wrap gap-2.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Checkbox – hidden when printing */}
                            <div className="print-hidden-custom flex items-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleBox(box)}
                                className="w-4 h-4 cursor-pointer accent-[#543D2B] rounded"
                              />
                            </div>

                            <span className="bg-[#E5D7C3] text-[#543D2B] font-bold text-xs px-2.5 py-0.5 rounded-md border border-[#D8C7B0]/80 shadow-2xs flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              Box #{box}
                            </span>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-800 text-xs font-semibold border border-stone-200">
                              Total Pcs: <strong className="text-stone-900 font-bold">{boxData.totalPcs}</strong>
                              {breakdown.isVerified && (
                                <span className="text-stone-600 font-normal ml-1">
                                  ({breakdown.matched} Received{breakdown.missing > 0 ? `, ${breakdown.missing} Missing` : ""}{breakdown.extra > 0 ? `, +${breakdown.extra} Extra` : ""})
                                </span>
                              )}
                            </span>

                            <div className="print-hidden-custom flex items-center gap-1.5">
                              {isBoxReceived && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Received
                                  </span>

                                  {breakdown.isVerified && breakdown.missing > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-300">
                                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                                      Partially Received ({breakdown.missing} Missing)
                                    </span>
                                  )}

                                  {breakdown.isVerified && breakdown.extra > 0 && breakdown.missing === 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-blue-50 text-blue-800 border border-blue-300">
                                      <PlusCircle className="h-3 w-3 text-blue-600" />
                                      Extra Added (+{breakdown.extra})
                                    </span>
                                  )}

                                  {!isOrderReceived && (
                                    <button
                                      type="button"
                                      onClick={() => handleNotReceiveBoxClick(box)}
                                      disabled={updateBoxNotReceivedStatusMutation.isPending}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors cursor-pointer"
                                      title="Undo received status for this box"
                                    >
                                      <RotateCcw className="h-3 w-3 text-amber-700" />
                                      Undo
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 print-hidden-custom flex-wrap">
                            {/* Check / Manage Barcodes Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openBarcodeDialog(box, boxData)}
                              className="h-7 text-xs font-semibold bg-white hover:bg-stone-50 border-stone-200 text-stone-700 rounded-lg px-2.5 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                            >
                              <Barcode className="h-3.5 w-3.5 text-[#543D2B]" />
                              Check Barcodes
                            </Button>

                            {/* Show / Hide Details Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleBoxExpand(box)}
                              className="h-7 text-xs font-semibold bg-white hover:bg-stone-50 border-stone-200 text-stone-700 rounded-lg px-2.5 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3.5 w-3.5 text-stone-500" />
                                  Hide Details
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3.5 w-3.5 text-stone-500" />
                                  Show Details
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Table is shown when expanded on screen, and always rendered when printing */}
                        <div className={`${isExpanded ? "block" : "hidden print:block"} p-2.5 sm:p-3 bg-white/70 border-t border-stone-100`}>
                          <div className="overflow-hidden rounded-lg border border-stone-200/80 print:rounded-none print:border-black">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="bg-[#E5D7C3] text-[#543D2B] print:bg-[#E5D7C3]">
                                  <th className="border-b border-stone-200 print:border p-2 print:p-1 text-left font-bold text-xs uppercase tracking-wider">
                                    Barcode
                                  </th>
                                  <th className="border-b border-stone-200 print:border p-2 print:p-1 text-center font-bold text-xs uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th className="border-b border-stone-200 print:border p-2 print:p-1 text-center font-bold text-xs uppercase tracking-wider">
                                    Size
                                  </th>
                                  <th className="border-b border-stone-200 print:border p-2 print:p-1 text-center font-bold text-xs uppercase tracking-wider">
                                    MRP (₹)
                                  </th>
                                  <th className="border-b border-stone-200 print:border p-2 print:p-1 text-right font-bold text-xs uppercase tracking-wider">
                                    Quantity
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-stone-100">
                                {rows.length > 0 || (breakdown.isVerified && breakdown.items?.length > 0) ? (
                                  <>
                                    {rows.map((row, idx) => {
                                      const isVerified = breakdown.isVerified;
                                      const scannedQty = isVerified
                                        ? (breakdown.scannedCounts?.[row.barcode] ?? 0)
                                        : null;
                                      const expectedQty = row.quantity || 0;

                                      return (
                                        <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                                          <td className="border-stone-200 print:border p-2 print:p-1 font-mono font-semibold text-stone-800 text-xs">
                                            {row.barcode}
                                          </td>
                                          <td className="border-stone-200 print:border p-2 print:p-1 text-center text-xs">
                                            {!isVerified ? (
                                              isBoxReceived ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                  Received
                                                </span>
                                              ) : (
                                                <span className="text-stone-400 text-xs font-medium">-</span>
                                              )
                                            ) : scannedQty === expectedQty ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                Matched ({scannedQty}/{expectedQty})
                                              </span>
                                            ) : scannedQty === 0 ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                                Missing ({expectedQty} pcs)
                                              </span>
                                            ) : scannedQty < expectedQty ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                                Missing: {expectedQty - scannedQty} (Matched: {scannedQty}/{expectedQty})
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-300">
                                                <PlusCircle className="w-3 h-3 text-blue-600" />
                                                Extra Added (+{scannedQty - expectedQty})
                                              </span>
                                            )}
                                          </td>
                                          <td className="border-stone-200 print:border p-2 print:p-1 text-center text-stone-700 text-xs">
                                            {row.size}
                                          </td>
                                          <td className="border-stone-200 print:border p-2 print:p-1 text-center font-mono text-stone-800 text-xs">
                                            {row.amount}
                                          </td>
                                          <td className="border-stone-200 print:border p-2 print:p-1 text-right font-bold text-stone-900 text-xs">
                                            {row.quantity}
                                          </td>
                                        </tr>
                                      );
                                    })}

                                    {/* Render any extra barcodes scanned that were not in the original packing list */}
                                    {breakdown.isVerified &&
                                      (breakdown.items || [])
                                        .filter(
                                          (item) =>
                                            (item.expectedQty === 0 || !item.expectedQty) &&
                                            item.scannedQty > 0 &&
                                            !rows.some((r) => r.barcode === item.barcode)
                                        )
                                        .map((extraItem, eIdx) => (
                                          <tr key={`extra-${eIdx}`} className="bg-blue-50/40 hover:bg-blue-50/70 transition-colors">
                                            <td className="border-stone-200 print:border p-2 print:p-1 font-mono font-semibold text-blue-950 text-xs">
                                              {extraItem.barcode}
                                            </td>
                                            <td className="border-stone-200 print:border p-2 print:p-1 text-center text-xs">
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-300">
                                                <PlusCircle className="w-3 h-3 text-blue-600" />
                                                Extra Added (+{extraItem.scannedQty})
                                              </span>
                                            </td>
                                            <td className="border-stone-200 print:border p-2 print:p-1 text-center text-stone-500 text-xs">
                                              {extraItem.size || "-"}
                                            </td>
                                            <td className="border-stone-200 print:border p-2 print:p-1 text-center font-mono text-stone-500 text-xs">
                                              {extraItem.amount || "-"}
                                            </td>
                                            <td className="border-stone-200 print:border p-2 print:p-1 text-right font-bold text-blue-950 text-xs">
                                              {extraItem.scannedQty}
                                            </td>
                                          </tr>
                                        ))}
                                  </>
                                ) : (
                                  <tr>
                                    <td colSpan={5} className="p-3 text-center text-stone-500 text-xs">
                                      No item barcodes registered for this box yet.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                              {/* {rows.length > 0 && (
                                <tfoot>
                                  <tr className="bg-stone-50/80 font-bold text-xs text-stone-900 border-t border-stone-200">
                                    <td colSpan={2} className="p-2 print:p-1 text-stone-600 font-semibold">
                                      Subtotal for Box #{box}
                                    </td>
                                    <td className="p-2 print:p-1 text-center font-mono font-bold text-[#543D2B]">
                                      ₹{totalAmount.toLocaleString()}
                                    </td>
                                    <td className="p-2 print:p-1 text-right font-bold text-[#543D2B]">
                                      {boxData.totalPcs} Pcs
                                    </td>
                                  </tr>
                                </tfoot>
                              )} */}
                            </table>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2-Step Barcode Scanner & Comparison Modal */}
      <BoxBarcodeScannerModal
        open={barcodeDialogOpen}
        onOpenChange={setBarcodeDialogOpen}
        boxNumber={selectedBox?.boxNumber}
        formattedBoxTitle={selectedBox ? formatBoxNumber(selectedBox.boxNumber) : ""}
        expectedItems={selectedBox ? (groupedRows[selectedBox.boxNumber] || []) : []}
        initialBarcodes={selectedBox?.currentBarcodes || []}
        originalBarcodes={selectedBox?.originalBarcodes || []}
        savedScannedCounts={selectedBox?.savedScannedCounts}
        onSave={handleSaveBoxBarcodes}
        isSaving={saveBoxVerificationMutation.isPending}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Close Packing Receipt Order?"
        description="Are you sure you want to close this Packing Receipt and mark all materials as received?"
        variant="warning"
        confirmText="Yes, Close Order"
        cancelText="No"
        onConfirm={confirmCloseWorkOrder}
        isLoading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={receiveConfirmOpen}
        onOpenChange={setReceiveConfirmOpen}
        title={`Mark Box ${selectedBoxToReceive} as Received?`}
        description={`Are you sure you want to mark Box ${selectedBoxToReceive} as received?`}
        variant="success"
        confirmText="Yes, Mark Received"
        cancelText="Cancel"
        onConfirm={confirmReceiveBox}
        isLoading={updateBoxStatusMutation.isPending}
      />

      <ConfirmDialog
        open={receiveSelectedConfirmOpen}
        onOpenChange={setReceiveSelectedConfirmOpen}
        title={`Mark ${selectedBoxesToReceiveList.length} Selected Box(es) as Received?`}
        description={`Are you sure you want to mark Box ${selectedBoxesToReceiveList.join(", ")} as received?`}
        variant="success"
        confirmText="Yes, Mark Received"
        cancelText="Cancel"
        onConfirm={confirmReceiveSelectedBoxes}
        isLoading={updateSelectedBoxesStatusMutation.isPending}
      />

      <ConfirmDialog
        open={notReceiveConfirmOpen}
        onOpenChange={setNotReceiveConfirmOpen}
        title={`Undo Received Status for Box ${selectedBoxToNotReceive}?`}
        description={`Are you sure you want to undo received status and mark Box ${selectedBoxToNotReceive} as not received?`}
        variant="warning"
        confirmText="Yes, Undo Received"
        cancelText="Cancel"
        onConfirm={confirmNotReceiveBox}
        isLoading={updateBoxNotReceivedStatusMutation.isPending}
      />

      <ConfirmDialog
        open={notReceiveSelectedConfirmOpen}
        onOpenChange={setNotReceiveSelectedConfirmOpen}
        title={`Undo Received Status for ${selectedBoxesToNotReceiveList.length} Selected Box(es)?`}
        description={`Are you sure you want to undo received status and mark Box ${selectedBoxesToNotReceiveList.join(", ")} as not received?`}
        variant="warning"
        confirmText="Yes, Undo Received"
        cancelText="Cancel"
        onConfirm={confirmNotReceiveSelectedBoxes}
        isLoading={updateSelectedBoxesNotReceivedStatusMutation.isPending}
      />
    </Page>
  );
};

export default DcReceiptReceived;
