import { GenericList } from "@/components/GenericList";

export const WalletList = () => (
  <GenericList
    resource="wallet"
    title="Wallets"
    description="Manage user wallets and security settings"
    basePath="/wallets"
    columns={['id', 'publicKey', 'userId', 'isPinSet', 'isLocked', 'dailyTransactionLimit', 'createdAt']}
    searchPlaceholder="Search by wallet ID or public key..."
    canDelete={false}
    canEdit={false}
    enableSearch={true}
  />
);
