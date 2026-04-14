"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Loader2, 
  Shield, 
  ShieldCheck,
  Search,
  Building2,
  Lock,
  AlertCircle
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const LOGIN_TABLE = "Login";

export default function ManageUsers() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    "User Name": "",
    "Firm Name": "",
    Password: "",
    Pages: ""
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from(LOGIN_TABLE)
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;
      setData(rows || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        "User Name": user["User Name"] || "",
        "Firm Name": user["Firm Name"] || "",
        Password: user.Password || "",
        Pages: user.Pages || ""
      });
    } else {
      setEditingId(null);
      setFormData({
        "User Name": "",
        "Firm Name": "",
        Password: "",
        Pages: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      "User Name": "",
      "Firm Name": "",
      Password: "",
      Rights: ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData
      };

      if (editingId) {
        const { error } = await supabase
          .from(LOGIN_TABLE)
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("User updated successfully");
      } else {
        const { error } = await supabase
          .from(LOGIN_TABLE)
          .insert([payload]);
        if (error) throw error;
        toast.success("User created successfully");
      }
      fetchData();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error("Failed to save user data");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const { error } = await supabase
        .from(LOGIN_TABLE)
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("User deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const filteredUsers = data.filter(user => 
    user["User Name"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user["Firm Name"]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderRights = (pages) => {
    if (!pages) return <Badge variant="outline" className="text-gray-400">No Access</Badge>;
    
    let pagesArray = [];
    if (typeof pages === 'string') {
      if (pages.toLowerCase() === "all") {
        return (
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none flex items-center gap-1 w-fit">
            <ShieldCheck className="h-3 w-3" /> Administrator (All Access)
          </Badge>
        );
      }
      pagesArray = pages.split(",");
    } else if (Array.isArray(pages)) {
      pagesArray = pages;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {pagesArray.map((right, idx) => (
          <Badge key={idx} variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 text-[10px] px-2 py-0">
            {String(right).trim()}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Users className="text-purple-600 h-6 w-6" />
            </div>
            Manage Users
          </h1>
          <p className="text-gray-500 mt-1">Configure system access and firm assignments</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-green-600 hover:bg-green-700 shadow-md">
          <UserPlus className="h-4 w-4 mr-2" /> Add New User
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or firm..."
                className="pl-9 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-sm text-gray-500 font-medium">
              Total: {filteredUsers.length} Users
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-semibold text-gray-600">User Name</TableHead>
                <TableHead className="font-semibold text-gray-600">Firm Name</TableHead>
                <TableHead className="font-semibold text-gray-600">Access Permissions</TableHead>
                <TableHead className="text-right font-semibold text-gray-600">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center text-gray-400 font-medium">
                    No users found matching your search
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-gray-900 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs border border-purple-100">
                          {user["User Name"]?.charAt(0).toUpperCase()}
                        </div>
                        {user["User Name"]}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                       <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200 flex items-center gap-1 w-fit">
                        <Building2 className="h-3 w-3" /> {user["Firm Name"]}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      {renderRights(user.Pages)}
                    </TableCell>
                    <TableCell className="text-right space-x-1 py-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleOpenModal(user)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? <Edit2 className="h-5 w-5 text-purple-600" /> : <UserPlus className="h-5 w-5 text-purple-600" />}
              {editingId ? "Edit User Account" : "Create New User"}
            </DialogTitle>
            <DialogDescription>
              Assign firm access and system permissions for this user.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right text-xs">User Name</Label>
                <Input 
                  id="username" 
                  value={formData["User Name"]} 
                  onChange={(e) => setFormData({...formData, "User Name": e.target.value})} 
                  placeholder="e.g. nikhil"
                  className="col-span-3 h-9" 
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firm" className="text-right text-xs">Firm Name</Label>
                <Input 
                  id="firm" 
                  value={formData["Firm Name"]} 
                  onChange={(e) => setFormData({...formData, "Firm Name": e.target.value})} 
                  placeholder="e.g. Purab or all"
                  className="col-span-3 h-9" 
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right text-xs">Password</Label>
                <div className="col-span-3 relative">
                   <Input 
                    id="password" 
                    type="password"
                    value={formData.Password} 
                    onChange={(e) => setFormData({...formData, Password: e.target.value})} 
                    className="h-9 pr-10" 
                    required
                  />
                  <Lock className="absolute right-3 top-2.5 h-4 w-4 text-gray-300" />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rights" className="text-right text-xs">Access</Label>
                <Input 
                  id="rights" 
                  value={formData.Pages} 
                  onChange={(e) => setFormData({...formData, Pages: e.target.value})} 
                  placeholder="Comma separated steps or 'all'"
                  className="col-span-3 h-9" 
                  required
                />
              </div>
              <div className="pl-24">
                 <p className="text-[10px] text-muted-foreground bg-amber-50 p-2 rounded border border-amber-100 flex items-start gap-1.5">
                  <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5" />
                  Enter "all" for full administrator access, or a comma-separated list of step names (e.g., Indent, PO, Lift).
                </p>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 px-6">
                {editingId ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
  