import { GenericEdit } from "@/components/GenericEdit";

export const UserEdit = () => (
  <GenericEdit
    resource="user"
    title="User"
    listPath="/users"
    fields={[
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phoneNumber', label: 'Phone Number', type: 'text' },
      { key: 'country', label: 'Country', type: 'text' },
      { key: 'currency', label: 'Currency', type: 'text' },
      { key: 'language', label: 'Language', type: 'text' }
    ]}
  />
);
