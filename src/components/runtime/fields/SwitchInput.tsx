'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FieldNode } from '@/types/schema';
import clsx from 'clsx';

interface SwitchInputProps {
  field: FieldNode;
  disabled?: boolean;
}

export function SwitchInput({ field, disabled }: SwitchInputProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext();

  const { id, name, label, description, helperText, customClass } = field;
  const isChecked = Boolean(watch(name));
  const error = errors[name];
  const errorMessage = typeof error === 'string' ? error : error?.message;

  return (
    <div
      className={clsx('flex flex-col space-y-1 w-full', disabled && 'opacity-60 pointer-events-none', customClass)}
      data-field-id={id}
      data-field-name={name}
    >
      <div className="flex items-center justify-between py-1">
        <div className="flex flex-col pr-4">
          <label htmlFor={id} className="text-sm font-medium text-slate-800 cursor-pointer">
            {label}
          </label>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>

        <label htmlFor={id} className="relative inline-flex items-center cursor-pointer flex-shrink-0">
          <input
            id={id}
            type="checkbox"
            disabled={disabled}
            {...register(name)}
            className="sr-only peer"
          />
          <div
            className={clsx(
              'w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[""] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all',
              isChecked ? 'bg-blue-600' : 'bg-slate-300'
            )}
          />
        </label>
      </div>

      {helperText && !errorMessage && <p className="text-xs text-slate-500">{helperText}</p>}
      {errorMessage && (
        <p className="text-xs font-medium text-red-600 animate-fadeIn">{String(errorMessage)}</p>
      )}
    </div>
  );
}
