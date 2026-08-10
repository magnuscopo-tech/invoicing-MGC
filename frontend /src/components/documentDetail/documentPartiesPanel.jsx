import { Building2, Landmark, Users } from "lucide-react";

const PartyBlock = ({ icon: Icon, title, name, address, rows = [] }) => (
  <div className="rounded-xl border border-ink-100 p-4">
    <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-400">
      <Icon size={13} /> {title}
    </p>
    <p className="text-sm font-semibold text-ink-950">{name || "—"}</p>
    {address && (
      <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink-500">
        {address}
      </p>
    )}
    <dl className="mt-2.5 space-y-1">
      {rows
        .filter((row) => row.value)
        .map((row) => (
          <div key={row.label} className="flex gap-2 text-[12px]">
            <dt className="text-ink-400">{row.label}</dt>
            <dd className="font-mono text-ink-700">{row.value}</dd>
          </div>
        ))}
    </dl>
  </div>
);

export default function DocumentPartiesPanel({ document: doc }) {
  const company = doc.company || {};
  const client = doc.client || {};
  const bank = company.bankDetails || {};

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PartyBlock
        icon={Building2}
        title="Seller"
        name={company.name}
        address={company.address}
        rows={[
          { label: "GSTIN", value: company.gstin },
          { label: "PAN", value: company.pan },
          { label: "State", value: company.stateCode },
        ]}
      />

      <PartyBlock
        icon={Users}
        title="Buyer"
        name={client.name}
        address={client.address}
        rows={[
          {
            label: "GSTIN",
            value: doc.showBuyerGstin ? client.gstin : "",
          },
          { label: "Contact", value: client.contactPerson },
          { label: "Phone", value: client.phone },
        ]}
      />

      {bank.accountNumber && (
        <div className="md:col-span-2">
          <PartyBlock
            icon={Landmark}
            title="Bank details"
            name={bank.accountName}
            rows={[
              { label: "A/C", value: bank.accountNumber },
              { label: "IFSC", value: bank.ifsc },
              { label: "Bank", value: bank.bankName },
              { label: "Branch", value: bank.branch },
              { label: "GSTIN", value: bank.bankGstin },
            ]}
          />
        </div>
      )}
    </div>
  );
}
