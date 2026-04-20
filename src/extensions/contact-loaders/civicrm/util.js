/* eslint-disable no-param-reassign */
import moment from "moment-timezone";
import fetch from "node-fetch";
import { getConfig } from "../../../server/api/lib/config";
import { log } from "../../../lib/log";
import {
  CIVICRM_API4_URL,
  CIVICRM_PAGINATE_SIZE,
  DEFAULT_CONTACT_ENTITY_ACTION_NAME
} from "./const";

export function getIntegerArray(envVariable) {
  const retValue = [];
  if (envVariable) {
    const csvParts = envVariable.split(",");
    for (const csvPart of csvParts) {
      const csvPartAsInt = parseInt(csvPart, 10);
      if (Number.isNaN(csvPartAsInt)) {
        return [];
      }
      retValue.push(csvPartAsInt);
    }
  }
  return retValue;
}

export function getCustomFields(customDataEnv) {
  const pairsFieldAndLabel = {};

  if (customDataEnv) {
    const csvParts = customDataEnv.split(",");
    for (const csvPart of csvParts) {
      const colonParts = csvPart.split(":");
      const fieldName = colonParts[0];
      if (colonParts.length === 1) {
        pairsFieldAndLabel[fieldName] = fieldName;
      } else {
        pairsFieldAndLabel[fieldName] = colonParts[1];
      }
    }
  }
  return pairsFieldAndLabel;
}

async function paginate(
  fetchfromAPIMethod,
  config,
  entity,
  entityAction,
  options,
  callback
) {
  let count = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const once = await fetchfromAPIMethod(
      config,
      entity,
      options,
      entityAction
    );

    if (!once.length) {
      return count;
    }
    await callback(once);

    count += once.length;

    options.options = options.options || {};
    options.options.offset =
      (options.options.offset || 0) + CIVICRM_PAGINATE_SIZE;
  }
}

async function fetchfromAPI(
  config,
  entity,
  params,
  entityAction = "get",
  fetchOptions = {}
) {
  const jsonParams = encodeURIComponent(JSON.stringify(params));
  const url = `${config.server}${config.path}?key=${config.key}&api_key=${config.api_key}&entity=${entity}&action=${entityAction}&json=${jsonParams}`;
  try {
    const result = await fetch(url, fetchOptions);
    const json = await result.json();
    return json.is_error ? false : json.values;
  } catch (error) {
    log.error(`CiviCRM API3 fetch error for ${entity}.${entityAction}:`, error);
    return false;
  }
}

/**
 * Escape a user string for safe use inside Civi LIKE patterns (same approach as
 * listmanager-backend escapeString).
 * @param {string} strIn
 * @returns {string}
 */
export function escapeStringForCiviLike(strIn) {
  return JSON.stringify(strIn).slice(1, -1);
}

/**
 * Key-based Api4 calls use POST + application/x-www-form-urlencoded with
 * params, key, and api_key (same pattern as listmanager-backend civiApiV4).
 *
 * @see https://docs.civicrm.org/dev/en/latest/api/v4/rest/
 * @param {string} baseUrl e.g. https://example.org/civicrm/ajax/api4 (no trailing slash)
 * @param {string} entity
 * @param {string} action
 * @param {object} params Api4 params (select, where, …)
 * @returns {Promise<object[]|false>} values array, or false on HTTP/parse/API error
 */
async function fetchfromAPI4(baseUrl, entity, action, params) {
  const apiKey = getConfig("CIVICRM_API_KEY");
  const siteKey = getConfig("CIVICRM_SITE_KEY");
  const root = String(baseUrl).replace(/\/$/, "");
  const url = `${root}/${entity}/${action}`;
  const queryParams = new URLSearchParams({
    params: JSON.stringify(params),
    key: siteKey,
    api_key: apiKey
  });

  try {
    const result = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: queryParams.toString()
    });
    const text = await result.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (_e) {
      log.error(`CiviCRM API4 non-JSON response from ${url}:`, text.substring(0, 200));
      return false;
    }
    if (!result.ok) {
      log.error(`CiviCRM API4 HTTP ${result.status} from ${url}`);
      return false;
    }
    if (json.error_message) {
      log.error(`CiviCRM API4 error from ${url}: ${json.error_message}`);
      return false;
    }
    const {values} = json;
    if (!Array.isArray(values)) {
      return [];
    }
    return values;
  } catch (_e) {
    log.error(`CiviCRM API4 fetch exception for ${url}:`, _e);
    return false;
  }
}

export function getCivi() {
  const civicrm = new URL(getConfig("CIVICRM_API_URL"));

  const config = {
    server: `${civicrm.protocol}//${civicrm.host}`,
    path: civicrm.pathname,
    debug: 1,
    key: getConfig("CIVICRM_SITE_KEY"),
    api_key: getConfig("CIVICRM_API_KEY")
  };

  return config;
}


function shouldUseCiviApi4() {
  const url = getConfig(CIVICRM_API4_URL);
  return Boolean(url && String(url).trim());
}

async function searchGroupsApi3(query, getcountVal) {
  const config = getCivi();
  const key = "api.GroupContact.getcount";

  const res = await fetchfromAPI(config, "group", {
    sequential: 1,
    return: ["id", "title"],
    title: { LIKE: `${query}%` },
    [key]: getcountVal,
    options: { limit: 0 }
  });
  if (Array.isArray(res)) {
    if (getcountVal) {
      return res.map(group => ({
        title: `${group.title} (${group[key]})`,
        count: group[key],
        id: group.id
      }));
    }
    return res.map(group => ({
      title: `${group.title}`,
      id: group.id
    }));
  }
  return [];
}

async function searchGroupsApi4(query, getcountVal) {
  const baseUrl = getConfig(CIVICRM_API4_URL);
  const escaped = escapeStringForCiviLike(query);
  const likePattern = `${escaped}%`;
  const select = getcountVal
    ? ["id", "title", "contact_count"]
    : ["id", "title"];
  const params = {
    select,
    where: [["title", "LIKE", likePattern]]
  };
  const res = await fetchfromAPI4(baseUrl, "Group", "get", params);
  if (res === false) {
    return [];
  }
  if (getcountVal) {
    return res.map(row => ({
      title: `${row.title} (${row.contact_count})`,
      count: row.contact_count,
      id: Number(row.id)
    }));
  }
  return res.map(row => ({
    title: `${row.title}`,
    id: Number(row.id)
  }));
}



/**
 * @param {string} query
 * @returns {Promise<{ title: string; count?: number; id: number }[]>}
 */
export async function searchGroups(query, getcountVal = 0) {
  if (shouldUseCiviApi4()) {
    return searchGroupsApi4(query, getcountVal);
  }
  return searchGroupsApi3(query, getcountVal);
}

export async function getGroupMembers(groupId, callback) {
  const config = getCivi();

  const contactEntityAction =
    getConfig("CIVICRM_CUSTOM_CONTACT_ACTION") ||
    DEFAULT_CONTACT_ENTITY_ACTION_NAME;

  const customFields = getCustomFields(getConfig("CIVICRM_CUSTOM_DATA"));
  const customFieldNames = Object.keys(customFields);

  const paginatedData = await paginate(
    fetchfromAPI,
    config,
    "Contact",
    contactEntityAction,
    {
      sequential: 1,
      options: { limit: CIVICRM_PAGINATE_SIZE },
      first_name: { "IS NOT NULL": 1 },
      last_name: { "IS NOT NULL": 1 },
      do_not_sms: { "=": 0 },
      is_deleted: { "=": 0 },
      is_deceased: { "=": 0 },
      is_opt_out: { "=": 0 },
      contact_type: "Individual",

      return: [
        "id",
        "first_name",
        "last_name",
        "postal_code",
        ...customFieldNames
      ],

      "api.Phone.get": {
        contact_id: "$value.id",
        phone_type_id: "Mobile",

        return: ["id", "phone_numeric"],
        options: { limit: 1 }
      },
      // Closest thing to docs for this: https://lab.civicrm.org/dev/core/blob/d434a5cfb2dc3c248ac3c0d8570bd8e9d828f6ad/api/v3/Contact.php#L403
      group: groupId
    },
    callback
  );
  return paginatedData;
}

export async function addContactToGroup(contactId, groupId) {
  const config = getCivi();

  const res = await fetchfromAPI(
    config,
    "GroupContact",
    {
      contact_id: contactId,
      group_id: groupId
    },
    "create",
    { method: "post" }
  );

  return res;
}

export async function sendEmailToContact(contactId, templateId) {
  const config = getCivi();

  const res = await fetchfromAPI(
    config,
    "Email",
    {
      contact_id: contactId,
      template_id: templateId
    },
    "send",
    { method: "post" }
  );

  return res;
}

export async function addContactToTag(contactId, tagId) {
  const config = getCivi();

  const res = await fetchfromAPI(
    config,
    "EntityTag",
    {
      entity_id: contactId,
      entity_table: "civicrm_contact",
      tag_id: tagId
    },
    "create",
    { method: "post" }
  );

  return res;
}

/**
 * @returns {Promise<{ name: string; id: number }[]>}
 */
export async function searchTags() {
  const config = getCivi();

  const res = await fetchfromAPI(config, "tag", {
    sequential: 1,
    return: ["id", "name"],
    options: { limit: 0 }
  });
  if (Array.isArray(res)) {
    return res;
  }
  return [];
}

/**
 * @returns {Promise<{ name: string; id: number }[]>}
 */
export async function searchEvents() {
  const config = getCivi();
  const currentNow = moment().format();
  const res = await fetchfromAPI(config, "event", {
    sequential: 1,
    return: ["id", "title", "default_role_id", "start_date"],
    title: { "!=": "" },
    is_monetary: 0,
    requires_approval: 0,
    end_date: {
      ">": currentNow
    },
    options: { limit: 0 }
  });
  if (Array.isArray(res)) {
    return res;
  }
  return [];
}

export async function registerContactForEvent(contactId, eventId, roleId) {
  const config = getCivi();

  const res = await fetchfromAPI(
    config,
    "Participant",
    {
      contact_id: contactId,
      event_id: eventId,
      role_id: roleId
    },
    "create",
    { method: "post" }
  );

  return res;
}

export async function searchMessageTemplates() {
  const config = getCivi();
  const res = await fetchfromAPI(config, "MessageTemplate", {
    sequential: 1,
    return: ["id", "msg_title"],
    msg_title: { "!=": "" },
    id: { IN: getIntegerArray(getConfig("CIVICRM_MESSAGE_IDS")) },
    options: { limit: 0 }
  });
  if (Array.isArray(res)) {
    return res;
  }
  return [];
}

export async function optoutContactToGroup(contactId) {
  const config = getCivi();

  const res = await fetchfromAPI(
    config,
    "Contact",
    {
      id: contactId,
      do_not_sms: 1
    },
    "create",
    { method: "post" }
  );

  return res;
}
