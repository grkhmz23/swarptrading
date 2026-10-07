import { GenericList } from "@/components/GenericList";
import { TRANSACTION_LIST_COLUMNS } from "@/resources/fields";

export const TransactionList = () => (
  <GenericList
    resource="transaction"
    title="Transactions"
    singularTitle="Transaction"
    description="All wallet transactions"
    basePath="/transactions"
    columns={TRANSACTION_LIST_COLUMNS}
    searchPlaceholder="Search by transaction signature..."
  />
);
