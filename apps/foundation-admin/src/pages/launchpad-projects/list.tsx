import { GenericList } from "@/components/GenericList";
import { LAUNCHPAD_PROJECT_LIST_COLUMNS } from "@/resources/fields";

export const LaunchpadProjectList = () => (
  <GenericList
    resource="launchpad-project"
    title="Launchpad Projects"
    singularTitle="Launchpad Project"
    description="Token launchpad projects and their status"
    basePath="/launchpad-projects"
    columns={LAUNCHPAD_PROJECT_LIST_COLUMNS}
    searchPlaceholder="Search by name, ticker, or token address..."
    deleteConfirmField="name"
  />
);
