import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';

import { useFormSchema } from './Form';

import type { z } from 'zod';


export interface FormFieldProps {
  /** Field name matching a key in the Zod schema */
  name: string;
  /** Single form field component (Input, Select, TextArea, Checkbox, DatePicker) */
  children: React.ReactElement<Record<string, unknown>>;
}

export function FormField({ name, children }: FormFieldProps) {
  const { control } = useFormContext();
  const schema = useFormSchema();

  const isRequired = React.useMemo(() => {
    if (!schema || !('shape' in schema)) return false;
    const fieldSchema = (schema as z.ZodObject<z.ZodRawShape>).shape[name];
    return fieldSchema ? !fieldSchema.isOptional() : false;
  }, [schema, name]);

  const child = React.Children.only(children);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const isCheckbox =
          (child.type as { displayName?: string })?.displayName === 'Checkbox';
        const isDatePicker =
          (child.type as { displayName?: string })?.displayName === 'DatePicker';

        const fieldProps = isCheckbox
          ? { checked: !!field.value, onChange: field.onChange }
          : isDatePicker
            ? { value: field.value ?? undefined, onChange: field.onChange }
            : { value: field.value ?? '', onChange: field.onChange };

        return React.cloneElement(child, {
          ...fieldProps,
          onBlur: field.onBlur,
          name: field.name,
          ref: field.ref,
          error: fieldState.error?.message,
          required: (child.props as { required?: boolean }).required ?? isRequired,
          ...(field.disabled ? { disabled: true } : {}),
        });
      }}
    />
  );
}

FormField.displayName = 'FormField';
