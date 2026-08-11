import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import BaseModal from "../baseModal";
import InputField from "../../custom/inputField";
import SelectField from "../../custom/selectField";
import CustomButton from "../../custom/customButton";
import { handleCreateUser } from "../../../Services/apiCalling/authApis";
import { SuccessMessage } from "../../../Utlis/Toastify/ToastMessage";
import { commonValidator } from "../../../Utlis/Common/commonValidator";

const EMPTY_FORM = { name: "", email: "", password: "", role: "finance_user" };

const ROLE_OPTIONS = [
  { value: "finance_user", label: "Finance user" },
  { value: "admin", label: "Admin" },
];

// Role is granted here, by an existing admin - never on public registration.
export default function TeamMemberModal({
  open,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(EMPTY_FORM);
      setErrors({});
    }
  }, [open]);

  const onFieldChange = (value, field) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {
      name: commonValidator("name", formData.name),
      email: commonValidator("email", formData.email),
      password: commonValidator("password", formData.password),
    };

    const cleaned = Object.fromEntries(
      Object.entries(nextErrors).filter(([, message]) => message)
    );
    setErrors(cleaned);
    return Object.keys(cleaned).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const result = await handleCreateUser({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      });

      if (result) {
        SuccessMessage(`${result.name} added to the workspace.`);
        onSuccess(result);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal
      open={open}
      title="Add team member"
      description="Creates an account with the role you choose."
      size="sm"
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton size="sm" loading={saving} onClick={onSubmit}>
            Create account
          </CustomButton>
        </>
      }
    >
      <div className="space-y-4">
        <InputField
          label="Full name"
          name="name"
          required
          placeholder="Priya Nair"
          value={formData.name}
          error={errors.name}
          onChange={onFieldChange}
        />
        <InputField
          label="Email"
          name="email"
          type="email"
          required
          placeholder="priya@company.com"
          value={formData.email}
          error={errors.email}
          onChange={onFieldChange}
        />
        <InputField
          label="Temporary password"
          name="password"
          type="password"
          required
          hint="At least 8 characters. Ask them to change it after first sign-in."
          value={formData.password}
          error={errors.password}
          onChange={onFieldChange}
        />
        <SelectField
          label="Role"
          name="role"
          required
          value={formData.role}
          options={ROLE_OPTIONS}
          onChange={onFieldChange}
        />

        {formData.role === "admin" && (
          <p className="flex animate-fade-in gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800">
            <ShieldAlert size={15} className="mt-0.5 shrink-0" />
            Admins can see every financial report across the workspace and can
            delete companies, clients, services and documents.
          </p>
        )}
      </div>
    </BaseModal>
  );
}
