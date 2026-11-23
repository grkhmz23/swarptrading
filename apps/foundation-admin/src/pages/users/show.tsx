import { GenericShow } from "@/components/GenericShow";
import { USER_SHOW_FIELDS } from "@/resources/fields";

export const UserShow = () => (
  <GenericShow resource="user" title="User" listPath="/users" fields={USER_SHOW_FIELDS} />
);
