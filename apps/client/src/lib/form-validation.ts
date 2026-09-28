import { useIntl } from 'react-intl';

/**
 * Field-level validation copy, in the active UI language.
 *
 * A form must not hand an Indonesian user the English literal "Required", so
 * every bare "this field is required" string comes from here. One hook, one id,
 * one translation — the alternative is the same literal copied into 15 form
 * pages, which is how the drift got here.
 */
export function useRequiredMessage(): string {
  const intl = useIntl();
  return intl.formatMessage({
    id: 'common.validation.required',
    defaultMessage: 'Required',
  });
}
