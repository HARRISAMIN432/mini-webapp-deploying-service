// components/auth/AuthInputField.tsx
"use client";

import * as React from "react";
import { Controller, Control, FieldPath, FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";

interface AuthInputFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  rightElement?: React.ReactNode;
  className?: string;
  description?: string;
}

export function AuthInputField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  rightElement,
  className,
  description,
}: AuthInputFieldProps<T>) {
  const inputId = `auth-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className={cn("space-y-1.5", className)}>
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-gray-700"
          >
            {label}
          </label>

          <div className="relative">
            <input
              {...field}
              id={inputId}
              type={type}
              placeholder={placeholder}
              autoComplete={autoComplete}
              inputMode={inputMode}
              maxLength={maxLength}
              aria-invalid={fieldState.invalid}
              className={cn(
                "block w-full h-11 rounded-xl px-3.5 text-sm text-gray-900 placeholder:text-gray-400",
                "bg-white border border-gray-200",
                "focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10",
                "transition-all duration-200",
                fieldState.error &&
                  "border-red-300 focus:border-red-500 focus:ring-red-500/10",
                rightElement && "pr-10",
              )}
            />
            {rightElement && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {rightElement}
              </div>
            )}
          </div>

          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}

          {fieldState.invalid && fieldState.error && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <svg
                className="w-3 h-3 flex-shrink-0"
                viewBox="0 0 12 12"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M6 1a5 5 0 100 10A5 5 0 006 1zM5.25 3.5a.75.75 0 011.5 0v2.5a.75.75 0 01-1.5 0v-2.5zm.75 5.75a.75.75 0 100-1.5.75.75 0 000 1.5z"
                />
              </svg>
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}
