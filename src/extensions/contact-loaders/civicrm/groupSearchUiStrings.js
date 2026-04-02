import { CIVICRM_MINQUERY_SIZE } from "./const";

/** Shown in the Autocomplete list while `loading` is true (MUI `loadingText`). */
export const CIVICRM_GROUP_SEARCH_LOADING_TEXT = "Looking for groups";

/**
 * Copy for MUI Autocomplete `noOptionsText` when the options list is empty.
 *
 * @param {object} opts
 * @param {number} opts.inputLength
 * @param {number} [opts.minQuerySize]
 * @param {boolean} opts.loading
 * @param {boolean} opts.hasError
 * @param {boolean} opts.hasOptions — whether the last successful fetch returned any groups
 */
export function civicrmGroupSearchNoOptionsText({
  inputLength,
  minQuerySize = CIVICRM_MINQUERY_SIZE,
  loading,
  hasError,
  hasOptions
}) {
  if (inputLength < minQuerySize) {
    return "Start typing to search";
  }
  if (loading || hasError) {
    return "";
  }
  if (!hasOptions) {
    return "No groups found";
  }
  return "";
}
