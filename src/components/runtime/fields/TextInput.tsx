'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FieldNode } from '@/types/schema';
import { FieldWrapper } from './FieldWrapper';
import clsx from 'clsx';

interface TextInputProps {
  field: FieldNode;
  disabled?: boolean;
}

export function TextInput({ field, disabled }: TextInputProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const { id, name, type, label, description, placeholder, helperText, validation, customClass } = field;
  const error = errors[name];
  const isRequired = Boolean(validation?.required);

  const baseInputStyles =
    'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed';

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
      disabled={disabled}
      customClass={customClass}
    >
      {type === 'textarea' ? (
        <textarea
          id={id}
          rows={field.fieldProps?.rows || 3}
          placeholder={placeholder}
          disabled={disabled}
          {...register(name)}
          className={clsx(baseInputStyles, borderStyles, 'resize-y')}
        />
      ) : (
        <input
          id={id}
          type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
          placeholder={placeholder}
          disabled={disabled}
          min={validation?.min}
          max={validation?.max}
          step={field.fieldProps?.step || (type === 'number' ? 'any' : undefined)}
          {...register(name)}
          className={clsx(baseInputStyles, borderStyles)}
        />
      )}
    </FieldWrapper>
  );
}
