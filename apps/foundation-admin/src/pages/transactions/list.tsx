import { GenericList } from "@/components/GenericList";

export const TransactionList = () => (
  <GenericList
    resource="transaction"
    title="Transactions"
    description="View all financial transactions"
    basePath="/transactions"
    columns={['id', 'amount', 'status', 'transactionHash', 'isConfirmed', 'createdAt']}
    searchPlaceholder="Search by transaction hash..."
    canDelete={false}
    canEdit={false}
    enableSearch={true}
  />
);
