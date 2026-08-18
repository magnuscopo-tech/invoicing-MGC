import { useState } from "react";
import { useDispatch } from "react-redux";
import { Eye, EyeOff } from "lucide-react";
import BaseModal from "../baseModal";
import InputField from "../../custom/inputField";
import CustomButton from "../../custom/customButton";
import { handleChangePassword } from "../../../Services/apiCalling/authApis";
import { logout } from "../../../ReduxFeature/Authenthicate/LoginSlice";
import { SuccessMessage } from "../../../Utlis/Toastify/ToastMessage";
import { commonValidator } from "../../../Utlis/Common/commonValidator";

const EMPTY_FORM = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function ChangePasswordModal({ open, onClose = () => {} }) {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [saving, setSaving] = useState(false);

  const passwordToggle = (field) => {
    const isVisible = Boolean(visiblePasswords[field]);

    return (
      <button
        type="button"
        className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
        onClick={() =>
          setVisiblePasswords((current) => ({
            ...current,
            [field]: !current[field],
          }))
        }
        aria-label={isVisible ? "Hide password" : "Show password"}
        title={isVisible ? "Hide password" : "Show password"}
      >
        {isVisible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    );
  };

  const onFieldChange = (value, field) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {
      currentPassword: commonValidator("required", formData.currentPassword),
      newPassword: commonValidator("password", formData.newPassword),
    };

    if (
      !nextErrors.newPassword &&
      formData.newPassword !== formData.confirmPassword
    ) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

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
      const result = await handleChangePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      if (result) {
        SuccessMessage("Password changed. Please log in again.");
        setFormData(EMPTY_FORM);
        setVisiblePasswords({});
        onClose();
        dispatch(logout());
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal
      open={open}
      title="Change password"
      description="All existing sessions are signed out after a password change."
      size="sm"
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton size="sm" loading={saving} onClick={onSubmit}>
            Update password
          </CustomButton>
        </>
      }
    >
      <div className="space-y-4">
        <InputField
          label="Current password"
          name="currentPassword"
          type={visiblePasswords.currentPassword ? "text" : "password"}
          required
          value={formData.currentPassword}
          error={errors.currentPassword}
          onChange={onFieldChange}
          suffix={passwordToggle("currentPassword")}
        />
        <InputField
          label="New password"
          name="newPassword"
          type={visiblePasswords.newPassword ? "text" : "password"}
          required
          hint="At least 8 characters."
          value={formData.newPassword}
          error={errors.newPassword}
          onChange={onFieldChange}
          suffix={passwordToggle("newPassword")}
        />
        <InputField
          label="Confirm new password"
          name="confirmPassword"
          type={visiblePasswords.confirmPassword ? "text" : "password"}
          required
          value={formData.confirmPassword}
          error={errors.confirmPassword}
          onChange={onFieldChange}
          suffix={passwordToggle("confirmPassword")}
        />
      </div>
    </BaseModal>
  );
}
