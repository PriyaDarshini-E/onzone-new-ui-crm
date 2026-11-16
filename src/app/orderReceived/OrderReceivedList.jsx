import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDown,
  Edit,
  Loader2,
  Package,
  ReceiptText,
  Search,
  SquarePlus,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // <- import dialog
import BASE_URL from "@/config/BaseUrl";
import { useNavigate } from "react-router-dom";
import { ButtonConfig } from "@/config/ButtonConfig";
import {
  ErrorComponent,
  LoaderComponent,
} from "@/components/LoaderComponent/LoaderComponent";
import Page from "@/app/dashboard/page";
import moment from "moment";

const OrderReceivedList = () => {
  // ----- fetch data -----
  const {
    data: workorderrc,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["workorderrc"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/api/fetch-work-order-received-list`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data.workorderrc;
    },
  });

  // ----- table state -----
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const navigate = useNavigate();

  // ----- confirmation dialog state -----
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmOrderId, setConfirmOrderId] = useState(null);

  // ----- mutation for updating status -----
  const [updatingId, setUpdatingId] = useState(null);
  const updateStatusMutation = useMutation({
    mutationFn: async (id) => {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${BASE_URL}/api/update-work-orders-received-factory-status/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data;
    },
    onMutate: (id) => {
      setUpdatingId(id);
    },
    onSuccess: () => {
      refetch();
    },
    onSettled: () => {
      setUpdatingId(null);
      setConfirmDialogOpen(false); // close dialog after completion
      setConfirmOrderId(null);
    },
    onError: (error) => {
      console.error("Update status error:", error);
      setConfirmDialogOpen(false);
      setConfirmOrderId(null);
      // Optionally show toast error here
    },
  });

  // ----- handle dialog confirm -----
  const handleConfirm = () => {
    if (confirmOrderId) {
      updateStatusMutation.mutate(confirmOrderId);
    }
  };

  // ----- columns definition -----
  const columns = [
    {
      id: "sl_no",
      header: "Sl. No.",
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination;
        return (
          <span className="font-semibold text-stone-700 text-xs">
            {pageIndex * pageSize + row.index + 1}
          </span>
        );
      },
    },
    {
      id: "Work Order Rc No",
      header: "Work Order Rc No",
      accessorFn: (row) => {
        const val = row?.work_order_rc_no;
        if (!val && val !== 0) return "-";
        const str = String(val).trim();
        if (!str || str === "-") return "-";
        return /^REC\/OZ\//i.test(str) ? str.toUpperCase() : `REC/OZ/${str}`;
      },
      cell: ({ getValue }) => <div>{getValue()}</div>,
    },
    {
      id: "Work Order Ref",
      header: "Work Order Ref",
      accessorFn: (row) => {
        const val = row?.work_order_rc_w_ref;
        if (!val || typeof val !== "string") return "-";
        return val
          .split(",")
          .map((item) =>
            item
              .trim()
              .replace(
                /\/(?:(19|20)?\d{2}[-\u2013\u2014]\d{2,4}|(19|20)\d{2})$/,
                ""
              )
          )
          .join(", ");
      },
      cell: ({ getValue }) => <div>{getValue() || "-"}</div>,
    },
    {
      accessorKey: "work_order_rc_date",
      id: "Date",
      header: "Date",
      cell: ({ row }) => {
        const date = row.getValue("Date");
        return (
          <span className="text-stone-600 whitespace-nowrap font-medium">
            {date ? moment(date).format("DD-MMM-YYYY") : "-"}
          </span>
        );
      },
    },
    {
      accessorKey: "work_order_rc_factory",
      id: "Factory",
      header: "Factory",
      cell: ({ row }) => <div>{row.getValue("Factory")}</div>,
    },
    {
      accessorKey: "work_order_rc_brand",
      id: "Brand",
      header: "Brand",
      cell: ({ row }) => <div>{row.getValue("Brand")}</div>,
    },
    {
      accessorKey: "work_order_rc_status",
      id: "Status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("Status");
        const statusColors = {
          Active: "bg-green-100 text-green-800",
          Received: "bg-red-100 text-red-800",
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs ${
              statusColors[status] || "bg-gray-100 text-gray-800"
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const orderReceivedId = row.original.id;
        const orderReceivedStatus = row.original.work_order_rc_status;
        const userType = localStorage.getItem("userType");

        return (
          <div className="flex flex-row">
            {/* Edit */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      navigate(
                        `/order-received/edit-order-received/${orderReceivedId}`,
                      )
                    }
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Packing List */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      navigate(
                        `/order-received/view-order-received/${orderReceivedId}`,
                      )
                    }
                  >
                    <Package className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
  ];

  // ----- table instance -----
  const table = useReactTable({
    data: workorderrc || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 7,
      },
    },
  });

  // ----- loading / error -----
  if (isLoading) return <LoaderComponent name="Work Order Received Data" />;
  if (isError)
    return (
      <ErrorComponent
        message="Error Fetching Work Order Received Data"
        refetch={refetch}
      />
    );

  return (
    <Page>
      <div className="w-full space-y-3.5 pt-1">
        {/* Unified Top Header & Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-[#FDFBF7] border border-stone-200/80 px-5 py-3.5 rounded-2xl shadow-2xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#A27B5C]">
              Factory Outward
            </span>
            <h1 className="font-heading text-lg font-bold text-stone-800 tracking-tight leading-none mt-0.5">
              {localStorage.getItem("userType") == 4
                ? "New Packaging Slip List"
                : "Factory Outward List"}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-64 flex items-center">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
              <Input
                placeholder="Search factory outward..."
                value={table.getState().globalFilter || ""}
                onChange={(event) => table.setGlobalFilter(event.target.value)}
                className="h-9 pl-9 pr-3 text-xs bg-white border-stone-200 focus:border-[#A27B5C] focus:ring-[#A27B5C]/20 rounded-xl text-stone-800 shadow-2xs"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-stone-200 text-stone-700 hover:bg-[#F5F2EB] rounded-xl text-xs shadow-2xs"
                >
                  Columns <ChevronDown className="ml-1.5 h-3.5 w-3.5 text-stone-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[#FDFBF7] border border-stone-200/80 rounded-xl shadow-lg"
              >
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize text-stone-700 text-xs focus:bg-[#F5F2EB]"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {localStorage.getItem("userType") == "4" ? (
              <Button
                variant="default"
                className="h-9 bg-[#A27B5C] hover:bg-[#8C6547] text-white shadow-2xs rounded-xl font-medium px-3 text-xs flex items-center gap-1.5"
                onClick={() => navigate("/work-order/factory-create-work-order")}
              >
                <SquarePlus className="h-4 w-4" /> New Packaging Slip
              </Button>
            ) : (
              <Button
                variant="default"
                className="h-9 bg-[#A27B5C] hover:bg-[#8C6547] text-white shadow-2xs rounded-xl font-medium px-3 text-xs flex items-center gap-1.5"
                onClick={() => navigate("/order-received/add-order-received")}
              >
                <SquarePlus className="h-4 w-4" /> New Outward
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-stone-200/80 bg-white shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-stone-200/80 bg-[#F5F2EB]/90 hover:bg-[#F5F2EB]"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-stone-800 font-semibold text-xs uppercase tracking-wider py-3.5 px-4"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="border-b border-stone-100 hover:bg-stone-50/70 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="py-3 px-4 text-sm text-stone-700"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-28 text-center text-stone-400 text-sm"
                  >
                    No outward records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between py-2 text-xs text-stone-500">
          <div>
            Total Factory Outward:&nbsp;
            <span className="font-semibold text-stone-800">
              {table.getFilteredRowModel().rows.length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 border-stone-200 text-stone-700 hover:bg-[#F5F2EB] rounded-xl text-xs shadow-2xs disabled:opacity-40"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 border-stone-200 text-stone-700 hover:bg-[#F5F2EB] rounded-xl text-xs shadow-2xs disabled:opacity-40"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="bg-[#FDFBF7] border border-stone-200/80 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-stone-900 font-bold">
              Confirm Completion
            </DialogTitle>
            <DialogDescription className="text-stone-600 text-xs">
              Do you want to mark this order as <strong>Sent</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-stone-200 text-stone-700 hover:bg-[#F5F2EB] rounded-xl text-xs"
              onClick={() => {
                setConfirmDialogOpen(false);
                setConfirmOrderId(null);
              }}
            >
              No
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={updateStatusMutation.isLoading}
              className="bg-[#A27B5C] hover:bg-[#8C6547] text-white rounded-xl text-xs shadow-2xs"
            >
              {updateStatusMutation.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Yes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
};

export default OrderReceivedList;
