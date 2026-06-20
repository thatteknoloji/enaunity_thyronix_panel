"use client";

import { ContractEditorForm } from "@/components/admin/ContractEditorForm";

export default function NewContractPage() {
  return (
    <ContractEditorForm
      mode="create"
      initial={{
        title: "",
        slug: "",
        content: "",
        type: "public",
        active: true,
      }}
    />
  );
}
