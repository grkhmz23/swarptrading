import { GenericList } from "@/components/GenericList";
import { USER_LIST_COLUMNS } from "@/resources/fields";

export const UserList = () => (
  <GenericList
    resource="user"
    title="Users"
    singularTitle="User"
    description="System users and their accounts. Emails and phone numbers are partially masked."
    basePath="/users"
    columns={USER_LIST_COLUMNS}
    searchPlaceholder="Search by email or phone..."
  />
);
