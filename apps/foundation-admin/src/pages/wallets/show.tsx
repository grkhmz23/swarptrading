import { GenericShow } from "@/components/GenericShow";

export const WalletShow = () => (
  <GenericShow
    resource="wallet"
    title="Wallet"
    listPath="/wallets"
    canDelete={false}
    canEdit={false}
  />
);
