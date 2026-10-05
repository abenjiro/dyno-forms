'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FieldNode, StaticOption } from '@/types/schema';
import { useDynamicApiResolver } from '@/runtime/useDynamicApiResolver';
import { FieldWrapper } from './FieldWrapper';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface RadioInputProps {
  field: FieldNode;
  disabled?: boolean;
}

export function RadioInput({ field, disabled }: RadioInputProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext();

  const { id, name, label, description, helperText, validation, dataSource, customClass } = field;
  const error = errors[name];
  const isRequired = Boolean(validation?.required);
  const currentValue = watch(name);

  // Cascading dependency tracking if any
  const dependsOnField = dataSource?.api?.dependsOnField;
  const parentValue = dependsOnField ? watch(dependsOnField) : undefined;

  const isApi = dataSource?.type === 'api';
  const {
    options: apiOptions,
    isLoading,
    isError,
  } = useDynamicApiResolver(isApi ? dataSource?.api : undefined, parentValue);

  let options: StaticOption[] = [];
  if (isApi) {
    options = apiOptions;
  } else if (dataSource?.staticOptions) {
    options = dataSource.staticOptions;
  }

  return (
    <FieldWrapper
      id={id}
      name={name}
      label={label}
      description={description}
      helperText={helperText}
      required={isRequired}
      error={error as any}
      disabled={disabled}
      customClass={customClass}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2 py-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Loading choices...</span>
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          {options.map((opt, idx) => {
            const isSelected = String(currentValue) === String(opt.value);
            const radioId = `${id}_opt_${idx}`;

            return (
              <label
                key={`${opt.value}-${idx}`}
                htmlFor={radioId}
                className={clsx(
                  'flex items-center p-3 rounded-lg border text-sm cursor-pointer transition-colors',
                  isSelected
                    ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-medium'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  disabled && 'cursor-not-allowed opacity-60'
                )}
              >
                <input
                  id={radioId}
                  type="radio"
                  value={opt.value}
                  disabled={disabled}
                  {...register(name)}
                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 mr-3"
                />
                <span className="flex-1">{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {isError && (
        <p className="text-xs text-amber-600 mt-1">Failed to load dynamic radio choices.</p>
      )}
    </FieldWrapper>
  );
}
