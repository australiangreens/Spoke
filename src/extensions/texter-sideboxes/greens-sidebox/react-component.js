import type from "prop-types";
import React from "react";
import yup from "yup";
import Form from "react-formal";
import RaisedButton from "material-ui/RaisedButton";

export const displayName = () => "CiviCRM/Rocket Actions";

export const showSidebox = ({ contact, settingsData }) =>
  contact && settingsData.rocketUrl;

export class TexterSidebox extends React.Component {
  render() {
    const { campaign, assignment, contact, settingsData } = this.props;
    const rocketUrl =
      settingsData.rocketUrl + "/agc/ems8#!/contact/" + contact.external_id;

    return (
      <div style={{ textAlign: "center" }}>
        <h2>Spoke Top Tips</h2>
        <ul style={{ textAlign: "left" }}>
          <li>Opt-out here doesn't change a person's record in Civi </li>
          <li>Be polite &amp; personable; it can make someone's day!</li>
          <li>Be mindful of the time when sending messages</li>
        </ul>
        <div>
          <RaisedButton
            label={"View " + contact.firstName + " in Rocket"}
            onClick={() => {
              window.open(rocketUrl, "_blank");
            }}
            primary
          />
        </div>
      </div>
    );
  }
}

TexterSidebox.propTypes = {
  // data
  contact: type.object,
  campaign: type.object,
  assignment: type.object,
  texter: type.object,

  // parent state
  disabled: type.bool,
  navigationToolbarChildren: type.object,
  messageStatusFilter: type.string
};

export const adminSchema = () => ({
  rocketUrl: yup.string()
});

export class AdminConfig extends React.Component {
  render() {
    return (
      <div>
        <Form.Field
          name="rocketUrl"
          label="Civi/Rocket top-level URL"
          fullWidth
        />
      </div>
    );
  }
}

AdminConfig.propTypes = {
  settingsData: type.object,
  onToggle: type.func
};
