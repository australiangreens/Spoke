import { CIVICRM_GROUP_SEARCH_DEBOUNCE_MS } from "../../../../src/extensions/contact-loaders/civicrm/const";
import {
  CIVICRM_GROUP_SEARCH_LOADING_TEXT,
  civicrmGroupSearchNoOptionsText
} from "../../../../src/extensions/contact-loaders/civicrm/groupSearchUiStrings";

describe("civicrm/const group search debounce", () => {
  it("exports debounce interval used by CiviCRMLoaderField", () => {
    expect(CIVICRM_GROUP_SEARCH_DEBOUNCE_MS).toBe(500);
  });
});

describe("civicrm/groupSearchUiStrings", () => {
  const min = 3;

  it("exports loading text for Autocomplete loadingText", () => {
    expect(CIVICRM_GROUP_SEARCH_LOADING_TEXT).toBe("Looking for groups");
  });

  describe("civicrmGroupSearchNoOptionsText", () => {
    it('returns "Start typing to search" when below the minimum query length', () => {
      expect(
        civicrmGroupSearchNoOptionsText({
          inputLength: 0,
          minQuerySize: min,
          loading: false,
          hasError: false,
          hasOptions: false
        })
      ).toBe("Start typing to search");

      expect(
        civicrmGroupSearchNoOptionsText({
          inputLength: 2,
          minQuerySize: min,
          loading: false,
          hasError: false,
          hasOptions: false
        })
      ).toBe("Start typing to search");
    });

    it('returns empty string while loading (loadingText is used instead)', () => {
      expect(
        civicrmGroupSearchNoOptionsText({
          inputLength: 3,
          minQuerySize: min,
          loading: true,
          hasError: false,
          hasOptions: false
        })
      ).toBe("");
    });

    it('returns empty string when there is an error (helper text shows the error)', () => {
      expect(
        civicrmGroupSearchNoOptionsText({
          inputLength: 3,
          minQuerySize: min,
          loading: false,
          hasError: true,
          hasOptions: false
        })
      ).toBe("");
    });

    it('returns "No groups found" when the search finished with no matching groups', () => {
      expect(
        civicrmGroupSearchNoOptionsText({
          inputLength: 3,
          minQuerySize: min,
          loading: false,
          hasError: false,
          hasOptions: false
        })
      ).toBe("No groups found");

      expect(
        civicrmGroupSearchNoOptionsText({
          inputLength: 10,
          minQuerySize: min,
          loading: false,
          hasError: false,
          hasOptions: false
        })
      ).toBe("No groups found");
    });

    it("returns empty string when there are options (list is not empty)", () => {
      expect(
        civicrmGroupSearchNoOptionsText({
          inputLength: 3,
          minQuerySize: min,
          loading: false,
          hasError: false,
          hasOptions: true
        })
      ).toBe("");
    });
  });
});
