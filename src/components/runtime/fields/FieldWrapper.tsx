'use client';

import React from 'react';
import { FieldError } from 'react-hook-form';
import clsx from 'clsx';

interface FieldWrapperProps {
  id: string;
  name: string;
  label?: string;
  description?: string;
  helperText?: string;
  required?: boolean;
  error?: FieldError | string;
  disabled?: boolean;
  customClass?: string;
  children: React.ReactNode;
}

export function FieldWrapper({
  id,
  name,
  label,
  description,
  helperText,
  required,
  error,
  disabled,
  customClass,
  children,
}: FieldWrapperProps) {
  const errorMessage = typeof error === 'string' ? error : error?.message;

  return (
    <div
      className={clsx(
        'flex flex-col space-y-1.5 w-full transition-opacity',
        disabled && 'opacity-60 pointer-events-none',
        customClass
      )}
      data-field-id={id}
      data-field-name={name}
    >
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-semibold text-slate-800 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-red-500 ml-1 font-bold">*</span>}
          </span>
        </label>
      )}

      {description && (
        <p className="text-xs text-slate-500 leading-normal">{description}</p>
      )}

      <div className="relative">{children}</div>

      {helperText && !errorMessage && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}

      {errorMessage && (
        <p className="text-xs font-medium text-red-600 flex items-center space-x-1 animate-fadeIn">
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
}
