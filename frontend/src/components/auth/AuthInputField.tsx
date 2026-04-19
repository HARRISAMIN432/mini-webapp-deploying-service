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
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={inputId} className="text-white">
            {label}
          </FieldLabel>

          {rightElement ? (
            <div className="relative">
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
                  "h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-600",
                  "focus-visible:ring-blue-500/50 focus-visible:border-blue-500/60",
                  "transition-all duration-150",
                  fieldState.error &&
                    "border-red-500/50 focus-visible:ring-red-500/30",
                  rightElement && "pr-12",
                  inputClassName,
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {rightElement}
              </div>
            </div>
          ) : (
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
                "h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-600",
                "focus-visible:ring-blue-500/50 focus-visible:border-blue-500/60",
                "transition-all duration-150",
                fieldState.error &&
                  "border-red-500/50 focus-visible:ring-red-500/30",
                inputClassName,
              )}
            />
          )}

          {description && <FieldDescription>{description}</FieldDescription>}

          {fieldState.invalid && fieldState.error && (
            <FieldError errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  );
}
