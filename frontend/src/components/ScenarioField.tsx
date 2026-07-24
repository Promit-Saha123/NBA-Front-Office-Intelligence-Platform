"use client";

import styles from "./ScenarioForm.module.css";

export interface ScenarioFieldOption {
  value: string;
  label: string;
  /** When set, options are chunked into <optgroup>s in first-seen group order
   *  (a native, zero-dependency way to break up a long flat list — design-review
   *  finding: 478 players in one ungrouped list, a real "wall of options"). */
  group?: string;
}

/** Buckets options into ordered [group, options][] pairs, preserving each
 *  group's first-seen order and each option's original order within it.
 *  Ungrouped options (no `group`) form their own bucket under `null`. */
function groupOptions(
  options: ScenarioFieldOption[],
): { group: string | null; options: ScenarioFieldOption[] }[] {
  const buckets = new Map<string | null, ScenarioFieldOption[]>();
  for (const option of options) {
    const key = option.group ?? null;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(option);
    else buckets.set(key, [option]);
  }
  return Array.from(buckets, ([group, groupOptions]) => ({ group, options: groupOptions }));
}

export interface ScenarioFieldProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  options: ScenarioFieldOption[];
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  errorText?: string;
  required?: boolean;
}

/**
 * A labeled native <select> with a programmatic accessible name (via
 * `<label htmlFor>`), optional help text and error text both associated
 * through `aria-describedby`, and a visible disabled state. Native control,
 * per decision 0008 ("use native form controls unless a custom control is
 * clearly justified") — no combobox/command-palette library.
 */
export function ScenarioField({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "Select…",
  helpText,
  errorText,
  required = false,
}: ScenarioFieldProps) {
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = errorText ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? " (required)" : null}
      </label>
      <select
        id={id}
        className={styles.select}
        value={value ?? ""}
        disabled={disabled}
        required={required}
        aria-describedby={describedBy}
        aria-invalid={errorText ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {groupOptions(options).map(({ group, options: groupedOptions }) =>
          group === null ? (
            groupedOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          ) : (
            <optgroup key={group} label={group}>
              {groupedOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ),
        )}
      </select>
      {helpText ? (
        <p id={helpId} className={styles.help}>
          {helpText}
        </p>
      ) : null}
      {errorText ? (
        <p id={errorId} className={styles.fieldError} role="alert">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
