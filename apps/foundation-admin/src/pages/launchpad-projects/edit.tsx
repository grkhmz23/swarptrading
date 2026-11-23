import { GenericEdit } from "@/components/GenericEdit";
import { LAUNCHPAD_PROJECT_EDIT_FIELDS } from "@/resources/fields";

export const LaunchpadProjectEdit = () => (
  <GenericEdit
    resource="launchpad-project"
    title="Launchpad Project"
    listPath="/launchpad-projects"
    fields={LAUNCHPAD_PROJECT_EDIT_FIELDS}
  />
);
