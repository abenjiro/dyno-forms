'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FieldNode, StaticOption } from '@/types/schema';
import { useDynamicApiResolver } from '@/runtime/useDynamicApiResolver';
import { FieldWrapper } from './FieldWrapper';
import { Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface SelectInputProps {
  field: FieldNode;
  disabled?: boolean;
}

export function SelectInput({ field, disabled }: SelectInputProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext();

  const { id, name, label, description, placeholder, helperText, validation, dataSource, customClass } = field;
  const error = errors[name];
  const isRequired = Boolean(validation?.required);

  // Cascading dependency tracking
  const dependsOnField = dataSource?.api?.dependsOnField;
  const parentValue = dependsOnField ? watch(dependsOnField) : undefined;

  // Resolve dynamic options if API datasource
  const isApi = dataSource?.type === 'api';
  const {
    options: apiOptions,
    isLoading,
    isError,
    error: apiError,
  } = useDynamicApiResolver(isApi ? dataSource?.api : undefined, parentValue);

  // Determine final options list
  let options: StaticOption[] = [];
  if (isApi) {
    options = apiOptions;
  } else if (dataSource?.staticOptions) {
    options = dataSource.staticOptions;
  }

  const isCascadingWaiting = Boolean(dependsOnField && (parentValue === undefined || parentValue === null || parentValue === ''));

  const baseInputStyles =
    'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed appearance-none cursor-pointer';

  const borderStyles = error
    ? 'border-red-400 focus:border-red-500 focus:ring-red-400'
    : 'border-slate-300 hover:border-slate-400';

  return (
    <FieldWrapper
      id={id}
      name={name}
      label={label}
      description={description}
      helperText={helperText}
      required={isRequired}
      error={error as any}
      disabled={disabled || isCascadingWaiting}
      customClass={customClass}
    >
      <div className="relative">
        <select
          id={id}
          disabled={disabled || isLoading || isCascadingWaiting}
          {...register(name)}
          className={clsx(baseInputStyles, borderStyles, 'pr-10')}
          defaultValue={field.defaultValue || ''}
        >
          <option value="" disabled={isRequired}>
            {isLoading
              ? 'Loading options from API...'
              : isCascadingWaiting
              ? `Select ${dependsOnField} first...`
              : placeholder || 'Select an option...'}
          </option>

          {options.map((opt, idx) => (
            <option key={`${opt.value}-${idx}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Right dropdown chevron or loading spinner */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {isError && (
        <p className="text-xs text-amber-600 mt-1">
          {apiError?.message || 'Unable to load live options. Using offline fallback.'}
        </p>
      )}
    </FieldWrapper>
  );
}
