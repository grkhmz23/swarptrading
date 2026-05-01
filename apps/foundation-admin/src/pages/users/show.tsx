import { GenericShow } from "@/components/GenericShow";

export const UserShow = () => (
  <GenericShow
    resource="user"
    title="User"
    listPath="/users"
    canDelete={true}
  />
);
