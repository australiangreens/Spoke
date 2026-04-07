import { when } from "jest-when";
import fetch from "node-fetch";
import {
  getIntegerArray,
  getCustomFields,
  getCivi,
  searchGroups,
  escapeStringForCiviLike
} from "../../../../src/extensions/contact-loaders/civicrm/util";
import { CIVICRM_API4_URL } from "../../../../src/extensions/contact-loaders/civicrm/const";
import { getConfig } from "../../../../src/server/api/lib/config";

jest.mock("../../../../src/server/api/lib/config");
jest.mock("node-fetch", () => jest.fn());

describe("civicrm/util", () => {
  beforeEach(async () => {
    when(getConfig)
      .calledWith("CIVICRM_API_KEY")
      .mockReturnValue("api");
    when(getConfig)
      .calledWith("CIVICRM_SITE_KEY")
      .mockReturnValue("site");
    when(getConfig)
      .calledWith("CIVICRM_API_URL")
      .mockReturnValue(
        "http://dmaster.localhost:7979/sites/all/modules/civicrm/extern/rest.php"
      );
    when(getConfig)
      .calledWith(CIVICRM_API4_URL)
      .mockReturnValue(undefined);
    fetch.mockReset();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  it("expects getIntegerArray to work as expected.", () => {
    expect(getIntegerArray(undefined)).toEqual([]);
    expect(getIntegerArray(null)).toEqual([]);
    expect(getIntegerArray("")).toEqual([]);
    expect(getIntegerArray("1")).toEqual([1]);
    expect(getIntegerArray("1,-2")).toEqual([1, -2]);
    expect(getIntegerArray("1,-2,3")).toEqual([1, -2, 3]);
    expect(getIntegerArray("a")).toEqual([]);
  });

  it("expects getCustomFields to work as expected.", () => {
    expect(getCustomFields(undefined)).toEqual({});
    expect(getCustomFields(null)).toEqual({});
    expect(getCustomFields("")).toEqual({});
    expect(getCustomFields("a")).toEqual({ a: "a" });
    expect(getCustomFields("a:b")).toEqual({ a: "b" });
    expect(getCustomFields("a,c")).toEqual({ a: "a", c: "c" });
    expect(getCustomFields("a:b,c:d")).toEqual({ a: "b", c: "d" });
  });

  it("expects getCivi to work as expected.", () => {
    expect(getCivi()).toEqual({
      api_key: "api",
      debug: 1,
      key: "site",
      path: "/sites/all/modules/civicrm/extern/rest.php",
      server: "http://dmaster.localhost:7979"
    });
  });

  describe("escapeStringForCiviLike", () => {
    it("escapes quotes like listmanager escapeString", () => {
      expect(escapeStringForCiviLike('a"b')).toEqual('a\\"b');
    });
  });

  describe("searchGroups", () => {
    it("uses API v3 rest.php when CIVICRM_API4_URL is unset", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          is_error: 0,
          values: [{ id: 1, title: "Alpha" }]
        })
      });
      await expect(searchGroups("news", 0)).resolves.toEqual([
        { title: "Alpha", id: 1 }
      ]);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("extern/rest.php"),
        expect.anything()
      );
    });

    it("uses API v4 Group/get when CIVICRM_API4_URL is set", async () => {
      when(getConfig)
        .calledWith(CIVICRM_API4_URL)
        .mockReturnValue("http://civi.test/civicrm/ajax/api4");
      fetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            values: [{ id: 1, title: "Beta", contact_count: 12 }]
          })
      });
      await expect(searchGroups("news", 1)).resolves.toEqual([
        { title: "Beta (12)", count: 12, id: 1 }
      ]);
      expect(fetch).toHaveBeenCalledWith(
        "http://civi.test/civicrm/ajax/api4/Group/get",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest"
          })
        })
      );
      const fetchOpts = fetch.mock.calls[0][1];
      expect(fetchOpts.headers.Authorization).toBeUndefined();
      const body = new URLSearchParams(fetchOpts.body);
      expect(body.get("key")).toBe("site");
      expect(body.get("api_key")).toBe("api");
      const params = JSON.parse(body.get("params"));
      expect(params.select).toEqual(["id", "title", "contact_count"]);
      expect(params.where).toEqual([["title", "LIKE", "%news%"]]);
    });
  });
});
