import { GenericList } from "@/components/GenericList";
import { WALLET_LIST_COLUMNS } from "@/resources/fields";

export const WalletList = () => (
  <GenericList
    resource="wallet"
    title="Wallets"
    singularTitle="Wallet"
    description="User wallets and their security settings"
    basePath="/wallets"
    columns={WALLET_LIST_COLUMNS}
    searchPlaceholder="Search by wallet ID or public key..."
  />
);
