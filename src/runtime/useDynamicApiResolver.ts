'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiDataSourceConfig, StaticOption } from '../types/schema';

/**
 * Helper to safely extract deep nested value using dot notation
 * e.g. getNestedValue({ name: { common: 'Canada' } }, 'name.common') => 'Canada'
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return obj;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

export interface DynamicApiResolverOptions {
  formId?: string;
  fieldId?: string;
}

export function useDynamicApiResolver(
  apiConfig?: ApiDataSourceConfig,
  parentFieldValue?: any,
  resolverOptions?: DynamicApiResolverOptions
): {
  options: StaticOption[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  // If cascading dependency is required but not yet selected, disable query
  const hasDependency = Boolean(apiConfig?.dependsOnField);
  const dependencyReady = !hasDependency || (parentFieldValue !== undefined && parentFieldValue !== null && parentFieldValue !== '');

  const isEnabled = Boolean(apiConfig?.url && dependencyReady);

  const shouldUseProxy = Boolean(
    apiConfig?.useProxy && resolverOptions?.formId && resolverOptions?.fieldId
  );

  // Construct target URL with dependency parameter if present
  let resolvedUrl = '';

  if (shouldUseProxy) {
    const formId = resolverOptions!.formId!;
    const fieldId = resolverOptions!.fieldId!;
    const params = new URLSearchParams();
    params.set('fieldId', fieldId);

    if (hasDependency && dependencyReady) {
      const paramKey = apiConfig?.dependencyParamKey || apiConfig?.dependsOnField || 'parent';
      params.set(paramKey, String(parentFieldValue));
    }

    resolvedUrl = `/api/forms/${encodeURIComponent(formId)}/proxy-query?${params.toString()}`;
  } else {
    resolvedUrl = apiConfig?.url || '';
    if (hasDependency && dependencyReady && resolvedUrl) {
      const paramKey = apiConfig?.dependencyParamKey || apiConfig?.dependsOnField || 'parent';
      try {
        const urlObj = new URL(resolvedUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3050');
        urlObj.searchParams.set(paramKey, String(parentFieldValue));
        resolvedUrl = urlObj.toString();
      } catch {
        const separator = resolvedUrl.includes('?') ? '&' : '?';
        resolvedUrl = `${resolvedUrl}${separator}${encodeURIComponent(paramKey)}=${encodeURIComponent(String(parentFieldValue))}`;
      }
    }
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dynamic-api-source', resolvedUrl, shouldUseProxy, apiConfig?.dataArrayPath, apiConfig?.labelPath, apiConfig?.valuePath],
    queryFn: async () => {
      let response: Response;
      try {
        response = await fetch(resolvedUrl, {
          method: shouldUseProxy ? 'GET' : (apiConfig?.method || 'GET'),
          headers: {
            'Content-Type': 'application/json',
            ...(!shouldUseProxy ? (apiConfig?.headers || {}) : {}),
          },
        });

        if (!response.ok) {
          throw new Error(`API returned HTTP ${response.status}`);
        }
      } catch (primaryErr) {
        // Resilient fallback for local mock endpoints if 4050/4000 port is unreachable
        if (!shouldUseProxy && resolvedUrl.includes('/api/countries')) {
          response = await fetch('/api/mock/countries');
        } else if (!shouldUseProxy && resolvedUrl.includes('/api/states')) {
          const countryParam = String(parentFieldValue || 'US');
          response = await fetch(`/api/mock/states?country=${encodeURIComponent(countryParam)}`);
        } else if (!shouldUseProxy && resolvedUrl.includes('/api/industries')) {
          response = await fetch('/api/mock/industries');
        } else {
          throw primaryErr;
        }
      }

      const json = await response.json();

      // If proxied response, return sanitized server-normalized options directly
      if (shouldUseProxy && json && Array.isArray(json.options)) {
        return json.options as StaticOption[];
      }

      // Extract array from payload
      let rawArray: any[] = [];
      if (apiConfig?.dataArrayPath) {
        const extracted = getNestedValue(json, apiConfig.dataArrayPath);
        rawArray = Array.isArray(extracted) ? extracted : [];
      } else if (Array.isArray(json)) {
        rawArray = json;
      } else if (json && typeof json === 'object') {
        // Try finding first array property
        const arrayProp = Object.values(json).find((v) => Array.isArray(v));
        rawArray = (arrayProp as any[]) || [];
      }

      // Map to normalized { label, value } options
      const normalizedOptions: StaticOption[] = rawArray.map((item, idx) => {
        if (typeof item === 'string' || typeof item === 'number') {
          return { label: String(item), value: item };
        }

        const label = getNestedValue(item, apiConfig?.labelPath || 'label') ?? `Option ${idx + 1}`;
        const value = getNestedValue(item, apiConfig?.valuePath || 'value') ?? String(idx);

        return {
          label: String(label),
          value: value as string | number,
        };
      });

      return normalizedOptions;
    },
    enabled: isEnabled,
    staleTime: apiConfig?.cacheTimeMs || 5 * 60 * 1000,
  });

  return {
    options: data || [],
    isLoading: isEnabled && isLoading,
    isError,
    error: error as Error | null,
  };
}
