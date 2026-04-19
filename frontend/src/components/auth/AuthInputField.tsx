"use client";

import * as React from "react";
import { Controller, Control, FieldPath, FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
  inputClassName?: string;
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
  inputClassName,
  description,
}: AuthInputFieldProps<T>) {
  const inputId = `auth-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field
          data-invalid={fieldState.invalid}
          className={cn("space-y-1.5", className)}
        >
          <FieldLabel
            htmlFor={inputId}
            className="text-[#9ca3af] text-xs font-medium tracking-wide uppercase"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.06em",
            }}
          >
            {label}
          </FieldLabel>

          {rightElement ? (
            <div className="relative group">
              <Input
                {...field}
                id={inputId}
                type={type}
                placeholder={placeholder}
                autoComplete={autoComplete}
                inputMode={inputMode}
                maxLength={maxLength}
                aria-invalid={fieldState.invalid}
                className={cn(
                  "h-11 w-full rounded-xl text-sm text-white placeholder:text-[#374151] pr-12",
                  "transition-all duration-200 outline-none",
                  "bg-[#0d0f14] border border-white/[0.08]",
                  "hover:border-white/[0.14] hover:bg-[#0f1116]",
                  "focus:border-indigo-500/60 focus:bg-[#0f1116]",
                  "focus:ring-2 focus:ring-indigo-500/15 focus:ring-offset-0",
                  "focus-visible:ring-2 focus-visible:ring-indigo-500/15 focus-visible:ring-offset-0",
                  fieldState.error &&
                    "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/15 focus-visible:ring-red-500/15",
                  inputClassName,
                )}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563]">
                {rightElement}
              </div>
              {/* Focus glow line */}
              {!fieldState.error && (
                <div
                  className="absolute bottom-0 left-3 right-3 h-px rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-200"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)",
                  }}
                />
              )}
            </div>
          ) : (
            <div className="relative group">
              <Input
                {...field}
                id={inputId}
                type={type}
                placeholder={placeholder}
                autoComplete={autoComplete}
                inputMode={inputMode}
                maxLength={maxLength}
                aria-invalid={fieldState.invalid}
                className={cn(
                  "h-11 w-full rounded-xl text-sm text-white placeholder:text-[#374151]",
                  "transition-all duration-200 outline-none",
                  "bg-[#0d0f14] border border-white/[0.08]",
                  "hover:border-white/[0.14] hover:bg-[#0f1116]",
                  "focus:border-indigo-500/60 focus:bg-[#0f1116]",
                  "focus:ring-2 focus:ring-indigo-500/15 focus:ring-offset-0",
                  "focus-visible:ring-2 focus-visible:ring-indigo-500/15 focus-visible:ring-offset-0",
                  fieldState.error &&
                    "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/15 focus-visible:ring-red-500/15",
                  inputClassName,
                )}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
              {!fieldState.error && (
                <div
                  className="absolute bottom-0 left-3 right-3 h-px rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-200"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)",
                  }}
                />
              )}
            </div>
          )}

          {description && (
            <FieldDescription
              className="text-[#4b5563] text-xs"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {description}
            </FieldDescription>
          )}

          {fieldState.invalid && fieldState.error && (
            <FieldError
              errors={[fieldState.error]}
              className="text-red-400 text-xs flex items-center gap-1.5 mt-1"
            />
          )}
        </Field>
      )}
    />
  );
}
