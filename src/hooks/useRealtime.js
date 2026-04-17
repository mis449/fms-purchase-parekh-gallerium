import { useEffect } from "react";
import { supabase } from "../lib/supabase";

/**
 * Custom hook for subscribing to real-time changes using Supabase.
 * @param {string} table - The table name to listen for.
 * @param {Function} callback - Function called on any change.
 */
export const useRealtime = (table, callback) => {
  useEffect(() => {
    // Basic setup for realtime listening on any event (* = INSERT, UPDATE, DELETE)
    const channel = supabase
      .channel(`${table}-realtime`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
        },
        (payload) => {
          console.log(`Realtime change detected in ${table}:`, payload);
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, callback]);
};
