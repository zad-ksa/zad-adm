"use client";

import React from "react";

export default function ZadLogo({
  isOpen,
  className = "",
}: {
  isOpen: boolean;
  className?: string;
}) {
  return (
    <img
      src={isOpen ? "/logo-full.svg" : "/logo-icon.svg"}
      alt="Zad Logo"
      className={className}
      style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}
