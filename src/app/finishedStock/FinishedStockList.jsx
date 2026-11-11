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
  ArrowUpDown,
  ChevronDown,
  Download,
  Edit,
  Eye,
  Loader2,
  Search,
  SquareChevronRight,
  SquarePlus,
  Trash,
  UserPen,
  View,
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

import BASE_URL from "@/config/BaseUrl";

import { useNavigate } from "react-router-dom";

import { ButtonConfig } from "@/config/ButtonConfig";

import {
  ErrorComponent,
  LoaderComponent,
} from "@/components/LoaderComponent/LoaderComponent";

import Page from "@/app/dashboard/page";

const FinishedStockList = () => {
  const {
    data: finalStock = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["finalStock"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/api/fetch-work-order-final-stock-list`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response?.data?.finalStock || response?.data?.data || (Array.isArray(response?.data) ? response.data : []);
    },
  });

  // State for table management
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const navigate = useNavigate();

  // Define columns for the table
  const columns = [
    // {
    //   id: "sl_no",
    //   header: "Sl. No.",
    //   cell: ({ row, table }) => {
    //     const { pageIndex, pageSize } = table.getState().pagination;
    //     return (
    //       <span className="font-semibold text-stone-700 text-xs">
    //         {pageIndex * pageSize + row.index + 1}
    //       </span>
    //     );
    //   },
    // },
    {
      accessorKey: "work_order_rc_sub_barcode",
      id: "T Code",
      header: "T Code",
      cell: ({ row }) => (
        <span className="font-semibold text-stone-800">
          {row.getValue("T Code")}
        </span>
      ),
    },
    {
      accessorKey: "work_order_sub_brand",
      id: "Brand",
      header: "Brand",
      cell: ({ row }) => (
        <span className="text-stone-700">{row.getValue("Brand")}</span>
      ),
    },
    // {
    //   accessorKey: "work_order_sub_length",
    //   id: "Length",
    //   header: "Length",
    //   cell: ({ row }) => (
    //     <span className="text-stone-700">{row.getValue("Length")}</span>
    //   ),
    // },
    {
      accessorKey: "total_received",
      id: "Received",
      header: "Received",
      cell: ({ row }) => (
        <span className="font-semibold text-emerald-700">
          {row.getValue("Received")}
        </span>
      ),
    },
    {
      accessorKey: "total_sales",
      id: "Sales",
      header: "Sales",
      cell: ({ row }) => (
        <span className="font-semibold text-amber-700">
          {row.getValue("Sales")}
        </span>
      ),
    },
    {
      accessorKey: "total_sales_return",
      id: "Sales Return",
      header: "Sales Return",
      cell: ({ row }) => (
        <span className="font-semibold text-blue-700">
          {row.getValue("Sales Return") ?? 0}
        </span>
      ),
    },
    {
      id: "Balance",
      header: "Balance",
      accessorFn: (row) => {
        const received = Number(row.total_received) || 0;
        const sales = Number(row.total_sales) || 0;
        const salesReturn = Number(row.total_sales_return) || 0;
        return received - sales + salesReturn;
      },
      cell: ({ row }) => {
        const balance = row.getValue("Balance");
        return (
          <span
            className={`font-semibold ${balance > 0 ? "text-stone-800" : "text-stone-400"
              }`}
          >
            {balance}
          </span>
        );
      },
    },
    {
      accessorKey: "finished_stock_amount",
      id: "Amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-semibold text-stone-800">
          {row.getValue("Amount")}
        </span>
      ),
    },
  ];

  // Create the table instance
  const table = useReactTable({
    data: finalStock || [],
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

  // Render loading state
  if (isLoading) {
    return <LoaderComponent name="Work Order Final Stock Data" />;
  }

  // Render error state
  if (isError) {
    return (
      <ErrorComponent
        message="Error Fetching Work Order Final Stock Data"
        refetch={refetch}
      />
    );
  }

  return (
    <Page>
      <div className="w-full space-y-3.5 pt-1">
        {/* Unified Top Header & Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-[#FDFBF7] border border-stone-200/80 px-5 py-3.5 rounded-2xl shadow-2xs">
          <div>
            <h1 className="font-heading text-lg font-bold text-stone-800 tracking-tight leading-none mt-0.5">
              Inventory   Stock
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-64 flex items-center">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
              <Input
                placeholder="Search final stock..."
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
          </div>
        </div>

        {/* Table Container */}
        <div className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="bg-[#F5F2EB] border-b border-stone-200/80 hover:bg-[#F5F2EB]"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-stone-700 font-bold text-xs uppercase tracking-wider py-3"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
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
                      className="hover:bg-[#FBF9F5] transition-colors border-b border-stone-100"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="py-2.5 px-4 text-xs text-stone-700"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-28 text-center text-stone-400 text-xs"
                    >
                      No finished stock records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination & Summary */}
        <div className="flex items-center justify-between px-2 pt-1 pb-4">
          <div className="text-xs text-stone-500 font-medium">
            Total Finished Items : &nbsp;
            <span className="font-semibold text-stone-700">
              {table.getFilteredRowModel().rows.length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-3 border-stone-200 text-stone-600 hover:bg-[#F5F2EB] disabled:opacity-40 text-xs rounded-lg shadow-2xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-3 border-stone-200 text-stone-600 hover:bg-[#F5F2EB] disabled:opacity-40 text-xs rounded-lg shadow-2xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </Page>
  );
};

export default FinishedStockList;