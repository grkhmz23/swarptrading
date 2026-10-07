import { GenericShow } from "@/components/GenericShow";
import { LAUNCHPAD_PROJECT_SHOW_FIELDS } from "@/resources/fields";

export const LaunchpadProjectShow = () => (
  <GenericShow
    resource="launchpad-project"
    title="Launchpad Project"
    listPath="/launchpad-projects"
    fields={LAUNCHPAD_PROJECT_SHOW_FIELDS}
    deleteConfirmField="name"
  />
);
