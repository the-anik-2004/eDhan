import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import FormSheetModal from "./FormSheetModal";
import {
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from "../hooks/mutations/useAccountMutation";
import { Account, AccountType } from "../lib/services/accounts.services";

const ACCOUNT_TYPES: AccountType[] = ["CASH", "BANK", "SAVINGS", "CREDIT_CARD"];

export function AccountModal({
  visible,
  account,
  onClose,
  onSaved,
  onDeleted,
  onMadeDefault,
}: {
  visible: boolean;
  account: Account | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onMadeDefault: () => void;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "CASH");
  const { mutateAsync: createAccount, isPending: creating } = useCreateAccount();
  const { mutateAsync: updateAccount, isPending: updating } = useUpdateAccount();
  const { mutateAsync: deleteAccount, isPending: deleting } = useDeleteAccount();

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Account name required", "Enter a name for this account.");
      return;
    }

    try {
      if (account) {
        await updateAccount({
          accountId: account.id,
          payload: { name: name.trim(), type },
        });
      } else {
        await createAccount({ name: name.trim(), type });
      }
      onSaved();
    } catch {
      Alert.alert("Error", "Couldn't save this account.");
    }
  };

  const handleDelete = () => {
    if (!account) return;
    Alert.alert("Delete account", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAccount({ accountId: account.id, force: true });
            onDeleted();
          } catch {
            Alert.alert("Error", "Couldn't delete this account.");
          }
        },
      },
    ]);
  };

  return (
    <FormSheetModal
      visible={visible}
      title={account ? "Edit account" : "Add account"}
      onClose={onClose}
    >
      <Text className="text-black text-xs font-medium mb-1.5">Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Account name"
        placeholderTextColor="#A6A69F"
        className="rounded-xl bg-white border border-[#E8E6DF] px-4 py-3 mb-4 text-sm text-black"
      />

      <Text className="text-black text-xs font-medium mb-1.5">Type</Text>
      <View className="flex-row flex-wrap mb-5">
        {ACCOUNT_TYPES.map((accountType) => (
          <TouchableOpacity
            key={accountType}
            onPress={() => setType(accountType)}
            className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
              type === accountType
                ? "bg-black border-black"
                : "bg-white border-[#E8E6DF]"
            }`}
          >
            <Text
              className={`text-xs ${
                type === accountType ? "text-white" : "text-black"
              }`}
            >
              {accountType.replace("_", " ")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {account && !account.is_default ? (
        <TouchableOpacity
          onPress={onMadeDefault}
          className="border border-[#E8E6DF] bg-white rounded-xl py-3.5 items-center mb-3"
        >
          <Text className="text-black text-sm font-semibold">
            Make default
          </Text>
        </TouchableOpacity>
      ) : null}

      {account ? (
        <TouchableOpacity
          onPress={handleDelete}
          disabled={deleting}
          className="border border-red-200 bg-red-50 rounded-xl py-3.5 items-center mb-3"
        >
          <View className="flex-row items-center">
            <Feather name="trash-2" size={15} color="#EF4444" />
            <Text className="text-red-500 text-sm font-semibold ml-2">
              {deleting ? "Deleting..." : "Delete account"}
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        onPress={handleSave}
        disabled={creating || updating}
        className="bg-black rounded-xl py-4 items-center"
        activeOpacity={0.85}
      >
        <Text className="text-white text-sm font-semibold">
          {creating || updating ? "Saving..." : "Save account"}
        </Text>
      </TouchableOpacity>
    </FormSheetModal>
  );
}
