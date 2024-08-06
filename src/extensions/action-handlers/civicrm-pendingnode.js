/* eslint-disable no-empty-function */
import { r } from "../../server/models";
import { available as loaderAvailable } from "../contact-loaders/civicrm";
import { addPendingNote } from "../contact-loaders/civicrm/util";
import { getCacheLength } from "../contact-loaders/civicrm/getcachelength";
import { getConfig } from "../../server/api/lib/config";
import {
  ENVIRONMENTAL_VARIABLES_MANDATORY,
  CIVICRM_CONTACT_LOADER,
  CIVICRM_ACTION_HANDLER_ADDTAG
} from "../contact-loaders/civicrm/const";

export const name = CIVICRM_ACTION_HANDLER_ADDPENDINGNOTE;

// What the user sees as the option
export const displayName = () => "Add pending note to Contact";

// The Help text for the user after selecting the action
export const instructions = () =>
  "What note would you like added to the person's CiviCRM/Rocket record?";

export function serverAdministratorInstructions() {
  return {
    description: `
      This action is for allowing texters to add notes to Rocket/CiviCRM contact records.
      `,
    setupInstructions: `
      1. Add "civicrm-addpendingnote" to the environment variable "ACTION_HANDLERS";
      2. Set up Spoke to use the existing civicrm contact loader.
      `,
    environmentVariables: [...ENVIRONMENTAL_VARIABLES_MANDATORY]
  };
}

// eslint-disable-next-line no-unused-vars
export function clientChoiceDataCacheKey(organization, user) {
  return `${organization.id}`;
}

// return true, if the action is usable and available for the organizationId
// Sometimes this means certain variables/credentials must be setup
// either in environment variables or organization.features json data
// Besides this returning true, "civicrm-addtag" will also need to be added to
// process.env.ACTION_HANDLERS
export async function available(organizationId) {
  const contactLoadersConfig = getConfig("CONTACT_LOADERS").split(",");
  if (contactLoadersConfig.indexOf(CIVICRM_CONTACT_LOADER) !== -1) {
    const hasLoader = await loaderAvailable(organizationId, 0);
    return {
      result: hasLoader.result,
      expiresSeconds: getCacheLength(CIVICRM_ACTION_HANDLER_ADDPENDINGNOTE)
    };
  }
  return {
    result: false,
    expiresSeconds: getCacheLength(CIVICRM_ACTION_HANDLER_ADDPENDINGNOTE)
  };
}

// What happens when a texter saves the answer that triggers the action
// This is presumably the meat of the action
export async function processAction({
  actionObject,
  campaignContactId,
  contact
}) {
  // This is a meta action that updates a variable in the contact record itself.
  // Generally, you want to send action data to the outside world, so you
  // might want the request library loaded above
  const civiContactId = contact.external_id;
  await addPendingNote(civiContactId);

  await r
    .knex("campaign_contact")
    .where("campaign_contact.id", campaignContactId)
    .update("custom_fields", JSON.stringify(customFields));
}

// What happens when a texter removes an answer that triggers the action
// eslint-disable-next-line no-unused-vars
export async function processDeletedQuestionResponse(options) {}
