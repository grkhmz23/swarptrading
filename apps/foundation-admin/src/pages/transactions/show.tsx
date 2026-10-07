import { GenericShow } from "@/components/GenericShow";
import { TRANSACTION_SHOW_FIELDS } from "@/resources/fields";

export const TransactionShow = () => (
  <GenericShow
    resource="transaction"
    title="Transaction"
    listPath="/transactions"
    fields={TRANSACTION_SHOW_FIELDS}
  />
);
