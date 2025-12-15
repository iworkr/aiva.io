import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ComponentPropsWithoutRef } from "react";
import { Control, FieldValues, Path } from "react-hook-form";

type AuthFormInputProps<TFieldValues extends FieldValues> = {
  id: string;
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  description?: string;
  type?: string;
  placeholder?: string;
  inputProps?: Omit<
    ComponentPropsWithoutRef<typeof Input>,
    "id" | "name" | "type" | "placeholder"
  >;
};

export function AuthFormInput<TFieldValues extends FieldValues>({
  id,
  control,
  name,
  description,
  type,
  placeholder,
  inputProps,
  ...restProps
}: AuthFormInputProps<TFieldValues>) {
  // Generate accessible label from name
  const getAccessibleLabel = (fieldName: string) => {
    const labels: Record<string, string> = {
      email: 'Email address',
      password: 'Password',
    };
    return labels[fieldName] || fieldName;
  };

  const accessibleLabel = getAccessibleLabel(name as string);
  const ariaLabel = inputProps?.['aria-label'] || accessibleLabel;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input
              id={id}
              type={type}
              placeholder={placeholder}
              aria-label={ariaLabel}
              aria-describedby={description ? `${id}-description` : undefined}
              {...inputProps}
              {...field}
            />
          </FormControl>
          {description && (
            <FormDescription id={`${id}-description`}>
              {description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
