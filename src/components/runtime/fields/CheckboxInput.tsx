'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FieldNode } from '@/types/schema';
import clsx from 'clsx';

interface CheckboxInputProps {
  field: FieldNode;
  disabled?: boolean;
}

export function CheckboxInput({ field, disabled }: CheckboxInputProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const { id, name, label, description, helperText, validation, customClass } = field;
  const error = errors[name];
  const isRequired = Boolean(validation?.required);
  const errorMessage = typeof error === 'string' ? error : error?.message;

  return (
    <div
      className={clsx('flex flex-col space-y-1 w-full', disabled && 'opacity-60 pointer-events-none', customClass)}
      data-field-id={id}
      data-field-name={name}
    >
      <label htmlFor={id} className="flex items-start space-x-3 cursor-pointer pt-1">
        <input
          id={id}
          type="checkbox"
          disabled={disabled}
          {...register(name)}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors"
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800 leading-snug">
            {label}
            {isRequired && <span className="text-red-500 ml-1 font-bold">*</span>}
          </span>
          {description && <span className="text-xs text-slate-500 mt-0.5">{description}</span>}
        </div>
      </label>

      {helperText && !errorMessage && (
        <p className="text-xs text-slate-500 pl-7">{helperText}</p>
      )}

      {errorMessage && (
        <p className="text-xs font-medium text-red-600 pl-7 mt-0.5 animate-fadeIn">
          {String(errorMessage)}
        </p>
      )}
    </div>
  );
}
