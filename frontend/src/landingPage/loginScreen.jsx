import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  Layers,
  Lock,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import InputField from "../components/custom/inputField";
import CustomButton from "../components/custom/customButton";
import BrandMark from "../components/custom/brandMark";
import { handleLogIn, handleRegister } from "../Services/apiCalling/authApis";
import { login } from "../ReduxFeature/Authenthicate/LoginSlice";
import { SuccessMessage } from "../Utlis/Toastify/ToastMessage";
import { commonValidator } from "../Utlis/Common/commonValidator";
import { BRAND } from "../constants/brand.constants";

const HIGHLIGHTS = [
  {
    icon: Layers,
    title: "One chain, three documents",
    text: "Quotation → Proforma → Tax Invoice, carrying the same figures forward.",
  },
  {
    icon: BadgeCheck,
    title: "Numbers that never collide",
    text: "Serials are reserved only on save, per company and financial year.",
  },
  {
    icon: ShieldCheck,
    title: "Server-verified totals",
    text: "GST is fixed at 18% and recalculated on every write.",
  },
];

const EMPTY_FORM = { name: "", email: "", password: "" };

export default function LoginScreen() {
  const dispatch = useDispatch();
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  const onFieldChange = (value, field) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {
      email: commonValidator("email", formData.email),
      password: commonValidator("password", formData.password),
    };

    if (isRegister) {
      nextErrors.name = commonValidator("name", formData.name);
    }

    const cleaned = Object.fromEntries(
      Object.entries(nextErrors).filter(([, message]) => message)
    );
    setErrors(cleaned);
    return Object.keys(cleaned).length === 0;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = isRegister
        ? {
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
          }
        : {
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
          };

      const result = isRegister
        ? await handleRegister(payload)
        : await handleLogIn(payload);

      if (result?.token) {
        // An admin lands on the reporting dashboard, a finance user on the
        // working dashboard. App.jsx resolves that from the stored role.
        SuccessMessage(
          result.user?.role === "admin"
            ? "Signed in as admin."
            : isRegister
              ? "Account created. Welcome aboard."
              : "Welcome back."
        );
        dispatch(login({ token: result.token, user: result.user }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setErrors({});
  };

  return (
    <div className="grid min-h-screen overflow-x-hidden bg-white lg:grid-cols-[1.05fr_1fr]">
      {/* ---------------------------- Brand panel ---------------------------- */}
      <section className="relative hidden overflow-hidden bg-ink-950 p-12 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-900 to-ink-950" />

        {/* Slow-drifting glows give the panel depth without distracting motion. */}
        <div className="absolute -right-32 -top-40 h-[26rem] w-[26rem] animate-drift rounded-full bg-primary-400/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-[30rem] w-[30rem] animate-drift-slow rounded-full bg-sky-400/12 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)",
          }}
        />

        <BrandMark
          size="md"
          tone="onDark"
          subtitle={BRAND.tagline}
          className="relative animate-fade-in"
        />

        <div className="relative">
          <p className="mb-5 inline-flex animate-fade-up items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-100 ring-1 ring-inset ring-white/15 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            GST ready · INR
          </p>

          <h2
            className="max-w-lg animate-fade-up text-[2.6rem] font-bold leading-[1.1] tracking-tight text-white xl:text-5xl"
            style={{ animationDelay: "80ms" }}
          >
            Finance documents that stay consistent end to end.
          </h2>

          <p
            className="mt-5 max-w-md animate-fade-up text-[15px] leading-relaxed text-primary-100/90"
            style={{ animationDelay: "160ms" }}
          >
            Fill the details once. Every stage of the chain reuses the same
            company, client and line items — only what should change, changes.
          </p>

          <div className="mt-11 space-y-6">
            {HIGHLIGHTS.map((item, index) => (
              <div
                key={item.title}
                className="flex animate-slide-right gap-4"
                style={{ animationDelay: `${240 + index * 110}ms` }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/15 backdrop-blur">
                  <item.icon size={18} strokeWidth={2} />
                </span>
                <div className="pt-0.5">
                  <p className="text-[14px] font-semibold text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-primary-200/85">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* A real document line, so the panel shows the product, not just claims. */}
        <div
          className="relative w-full max-w-sm animate-fade-up rounded-2xl bg-white/10 p-4 ring-1 ring-inset ring-white/15 backdrop-blur-md"
          style={{ animationDelay: "600ms" }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white">
                <FileText size={16} />
              </span>
              <span className="leading-tight">
                <span className="block font-mono text-[13px] font-bold text-white">
                  MCI/26-27/003
                </span>
                <span className="block text-[11px] text-primary-200">
                  Tax Invoice
                </span>
              </span>
            </span>

            <span className="text-right leading-tight">
              <span className="block text-[14px] font-bold text-white tabular-nums">
                ₹16,708.80
              </span>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                Paid
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------ Form side ---------------------------- */}
      {/* overflow-hidden clips the decorative glow, which is wider than the
          column and would otherwise create a horizontal scrollbar on mobile. */}
      <section className="relative flex items-center justify-center overflow-hidden px-6 py-12 sm:px-12">
        <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-primary-100/50 blur-3xl lg:hidden" />

        <div className="relative w-full max-w-[23rem] animate-fade-up">
          <BrandMark size="md" className="mb-9 lg:hidden" />

          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700 ring-1 ring-inset ring-primary-100">
            {isRegister ? <UserPlus size={11} /> : <Lock size={11} />}
            {isRegister ? "New account" : "Secure sign in"}
          </span>

          <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-ink-950">
            {isRegister ? "Create your account" : "Sign in to continue"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            {isRegister
              ? `New ${BRAND.name} team members get full access to the shared workspace.`
              : `Use your ${BRAND.name} finance credentials to open the workspace.`}
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            {isRegister && (
              <InputField
                label="Full name"
                name="name"
                placeholder="Priya Nair"
                required
                value={formData.name}
                error={errors.name}
                onChange={onFieldChange}
              />
            )}

            <InputField
              label="Email address"
              name="email"
              type="email"
              placeholder="you@magnuscopo.com"
              required
              value={formData.email}
              error={errors.email}
              onChange={onFieldChange}
            />

            <InputField
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              hint={isRegister ? "At least 8 characters." : ""}
              value={formData.password}
              error={errors.password}
              onChange={onFieldChange}
            />

            <CustomButton
              type="submit"
              size="lg"
              fullWidth
              loading={submitting}
              icon={ArrowRight}
              iconRight
              className="!mt-7"
            >
              {isRegister ? "Create account" : "Sign in"}
            </CustomButton>
          </form>

          {/* No divider label here — there is no alternative sign-in method for
              an "or" to separate, so this is just a hairline rule. */}
          <p className="mt-7 border-t border-ink-100 pt-6 text-center text-[13px] text-ink-500">
            {isRegister ? "Already have an account?" : "Need an account?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="font-semibold text-primary-600 underline-offset-4 transition-colors hover:text-primary-700 hover:underline"
            >
              {isRegister ? "Sign in" : "Register"}
            </button>
          </p>

          <p className="mt-10 text-center text-[11px] leading-relaxed text-ink-400">
            © {new Date().getFullYear()} {BRAND.name} · GST fixed at 18% · INR
            only
          </p>
        </div>
      </section>
    </div>
  );
}
