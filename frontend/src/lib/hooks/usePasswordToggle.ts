"use client";

import { useState, useCallback } from "react";

export function usePasswordToggle() {
  const [showPassword, setShowPassword] = useState(false);

  const toggle = useCallback(() => setShowPassword((v) => !v), []);

  const inputType = showPassword ? "text" : "password";

  return { showPassword, toggle, inputType } as const;
}
