'use client'

import { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useNgLgas, useNgStates } from '@/hooks/use-ng-locations'

/**
 * Postal address inputs for a react-hook-form form (must render inside a
 * <Form>). `prefix` is the form field the address lives under — it differs
 * between the onboarding ("postal_address") and settings ("postalAddress")
 * payloads, while the inner keys are snake_case in both.
 */
export function PostalAddressFields({
  prefix,
  disabled,
}: {
  prefix: 'postal_address' | 'postalAddress'
  disabled?: boolean
}) {
  const { control, watch, setValue } = useFormContext()
  const { data: states, isLoading: statesLoading } = useNgStates()
  const { data: lgas, isLoading: lgasLoading } = useNgLgas()

  const selectedState: string = watch(`${prefix}.state`) || ''

  const filteredLgas = useMemo(
    () => (lgas ?? []).filter((l) => l.state_code === selectedState),
    [lgas, selectedState]
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField
        control={control}
        name={`${prefix}.street_name`}
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Street</FormLabel>
            <FormControl>
              <Input placeholder="e.g. 12 Adeola Odeku Street" disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`${prefix}.city_name`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>City</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Ikoyi" disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`${prefix}.postal_zone`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Postal Code</FormLabel>
            <FormControl>
              <Input placeholder="e.g. 102342" disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`${prefix}.state`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>State</FormLabel>
            {statesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={field.value || ''}
                onValueChange={(v) => {
                  field.onChange(v)
                  // LGAs are state-specific — a previously chosen one is now invalid.
                  setValue(`${prefix}.lga`, '', { shouldDirty: true })
                }}
                disabled={disabled}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(states ?? []).map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`${prefix}.lga`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>LGA</FormLabel>
            {lgasLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={field.value || ''}
                onValueChange={field.onChange}
                disabled={disabled || !selectedState}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedState ? 'Select LGA' : 'Select a state first'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredLgas.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`${prefix}.country`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Country</FormLabel>
            <FormControl>
              <Input placeholder="NG" disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
