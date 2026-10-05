'use client';

import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { FieldNode } from '@/types/schema';
import { FieldWrapper } from './FieldWrapper';
import { UploadCloud, FileText, X } from 'lucide-react';
import clsx from 'clsx';

interface FileInputProps {
  field: FieldNode;
  disabled?: boolean;
}

export function FileInput({ field, disabled }: FileInputProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext();

  const { id, name, label, description, helperText, validation, customClass } = field;
  const error = errors[name];
  const isRequired = Boolean(validation?.required);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    } else {
      setSelectedFileName(null);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedFileName(null);
    setValue(name, null);
  };

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
      <div
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-4 text-center transition-colors',
          error ? 'border-red-300 bg-red-50/30' : 'border-slate-300 hover:border-blue-400 bg-slate-50/50',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <input
          id={id}
          type="file"
          disabled={disabled}
          {...register(name, {
            onChange: handleFileChange,
          })}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
        />

        {selectedFileName ? (
          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center space-x-2 text-sm text-slate-800 truncate">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="truncate">{selectedFileName}</span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="z-20 p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-1 py-2">
            <UploadCloud className="w-7 h-7 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">
              Click or drag file to upload
            </p>
            <p className="text-xs text-slate-500">PDF, PNG, JPG, or DOC up to 10MB</p>
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}
