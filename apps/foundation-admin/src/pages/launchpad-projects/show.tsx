import { GenericShow } from "@/components/GenericShow";

export const LaunchpadProjectShow = () => (
  <GenericShow
    resource="launchpad-project"
    title="Launchpad Project"
    listPath="/launchpad-projects"
    canDelete={true}
  />
);
