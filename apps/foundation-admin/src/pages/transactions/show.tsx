import { GenericShow } from "@/components/GenericShow";

export const TransactionShow = () => (
  <GenericShow
    resource="transaction"
    title="Transaction"
    listPath="/transactions"
    canDelete={false}
    canEdit={false}
  />
);
