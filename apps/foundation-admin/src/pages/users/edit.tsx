import { GenericEdit } from "@/components/GenericEdit";
import { USER_EDIT_FIELDS } from "@/resources/fields";

export const UserEdit = () => (
  <GenericEdit resource="user" title="User" listPath="/users" fields={USER_EDIT_FIELDS} />
);
