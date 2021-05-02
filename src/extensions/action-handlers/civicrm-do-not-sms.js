import civicrm from "civicrm";
import { parse } from "url";
import { r } from "../../server/models";
import { getConfig } from "../../../server/api/lib/config";

export const name = "civicrm-do-not-sms";

// What the user sees as the option
export const displayName = () => "Set Do Not SMS in CiviCRM";

// The Help text for the user after selecting the action
export const instructions = () =>
  `
  Use this action to set "Do Not SMS" on a person's CiviCRM record.
  `;

export function serverAdministratorInstructions() {
  return {
    description: `
      This action sets "Do Not SMS" on a person's CiviCRM record.
      Only works if a campaign's contacts are loaded directly from CiviCRM.
      `,
    setupInstructions:
      "Add `civicrm-do-not-sms` to the environment variable `ACTION_HANDLERS`, and ensure CiviCRM contact loader is enabled",
    environmentVariables: [
      "CIVICRM_API_KEY",
      "CIVICRM_SITE_KEY",
      "CIVICRM_DOMAIN"
    ]
  };
}

// Helper functions for working with Civi's REST API. Copied from the civicrm
// contact loader.

function getCivi() {
  const domain = parse(getConfig("CIVICRM_DOMAIN"));

  const config = {
    server: domain.protocol + "//" + domain.host,
    path: domain.pathname,
    debug: 1,
    key: getConfig("CIVICRM_SITE_KEY"),
    api_key: getConfig("CIVICRM_API_KEY")
  };

  const crmAPI = civicrm(config);

  return {
    get: promisify(crmAPI.get.bind(crmAPI)),
    create: promisify(crmAPI.create.bind(crmAPI))
  };
}

function promisify(func) {
  return async function(...args) {
    return new Promise((resolve, reject) => {
      args.push(result => {
        if (result.is_error) {
          reject(result.error_message);
        } else {
          resolve(result.values);
        }
      });

      func(...args);
    });
  };
}

// return true, if the action is usable and available for the organizationId
// Sometimes this means certain variables/credentials must be setup
// either in environment variables or organization.features json data
// Besides this returning true, "test-action" will also need to be added to
// process.env.ACTION_HANDLERS
export async function available(organizationId) {
  return {
    result: true,
    expiresSeconds: 600
  };
}

// What happens when a texter saves the answer that triggers the action
// This is presumably the meat of the action
export async function processAction({
  campaignContactId,
  contact
  // campaign,    // unused parameter
  // organization // unused parameter
}) {
  // This is a meta action that updates a variable in the contact record itself.
  // Generally, you want to send action data to the outside world, so you
  // might want the request library loaded above
  const customFields = JSON.parse(contact.custom_fields || "{}");
  if (customFields) {
    customFields["processed_test_action"] = "completed";
  }

  await r
    .knex("campaign_contact")
    .where("campaign_contact.id", campaignContactId)
    .update("custom_fields", JSON.stringify(customFields));

  const { create } = getCivi();
  const res = await create("contact", {
    id: { "=": customFields["external_id"] },
    do_not_sms: { "=": 1 },
  });
 
  if (res.is_error) {
    console.error("error: could not set do_not_sms in CiviCRM");
  }
  else {
    console.info("success: Do Not SMS set in CiviCRM for contact ID " + customField["external_id"]); 
  }
}

