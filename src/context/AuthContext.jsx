"use client"
import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "../lib/supabase"

// Create and export the AuthContext
export const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [allowedSteps, setAllowedSteps] = useState([])

  // --- SUPABASE CONFIGURATION ---
  const LOGIN_TABLE = "Login"
  // --- END SUPABASE CONFIG ---

  useEffect(() => {
    const initializeAuth = async () => {
      const authStatus = localStorage.getItem("isAuthenticated")
      const userData = localStorage.getItem("user")
      const userSteps = localStorage.getItem("allowedSteps")

      if (authStatus === "true" && userData) {
        const parsedUser = JSON.parse(userData)
        setIsAuthenticated(true)
        setUser(parsedUser)

        if (userSteps) {
          const parsedUserSteps = JSON.parse(userSteps)
          setAllowedSteps(parsedUserSteps)
        } else {
          await fetchUserRoles(parsedUser.username)
        }
      }
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  const fetchUserRoles = async (username) => {
    try {
      const { data: rows, error } = await supabase
        .from(LOGIN_TABLE)
        .select('*')
        .ilike('User Name', username);

      if (error) throw error;

      if (!rows || rows.length === 0) {
        setAllowedSteps([])
        localStorage.setItem("allowedSteps", JSON.stringify([]))
        localStorage.removeItem("user")
        setUser(null)
        return []
      }

      const row = rows[0];
      const pagesData = row["Pages"]
      let userRoles = []
      
      if (typeof pagesData === 'string') {
        userRoles = pagesData.toLowerCase() === "all"
          ? ["admin"]
          : pagesData.split(",").map((step) => step.trim().toLowerCase()).filter(Boolean)
      } else if (Array.isArray(pagesData)) {
        userRoles = pagesData.map(p => String(p).toLowerCase())
      }

      const userFirm = (row["Firm Name"] || "").trim()

      const currentUserData = JSON.parse(localStorage.getItem("user") || "{}")
      const updatedUserData = { ...currentUserData, firmName: userFirm }
      localStorage.setItem("user", JSON.stringify(updatedUserData))
      setUser(updatedUserData)
      localStorage.setItem("allowedSteps", JSON.stringify(userRoles))
      setAllowedSteps(userRoles)
      return userRoles
    } catch (error) {
      toast.error("Role Fetch Error", { description: `Failed to load user roles: ${error.message}` })
      setAllowedSteps([])
      localStorage.setItem("allowedSteps", JSON.stringify([]))
      localStorage.removeItem("user")
      setUser(null)
      return []
    }
  }

  const login = async (username, password) => {
    try {
      const { data: rows, error } = await supabase
        .from(LOGIN_TABLE)
        .select('*')
        .ilike('User Name', username);

      if (error) throw error;

      if (!rows || rows.length === 0) {
        toast.error("Login Failed", { description: "Invalid username or password. Please try again." })
        return false;
      }

      const row = rows[0];
      if (row.Password.toString() !== password.toString()) {
        toast.error("Login Failed", { description: "Invalid username or password. Please try again." })
        return false;
      }

      const pagesData = row["Pages"]
      let userFoundRoles = []
      
      if (typeof pagesData === 'string') {
        userFoundRoles = pagesData.toLowerCase() === "all" 
          ? ["admin"] 
          : pagesData.split(",").map(step => step.trim().toLowerCase()).filter(Boolean);
      } else if (Array.isArray(pagesData)) {
        userFoundRoles = pagesData.map(p => String(p).toLowerCase())
      }

      const userFoundFirm = (row["Firm Name"] || "").trim()

      const userData = { username, firmName: userFoundFirm }
      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem("user", JSON.stringify(userData))
      localStorage.setItem("allowedSteps", JSON.stringify(userFoundRoles))

      setUser(userData)
      setIsAuthenticated(true)
      setAllowedSteps(userFoundRoles)

      toast.success("Login Successful", { description: "Welcome to the Purchase Management System." })
      return true;
    } catch (error) {
      toast.error("Login Error", { description: `An error occurred during login: ${error.message}` })
      return false;
    }
  }

  const logout = () => {
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("user")
    localStorage.removeItem("allowedSteps")
    setIsAuthenticated(false)
    setUser(null)
    setAllowedSteps([])
    toast.info("Logged Out", { description: "You have been successfully logged out." })
    window.location.reload()
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, allowedSteps, login, logout, isLoading }}>
      {!isLoading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}