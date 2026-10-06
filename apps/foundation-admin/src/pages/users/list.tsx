import { GenericList } from "@/components/GenericList";

export const UserList = () => (
  <GenericList
    resource="user"
    title="Users"
    description="Manage system users and their accounts"
    basePath="/users"
    columns={['id', 'email', 'phoneNumber', 'isVerified', 'country', 'currency', 'createdAt']}
    searchPlaceholder="Search by email or phone..."
    canDelete={true}
    enableSearch={true}
  />
);
