import { useFormContext } from 'react-hook-form';

export function useFormStatus(): {
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
} {
  const { formState } = useFormContext();
  return {
    isSubmitting: formState.isSubmitting,
    isValid: formState.isValid,
    isDirty: formState.isDirty,
  };
}
