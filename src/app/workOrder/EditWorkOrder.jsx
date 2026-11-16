import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Send, ArrowLeft, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Select from "react-select";
import { Textarea } from "@/components/ui/textarea";

import axios from "axios";

import {
  useFetchBrand,
  useFetchWidth,
  useFetchStyle,
  useFetchRatio,
  useFetchHalfRatio,
  useFetchFactory,
  useFetchCurrentYear,
} from "../../hooks/useApi";
import * as z from "zod";
import BASE_URL from "@/config/BaseUrl";
import Page from "../dashboard/page";
import { useToast } from "@/hooks/use-toast";
import {
  ErrorComponent,
  LoaderComponent,
} from "@/components/LoaderComponent/LoaderComponent";

const formSchema = z.object({
  work_order_year: z.string(),
  work_order_factory_no: z.string().min(1, "Factory is required"),
  work_order_brand: z.string().min(1, "Brand is required"),
  work_order_brand_other: z.string().optional(),
  work_order_style_type: z.string().default("Chinese Collar"),
  work_order_width: z.string().min(1, "Width is required"),
  work_order_count: z.number(),
  work_order_remarks: z.string().optional(),
  work_order_38_39: z.string().optional(),
  workorder_sub_data: z.array(
    z.object({
      work_order_sub_selection_id: z.string().min(1, "T Code is required"),
      work_order_sub_36_h: z.union([z.string(), z.number()]).transform(String),
      work_order_sub_38_h: z.union([z.string(), z.number()]).transform(String),
      work_order_sub_40_h: z.union([z.string(), z.number()]).transform(String),
      work_order_sub_42_h: z.union([z.string(), z.number()]).transform(String),
      work_order_sub_44_h: z.union([z.string(), z.number()]).transform(String),
      work_order_sub_46_h: z.union([z.string(), z.number()]).transform(String),
      work_order_sub_48_h: z.union([z.string(), z.number()]).transform(String),
      work_order_sub_50_h: z.union([z.string(), z.number()]).transform(String),
      work_order_sub_a: z.string().min(1, "A is required"),
      work_order_sub_b: z.string(),
      work_order_sub_c: z.string(),
      work_order_sub_length: z.string().min(1, "Length  is required"),
      work_order_sub_new_length: z.string(),
      work_order_sub_half_shirt: z.string().min(1, "Half Shirt is required"),
      work_order_sub_full_shirt: z.string().min(1, "Full Shirt is required"),
      work_order_sub_amount: z.string().min(1, "Mrp is required"),
    }),
  ),
  work_order_ratio: z.string().min(1, "Full ratio is required"),
  work_order_ratio_consumption: z
    .string()
    .min(1, "Full consumption is required"),
  work_order_ratio_h: z.string().min(1, "Half ratio is required"),
  work_order_ratio_h_consumption: z
    .string()
    .min(1, "Half consumption is required"),
});

const EditWorkOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: brandData } = useFetchBrand();
  const { data: widthData } = useFetchWidth();
  const { data: ratioData } = useFetchRatio();
  const { data: halfRatioData } = useFetchHalfRatio();
  const { data: factoryData } = useFetchFactory();

  const useTemplate = {
    work_order_sub_selection_id: "",
    work_order_sub_36_h: "0",
    work_order_sub_38_h: "0",
    work_order_sub_40_h: "0",
    work_order_sub_42_h: "0",
    work_order_sub_44_h: "0",
    work_order_sub_46_h: "0",
    work_order_sub_48_h: "0",
    work_order_sub_50_h: "0",
    work_order_sub_a: "",
    work_order_sub_b: "",
    work_order_sub_c: "",
    work_order_sub_length: "",
    work_order_sub_new_length: "",
    work_order_sub_half_shirt: "",
    work_order_sub_full_shirt: "",
    work_order_sub_amount: "",
  };

  const [workorder, setWorkOrder] = useState({
    work_order_year: "",
    work_order_factory_no: "",
    work_order_brand: "",
    work_order_brand_other: "",
    work_order_style_type: "Chinese Collar",
    work_order_width: "",
    work_order_count: 0,
    work_order_remarks: "",
    work_order_ratio: "",
    work_order_ratio_consumption: "",
    work_order_ratio_h: "",
    work_order_ratio_h_consumption: "",
    work_order_no: "",
    work_order_38_39: "No",
  });

  const [work_order_count, setCount] = useState(0);
  const [ratioValue, setRatioValue] = useState("");
  const [removedRows, setRemovedRows] = useState([]);
  const [users, setUsers] = useState([{ ...useTemplate }]);
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);

  // Fetch work order data
  const {
    data: workorderData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["workorder", id],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/api/fetch-work-order-by-id/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    },
  });

  useEffect(() => {
    if (workorderData && !isInitialDataLoaded) {
      const { workorder: wo, workordersub: wos } = workorderData;

      // Set main work order data
      setWorkOrder({
        work_order_year: wo?.work_order_year || "",
        work_order_factory_no: String(wo?.work_order_factory_no || ""),
        work_order_brand: wo?.work_order_brand || "",
        work_order_brand_other: wo?.work_order_brand_other || "",
        work_order_style_type: wo?.work_order_style_type || "Chinese Collar",
        work_order_width: wo?.work_order_width || "",
        work_order_count: wo?.work_order_count || 0,
        work_order_remarks: wo?.work_order_remarks || "",
        work_order_ratio: wo?.work_order_ratio || "",
        work_order_ratio_consumption: wo?.work_order_ratio_consumption || "",
        work_order_ratio_h: wo?.work_order_ratio_h || "",
        work_order_ratio_h_consumption:
          wo?.work_order_ratio_h_consumption || "",
        work_order_no: wo?.work_order_no || "",
        work_order_38_39: wo?.work_order_38_39 || "No",
      });

      setRatioValue(wo?.work_order_ratio_h || "");
      setCount(wo?.work_order_count || 0);

      // Set sub items data
      if (wos && wos.length > 0) {
        const mappedUsers = wos.map((sub) => ({
          id: sub.id,
          work_order_sub_selection_id: sub.work_order_sub_barcode || "",
          work_order_sub_36_h: String(sub.work_order_sub_36_h || 0),
          work_order_sub_38_h: String(sub.work_order_sub_38_h || 0),
          work_order_sub_40_h: String(sub.work_order_sub_40_h || 0),
          work_order_sub_42_h: String(sub.work_order_sub_42_h || 0),
          work_order_sub_44_h: String(sub.work_order_sub_44_h || 0),
          work_order_sub_46_h: String(sub.work_order_sub_46_h || 0),
          work_order_sub_48_h: String(sub.work_order_sub_48_h || 0),
          work_order_sub_50_h: String(sub.work_order_sub_50_h || 0),
          work_order_sub_a: String(sub.work_order_sub_a || ""),
          work_order_sub_b: String(sub.work_order_sub_b || ""),
          work_order_sub_c: String(sub.work_order_sub_c || ""),
          work_order_sub_length: String(sub.work_order_sub_length || 0),
          work_order_sub_new_length: String(
            sub.work_order_sub_new_length || "",
          ),
          work_order_sub_half_shirt: String(sub.work_order_sub_half_total || 0),
          work_order_sub_full_shirt: String(sub.work_order_sub_full_total || 0),
          work_order_sub_amount: String(sub.work_order_sub_amount || 0),
        }));
        setUsers(mappedUsers);
      } else {
        setUsers([{ ...useTemplate }]);
      }

      setIsInitialDataLoaded(true);
    }
  }, [workorderData, isInitialDataLoaded]);

  const generateNextTCode = (lastTCode) => {
    if (!lastTCode || lastTCode === "") return "1";

    const match = lastTCode.match(/^([A-Za-z]*)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const number = parseInt(match[2]) + 1;
      return prefix + number;
    } else {
      if (/^[A-Za-z]+$/.test(lastTCode)) {
        return lastTCode + "1";
      }
      if (/^\d+$/.test(lastTCode)) {
        return (parseInt(lastTCode) + 1).toString();
      }
      return lastTCode + "1";
    }
  };

  const addItem = () => {
    const tempUsers = [...users];
    const selectedValue = tempUsers.length;

    let nextTCode = "1";
    if (selectedValue > 0) {
      const lastTCode =
        tempUsers[selectedValue - 1].work_order_sub_selection_id;
      nextTCode = generateNextTCode(lastTCode);
    }

    tempUsers.push({
      ...useTemplate,
      work_order_sub_selection_id: nextTCode,
    });

    setUsers(tempUsers);
    setCount(work_order_count + 1);
  };

  const onChange = (e, index) => {
    const updatedUsers = users.map((user, i) =>
      index === i ? { ...user, [e.target.name]: e.target.value } : user,
    );
    setUsers(updatedUsers);
  };

  const removeUser = (index) => {
    const userToRemove = users[index];

    if (!userToRemove.id) {
      const updatedUsers = users.filter((_, i) => i !== index);
      setUsers(updatedUsers);
      setCount(work_order_count - 1);
      return;
    }

    const updatedUsers = [...users];
    updatedUsers[index].markedForRemoval =
      !updatedUsers[index].markedForRemoval;
    setUsers(updatedUsers);

    if (updatedUsers[index].markedForRemoval) {
      setRemovedRows([...removedRows, userToRemove.id]);
    } else {
      setRemovedRows(removedRows.filter((id) => id !== userToRemove.id));
    }
  };

  const calculateHalfValues = (index, field, value) => {
    const newValue = halfRatioData?.half_ratio?.find(
      (item) => item.ratio_range === ratioValue,
    );
    if (!newValue) return;

    const tempUsers = [...users];

    tempUsers[index][`work_order_sub_${field}`] = value;

    const parts = newValue.ratio_type.split(",");

    ["38", "40", "42", "44", "46", "48", "50"].forEach((size, i) => {
      if (parts[i] && parts[i][1] === field) {
        tempUsers[index][`work_order_sub_${size}_h`] =
          parseFloat(value) *
          parseFloat(parts[i].replace(/\D/g, "")).toString();
      }
    });

    const halfShirtTotal = ["38", "40", "42", "44", "46", "48", "50"].reduce(
      (sum, size) =>
        sum + parseFloat(tempUsers[index][`work_order_sub_${size}_h`] || 0),
      0,
    );

    tempUsers[index].work_order_sub_half_shirt = halfShirtTotal.toFixed(2);

    const length = parseFloat(tempUsers[index].work_order_sub_length || 0);
    const fullShirt = (
      (length -
        halfShirtTotal *
          parseFloat(workorder.work_order_ratio_h_consumption || 0)) /
      parseFloat(workorder.work_order_ratio_consumption || 1)
    ).toFixed(2);

    tempUsers[index].work_order_sub_full_shirt = fullShirt;

    setUsers(tempUsers);

    const hasNegative = tempUsers.some(
      (user) => Math.sign(parseFloat(user.work_order_sub_full_shirt)) === -1,
    );

    if (hasNegative) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Shortage of Cloth",
      });
    }
  };

  const HalfA1 = (index, value) => calculateHalfValues(index, "a", value);
  const HalfB1 = (index, value) => calculateHalfValues(index, "b", value);
  const HalfC1 = (index, value) => calculateHalfValues(index, "c", value);

  const validateOnlyNumber = (inputtxt) => {
    const phoneno = /^\d*\.?\d*$/;
    return phoneno.test(inputtxt) || inputtxt.length === 0;
  };

  const onInputChange = (e) => {
    const { name, value } = e.target;

    if (
      name === "work_order_ratio_consumption" ||
      name === "work_order_ratio_h_consumption"
    ) {
      if (validateOnlyNumber(value)) {
        setWorkOrder({ ...workorder, [name]: value });
      }
    } else {
      setWorkOrder({ ...workorder, [name]: value });
    }
  };

  // Update mutation for submit api
  const updateWorkOrderMutation = useMutation({
    mutationFn: async (data) => {
      const response = await axios.put(
        `${BASE_URL}/api/update-work-orders-delete-create/${id}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.code === 200) {
        toast({
          title: "Success",
          description: `${data.msg}`,
        });
        navigate("/work-order");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data?.msg,
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data?.message || "Update failed. Please try again.",
      });
    },
  });

  const onSubmit = async (e) => {
    e.preventDefault();

    const hasNegative = users.some(
      (user) => Math.sign(parseFloat(user.work_order_sub_full_shirt)) === -1,
    );

    if (hasNegative) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot submit with negative values",
      });
      return;
    }

    // const filteredUsers = users.filter((user) => !user.markedForRemoval);
    const filteredUsers = users
      .filter((user) => !user.markedForRemoval)
      .map((user) => ({
        ...user,
        work_order_sub_36_h: String(user.work_order_sub_36_h),
        work_order_sub_38_h: String(user.work_order_sub_38_h),
        work_order_sub_40_h: String(user.work_order_sub_40_h),
        work_order_sub_42_h: String(user.work_order_sub_42_h),
        work_order_sub_44_h: String(user.work_order_sub_44_h),
        work_order_sub_46_h: String(user.work_order_sub_46_h),
        work_order_sub_48_h: String(user.work_order_sub_48_h),
        work_order_sub_50_h: String(user.work_order_sub_50_h),
      }));
    const data = {
      work_order_year: workorder.work_order_year,
      work_order_factory_no: workorder.work_order_factory_no,
      work_order_brand: workorder.work_order_brand,
      work_order_brand_other: workorder.work_order_brand_other,
      work_order_style_type: workorder.work_order_style_type,
      work_order_width: workorder.work_order_width,
      workorder_sub_data: filteredUsers,
      work_order_count: filteredUsers.length,
      work_order_remarks: workorder.work_order_remarks,
      work_order_ratio: workorder.work_order_ratio,
      work_order_ratio_consumption: workorder.work_order_ratio_consumption,
      work_order_ratio_h: workorder.work_order_ratio_h,
      work_order_ratio_h_consumption: workorder.work_order_ratio_h_consumption,
      removed_rows: removedRows,
      work_order_38_39: workorder.work_order_38_39,
    };

    const validation = formSchema.safeParse(data);
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Please fix the following:",
        description: (
          <div className="grid gap-1">
            {validation.error.errors.map((error, i) => {
              const field = error.path[0].replace(/_/g, " ");
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

    updateWorkOrderMutation.mutate(data);
  };

  if (isLoading || !isInitialDataLoaded) {
    return <LoaderComponent name="Work Order Data" />;
  }

  if (isError) {
    return (
      <ErrorComponent
        message="Error Fetching Work Order Data"
        refetch={refetch}
      />
    );
  }

  return (
    <Page defaultCollapsed={true}>
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-center md:text-left md:text-xl">
          Edit Work Order
        </h3>

        <div className="p-4 bg-white rounded-lg shadow">
          <form id="addIndiv" autoComplete="off">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {/* Factory */}
              <div className="space-y-1">
                <Label htmlFor="work_order_factory_no" className="text-xs sm:text-sm font-medium">
                  Factory <span className="text-red-500">*</span>
                </Label>
                <Select
                  className="react-select-container text-xs sm:text-sm"
                  classNamePrefix="react-select"
                  placeholder="Search factory..."
                  options={
                    factoryData?.factory?.map((factory) => ({
                      value: factory.factory_no.toString(),
                      label: factory.factory_name,
                    })) || []
                  }
                  value={
                    factoryData?.factory
                      ?.map((factory) => ({
                        value: factory.factory_no.toString(),
                        label: factory.factory_name,
                      }))
                      .find(
                        (opt) =>
                          opt.value === String(workorder.work_order_factory_no),
                      ) || null
                  }
                  onChange={(selected) => {
                    setWorkOrder((prev) => ({
                      ...prev,
                      work_order_factory_no: selected?.value || "",
                    }));
                  }}
                />
              </div>

              {/* Brand */}
              <div className="space-y-1">
                <Label htmlFor="work_order_brand" className="text-xs sm:text-sm font-medium">
                  Brand <span className="text-red-500">*</span>
                </Label>
                <Select
                  className="react-select-container text-xs sm:text-sm"
                  classNamePrefix="react-select"
                  placeholder="Search brand..."
                  options={
                    brandData?.brand?.map((brand) => ({
                      value: brand.fabric_brand_brands.toString(),
                      label: brand.fabric_brand_brands,
                    })) || []
                  }
                  value={
                    brandData?.brand
                      ?.map((brand) => ({
                        value: brand.fabric_brand_brands.toString(),
                        label: brand.fabric_brand_brands,
                      }))
                      .find(
                        (opt) =>
                          opt.value === String(workorder.work_order_brand),
                      ) || null
                  }
                  onChange={(selected) => {
                    setWorkOrder((prev) => ({
                      ...prev,
                      work_order_brand: selected?.value || "",
                    }));
                  }}
                />
              </div>

              {/* Other Brand */}
              {workorder.work_order_brand === "Other" && (
                <div className="space-y-1">
                  <Label htmlFor="work_order_brand_other" className="text-xs sm:text-sm font-medium">Other Brand</Label>
                  <Input
                    type="text"
                    name="work_order_brand_other"
                    value={workorder.work_order_brand_other}
                    onChange={onInputChange}
                    required={workorder.work_order_brand === "Other"}
                    className="h-9 text-xs sm:text-sm"
                  />
                </div>
              )}

              {/* Width */}
              <div className="space-y-1">
                <Label htmlFor="work_order_width" className="text-xs sm:text-sm font-medium">
                  Width <span className="text-red-500">*</span>
                </Label>
                <Select
                  className="react-select-container text-xs sm:text-sm"
                  classNamePrefix="react-select"
                  placeholder="Search width..."
                  options={
                    widthData?.width?.map((width) => ({
                      value: width.width_mea.toString(),
                      label: width.width_mea,
                    })) || []
                  }
                  value={
                    widthData?.width
                      ?.map((width) => ({
                        value: width.width_mea.toString(),
                        label: width.width_mea,
                      }))
                      .find(
                        (opt) =>
                          opt.value === String(workorder.work_order_width),
                      ) || null
                  }
                  onChange={(selected) => {
                    setWorkOrder((prev) => ({
                      ...prev,
                      work_order_width: selected?.value || "",
                    }));
                  }}
                  isClearable
                />
              </div>

              {/* Half Ratio */}
              <div className="space-y-1">
                <Label htmlFor="work_order_ratio_h" className="text-xs sm:text-sm font-medium">
                  Half Ratio <span className="text-red-500">*</span>
                </Label>

                <Select
                  className="react-select-container text-xs sm:text-sm"
                  classNamePrefix="react-select"
                  placeholder="Search half ratio..."
                  options={
                    halfRatioData?.half_ratio?.map((hr) => ({
                      value: hr.ratio_range.toString(),
                      label: hr.ratio_range,
                    })) || []
                  }
                  value={
                    halfRatioData?.half_ratio
                      ?.map((hr) => ({
                        value: hr.ratio_range.toString(),
                        label: hr.ratio_range,
                      }))
                      .find(
                        (opt) =>
                          opt.value === String(workorder.work_order_ratio_h),
                      ) || null
                  }
                  onChange={(selected) => {
                    const value = selected?.value || "";

                    setWorkOrder((prev) => ({
                      ...prev,
                      work_order_ratio_h: value,
                    }));

                    setRatioValue(value);
                  }}
                  isClearable
                />
              </div>

              {/* Half Consumption */}
              <div className="space-y-1">
                <Label htmlFor="work_order_ratio_h_consumption" className="text-xs sm:text-sm font-medium">
                  Half Consumption <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  name="work_order_ratio_h_consumption"
                  value={workorder.work_order_ratio_h_consumption}
                  onChange={onInputChange}
                  required
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              {/* Full Ratio */}
              <div className="space-y-1">
                <Label htmlFor="work_order_ratio" className="text-xs sm:text-sm font-medium">
                  Full Ratio <span className="text-red-500">*</span>
                </Label>
                <Select
                  className="react-select-container text-xs sm:text-sm"
                  classNamePrefix="react-select"
                  placeholder="Search full ratio..."
                  options={
                    ratioData?.ratio?.map((ratio) => ({
                      value: ratio.ratio_range.toString(),
                      label: ratio.ratio_range,
                    })) || []
                  }
                  value={
                    ratioData?.ratio
                      ?.map((ratio) => ({
                        value: ratio.ratio_range.toString(),
                        label: ratio.ratio_range,
                      }))
                      .find(
                        (opt) =>
                          opt.value === String(workorder.work_order_ratio),
                      ) || null
                  }
                  onChange={(selected) => {
                    setWorkOrder((prev) => ({
                      ...prev,
                      work_order_ratio: selected?.value || "",
                    }));
                  }}
                  isClearable
                />
              </div>

              {/* Full Consumption */}
              <div className="space-y-1">
                <Label htmlFor="work_order_ratio_consumption" className="text-xs sm:text-sm font-medium">
                  Full Consumption <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  name="work_order_ratio_consumption"
                  value={workorder.work_order_ratio_consumption}
                  onChange={onInputChange}
                  required
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              {/* Order Size Toggle */}
              <div className="space-y-1">
                <Label htmlFor="work_order_38_39" className="text-xs sm:text-sm font-medium">
                  Order Size
                </Label>
                <div
                  className="relative flex items-center bg-slate-900 p-0.5 rounded-full h-9 select-none cursor-pointer shadow-inner"
                  role="group"
                  aria-label="Order Size Selection"
                >
                  {/* Sliding Beige Capsule */}
                  <div
                    className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-[#E5D7C3] rounded-full shadow-sm transition-all duration-300 ease-out ${
                      workorder.work_order_38_39 === "Yes" ? "left-[calc(50%+1px)]" : "left-0.5"
                    }`}
                  />

                  {/* 36/38 Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setWorkOrder((prev) => ({
                        ...prev,
                        work_order_38_39: "No",
                      }));
                    }}
                    className={`relative z-10 w-1/2 h-full text-[11px] font-semibold rounded-full transition-colors duration-200 flex items-center justify-center cursor-pointer ${
                      workorder.work_order_38_39 === "Yes"
                        ? "text-stone-300 hover:text-white"
                        : "text-[#543D2B] font-extrabold"
                    }`}
                  >
                    36/38
                  </button>

                  {/* 38/39 Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setWorkOrder((prev) => ({
                        ...prev,
                        work_order_38_39: "Yes",
                      }));
                    }}
                    className={`relative z-10 w-1/2 h-full text-[11px] font-semibold rounded-full transition-colors duration-200 flex items-center justify-center cursor-pointer ${
                      workorder.work_order_38_39 === "Yes"
                        ? "text-[#543D2B] font-extrabold"
                        : "text-stone-300 hover:text-white"
                    }`}
                  >
                    38/39
                  </button>
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="work_order_remarks" className="text-xs sm:text-sm font-medium">
                  Remarks
                </Label>
                <Input
                  type="text"
                  name="work_order_remarks"
                  value={workorder.work_order_remarks}
                  onChange={onInputChange}
                  placeholder="Enter remarks..."
                  className="h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <hr className="my-4 border-gray-200" />

            {/* Dynamic Fields */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <h4 className="font-medium">Order Items</h4>
              </div>

              <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            T Code
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            MRP
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Length
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            S-Length
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            A
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            B
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            C
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            {workorder.work_order_38_39 === "Yes" ? "H-38" : "H-36"}
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            {workorder.work_order_38_39 === "Yes" ? "H-39" : "H-38"}
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            H-40
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            H-42
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            H-44
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            H-46
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            H-48
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            H-50
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            H-Shirt
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            F-Shirt
                          </th>
                          <th className="px-1 py-1 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user, index) => (
                          <tr
                            key={index}
                            className={
                              user.markedForRemoval
                                ? "bg-red-50 hover:bg-red-100"
                                : "hover:bg-gray-50"
                            }
                          >
                            {/* T Code */}
                            <td className="px-1 py-1 whitespace-nowrap">
                              <Input
                                type="text"
                                name="work_order_sub_selection_id"
                                value={user.work_order_sub_selection_id}
                                onChange={(e) => onChange(e, index)}
                                required
                                className="w-16 h-8 text-xs"
                              />
                            </td>

                            {/* MRP */}
                            <td className="px-1 py-1 whitespace-nowrap">
                              <Input
                                type="text"
                                name="work_order_sub_amount"
                                value={user.work_order_sub_amount}
                                onChange={(e) => onChange(e, index)}
                                required
                                className="w-16 h-8 text-xs"
                              />
                            </td>

                            {/* Length */}
                            <td className="px-1 py-1 whitespace-nowrap">
                              <Input
                                type="text"
                                name="work_order_sub_length"
                                value={user.work_order_sub_length}
                                onChange={(e) => onChange(e, index)}
                                required
                                className="w-16 h-8 text-xs"
                              />
                            </td>

                            {/* S-Length */}
                            <td className="px-1 py-1 whitespace-nowrap">
                              <Input
                                type="text"
                                name="work_order_sub_new_length"
                                value={user.work_order_sub_new_length}
                                onChange={(e) => onChange(e, index)}
                                className="w-16 h-8 text-xs"
                              />
                            </td>

                            {/* A */}
                            <td className="px-1 py-1 whitespace-nowrap">
                              <Input
                                type="text"
                                name="work_order_sub_a"
                                value={user.work_order_sub_a}
                                onChange={(e) => {
                                  const value = e.target.value;

                                  const updatedUsers = [...users];
                                  updatedUsers[index] = {
                                    ...updatedUsers[index],
                                    work_order_sub_a: value,
                                  };
                                  setUsers(updatedUsers);

                                  if (value !== "") {
                                    HalfA1(index, value);
                                  }
                                }}
                                required
                                className="w-12 h-8 text-xs"
                              />
                            </td>

                            {/* B */}
                            <td className="px-1 py-1 whitespace-nowrap">
                              <Input
                                type="text"
                                name="work_order_sub_b"
                                value={user.work_order_sub_b}
                                onChange={(e) => {
                                  const value = e.target.value;

                                  const updatedUsers = [...users];
                                  updatedUsers[index] = {
                                    ...updatedUsers[index],
                                    work_order_sub_b: value,
                                  };
                                  setUsers(updatedUsers);

                                  if (value !== "") {
                                    HalfB1(index, value);
                                  }
                                }}
                                className="w-12 h-8 text-xs"
                              />
                            </td>

                            {/* C */}
                            <td className="px-1 py-1 whitespace-nowrap">
                              <Input
                                type="text"
                                name="work_order_sub_c"
                                value={user.work_order_sub_c}
                                onChange={(e) => {
                                  const value = e.target.value;

                                  const updatedUsers = [...users];
                                  updatedUsers[index] = {
                                    ...updatedUsers[index],
                                    work_order_sub_c: value,
                                  };
                                  setUsers(updatedUsers);

                                  if (value !== "") {
                                    HalfC1(index, value);
                                  }
                                }}
                                className="w-12 h-8 text-xs"
                              />
                            </td>

                            {/* Half sizes */}
                            {["36","38", "40", "42", "44", "46", "48", "50"].map(
                              (size) => (
                                <td
                                  key={size}
                                  className="px-1 py-1 whitespace-nowrap"
                                >
                                  <Input
                                    type="text"
                                    name={`work_order_sub_${size}_h`}
                                    value={user[`work_order_sub_${size}_h`]}
                                    onChange={(e) => onChange(e, index)}
                                    required
                                    className="w-12 h-8 text-xs"
                                    readOnly
                                  />
                                </td>
                              ),
                            )}

                            {/* Half Shirt */}
                            <td className="px-1 py-1 whitespace-nowrap">
                              <Input
                                type="text"
                                name="work_order_sub_half_shirt"
                                value={user.work_order_sub_half_shirt}
                                onChange={(e) => onChange(e, index)}
                                required
                                className="w-16 h-8 text-xs"
                                readOnly
                              />
                            </td>

                            {/* Full Shirt */}
                            <td className="px-1 py-1 whitespace-nowrap">
                              <Input
                                type="text"
                                name="work_order_sub_full_shirt"
                                value={user.work_order_sub_full_shirt}
                                onChange={(e) => onChange(e, index)}
                                required
                                className="w-16 h-8 text-xs"
                                readOnly
                              />
                            </td>

                            {/* Delete */}
                            <td className="px-1 py-1 whitespace-nowrap">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeUser(index)}
                                className={`h-8 w-8 p-0 ${user.markedForRemoval ? "bg-red-100" : ""}`}
                              >
                                <Trash2
                                  className={`w-3 h-3 ${user.markedForRemoval ? "text-red-700" : "text-red-500"}`}
                                />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={addItem}
                className="w-full sm:w-auto"
              >
                Add Item
              </Button>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/work-order")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>

              <Button
                type="button"
                onClick={onSubmit}
                disabled={updateWorkOrderMutation.isPending}
                className="h-10 px-6 bg-[#543D2B] hover:bg-[#412E20] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {updateWorkOrderMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Update Work Order
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Page>
  );
};

export default EditWorkOrder;
