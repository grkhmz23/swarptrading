import { GenericList } from "@/components/GenericList";

export const LaunchpadProjectList = () => (
  <GenericList
    resource="launchpad-project"
    title="Launchpad Projects"
    description="Manage token launchpad projects and their status"
    basePath="/launchpad-projects"
    columns={[
      'id',
      'name',
      'ticker',
      'status',
      'bondingProgress',
      'holderCount',
      'marketCap',
      'isFeatured',
      'createdAt'
    ]}
    searchPlaceholder="Search by name, ticker, or token address..."
    canDelete={true}
    enableSearch={true}
  />
);
