"use client";

import React, { useState, useEffect, useCallback, useContext, useMemo } from "react";
import {
  RotateCcw,
  FileText,
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  History,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  X,
  ExternalLink
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const PURCHASE_RETURNS_TABLE = "Purchase Returns";

export default function PurchaseReturn() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState({
    partyName: "all",
    productName: "all",
    firmName: "all"
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from(PURCHASE_RETURNS_TABLE)
        .select("*")
        .order("Time Stamp", { ascending: false });

      if (error) throw error;

      let filteredRows = rows;
      if (user?.firmName && user.firmName.toLowerCase() !== "all") {
        filteredRows = rows.filter(
          (row) => row["Firm Name"]?.toLowerCase() === user.firmName.toLowerCase()
        );
      }

      setData(filteredRows);
    } catch (error) {
      console.error("Error fetching purchase returns:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uniqueOptions = useMemo(() => {
    const parties = new Set();
    const products = new Set();
    const firms = new Set();

    data.forEach(item => {
      if (item["Party Name"]) parties.add(item["Party Name"]);
      if (item["Product Name"]) products.add(item["Product Name"]);
      if (item["Firm Name"]) firms.add(item["Firm Name"]);
    });

    return {
      parties: Array.from(parties).sort(),
      products: Array.from(products).sort(),
      firms: Array.from(firms).sort()
    };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = Object.values(item).some(val => 
        String(val || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesParty = filters.partyName === "all" || item["Party Name"] === filters.partyName;
      const matchesProduct = filters.productName === "all" || item["Product Name"] === filters.productName;
      const matchesFirm = filters.firmName === "all" || item["Firm Name"] === filters.firmName;

      return matchesSearch && matchesParty && matchesProduct && matchesFirm;
    });
  }, [data, searchTerm, filters]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).replace(",", "");
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RotateCcw className="text-purple-600 h-8 w-8" /> Purchase Returns
          </h1>
          <p className="text-gray-500">Manage and track all material returns to vendors.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="sm" className="bg-white">
            <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            New Return
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search returns..."
                className="pl-9 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filters.partyName} onValueChange={(v) => setFilters(f => ({ ...f, partyName: v }))}>
                <SelectTrigger className="w-[180px] bg-white text-xs h-9">
                  <SelectValue placeholder="Party Name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parties</SelectItem>
                  {uniqueOptions.parties.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filters.productName} onValueChange={(v) => setFilters(f => ({ ...f, productName: v }))}>
                <SelectTrigger className="w-[180px] bg-white text-xs h-9">
                  <SelectValue placeholder="Product Name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {uniqueOptions.products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchTerm("");
                  setFilters({ partyName: "all", productName: "all", firmName: "all" });
                }}
                className="text-xs"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-semibold py-4">Timestamp</TableHead>
                  <TableHead className="text-xs font-semibold py-4">Return No.</TableHead>
                  <TableHead className="text-xs font-semibold py-4">PO No.</TableHead>
                  <TableHead className="text-xs font-semibold py-4">Party Name</TableHead>
                  <TableHead className="text-xs font-semibold py-4">Product</TableHead>
                  <TableHead className="text-xs font-semibold py-4">Qty</TableHead>
                  <TableHead className="text-xs font-semibold py-4">Reason</TableHead>
                  <TableHead className="text-xs font-semibold py-4">Status</TableHead>
                  <TableHead className="text-xs font-semibold py-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                        <p className="text-gray-500">Fetching records...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertCircle className="h-10 w-10 text-gray-300" />
                        <p className="text-gray-500 font-medium">No purchase returns found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row) => (
                    <TableRow key={row.ID} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(row["Time Stamp"])}</TableCell>
                      <TableCell className="text-xs font-medium text-purple-700">{row["Purchase Return No."]}</TableCell>
                      <TableCell className="text-xs">{row["Po No."]}</TableCell>
                      <TableCell className="text-xs truncate max-w-[150px]">{row["Party Name"]}</TableCell>
                      <TableCell className="text-xs">{row["Product Name"]}</TableCell>
                      <TableCell className="text-xs">{row["Return Qty"] || row["Qty"]}</TableCell>
                      <TableCell className="text-xs italic text-gray-500 truncate max-w-[200px]">{row["Return Reason"]}</TableCell>
                      <TableCell className="text-xs">
                        {row.Actual ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0">
                            Completed
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-2 py-0">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
