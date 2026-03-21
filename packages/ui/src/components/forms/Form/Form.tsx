import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useForm, FormProvider } from 'react-hook-form';

import styles from './Form.module.css';

import type { z } from 'zod';

export interface FormProps<TSchema extends z.ZodType<Record<string, unknown>>> {
  /** Zod schema — single source of truth for validation */
  schema: TSchema;
  /** Called with validated data on successful submit */
  onSubmit: (data: z.infer<TSchema>) => void | Promise<void>;
  /** Called when form is reset */
  onReset?: () => void;
  /** Initial/default values for form fields */
  defaultValues?: Partial<z.infer<TSchema>>;
  /** Form density — affects spacing and max-width */
  density?: 'comfortable' | 'compact';
  /** Disable all form fields */
  disabled?: boolean;
  /** Form content — FormField components and action buttons */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** HTML id */
  id?: string;
}

const FormSchemaContext = React.createContext<z.ZodType<Record<string, unknown>> | null>(null);

export function useFormSchema() {
  return React.useContext(FormSchemaContext);
}

function FormInner<TSchema extends z.ZodType<Record<string, unknown>>>(
  {
    schema,
    onSubmit,
    onReset,
    defaultValues,
    density = 'comfortable',
    disabled = false,
    children,
    className,
    id,
  }: FormProps<TSchema>,
  ref: React.ForwardedRef<HTMLFormElement>,
) {
  const methods = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues: defaultValues as any,
    disabled,
  });

  return (
    <FormSchemaContext.Provider value={schema}>
      <FormProvider {...methods}>
        <form
          ref={ref}
          noValidate
          onSubmit={methods.handleSubmit(onSubmit)}
          onReset={(e) => {
            e.preventDefault();
            methods.reset();
            onReset?.();
          }}
          data-density={density}
          className={clsx(styles.form, className)}
          id={id}
        >
          {children}
        </form>
      </FormProvider>
    </FormSchemaContext.Provider>
  );
}

export const Form = React.forwardRef(FormInner) as <
  TSchema extends z.ZodType<Record<string, unknown>>,
>(
  props: FormProps<TSchema> & { ref?: React.Ref<HTMLFormElement> },
) => React.ReactElement | null;

(Form as { displayName?: string }).displayName = 'Form';
