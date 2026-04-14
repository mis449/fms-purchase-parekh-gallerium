"use client"

import { useState, useEffect, useCallback, useContext, useMemo } from "react"
import { Truck, FileText, Loader2, Upload, X, History, FileCheck, AlertTriangle, Filter } from "lucide-react"
import { MixerHorizontalIcon } from "@radix-ui/react-icons"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthContext } from "../context/AuthContext"
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

function formatTimestamp(timestampStr) {
  if (!timestampStr || typeof timestampStr !== "string") {
    return "N/A"
  }
  const numbers = timestampStr.match(/\d+/g)
  if (!numbers || numbers.length < 6) {
    const d = new Date(timestampStr)
    if (!isNaN(d.getTime())) {
      return d
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(",", "")
    }
    return "Invalid Date"
  }
  const date = new Date(
    parseInt(numbers[0]), // Year
    parseInt(numbers[1]) - 1, // Month (0-based)
    parseInt(numbers[2]), // Day
    parseInt(numbers[3]), // Hours
    parseInt(numbers[4]), // Minutes
    parseInt(numbers[5]), // Seconds
  )
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

// Supabase Tables
const INDENT_PO_TABLE = "INDENT-PO";
const LIFT_ACCOUNTS_TABLE = "LIFT-ACCOUNTS";
const MASTER_TABLE = "Master";
const DRIVE_FOLDER_ID = "1k0dGpTHzg7YHiAjIpVpz6smcy28g1OIM";
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxeWI6jn9sOuAzGIV8cM_1EzL0KOpXMiyTfSWLwJ9YEGiHI280Ki368Ulu3F-V9aEcd/exec";

const PO_COLUMNS_META = [
  { header: "Indent Number", dataKey: "indentNo", toggleable: true, alwaysVisible: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Quantity", dataKey: "quantity", toggleable: true },
  { header: "Rate", dataKey: "rate", toggleable: true },
  { header: "Alumina %", dataKey: "alumina", toggleable: true },
  { header: "Iron %", dataKey: "iron", toggleable: true },
  { header: "Pending Qty", dataKey: "pendingQty", toggleable: true },
  { header: "Planned", dataKey: "planned", toggleable: true },
  { header: "Notes", dataKey: "whatIsToBeDone", toggleable: true },
  { header: "Actions", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
]

const LIFTS_COLUMNS_META = [
  { header: "Lift ID", dataKey: "id", toggleable: true, alwaysVisible: true },
  { header: "Indent Number", dataKey: "indentNo", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "material", toggleable: true },
  { header: "PO Qty", dataKey: "quantity", toggleable: true },
  { header: "Lifted Qty", dataKey: "liftingQty", toggleable: true },
  { header: "Rate", dataKey: "rate", toggleable: true },
  { header: "Type", dataKey: "liftType", toggleable: true },
  { header: "Bill No.", dataKey: "billNo", toggleable: true },
  { header: "Truck No.", dataKey: "truckNo", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Bill Image", dataKey: "billImageUrl", toggleable: true, isLink: true, linkText: "View Bill" },
  { header: "Lifted On", dataKey: "createdAt", toggleable: true },
  { header: "Qty", dataKey: "additionalTruckQty", toggleable: true },
]

export default function LiftMaterial() {
  const { user } = useContext(AuthContext)
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [materialLifts, setMaterialLifts] = useState([])
  const [selectedPO, setSelectedPO] = useState(null)
  const [loadingPOs, setLoadingPOs] = useState(true)
  const [loadingLifts, setLoadingLifts] = useState(true)
  const [masterDataLoading, setMasterDataLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [error, setError] = useState(null)
  const [areaOptions, setAreaOptions] = useState([])
  const [transporterOptions, setTransporterOptions] = useState([])
  const [typeOptions, setTypeOptions] = useState([])
  const [rateTypeOptions, setRateTypeOptions] = useState([])
  const [formData, setFormData] = useState({
    billNo: "",
    Arealifting: "",
    liftingLeadTime: "",
    truckNo: "",
    driverNo: "",
    TransporterName: "",
    rateType: "",
    rate: "",
    truckQty: "",
    Type: "",
    biltyNo: "",
    indentNo: "",
    vendorName: "",
    material: "",
    totalQuantity: "",
    billImage: null,
    additionalTruckQty: "",
    transportRate: "", // Transport Rate field (not required for validation)
  })
  const [formErrors, setFormErrors] = useState({})
  const [activeTab, setActiveTab] = useState("availablePOs")
  const [visiblePoColumns, setVisiblePoColumns] = useState({})
  const [visibleLiftsColumns, setVisibleLiftsColumns] = useState({})
  const [filters, setFilters] = useState({
    vendorName: "all",
    materialName: "all",
    liftType: "all",
    totalQuantity: "all",
    orderNumber: "all",
  })

  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {}
      columnsMeta.forEach((col) => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable
      })
      return visibility
    }
    setVisiblePoColumns(initializeVisibility(PO_COLUMNS_META))
    setVisibleLiftsColumns(initializeVisibility(LIFTS_COLUMNS_META))
  }, [])

  const fetchMasterData = useCallback(async () => {
    setMasterDataLoading(true)
    setError(null)
    try {
      const { data: rows, error: fetchError } = await supabase
        .from(MASTER_TABLE)
        .select('*');

      if (fetchError) throw fetchError;

      const tempAreaOptions = new Set()
      const tempTransporterOptions = new Set()
      const tempTypeOptions = new Set()
      const tempRateTypeOptions = new Set()

      rows.forEach((row) => {
        if (row["Rate Type"]) tempRateTypeOptions.add(row["Rate Type"].trim())
        if (row["Area Lifting"]) tempAreaOptions.add(row["Area Lifting"].trim())
        if (row["Type"]) tempTypeOptions.add(row["Type"].trim())
        if (row["Transporter Name"]) tempTransporterOptions.add(row["Transporter Name"].trim())
      })

      setAreaOptions(Array.from(tempAreaOptions).sort().map((opt) => ({ value: opt, label: opt })))
      setTransporterOptions(Array.from(tempTransporterOptions).sort().map((opt) => ({ value: opt, label: opt })))
      setTypeOptions(Array.from(tempTypeOptions).sort().map((opt) => ({ value: opt, label: opt })))
      setRateTypeOptions(Array.from(tempRateTypeOptions).sort().map((opt) => ({ value: opt, label: opt })))

    } catch (error) {
      setError(`Failed to load Master data: ${error.message}`)
    } finally {
      setMasterDataLoading(false)
    }
  }, [])

  const fetchPurchaseOrders = useCallback(async () => {
    setLoadingPOs(true)
    setError(null)
    try {
      const { data: rows, error: fetchError } = await supabase
        .from(INDENT_PO_TABLE)
        .select('*')
        .not('Planned4', 'is', null)
        .is('Actual4', null);

      if (fetchError) throw fetchError;

      let formattedData = rows.map((row) => ({
        id: `PO-${row.id}`,
        indentNo: row["Indent Id."] || "",
        firmName: row["Firm Name"] || "",
        vendorName: row["Vendor"] || "",
        rawMaterialName: row["Material"] || "",
        quantity: row["Total Quantity"] || "",
        _dbId: row.id,
        rate: row["Rate"] || "",
        alumina: row["Alumina %"] || "",
        iron: row["Iron %"] || "",
        pendingQty: row["Pending Qty"] || "",
        planned: row["Planned4"] || "",
        whatIsToBeDone: row["PO Notes"] || "",
      }))

      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        const userFirmNameLower = user.firmName.toLowerCase()
        formattedData = formattedData.filter(
          (po) => po.firmName && String(po.firmName).toLowerCase() === userFirmNameLower,
        )
      }

      setPurchaseOrders(formattedData)
    } catch (error) {
      setError(`Failed to load PO data: ${error.message}`)
      setPurchaseOrders([])
    } finally {
      setLoadingPOs(false)
    }
  }, [user])

  const fetchMaterialLifts = useCallback(async () => {
    setLoadingLifts(true)
    setError(null)
    try {
      const { data: rows, error: fetchError } = await supabase
        .from(LIFT_ACCOUNTS_TABLE)
        .select('*')
        .order('Timestamp', { ascending: false });

      if (fetchError) throw fetchError;

      let formattedData = rows.map((row) => ({
        id: row["Lift No"] || "",
        indentNo: row["Indent no."] || "",
        vendorName: row["Vendor Name"] || "",
        quantity: row["Qty"] || "",
        material: row["Raw Material Name"] || "",
        billNo: row["Bill No."] || "",
        areaName: row["Area lifting"] || "",
        liftingLeadTime: row["Lead Time To Reach Factory (days)"] || "",
        liftingQty: row["Lifting Qty"] || "",
        liftType: row["Type"] || "",
        transporterName: row["Transporter Name"] || "",
        truckNo: row["Truck No."] || "",
        driverNo: row["Driver No."] || "",
        biltyNo: row["Bilty No."] || "",
        rateType: row["Type Of Transporting Rate"] || "",
        rate: row["Rate"] || "",
        billImageUrl: row["Bill Image"] || "",
        additionalTruckQty: row["Truck Qty"] || "",
        createdAt: row["Timestamp"] || "",
        firmName: row["Firm Name"] || "",
        transportRate: row["Transporter Rate"] || "",
      }))

      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        const userFirmNameLower = user.firmName.toLowerCase()
        formattedData = formattedData.filter(
          (lift) => lift.firmName && String(lift.firmName).toLowerCase() === userFirmNameLower,
        )
      }

      setMaterialLifts(formattedData)
    } catch (err) {
      setError((prev) =>
        prev ? `${prev}\nFailed to load lifts data: ${err.message}` : `Failed to load lifts data: ${err.message}`,
      )
      setMaterialLifts([])
    } finally {
      setLoadingLifts(false)
    }
  }, [user])

  useEffect(() => {
    fetchPurchaseOrders()
    fetchMaterialLifts()
    fetchMasterData()
  }, [fetchPurchaseOrders, fetchMaterialLifts, fetchMasterData])

  const uniqueFilterOptions = useMemo(() => {
    const vendors = new Set()
    const materials = new Set()
    const types = new Set()
    const quantities = new Set()
    const orders = new Set()

    purchaseOrders.forEach((po) => {
      if (po.vendorName) vendors.add(po.vendorName)
      if (po.rawMaterialName) materials.add(po.rawMaterialName)
      if (po.quantity) quantities.add(po.quantity)
      if (po.indentNo) orders.add(po.indentNo)
    })

    materialLifts.forEach((lift) => {
      if (lift.vendorName) vendors.add(lift.vendorName)
      if (lift.material) materials.add(lift.material)
      if (lift.liftType) types.add(lift.liftType)
      if (lift.liftingQty) quantities.add(lift.liftingQty)
      if (lift.additionalTruckQty) quantities.add(lift.additionalTruckQty)
      if (lift.indentNo) orders.add(lift.indentNo)
      if (lift.billNo) orders.add(lift.billNo)
    })

    return {
      vendorName: [...vendors].sort(),
      materialName: [...materials].sort(),
      liftType: [...types].sort(),
      totalQuantity: [...quantities].sort((a, b) => parseFloat(a) - parseFloat(b)),
      orderNumber: [...orders].sort(),
    }
  }, [purchaseOrders, materialLifts])

  const filteredPurchaseOrders = useMemo(() => {
    let filtered = purchaseOrders
    if (filters.vendorName !== "all") {
      filtered = filtered.filter((po) => po.vendorName === filters.vendorName)
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter((po) => po.rawMaterialName === filters.materialName)
    }
    if (filters.totalQuantity !== "all") {
      filtered = filtered.filter((po) => po.quantity === filters.totalQuantity)
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter((po) => po.indentNo === filters.orderNumber)
    }
    return filtered
  }, [purchaseOrders, filters])

  const filteredMaterialLifts = useMemo(() => {
    let filtered = materialLifts
    if (filters.vendorName !== "all") {
      filtered = filtered.filter((lift) => lift.vendorName === filters.vendorName)
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter((lift) => lift.material === filters.materialName)
    }
    if (filters.liftType !== "all") {
      filtered = filtered.filter((lift) => lift.liftType === filters.liftType)
    }
    if (filters.totalQuantity !== "all") {
      filtered = filtered.filter(
        (lift) => lift.liftingQty === filters.totalQuantity || lift.additionalTruckQty === filters.totalQuantity,
      )
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter((lift) => lift.indentNo === filters.orderNumber || lift.billNo === filters.orderNumber)
    }
    return filtered
  }, [materialLifts, filters])

  const handlePOSelect = (po) => {
    setSelectedPO(po)
    setFormData({
      billNo: "",
      Arealifting: "",
      liftingLeadTime: "",
      truckNo: "",
      driverNo: "",
      TransporterName: "",
      rateType: "",
      rate: "",
      truckQty: "",
      Type: "",
      biltyNo: "",
      indentNo: po.indentNo,
      vendorName: po.vendorName,
      material: po.rawMaterialName,
      totalQuantity: po.quantity,
      billImage: null,
      additionalTruckQty: "",
      transportRate: "", // Transport Rate field
    })
    setFormErrors({})
    setShowPopup(true)
  }

  const handleClosePopup = () => {
    setShowPopup(false)
    setSelectedPO(null)
    setFormData({
      billNo: "",
      Arealifting: "",
      liftingLeadTime: "",
      truckNo: "",
      driverNo: "",
      TransporterName: "",
      rateType: "",
      rate: "",
      truckQty: "",
      Type: "",
      biltyNo: "",
      indentNo: "",
      vendorName: "",
      material: "",
      totalQuantity: "",
      billImage: null,
      additionalTruckQty: "",
      transportRate: "", // Transport Rate field
    })
    setFormErrors({})
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null })
  }

  const handleFormSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value })
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null })
  }

  const handleFileUpload = (e) => {
    const { name, files } = e.target
    setFormData({ ...formData, [name]: files && files[0] ? files[0] : null })
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null })
  }

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      "billNo",
      "Arealifting",
      "Type",
      "liftingLeadTime",
      "truckNo",
      "driverNo",
      "TransporterName",
      "rateType",
      "rate",
      "truckQty",
      // "transportRate", // Removed as not required for validation
    ];

    requiredFields.forEach((field) => {
      let readableField = field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
      if (field === "Arealifting") readableField = "Area Lifting";
      if (field === "TransporterName") readableField = "Transporter Name";
      
      if (!formData[field] || String(formData[field]).trim() === "") {
        newErrors[field] = `${readableField} is required.`;
      }
    });

    if (formData.rate && isNaN(parseFloat(formData.rate))) newErrors.rate = "Rate must be a valid number.";
    if (formData.transportRate && isNaN(parseFloat(formData.transportRate))) newErrors.transportRate = "Transport Rate must be a valid number.";
    if (formData.truckQty && isNaN(parseFloat(formData.truckQty)))
      newErrors.truckQty = "Truck Qty must be a valid number.";
    if (
      formData.liftingLeadTime &&
      (isNaN(parseInt(formData.liftingLeadTime)) || parseInt(formData.liftingLeadTime) < 0)
    )
      newErrors.liftingLeadTime = "Lead Time must be a non-negative number.";
    if (formData.additionalTruckQty && isNaN(parseFloat(formData.additionalTruckQty))) {
      newErrors.additionalTruckQty = "Truck Quantity must be a valid number.";
    }

    // NO RATE VALIDATION DURING FORM SUBMISSION
    // Material Rate validation will be done after submission for display purposes only

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadFileToDrive = async (file, folderId) => {
    if (!folderId) {
      throw new Error("Configuration error: Drive Folder ID not specified.");
    }
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (error) => reject(error);
      });

      const payload = new URLSearchParams();
      payload.append("action", "uploadFile");
      payload.append("fileName", file.name);
      payload.append("mimeType", file.type);
      payload.append("base64Data", base64Data);
      payload.append("folderId", folderId);

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Drive upload failed: ${response.status}. ${errorText}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to upload file via Apps Script");
      }
      return result.fileUrl;
    } catch (error) {
      console.error("Error uploading file to Google Drive:", error);
      throw error;
    }
  };

  const generateLiftId = async () => {
    try {
      const { data, error } = await supabase
        .from(LIFT_ACCOUNTS_TABLE)
        .select('"Lift No"')
        .order('id', { ascending: false })
        .limit(1);

      if (error) throw error;

      let maxIdNum = 0;
      if (data && data.length > 0 && data[0]["Lift No"]) {
        const lastId = data[0]["Lift No"];
        if (lastId.startsWith("LF-")) {
          maxIdNum = parseInt(lastId.substring(3), 10);
        }
      }
      return `LF-${String(maxIdNum + 1).padStart(3, "0")}`;
    } catch (error) {
      console.error("[generateLiftId] Error:", error);
      return `LF-${Date.now().toString().slice(-3)}`;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Validation failed. Please check the required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const liftId = await generateLiftId();
      const timestamp = new Date().toISOString();

      const billImageUrl = formData.billImage 
        ? await uploadFileToDrive(formData.billImage, DRIVE_FOLDER_ID) 
        : "";

      // 1. Insert into LIFT-ACCOUNTS
      const liftInsertData = {
        "Timestamp": timestamp,
        "Lift No": liftId,
        "Indent no.": formData.indentNo,
        "Vendor Name": formData.vendorName,
        "Qty": parseFloat(formData.totalQuantity),
        "Raw Material Name": formData.material,
        "Bill No.": formData.billNo,
        "Area lifting": formData.Arealifting,
        "Lead Time To Reach Factory (days)": parseInt(formData.liftingLeadTime),
        "Lifting Qty": parseFloat(formData.truckQty),
        "Type": formData.Type,
        "Transporter Name": formData.TransporterName,
        "Truck No.": formData.truckNo,
        "Driver No.": formData.driverNo,
        "Bilty No.": formData.biltyNo || "",
        "Type Of Transporting Rate": formData.rateType,
        "Rate": parseFloat(formData.rate),
        "Bill Image": billImageUrl,
        "Truck Qty": parseFloat(formData.additionalTruckQty || 0),
        "Firm Name": selectedPO?.firmName || "",
        "Transporter Rate": parseFloat(formData.transportRate || 0)
      };

      const { error: insertError } = await supabase
        .from(LIFT_ACCOUNTS_TABLE)
        .insert([liftInsertData]);

      if (insertError) throw insertError;

      // 2. Update INDENT-PO setting Actual4
      const { error: updateError } = await supabase
        .from(INDENT_PO_TABLE)
        .update({ "Actual4": timestamp })
        .eq('id', selectedPO._dbId);

      if (updateError) throw updateError;

      toast.success("Material Lift Recorded", {
        description: `Lift ${liftId} for Indent ${formData.indentNo} has been successfully recorded.`,
      });
      handleClosePopup();
      fetchPurchaseOrders();
      fetchMaterialLifts();
    } catch (error) {
      console.error("Submission Failed:", error);
      toast.error("Submission Failed", {
        description: `Could not record lift. Reason: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const liftExistsForPO = (indentNo) => {
    if (!indentNo) return false
    return materialLifts.some((lift) => lift.indentNo === indentNo)
  }

  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "pos") {
      setVisiblePoColumns((prev) => ({ ...prev, [dataKey]: checked }))
    } else {
      setVisibleLiftsColumns((prev) => ({ ...prev, [dataKey]: checked }))
    }
  }

  const handleSelectAllColumns = (tab, columnsMeta, selectAll) => {
    if (tab === "pos") {
      const newVisibility = {}
      columnsMeta.forEach((col) => {
        newVisibility[col.dataKey] = col.alwaysVisible || selectAll
      })
      setVisiblePoColumns(newVisibility)
    } else {
      const newVisibility = {}
      columnsMeta.forEach((col) => {
        newVisibility[col.dataKey] = col.alwaysVisible || selectAll
      })
      setVisibleLiftsColumns(newVisibility)
    }
  }

  const renderCell = (item, column) => {
    const value = item[column.dataKey]
    if (column.isLink) {
      return value ? (
        <a
          href={String(value).startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 hover:text-purple-800 hover:underline font-medium text-xs"
        >
          {column.linkText || "View"}
        </a>
      ) : (
        <span className="text-gray-400 text-xs">N/A</span>
      )
    }
    return value || (value === 0 ? "0" : <span className="text-xs text-gray-400">N/A</span>)
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearAllFilters = () => {
    setFilters({
      vendorName: "all",
      materialName: "all",
      liftType: "all",
      totalQuantity: "all",
      orderNumber: "all",
    })
  }

  return (
    <div className="space-y-4 p-4 md:p-6 bg-slate-50 min-h-screen">
      <Card className="shadow-md border-none">
        <CardHeader className="p-4 border-b border-gray-200">
          <CardTitle className="flex items-center gap-2 text-gray-700 text-lg">
            <Truck className="h-5 w-5 text-purple-600" /> Step 5: Lift The Material
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm">
            Record material lifting details for purchase orders.
            {user?.firmName && user.firmName.toLowerCase() !== "all" && (
              <span className="ml-2 text-purple-600 font-medium">• Filtered by: {user.firmName}</span>
            )}
          </CardDescription>
          {masterDataLoading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading dropdown options from Master sheet...
            </div>
          )}
          {!masterDataLoading && (areaOptions.length > 0 || typeOptions.length > 0) && (
            <div className="text-sm text-green-600">
              ✅ Dropdown options loaded: {areaOptions.length} areas, {typeOptions.length} types,{" "}
              {transporterOptions.length} transporters, {rateTypeOptions.length} rate types
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[450px] grid-cols-2 mb-4">
              <TabsTrigger value="availablePOs" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> Available POs
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {filteredPurchaseOrders.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="liftsHistory" className="flex items-center gap-2">
                <History className="h-4 w-4" /> Lifts History
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {filteredMaterialLifts.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="mb-4 p-4 bg-purple-50/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium">Filters</Label>
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="ml-auto bg-white">
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Select value={filters.vendorName} onValueChange={(value) => handleFilterChange("vendorName", value)}>
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {uniqueFilterOptions.vendorName.map((vendor) => (
                      <SelectItem key={vendor} value={vendor}>
                        {vendor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.materialName}
                  onValueChange={(value) => handleFilterChange("materialName", value)}
                >
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Materials" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Materials</SelectItem>
                    {uniqueFilterOptions.materialName.map((material) => (
                      <SelectItem key={material} value={material}>
                        {material}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.liftType} onValueChange={(value) => handleFilterChange("liftType", value)}>
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.totalQuantity}
                  onValueChange={(value) => handleFilterChange("totalQuantity", value)}
                >
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Quantities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quantities</SelectItem>
                    {uniqueFilterOptions.totalQuantity.map((qty) => (
                      <SelectItem key={qty} value={qty}>
                        {qty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.orderNumber} onValueChange={(value) => handleFilterChange("orderNumber", value)}>
                  <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="All Orders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    {uniqueFilterOptions.orderNumber.map((order) => (
                      <SelectItem key={order} value={order}>
                        {order}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="availablePOs" className="flex-1 flex flex-col mt-0">
              <Card className="shadow-sm border border-border flex-1 flex-col">
                <CardHeader className="py-3 px-4 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center text-sm font-semibold text-foreground">
                        <FileCheck className="h-4 w-4 text-purple-600 mr-2" /> Available Purchase Orders (
                        {filteredPurchaseOrders.length})
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Filtered: Column AN (Planned) is filled & Column AO (Lifted On Timestamp) is empty.
                      </CardDescription>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent">
                          <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View Columns
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-3">
                        <div className="grid gap-2">
                          <p className="text-sm font-medium">Toggle PO Columns</p>
                          <div className="flex items-center justify-between mt-1 mb-2">
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-xs"
                              onClick={() => handleSelectAllColumns("pos", PO_COLUMNS_META, true)}
                            >
                              Select All
                            </Button>
                            <span className="text-gray-300 mx-1">|</span>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-xs"
                              onClick={() => handleSelectAllColumns("pos", PO_COLUMNS_META, false)}
                            >
                              Deselect All
                            </Button>
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {PO_COLUMNS_META.filter((col) => col.toggleable).map((col) => (
                              <div key={`toggle-po-${col.dataKey}`} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`toggle-po-${col.dataKey}`}
                                  checked={!!visiblePoColumns[col.dataKey]}
                                  onCheckedChange={(checked) =>
                                    handleToggleColumn("pos", col.dataKey, Boolean(checked))
                                  }
                                  disabled={col.alwaysVisible}
                                />
                                <Label
                                  htmlFor={`toggle-po-${col.dataKey}`}
                                  className="text-xs font-normal cursor-pointer"
                                >
                                  {col.header}{" "}
                                  {col.alwaysVisible && <span className="text-gray-400 ml-0.5 text-xs">(Fixed)</span>}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex-col">
                  {loadingPOs ? (
                    <div className="flex flex-col justify-center items-center py-8 flex-1">
                      <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-3" />
                      <p className="text-muted-foreground ml-2">Loading Purchase Orders...</p>
                    </div>
                  ) : error && filteredPurchaseOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
                      <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                      <p className="font-medium text-destructive">Error Loading POs</p>
                      <p className="text-sm text-muted-foreground max-w-md">{error}</p>
                    </div>
                  ) : filteredPurchaseOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-purple-200/50 bg-purple-50/50 rounded-lg mx-4 my-4 text-center flex-1">
                      <FileText className="h-12 w-12 text-purple-500 mb-3" />
                      <p className="font-medium text-foreground">No Eligible POs Found</p>
                      <p className="text-sm text-muted-foreground text-center">
                        Ensure POs meet criteria: Column AN filled & AO empty.
                        {user?.firmName && user.firmName.toLowerCase() !== "all" && (
                          <span className="block mt-1">(Filtered by firm: {user.firmName})</span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-b-lg flex-1">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                            {PO_COLUMNS_META.filter((col) => visiblePoColumns[col.dataKey]).map((col) => (
                              <TableHead key={col.dataKey} className="whitespace-nowrap text-xs px-3 py-2">
                                {col.header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPurchaseOrders.map((po) => (
                            <TableRow
                              key={po.id}
                              className={`hover:bg-purple-50/50 ${liftExistsForPO(po.indentNo) ? "opacity-60 bg-gray-100 cursor-not-allowed" : ""} ${selectedPO?.id === po.id ? "bg-purple-100 ring-1 ring-purple-300" : ""}`}
                            >
                              {PO_COLUMNS_META.filter((col) => visiblePoColumns[col.dataKey]).map((column) => (
                                <TableCell
                                  key={column.dataKey}
                                  className={`whitespace-nowrap text-xs px-3 py-2 ${
                                    column.dataKey === "indentNo" ? "font-medium text-primary" : "text-gray-700"
                                  } ${
                                    column.dataKey === "vendorName" ||
                                    column.dataKey === "rawMaterialName" ||
                                    column.dataKey === "whatIsToBeDone"
                                      ? "truncate max-w-[150px]"
                                      : ""
                                  }`}
                                >
                                  {column.dataKey === "actionColumn" ? (
                                    liftExistsForPO(po.indentNo) ? (
                                      <Badge
                                        variant="outline"
                                        className="bg-green-100 text-green-700 border-green-200 text-xs"
                                      >
                                        Lift Recorded
                                      </Badge>
                                    ) : (
                                      <Button
                                        onClick={() => handlePOSelect(po)}
                                        size="xs"
                                        variant="outline"
                                        disabled={isSubmitting || !!selectedPO}
                                        className="text-xs h-7 px-2 py-1"
                                      >
                                        Create Lift
                                      </Button>
                                    )
                                  ) : (
                                    <span title={column.dataKey === "whatIsToBeDone" ? po[column.dataKey] : undefined}>
                                      {renderCell(po, column)}
                                    </span>
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="liftsHistory" className="flex-1 flex flex-col mt-0">
              <Card className="shadow-sm border border-border flex-1 flex-col">
                <CardHeader className="py-3 px-4 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center text-sm font-semibold text-foreground">
                        <History className="h-4 w-4 text-purple-600 mr-2" /> All Material Lifts (
                        {filteredMaterialLifts.length})
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        Sorted from latest to oldest recorded lift. Red rows indicate Material Rate mismatch with PO Rate.
                      </CardDescription>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent">
                          <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View Columns
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] p-3">
                        <div className="grid gap-2">
                          <p className="text-sm font-medium">Toggle Lift Columns</p>
                          <div className="flex items-center justify-between mt-1 mb-2">
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-xs"
                              onClick={() => handleSelectAllColumns("lifts", LIFTS_COLUMNS_META, true)}
                            >
                              Select All
                            </Button>
                            <span className="text-gray-300 mx-1">|</span>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-xs"
                              onClick={() => handleSelectAllColumns("lifts", LIFTS_COLUMNS_META, false)}
                            >
                              Deselect All
                            </Button>
                          </div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {LIFTS_COLUMNS_META.filter((col) => col.toggleable).map((col) => (
                              <div key={`toggle-lift-${col.dataKey}`} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`toggle-lift-${col.dataKey}`}
                                  checked={!!visibleLiftsColumns[col.dataKey]}
                                  onCheckedChange={(checked) =>
                                    handleToggleColumn("lifts", col.dataKey, Boolean(checked))
                                  }
                                  disabled={col.alwaysVisible}
                                />
                                <Label
                                  htmlFor={`toggle-lift-${col.dataKey}`}
                                  className="text-xs font-normal cursor-pointer"
                                >
                                  {col.header}{" "}
                                  {col.alwaysVisible && <span className="text-gray-400 ml-0.5 text-xs">(Fixed)</span>}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex-col">
                  {loadingLifts ? (
                    <div className="flex flex-col justify-center items-center py-8 flex-1">
                      <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-3" />
                      <p className="text-muted-foreground ml-2">Loading Material Lifts...</p>
                    </div>
                  ) : error && filteredMaterialLifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
                      <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                      <p className="font-medium text-destructive">Error Loading Lifts</p>
                      <p className="text-sm text-muted-foreground max-w-md">
                        {error.split("\n").find((line) => line.includes("lifts data")) || error}
                      </p>
                    </div>
                  ) : filteredMaterialLifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-purple-200/50 bg-purple-50/50 rounded-lg mx-4 my-4 text-center flex-1">
                      <Truck className="h-12 w-12 text-purple-500 mb-3" />
                      <p className="font-medium text-foreground">No Material Lifts Recorded</p>
                      <p className="text-sm text-muted-foreground text-center">
                        Create lifts from the 'Available POs' tab.
                        {user?.firmName && user.firmName.toLowerCase() !== "all" && (
                          <span className="block mt-1">(Filtered by firm: {user.firmName})</span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-b-lg flex-1">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                            {LIFTS_COLUMNS_META.filter((col) => visibleLiftsColumns[col.dataKey]).map((col) => (
                              <TableHead key={col.dataKey} className="whitespace-nowrap text-xs px-3 py-2">
                                {col.header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMaterialLifts.map((lift) => {
                            // Check if Material Rate matches PO Rate - ONLY Material Rate comparison
                            const liftMaterialRate = parseFloat(lift.rate) || 0;
                            
                            // Find corresponding PO rate from INDENT-PO sheet column Y
                            const correspondingPO = purchaseOrders.find(po => po.indentNo === lift.indentNo);
                            const poRate = parseFloat(correspondingPO?.rate) || 0;
                            const materialRateMatches = Math.abs(liftMaterialRate - poRate) < 0.01;
                            
                            return (
                              <TableRow 
                                key={lift.id} 
                                className={`hover:bg-purple-50/50 ${!materialRateMatches ? 'bg-red-50 border-red-700' : ''}`}
                              >
                                {LIFTS_COLUMNS_META.filter((col) => visibleLiftsColumns[col.dataKey]).map((column) => (
                                  <TableCell
                                    key={column.dataKey}
                                    className={`whitespace-nowrap text-xs px-3 py-2 ${
                                      column.dataKey === "id" ? "font-medium text-primary" : "text-gray-700"
                                    } ${
                                      column.dataKey === "vendorName" ||
                                      column.dataKey === "material" ||
                                      column.dataKey === "transporterName"
                                        ? "truncate max-w-[150px]"
                                        : ""
                                    }`}
                                  >
                                    {renderCell(lift, column)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {showPopup && selectedPO && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[95vh] flex flex-col shadow-2xl">
            <CardHeader className="px-7 py-5 bg-gray-50 border-b border-gray-200 flex justify-between items-center rounded-t-xl">
              <CardTitle className="font-semibold text-lg text-gray-800">
                Record Lift for <span className="text-purple-600">{formData.indentNo}</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClosePopup}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-7 space-y-6 overflow-y-auto scrollbar-hide">
              <form onSubmit={handleSubmit}>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Selected Purchase Order Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <Label className="text-slate-500">Indent No.</Label>
                      <p className="font-medium text-slate-600">{selectedPO.indentNo}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Vendor</Label>
                      <p className="font-medium text-slate-600 truncate">{selectedPO.vendorName}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">Material</Label>
                      <p className="font-medium text-slate-600 truncate">{selectedPO.rawMaterialName}</p>
                    </div>
                    <div>
                      <Label className="text-slate-500">PO Quantity</Label>
                      <p className="font-medium text-slate-600">{selectedPO.quantity} units</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                  {[
                    { label: "Bill No.", name: "billNo", type: "text", isRequired: true },
                    {
                      label: "Type",
                      name: "Type",
                      type: "select",
                      options: [{ value: "", label: "Select type" }, ...typeOptions],
                      isRequired: true,
                    },
                    {
                      label: "Area Lifting",
                      name: "Arealifting",
                      type: "select",
                      options: [{ value: "", label: "Select area" }, ...areaOptions],
                      isRequired: true,
                    },
                    {
                      label: "Lead Time (days for lifting)",
                      name: "liftingLeadTime",
                      type: "number",
                      isRequired: true,
                    },
                    { label: "Truck No.", name: "truckNo", type: "text", isRequired: true },
                    { label: "Driver No.", name: "driverNo", type: "text", isRequired: true },
                    {
                      label: "Transporter Name",
                      name: "TransporterName",
                      type: "select",
                      options: [{ value: "", label: "Select transporter" }, ...transporterOptions],
                      isRequired: true,
                    },
                    {
                      label: "Type Of Transporting Rate",
                      name: "rateType",
                      type: "select",
                      options: [{ value: "", label: "Select rate type" }, ...rateTypeOptions],
                      isRequired: true,
                    },
                    { label: "Material Rate (INR)", name: "rate", type: "number", step: "any", isRequired: true },
                    { label: "Transport Rate (INR)", name: "transportRate", type: "number", step: "any", isRequired: false }, // Changed to not required
                    {
                      label: "Lifted Quantity (Units)",
                      name: "truckQty",
                      type: "number",
                      step: "any",
                      isRequired: true,
                    },
                    {
                      label: "Truck Quantity",
                      name: "additionalTruckQty",
                      type: "number",
                      step: "any",
                      isRequired: false,
                    },
                  ].map((field) => {
                    const placeholderLabel =
                      field.type === "select"
                        ? field.options.find((opt) => opt.value === "")?.label ||
                          `Select ${field.label.toLowerCase().replace(" *", "")}`
                        : field.label.replace(" *", "")
                    const actualOptions = field.type === "select" ? field.options.filter((opt) => opt.value !== "") : []
                    return (
                      <div key={field.name}>
                        <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={field.name}>
                          {field.label} {field.isRequired && <span className="text-red-500">*</span>}
                        </Label>
                        {field.type === "select" ? (
                          <Select
                            name={field.name}
                            value={formData[field.name]}
                            onValueChange={(value) => handleFormSelectChange(field.name, value)}
                          >
                            <SelectTrigger
                              className={`w-full ${formErrors[field.name] ? "border-red-500" : "border-gray-300"}`}
                            >
                              <SelectValue placeholder={placeholderLabel} />
                            </SelectTrigger>
                            <SelectContent>
                              {actualOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={field.type}
                            id={field.name}
                            name={field.name}
                            value={formData[field.name]}
                            onChange={handleInputChange}
                            step={field.step}
                            className={`${formErrors[field.name] ? "border-red-500" : "border-gray-300"}`}
                            placeholder={placeholderLabel}
                          />
                        )}
                        {formErrors[field.name] && (
                          <p className="mt-1 text-xs text-red-600">{formErrors[field.name]}</p>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-5">
                  <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="billImage">
                    Upload Bill Image (Optional)
                  </Label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-purple-400 transition-colors">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-10 w-10 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <Label
                          htmlFor="billImage"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-purple-500 px-1"
                        >
                          <span>Upload a file</span>
                          <Input
                            id="billImage"
                            name="billImage"
                            type="file"
                            className="sr-only"
                            onChange={handleFileUpload}
                            accept="image/*,.pdf"
                          />
                        </Label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formData.billImage ? formData.billImage.name : "PNG, JPG, PDF up to 10MB"}
                      </p>
                    </div>
                  </div>
                  {formErrors.billImage && <p className="mt-1 text-xs text-red-600">{formErrors.billImage}</p>}
                </div>

                <div className="pt-6 flex justify-end gap-4 border-t border-gray-200 mt-4">
                  <Button type="button" variant="outline" onClick={handleClosePopup}>
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin my-0.5" /> Recording Lift...
                      </>
                    ) : (
                      "Record Material Lifting"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
