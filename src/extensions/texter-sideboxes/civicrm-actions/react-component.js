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
    const url =
      settingsData.rocketUrl + "/agc/ems8#!/contact/" + contact.external_id;

    return (
      <div style={{ textAlign: "center" }}>
        <h2>CiviCRM/Rocket Actions</h2>
        <div>
          <RaisedButton
            label="Open record in Rocket"
            onClick={() => {
              window.open(url, "_blank");
            }}
            primary={true}
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
