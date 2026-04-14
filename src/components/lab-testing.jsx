"use client"

import { useState, useEffect, useCallback, useMemo, useContext } from "react" // Import useContext
// Shadcn/ui components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"

// Sonner Toast
import { toast } from "sonner"

// Lucide icons
import { Beaker, CheckCircle, XCircle, Loader2, AlertTriangle, Info, History, FileCheckIcon, Filter } from "lucide-react" // Added Filter icon
import { MixerHorizontalIcon } from "@radix-ui/react-icons"
import { AuthContext } from "../context/AuthContext" // Import AuthContext

// --- Constants for Google Sheets and Apps Script ---
const SHEET_ID = "1nOwuz2pnGMQRXKYjKu7QXggvWEnUFVeeh4Vxqe1LXBg"
const LIFTS_SHEET_NAME = "LIFT-ACCOUNTS"
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxeWI6jn9sOuAzGIV8cM_1EzL0KOpXMiyTfSWLwJ9YEGiHI280Ki368Ulu3F-V9aEcd/exec"
const DATA_START_ROW_LIFTS = 6; // FIX: Corrected from 7 to 6

// ---- Column Indices for LIFT-ACCOUNTS (0-based) ----
const LIFT_ID_COL = 1 // B: Lift No
const INDENT_NO_COL = 2 // C: Indent No.
const VENDOR_NAME_COL = 3 // D: Vendor Name
const RAW_MATERIAL_NAME_COL = 5 // F: Raw Material Name
const ORIGINAL_QTY_COL = 6 // G: PO Qty (Needed for totalQuantity filter)
const LIFT_TYPE_COL = 10 // K: Type (Needed for liftType filter)
const BILL_NO_COL = 7 // H: Bill No. (Needed for orderNumber filter)
const RECEIPT_DATE_OF_RECEIVING_COL = 22 // W: Date Of Receiving
const RECEIPT_TOTAL_BILL_QUANTITY_COL = 23 // X: Total Bill Quantity (Needed for totalQuantity filter)
const RECEIPT_ACTUAL_QTY_COL = 24 // Y: Actual Quantity Received (Needed for totalQuantity filter)
const FIRM_NAME_COL = 55 // Column BD for Firm Name

// --- Eligibility and Lab Test Data Columns ---
const AI_CONDITION_NOT_NULL_COL = 34 // AI: Pre-existing non-null (Date Of Receiving)
const AJ_TIMESTAMP_OR_NULL_COL = 35 // AJ: Lab Test Timestamp (Null for eligible)
const AL_STATUS_COL = 37 // AL: Status (Passed/Fail)
const AM_DATE_OF_TEST_COL = 38 // AM: Date of Test
const AN_MOISTURE_PERCENT_COL = 39 // AN: Moisture %
const AO_BD_PERCENT_COL = 40 // AO: BD %
const AP_AP_PERCENT_COL = 41 // AP: AP %
const AQ_ALUMINA_PERCENT_COL = 42 // AQ: Alumina %
const AR_IRON_PERCENT_COL = 43 // AR: Iron %
const AS_SIEVE_ANALYSIS_COL = 44 // AS: Sieve Analysis
const AT_LOI_PERCENT_COL = 45 // AT: LOI %
const AU_SIO2_PERCENT_COL = 46 // AU: SiO2 %
const AV_CAO_PERCENT_COL = 47 // AV: CaO %
const AW_MGO_PERCENT_COL = 48 // AW: MgO %
const AX_TIO2_PERCENT_COL = 49 // AX: TiO2 %
const AY_KNA2O_PERCENT_COL = 50 // AY: K2O+Na2O %
const AZ_FREE_IRON_PERCENT_COL = 51 // AZ: Free Iron %

// --- Helper to parse Google Sheet gviz JSON response ---
const parseGvizResponse = (text, sheetNameForError) => {
  if (!text || !text.includes("google.visualization.Query.setResponse")) {
    console.error(
      `Invalid or empty gviz response for ${sheetNameForError}:`,
      text ? text.substring(0, 500) : "Response was null/empty",
    )
    throw new Error(
      `Invalid response format from Google Sheets for ${sheetNameForError}. Please ensure the sheet is publicly accessible and the sheet name is correct.`,
    )
  }

  try {
    const jsonStart = text.indexOf("{")
    const jsonEnd = text.lastIndexOf("}") + 1
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error(`Could not find JSON data in response`)
    }

    const jsonString = text.substring(jsonStart, jsonEnd)
    const data = JSON.parse(jsonString)

    if (data.status === "error") {
      throw new Error(`Google Sheets API Error: ${data.errors?.[0]?.detailed_message || "Unknown error"}`)
    }

    if (!data.table) {
      console.warn(`No data.table in ${sheetNameForError}, treating as empty.`)
      return { cols: [], rows: [] }
    }

    if (!data.table.cols) {
      console.warn(`No data.table.cols in ${sheetNameForError}, treating as empty.`)
      return { cols: [], rows: [] }
    }

    if (!data.table.rows) {
      console.warn(`No data.table.rows in ${sheetNameForError}, treating as empty.`)
      data.table.rows = []
    }

    return data.table
  } catch (parseError) {
    console.error("JSON Parse Error:", parseError)
    throw new Error(`Failed to parse response from Google Sheets: ${parseError.message}`)
  }
}

// Function to format date string
const formatDateString = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string" || !dateValue.trim()) {
    return ""
  }

  // Check if the dateValue is in the format "Date(YYYY, MM, DD, ...)"
  const gvizMatch = dateValue.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/)
  if (gvizMatch) {
    const [, year, month, day, hours, minutes, seconds] = gvizMatch.map(Number)
    const parsedDate = new Date(year, month, day, hours || 0, minutes || 0, seconds || 0)
    if (!isNaN(parsedDate.getTime())) {
      return new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(parsedDate)
    }
  }

  // If the dateValue is not in the "Date(...)" format, try parsing it as a standard date string
  const dateObj = new Date(dateValue)
  if (!isNaN(dateObj.getTime())) {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(dateObj)
  }

  // Return the original value if parsing fails
  return dateValue
}

// --- Column Definitions for Tables ---
const ELIGIBLE_TESTS_COLUMNS_META = [
  { header: "Lift Number", dataKey: "liftNo", toggleable: true, alwaysVisible: true },
  { header: "PO Number", dataKey: "indentNo", toggleable: true },
  { header: "Party Name", dataKey: "vendorName", toggleable: true },
  { header: "Product Name", dataKey: "rawMaterialName", toggleable: true },
  { header: "Actual Qty Rcvd", dataKey: "actualQty_fromReceipt", toggleable: true },
  { header: "Date of Receiving (AI)", dataKey: "aiCondition_val_formatted", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Action", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
]

const RECORDED_TESTS_COLUMNS_META = [
  { header: "Lift Number", dataKey: "liftNo", toggleable: true, alwaysVisible: true },
  { header: "Test Date (AM)", dataKey: "amDateOfTest_formatted_val", toggleable: true },
  { header: "Status (AL)", dataKey: "alStatus_val", toggleable: true, isBadge: true },
  { header: "Moisture % (AN)", dataKey: "anMoisturePercent_val", toggleable: true },
  { header: "Alumina % (AQ)", dataKey: "aqAluminaPercent_val", toggleable: true },
  { header: "Iron % (AR)", dataKey: "arIronPercent_val", toggleable: true },
  { header: "Firm Name", dataKey: "firmName", toggleable: true },
  { header: "Test Timestamp (AJ)", dataKey: "ajTimestamp_formatted_val", toggleable: true },
]

export default function LabTesting() {
  const { user } = useContext(AuthContext) // Get user from AuthContext
  const [allLiftsData, setAllLiftsData] = useState([])
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState(null)
  const [loadingData, setLoadingData] = useState(true)
  const [errorData, setErrorData] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Tab and Column Visibility States
  const [activeTab, setActiveTab] = useState("eligibleForTest")
  const [visibleEligibleTestColumns, setVisibleEligibleTestColumns] = useState({})
  const [visibleRecordedTestColumns, setVisibleRecordedTestColumns] = useState({})

  // Filter State
  const [filters, setFilters] = useState({
    vendorName: "all",
    materialName: "all",
    liftType: "all",
    totalQuantity: "all",
    orderNumber: "all",
  })

  const initialFormData = {
    liftIdToUpdate: "",
    alStatus: "passed",
    amDateOfTest: new Date().toISOString().split("T")[0],
    anMoisturePercent: "",
    aoBdPercent: "",
    apApPercent: "",
    aqAluminaPercent: "",
    arIronPercent: "",
    asSieveAnalysis: "",
    atLoiPercent: "",
    auSio2Percent: "",
    avCaoPercent: "",
    awMgoPercent: "",
    axTio2Percent: "",
    ayKna2oPercent: "",
    azFreeIronPercent: "",
  }

  const [formData, setFormData] = useState(initialFormData)
  const [formErrors, setFormErrors] = useState({})

  // Filter Handlers
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

  // Initialize column visibility
  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {}
      columnsMeta.forEach((col) => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable
      })
      return visibility
    }
    setVisibleEligibleTestColumns(initializeVisibility(ELIGIBLE_TESTS_COLUMNS_META))
    setVisibleRecordedTestColumns(initializeVisibility(RECORDED_TESTS_COLUMNS_META))
  }, [])

  // Fetch Data
  useEffect(() => {
    const fetchLiftAccountData = async () => {
      setLoadingData(true)
      setErrorData(null)
      try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(LIFTS_SHEET_NAME)}&t=${new Date().getTime()}`
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`)

        const responseText = await response.text()
        const dataTable = parseGvizResponse(responseText, LIFTS_SHEET_NAME)

        let processedData = dataTable.rows.map((row, gvizRowIndex) => {
          const getStringValue = (colIndex) =>
            row.c?.[colIndex]?.v !== null && row.c?.[colIndex]?.v !== undefined
              ? String(row.c[colIndex].v)
              : ""
          const getFormattedValue = (colIndex) => formatDateString(getStringValue(colIndex))

          const liftData = {
            _id: `${LIFTS_SHEET_NAME}-${gvizRowIndex}`,
            _rowIndex: gvizRowIndex + DATA_START_ROW_LIFTS,
            rawCells: row.c ? row.c.map((cell) => (cell ? (cell.f ?? cell.v) : null)) : [],
            liftNo: getStringValue(LIFT_ID_COL),
            indentNo: getStringValue(INDENT_NO_COL),
            vendorName: getStringValue(VENDOR_NAME_COL),
            rawMaterialName: getStringValue(RAW_MATERIAL_NAME_COL),
            type: getStringValue(LIFT_TYPE_COL),
            qty: getStringValue(ORIGINAL_QTY_COL),
            totalBillQuantity_fromSheet: getStringValue(RECEIPT_TOTAL_BILL_QUANTITY_COL),
            actualQty_fromReceipt: getStringValue(RECEIPT_ACTUAL_QTY_COL),
            billNo: getStringValue(BILL_NO_COL),
            dateOfReceiving_formatted: getFormattedValue(RECEIPT_DATE_OF_RECEIVING_COL),
            firmName: getStringValue(FIRM_NAME_COL),
            aiCondition_val: getStringValue(AI_CONDITION_NOT_NULL_COL),
            aiCondition_val_formatted: getFormattedValue(AI_CONDITION_NOT_NULL_COL),
            ajTimestamp_val: getStringValue(AJ_TIMESTAMP_OR_NULL_COL),
            ajTimestamp_formatted_val: getFormattedValue(AJ_TIMESTAMP_OR_NULL_COL),
            alStatus_val: getStringValue(AL_STATUS_COL),
            amDateOfTest_val: getStringValue(AM_DATE_OF_TEST_COL),
            amDateOfTest_formatted_val: getFormattedValue(AM_DATE_OF_TEST_COL),
            anMoisturePercent_val: getStringValue(AN_MOISTURE_PERCENT_COL),
            aoBdPercent_val: getStringValue(AO_BD_PERCENT_COL),
            apApPercent_val: getStringValue(AP_AP_PERCENT_COL),
            aqAluminaPercent_val: getStringValue(AQ_ALUMINA_PERCENT_COL),
            arIronPercent_val: getStringValue(AR_IRON_PERCENT_COL),
            asSieveAnalysis_val: getStringValue(AS_SIEVE_ANALYSIS_COL),
            atLoiPercent_val: getStringValue(AT_LOI_PERCENT_COL),
            auSio2Percent_val: getStringValue(AU_SIO2_PERCENT_COL),
            avCaoPercent_val: getStringValue(AV_CAO_PERCENT_COL),
            awMgoPercent_val: getStringValue(AW_MGO_PERCENT_COL),
            axTio2Percent_val: getStringValue(AX_TIO2_PERCENT_COL),
            ayKna2oPercent_val: getStringValue(AY_KNA2O_PERCENT_COL),
            azFreeIronPercent_val: getStringValue(AZ_FREE_IRON_PERCENT_COL),
          }
          return liftData
        })

        if (user?.firmName && user.firmName.toLowerCase() !== "all") {
          const userFirmNameLower = user.firmName.toLowerCase()
          processedData = processedData.filter(
            (lift) => lift && lift.firmName && String(lift.firmName).toLowerCase() === userFirmNameLower,
          )
        }

        setAllLiftsData(processedData.filter(Boolean))
      } catch (err) {
        const errorMessage = `Failed to load data from LIFT-ACCOUNTS: ${err.message}`
        setErrorData(errorMessage)
        toast.error("Data Load Error", {
          description: errorMessage,
          icon: <XCircle className="h-4 w-4" />,
        })
      } finally {
        setLoadingData(false)
      }
    }
    fetchLiftAccountData()
  }, [refreshTrigger, user])

  const uniqueFilterOptions = useMemo(() => {
    const vendors = new Set()
    const materials = new Set()
    const types = new Set()
    const quantities = new Set()
    const orders = new Set()

    allLiftsData.forEach((lift) => {
      if (lift.vendorName) vendors.add(lift.vendorName)
      if (lift.rawMaterialName) materials.add(lift.rawMaterialName)
      if (lift.type) types.add(lift.type)
      if (lift.qty) quantities.add(lift.qty)
      if (lift.totalBillQuantity_fromSheet) quantities.add(lift.totalBillQuantity_fromSheet)
      if (lift.actualQty_fromReceipt) quantities.add(lift.actualQty_fromReceipt)

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
  }, [allLiftsData])


  // Memoized lists for tabs
  const receiptsAwaitingLabTest = useMemo(() => {
    let filtered = allLiftsData.filter((lift) => {
      const aiValue = lift.aiCondition_val
      const ajValue = lift.ajTimestamp_val
      return (
        aiValue !== null &&
        aiValue !== undefined &&
        String(aiValue).trim() !== "" &&
        (ajValue === null || ajValue === undefined || String(ajValue).trim() === "")
      )
    })

    if (filters.vendorName !== "all") {
      filtered = filtered.filter(lift => lift.vendorName === filters.vendorName);
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter(lift => lift.rawMaterialName === filters.materialName);
    }
    if (filters.liftType !== "all") {
      filtered = filtered.filter(lift => lift.type === filters.liftType);
    }
    if (filters.totalQuantity !== "all") {
      filtered = filtered.filter(lift =>
        lift.qty === filters.totalQuantity ||
        lift.totalBillQuantity_fromSheet === filters.totalQuantity ||
        lift.actualQty_fromReceipt === filters.totalQuantity
      );
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter(lift => lift.indentNo === filters.orderNumber || lift.billNo === filters.orderNumber);
    }

    return filtered
  }, [allLiftsData, filters])

  const recordedLabTests = useMemo(() => {
    let filtered = allLiftsData.filter((lift) => lift.ajTimestamp_val && String(lift.ajTimestamp_val).trim() !== "")

    if (filters.vendorName !== "all") {
      filtered = filtered.filter(lift => lift.vendorName === filters.vendorName);
    }
    if (filters.materialName !== "all") {
      filtered = filtered.filter(lift => lift.rawMaterialName === filters.materialName);
    }
    if (filters.liftType !== "all") {
      filtered = filtered.filter(lift => lift.type === filters.liftType);
    }
    if (filters.totalQuantity !== "all") {
      filtered = filtered.filter(lift =>
        lift.qty === filters.totalQuantity ||
        lift.totalBillQuantity_fromSheet === filters.totalQuantity ||
        lift.actualQty_fromReceipt === filters.totalQuantity
      );
    }
    if (filters.orderNumber !== "all") {
      filtered = filtered.filter(lift => lift.indentNo === filters.orderNumber || lift.billNo === filters.orderNumber);
    }

    return filtered.sort((a, b) => {
      const parseDate = (dateStr) => {
        if (!dateStr) return 0
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(dateStr).getTime()
        const dtParts = dateStr.split(" ")
        if (dtParts.length > 0) {
          const dateParts = dtParts[0].split("/")
          if (dateParts.length === 3) {
            const [d, m, y] = dateParts.map(Number)
            if (d && m && y && y > 1900 && y < 2100) {
              const t = { hr: 0, min: 0, s: 0 }
              if (dtParts.length > 1) {
                const ts = dtParts[1].split(":")
                if (ts.length >= 2) {
                  t.hr = Number.parseInt(ts[0], 10)
                  t.min = Number.parseInt(ts[1], 10)
                  if (ts.length === 3) t.s = Number.parseInt(ts[2], 10)
                }
              }
              return new Date(y, m - 1, d, t.hr, t.min, t.s).getTime()
            }
          }
        }
        return new Date(dateStr).getTime()
      }
      const dateA = parseDate(a.ajTimestamp_formatted_val || a.ajTimestamp_val)
      const dateB = parseDate(b.ajTimestamp_formatted_val || b.ajTimestamp_val)
      return dateB - dateA
    })
  }, [allLiftsData, filters])

  // Form and Submission Logic
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleSelectChange = (name) => (value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleOpenLabTestModal = (receipt) => {
    setSelectedReceiptForModal(receipt)
    setFormErrors({})
    setFormData({
      liftIdToUpdate: receipt.liftNo,
      alStatus: receipt.alStatus_val || "passed",
      amDateOfTest: receipt.amDateOfTest_val || new Date().toISOString().split("T")[0],
      anMoisturePercent: receipt.anMoisturePercent_val || "",
      aoBdPercent: receipt.aoBdPercent_val || "",
      apApPercent: receipt.apApPercent_val || "",
      aqAluminaPercent: receipt.aqAluminaPercent_val || "",
      arIronPercent: receipt.arIronPercent_val || "",
      asSieveAnalysis: receipt.asSieveAnalysis_val || "",
      atLoiPercent: receipt.atLoiPercent_val || "",
      auSio2Percent: receipt.auSio2Percent_val || "",
      avCaoPercent: receipt.avCaoPercent_val || "",
      awMgoPercent: receipt.awMgoPercent_val || "",
      axTio2Percent: receipt.axTio2Percent_val || "",
      ayKna2oPercent: receipt.ayKna2oPercent_val || "",
      azFreeIronPercent: receipt.azFreeIronPercent_val || "",
    })
    setIsModalOpen(true)
  }

  const validateForm = useCallback(() => {
    const newErrors = {}
    const reqFields = {
      alStatus: "Status",
      amDateOfTest: "Date Of Test",
      anMoisturePercent: "Moisture %",
      aoBdPercent: "BD %",
      apApPercent: "AP %",
      aqAluminaPercent: "Alumina %",
      arIronPercent: "Iron %",
      asSieveAnalysis: "Sieve Analysis",
      atLoiPercent: "LOI %",
      auSio2Percent: "SiO2 %",
      avCaoPercent: "CaO %",
      awMgoPercent: "MgO %",
      axTio2Percent: "TiO2 %",
      ayKna2oPercent: "K2O+Na2O %",
      azFreeIronPercent: "Free Iron %",
    }
    for (const fKey in reqFields) {
      if (formData[fKey] === null || formData[fKey] === undefined || String(formData[fKey]).trim() === "") {
        newErrors[fKey] = `${reqFields[fKey]} is required`
      }
    }
    setFormErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmitLabTest = async (e) => {
  e.preventDefault();
  if (!validateForm()) {
    toast.error("Validation Error", { description: "Please fill all required fields." });
    return;
  }
  if (!selectedReceiptForModal) {
    toast.error("Error", { description: "No receipt selected. Please try again." });
    return;
  }

  setIsSubmitting(true);

  try {
    const systemGeneratedTimestamp = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).replace(/,/g, "");

    const cellUpdates = {
      [`col${AJ_TIMESTAMP_OR_NULL_COL + 1}`]: systemGeneratedTimestamp,
      [`col${AL_STATUS_COL + 1}`]: formData.alStatus,
      [`col${AM_DATE_OF_TEST_COL + 1}`]: formData.amDateOfTest,
      [`col${AN_MOISTURE_PERCENT_COL + 1}`]: formData.anMoisturePercent,
      [`col${AO_BD_PERCENT_COL + 1}`]: formData.aoBdPercent,
      [`col${AP_AP_PERCENT_COL + 1}`]: formData.apApPercent,
      [`col${AQ_ALUMINA_PERCENT_COL + 1}`]: formData.aqAluminaPercent,
      [`col${AR_IRON_PERCENT_COL + 1}`]: formData.arIronPercent,
      [`col${AS_SIEVE_ANALYSIS_COL + 1}`]: formData.asSieveAnalysis,
      [`col${AT_LOI_PERCENT_COL + 1}`]: formData.atLoiPercent,
      [`col${AU_SIO2_PERCENT_COL + 1}`]: formData.auSio2Percent,
      [`col${AV_CAO_PERCENT_COL + 1}`]: formData.avCaoPercent,
      [`col${AW_MGO_PERCENT_COL + 1}`]: formData.awMgoPercent,
      [`col${AX_TIO2_PERCENT_COL + 1}`]: formData.axTio2Percent,
      [`col${AY_KNA2O_PERCENT_COL + 1}`]: formData.ayKna2oPercent,
      [`col${AZ_FREE_IRON_PERCENT_COL + 1}`]: formData.azFreeIronPercent,
    };

    const params = new URLSearchParams({
      action: "updateCells",
      sheetName: LIFTS_SHEET_NAME,
      rowIndex: selectedReceiptForModal._rowIndex,
      cellUpdates: JSON.stringify(cellUpdates),
    });

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    
    const responseText = await response.text();
    if (!response.ok && !responseText.toLowerCase().includes("success")) {
      throw new Error(`Server error: ${response.status}. ${responseText}`);
    }

    toast.success("Success!", {
      description: `Lab test for Lift ID ${selectedReceiptForModal.liftNo} recorded.`,
      icon: <CheckCircle className="h-4 w-4" />,
    });

    setTimeout(() => setRefreshTrigger(prev => prev + 1), 1000);
    handleModalClose();
  } catch (error) {
    toast.error("Operation Failed", {
      description: error.message,
      icon: <XCircle className="h-4 w-4" />,
    });
  } finally {
    setIsSubmitting(false);
  }
};


  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormErrors({});
    setFormData(initialFormData);
    setSelectedReceiptForModal(null);
  };

  // Column Toggle Handlers
  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "eligible") {
      setVisibleEligibleTestColumns((prev) => ({ ...prev, [dataKey]: checked }))
    } else {
      setVisibleRecordedTestColumns((prev) => ({ ...prev, [dataKey]: checked }))
    }
  }

  const handleSelectAllColumns = (tab, columnsMeta, checked) => {
    const newVisibility = {}
    columnsMeta.forEach((col) => {
      if (col.toggleable && !col.alwaysVisible) newVisibility[col.dataKey] = checked
    })
    if (tab === "eligible") {
      setVisibleEligibleTestColumns((prev) => ({ ...prev, ...newVisibility }))
    } else {
      setVisibleRecordedTestColumns((prev) => ({ ...prev, ...newVisibility }))
    }
  }

  const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
      case "passed":
        return "success"
      case "failed":
        return "destructive"
      case "conditional":
        return "warning"
      default:
        return "outline"
    }
  }

  const renderCell = (item, column) => {
    const value = item[column.dataKey]
    if (column.isBadge && column.dataKey === "alStatus_val") {
      return (
        <Badge variant={getStatusBadgeVariant(value)} className="capitalize px-2 py-0.5 text-xs whitespace-nowrap">
          {value || "N/A"}
        </Badge>
      )
    }
    return value || (value === 0 ? "0" : <span className="text-xs text-gray-400">N/A</span>)
  }

  // Reusable Table Rendering Function
  const renderTableSection = (tabKey, title, description, data, columnsMeta, visibilityState) => {
    const visibleCols = columnsMeta.filter((col) => visibilityState[col.dataKey])
    const isLoading = loadingData && data.length === 0
    const hasError = errorData && data.length === 0 && activeTab === tabKey

    return (
      <Card className="shadow-sm border border-border flex-1 flex flex-col">
        <CardHeader className="py-3 px-4 bg-muted/30">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-md font-semibold text-foreground">
                {tabKey === "eligibleForTest" ? (
                  <FileCheckIcon className="h-5 w-5 text-primary mr-2" />
                ) : (
                  <History className="h-5 w-5 text-primary mr-2" />
                )}
                {title} ({data.length})
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">{description}</CardDescription>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-3">
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Toggle Columns</p>
                  <div className="flex items-center justify-between mt-1 mb-2">
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs"
                      onClick={() =>
                        handleSelectAllColumns(
                          tabKey === "eligibleForTest" ? "eligible" : "recorded",
                          columnsMeta,
                          true,
                        )
                      }
                    >
                      Select All
                    </Button>
                    <span className="text-gray-300 mx-1">|</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs"
                      onClick={() =>
                        handleSelectAllColumns(
                          tabKey === "eligibleForTest" ? "eligible" : "recorded",
                          columnsMeta,
                          false,
                        )
                      }
                    >
                      Deselect All
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {columnsMeta
                      .filter((col) => col.toggleable)
                      .map((col) => (
                        <div key={`toggle-${tabKey}-${col.dataKey}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`toggle-${tabKey}-${col.dataKey}`}
                            checked={!!visibilityState[col.dataKey]}
                            onCheckedChange={(checked) =>
                              handleToggleColumn(
                                tabKey === "eligibleForTest" ? "eligible" : "recorded",
                                col.dataKey,
                                Boolean(checked),
                              )
                            }
                            disabled={col.alwaysVisible}
                          />
                          <Label
                            htmlFor={`toggle-${tabKey}-${col.dataKey}`}
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
        <CardContent className="p-0 flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-10 flex-1">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <p className="font-medium text-destructive">Error Loading Data</p>
              <p className="text-sm text-muted-foreground max-w-md">{errorData}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-blue-200/50 bg-blue-50/50 rounded-lg mx-4 my-4 text-center flex-1">
              <Info className="h-12 w-12 text-blue-500 mb-3" />
              <p className="font-medium text-foreground">No Data Found</p>
              <p className="text-sm text-muted-foreground text-center">
                {tabKey === "eligibleForTest"
                  ? "No materials are currently eligible for lab testing."
                  : "No lab tests have been recorded yet."}
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
                    {visibleCols.map((col) => (
                      <TableHead key={col.dataKey} className="whitespace-nowrap text-xs">
                        {col.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item._id} className="hover:bg-purple-50/50">
                      {visibleCols.map((column) => (
                        <TableCell
                          key={column.dataKey}
                          className={`whitespace-nowrap text-xs ${column.dataKey === "liftNo" ? "font-medium text-primary" : "text-gray-700"}`}
                        >
                          {column.dataKey === "actionColumn" && tabKey === "eligibleForTest" ? (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleOpenLabTestModal(item)}
                              className="h-7 px-2.5 py-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200"
                            >
                              Record Lab Test
                            </Button>
                          ) : (
                            renderCell(item, column)
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
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
      <Card className="shadow-md border-none">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <Beaker className="h-6 w-6 text-purple-600" />
            Step 7: Lab Testing - Is The Quality Good?
          </CardTitle>
          <CardDescription className="text-gray-600">
            Record lab test results for received materials by updating LIFT-ACCOUNTS.
            {user?.firmName && user.firmName.toLowerCase() !== "all" && (
              <span className="ml-2 text-blue-600 font-medium">• Filtered by: {user.firmName}</span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 lg:p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[480px] grid-cols-2 mb-6">
              <TabsTrigger value="eligibleForTest" className="flex items-center gap-2">
                <FileCheckIcon className="h-4 w-4" /> Eligible for Test
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {receiptsAwaitingLabTest.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="recordedTests" className="flex items-center gap-2">
                <History className="h-4 w-4" /> Recorded Tests
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {recordedLabTests.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Filter Section - START */}
            <div className="mb-6 p-4 bg-purple-50/50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium text-gray-700">Filters</Label>
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="ml-auto bg-white hover:bg-gray-50">
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Select value={filters.vendorName} onValueChange={(value) => handleFilterChange("vendorName", value)}>
                  <SelectTrigger className="h-9 bg-white text-xs">
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

                <Select value={filters.materialName} onValueChange={(value) => handleFilterChange("materialName", value)}>
                  <SelectTrigger className="h-9 bg-white text-xs">
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
                  <SelectTrigger className="h-9 bg-white text-xs">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueFilterOptions.liftType.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.totalQuantity} onValueChange={(value) => handleFilterChange("totalQuantity", value)}>
                  <SelectTrigger className="h-9 bg-white text-xs">
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
                  <SelectTrigger className="h-9 bg-white text-xs">
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
            {/* Filter Section - END */}


            <TabsContent value="eligibleForTest" className="flex-1 flex flex-col mt-0">
              {renderTableSection(
                "eligibleForTest",
                "Material Receipts Eligible for Lab Testing",
                "Filtered by: Column AI (Date of Receiving) is NOT empty AND Column AJ (Lab Test Timestamp) IS empty.",
                receiptsAwaitingLabTest,
                ELIGIBLE_TESTS_COLUMNS_META,
                visibleEligibleTestColumns,
              )}
            </TabsContent>
            <TabsContent value="recordedTests" className="flex-1 flex flex-col mt-0">
              {renderTableSection(
                "recordedTests",
                "All Recorded Lab Tests",
                "Lifts with a Lab Test Timestamp in Column AJ, sorted by latest test.",
                recordedLabTests,
                RECORDED_TESTS_COLUMNS_META,
                visibleRecordedTestColumns,
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-lg md:text-xl text-foreground flex items-center gap-2">
              <Beaker className="h-6 w-6 text-purple-600" />
              Record Lab Test for Lift ID:{" "}
              <span className="font-bold text-primary ml-1">{selectedReceiptForModal?.liftNo}</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1 text-xs">
              PO: {selectedReceiptForModal?.indentNo || "N/A"} | Party: {selectedReceiptForModal?.vendorName || "N/A"} |
              Material: {selectedReceiptForModal?.rawMaterialName || "N/A"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitLabTest} className="space-y-6 py-2 px-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-4">
              <div>
                <Label className="text-foreground text-xs" htmlFor="alStatus">
                  AL: Status <span className="text-destructive">*</span>
                </Label>
                <Select name="alStatus" value={formData.alStatus} onValueChange={handleSelectChange("alStatus")}>
                  <SelectTrigger
                    className={`h-9 mt-1 rounded-md text-xs ${formErrors.alStatus ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                  >
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="conditional">Conditional Pass</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.alStatus && <p className="mt-1 text-xs text-destructive">{formErrors.alStatus}</p>}
              </div>
              <div>
                <Label className="text-foreground text-xs" htmlFor="amDateOfTest">
                  Date Of Test <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  id="amDateOfTest"
                  name="amDateOfTest"
                  value={formData.amDateOfTest}
                  onChange={handleInputChange}
                  className={`h-9 mt-1 rounded-md text-xs ${formErrors.amDateOfTest ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                />
                {formErrors.amDateOfTest && <p className="mt-1 text-xs text-destructive">{formErrors.amDateOfTest}</p>}
              </div>
              {[
                { label: "Moisture %", name: "anMoisturePercent", placeholder: "" },
                { label: "BD %", name: "aoBdPercent", placeholder: "" },
                { label: "AP %", name: "apApPercent", placeholder: "" },
                { label: "Alumina %", name: "aqAluminaPercent", placeholder: "" },
                { label: "Iron %", name: "arIronPercent", placeholder: "" },
                { label: "Sieve Analysis", name: "asSieveAnalysis", placeholder: "" },
                { label: "LOI %", name: "atLoiPercent", placeholder: "" },
                { label: "SiO2 %", name: "auSio2Percent", placeholder: "" },
                { label: "CaO %", name: "avCaoPercent", placeholder: "" },
                { label: "MgO %", name: "awMgoPercent", placeholder: "" },
                { label: "TiO2 %", name: "axTio2Percent", placeholder: "" },
                { label: "K2O+Na2O %", name: "ayKna2oPercent", placeholder: "" },
                { label: "Free Iron %", name: "azFreeIronPercent", placeholder: "" },
              ].map((f) => (
                <div key={f.name}>
                  <Label className="text-foreground text-xs" htmlFor={f.name}>
                    {f.label} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="text"
                    id={f.name}
                    name={f.name}
                    value={formData[f.name]}
                    onChange={handleInputChange}
                    placeholder={f.placeholder}
                    className={`h-9 mt-1 rounded-md text-xs ${formErrors[f.name] ? "border-destructive" : "border-gray-300 focus:ring-purple-500 focus:border-purple-500"}`}
                  />
                  {formErrors[f.name] && <p className="mt-1 text-xs text-destructive">{formErrors[f.name]}</p>}
                </div>
              ))}
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedReceiptForModal}
                className={`bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-md hover:opacity-90 transition-opacity flex items-center justify-center min-w-[100px] ${isSubmitting || !selectedReceiptForModal ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  "Record Lab Test"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}