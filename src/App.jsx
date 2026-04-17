"use client";
import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import IndentForm from "./components/IndentForm";
import StockApproval from "./components/StockApproval";
import GeneratePO from "./components/generate-po";
import TallyEntry from "./components/tally-entry";
import LiftMaterial from "./components/lift-material";
import ReceiptCheck from "./components/receipt-check";
import LoginForm from "./components/LoginForm";
import AppHeader from "./components/AppHeader";

import { useAuth } from "./context/AuthContext";
import Accounts from "./components/Accounts";
import ManageUsers from "./components/ManageUsers";
import PurchaseReturn from "./components/PurchaseReturn";
import KycPage from "./components/KycPage";
import VendorPaymentPage from "./components/VendorPaymentPage";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  LayoutDashboard, FilePlus, PackageCheck, FileText, Calculator,
  Truck, CheckSquare, Menu, X, Database, Loader2, RotateCcw, Settings, Users
} from 'lucide-react';
import { Toaster } from "@/components/ui/sonner";
import { useLocation, useNavigate } from "react-router-dom";

function App() {
  const { isAuthenticated, allowedSteps } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Map URL paths to tab IDs
  const pathToTabMap = {
    "/": "dashboard",
    "/indent": "indent",
    "/stock": "stock",
    "/generate-po": "generate-po",
    "/tally-entry": "tally-entry",
    "/lift-material": "lift-material",
    "/receipt-check": "receipt-check",
    "/arrange-logistics": "lift-material", // Map both to same tab
    "/accounts": "accounts",
    "/purchase-return": "purchase-return",
    "/users": "users",
  };

  const allTabs = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} />, stepName: "Dashboard", path: "/" },
    { id: "indent", label: "Indent", icon: <FilePlus size={20} />, stepName: "Generate Indent", path: "/indent" },
    { id: "stock", label: "Stock", icon: <PackageCheck size={20} />, stepName: "Recheck the Stock And Approve Quantity", path: "/stock" },
    { id: "generate-po", label: "PO", icon: <FileText size={20} />, stepName: "Generate Purchase Order", path: "/generate-po" },
    { id: "tally-entry", label: "Tally", icon: <Calculator size={20} />, stepName: "Purchase Order Entry In Tally", path: "/tally-entry" },
    { id: "lift-material", label: "Lift", icon: <Truck size={20} />, stepName: "Lift The Material", path: "/lift-material" },
    { id: "receipt-check", label: "Receipt", icon: <CheckSquare size={20} />, stepName: "Receipt Of Material / Physical Quality Check", path: "/receipt-check" },
    // Individual Accounts Pages
    { id: "accounts", label: "Accounts", icon: <Database size={20} />, stepName: "accounts", path: "/accounts" },
    { id: "purchase-return", label: "Return", icon: <RotateCcw size={20} />, stepName: "purchase-returns", path: "/purchase-return" },
    { id: "users", label: "Users", icon: <Users size={20} />, stepName: "admin", path: "/users" }
  ];

  const accessibleTabs = allTabs.filter(tab =>
    tab.id === "dashboard" ||
    allowedSteps.includes("admin") ||
    allowedSteps.includes(tab.stepName?.toLowerCase())
  );

  // Sync activeTab with URL
  useEffect(() => {
    const tabId = pathToTabMap[location.pathname];
    if (tabId && tabId !== activeTab) {
      setActiveTab(tabId);
    }
  }, [location.pathname]);

  // Sync URL with activeTab (from sidebar interaction)
  useEffect(() => {
    const currentPath = allTabs.find(t => t.id === activeTab)?.path || "/";
    if (location.pathname !== currentPath && currentPath !== "/arrange-logistics") {
       // Only navigate if path is different (avoid infinite loops)
       // navigate(currentPath);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!activeTab || !accessibleTabs.some(tab => tab.id === activeTab)) {
      setActiveTab("dashboard");
    }
  }, [accessibleTabs, activeTab, isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const toggleDesktopSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderSidebarContent = (isMobile = false) => (
    <>
      <ScrollArea className={`${isMobile ? 'h-[calc(100vh-4rem)]' : 'h-[calc(100vh-4rem)]'} flex-1`}>
        <nav className="space-y-1 p-2 pb-20">
          {accessibleTabs.map((tab) => (
            <Button
              key={tab.id}
              className={`w-full justify-start h-12 relative group rounded-lg transition-all duration-200 ease-in-out
                        ${isMobile ? 'px-4' : (isSidebarOpen ? 'pl-4' : 'justify-center')}
                        ${activeTab === tab.id
                          ? "bg-purple-600 text-white shadow-md"
                          : "bg-white text-gray-700 hover:bg-purple-50 hover:text-gray-900"
                        }`}
              onClick={() => {
                setActiveTab(tab.id);
                if (isMobile) setIsMobileSidebarOpen(false);
              }}
              title={tab.label}
            >
              <span className={`transition-colors duration-150 ease-in-out
                              ${activeTab === tab.id ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>
                {tab.icon}
              </span>
              {(isMobile || isSidebarOpen) && (
                <span className="ml-3 text-base font-medium flex items-center flex-1 min-w-0">
                  <span className="truncate">{tab.label}</span>
                </span>
              )}
              {!isMobile && !isSidebarOpen && activeTab === tab.id && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-purple-600 rounded-r-full"></span>
              )}
            </Button>
          ))}
        </nav>
      </ScrollArea>
      {!isMobile && isSidebarOpen && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 text-center bg-white">
          <p className="text-sm text-gray-500 font-semibold">Powered By</p>
          <a className="text-base font-bold bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent" href="https://www.botivate.in/">Botivate</a>
        </div>
      )}
    </>
  );

  const renderContent = () => {
    if (!accessibleTabs.some(tab => tab.id === activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center text-gray-500">
          <X size={48} className="text-red-400 mb-4" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="mt-2">You do not have permission to view this section.</p>
          <Button onClick={() => setActiveTab("dashboard")} className="mt-4">Go to Dashboard</Button>
        </div>
      );
    }
    
    switch (activeTab) {
      case "dashboard": return <Dashboard />;
      case "indent": return <IndentForm />;
      case "stock": return <StockApproval />;
      case "generate-po": return <GeneratePO />;
      case "tally-entry": return <TallyEntry />;
      case "lift-material": return <LiftMaterial />;
      case "receipt-check": return <ReceiptCheck />;
      // Individual Accounts Pages
      case "accounts": return <Accounts />;
      case "purchase-return": return <PurchaseReturn />;
      case "users": return <ManageUsers />;
      case "kyc": return <KycPage />;
      case "vendor-payment": return <VendorPaymentPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex bg-white shadow-lg transition-all duration-300 ease-in-out flex-col flex-shrink-0 relative ${
          isSidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Header */}
        <div
          className={`h-16 flex items-center border-b border-gray-200 flex-shrink-0 z-10 bg-white ${
            isSidebarOpen ? "px-4 justify-start" : "px-0 justify-center"
          }`}
        >
          {isSidebarOpen ? (
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Purchase Management
            </span>
          ) : (
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              P
            </span>
          )}
        </div>
        {/* Sidebar Content */}
        <div className="flex-1 relative">
          {renderSidebarContent(false)}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader
          toggleDesktopSidebar={toggleDesktopSidebar}
          isSidebarOpen={isSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 flex flex-col w-60 relative">
          {/* Mobile Header */}
          <div className="h-16 flex items-center border-b border-gray-200 px-4 justify-start flex-shrink-0 bg-white z-10">
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Purchase Management
            </span>
          </div>
          {/* Mobile Sidebar Content */}
          <div className="flex-1">
            {renderSidebarContent(true)}
          </div>
        </SheetContent>
      </Sheet>

      <Toaster />
    </div>
  );
}

export default App;