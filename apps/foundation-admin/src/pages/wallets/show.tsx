import { GenericShow } from "@/components/GenericShow";
import { WALLET_SHOW_FIELDS } from "@/resources/fields";

export const WalletShow = () => (
  <GenericShow resource="wallet" title="Wallet" listPath="/wallets" fields={WALLET_SHOW_FIELDS} />
);
