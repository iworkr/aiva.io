"use client";

import { useEffect } from "react";

/**
 * Client component that enables scrolling on external pages
 * by removing overflow-hidden from body when mounted
 */
export function EnableScrolling() {
  useEffect(() => {
    // Remove overflow-hidden from body to enable scrolling
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";

    // Cleanup: restore original styles when component unmounts
    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, []);

  return null;
}

