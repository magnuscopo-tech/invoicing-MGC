import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import ReportCard from "./reportCard";
import DataTable from "./dataTable";
import Pagination from "../custom/pagination";
import TableLoader from "../loader/tableLoader";
import StatusBadge from "../custom/statusBadge";
import CustomButton from "../custom/customButton";
import ConfirmDialog from "../modal/confirmDialog";
import TeamMemberModal from "../modal/auth/teamMemberModal";
import { selectCurrentUser } from "../../ReduxFeature/Authenthicate/LoginSlice";
import { handleGetAuditTrail } from "../../Services/apiCalling/reportApis";
import {
  handleGetAllUsers,
  handleUpdateUserStatus,
} from "../../Services/apiCalling/authApis";
import { itemsOf } from "../../Utlis/Common/commonMethod";
import { SuccessMessage } from "../../Utlis/Toastify/ToastMessage";
import { formatDisplayDateTime } from "../../Utlis/dateFormat";

const LIMIT = 20;

const ACTION_TONE = {
  created: "success",
  converted: "info",
  updated: "warning",
  regenerated: "info",
  status_changed: "warning",
  deleted: "danger",
  deactivated: "danger",
};

const EMPTY_GROUP = {
  active: 0,
  total: 0,
  missingGstin: 0,
};

export default function AdminGovernanceTab({ overview }) {
  const companies = overview?.companies || EMPTY_GROUP;
  const clients = overview?.clients || EMPTY_GROUP;
  const services = overview?.services || EMPTY_GROUP;
  const currentUser = useSelector(selectCurrentUser);
  const [audit, setAudit] = useState(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [pendingUser, setPendingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const auditRows = itemsOf(audit?.items);

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const result = await handleGetAuditTrail({ page: auditPage, limit: LIMIT });
      setAudit(result);
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const result = await handleGetAllUsers({ page: 1, limit: 50 });
      setUsers(itemsOf(result?.items));
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onToggleUser = async () => {
    setSaving(true);
    try {
      const result = await handleUpdateUserStatus(pendingUser._id, {
        isActive: !pendingUser.isActive,
      });
      if (result) {
        SuccessMessage(
          result.isActive ? "User reactivated." : "User deactivated."
        );
        setPendingUser(null);
        fetchUsers();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Companies",
              value: `${companies.active} / ${companies.total}`,
              caption: "active / total",
            },
            {
              label: "Clients",
              value: `${clients.active} / ${clients.total}`,
              caption: `${clients.missingGstin} without GSTIN — quotation only`,
            },
            {
              label: "Services",
              value: `${services.active} / ${services.total}`,
              caption: "active / total",
            },
          ].map((tile, index) => (
            <article
              key={tile.label}
              style={{ animationDelay: `${index * 70}ms` }}
              className="card animate-fade-up p-5"
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                {tile.label}
              </p>
              <p className="mt-2 text-xl font-bold tracking-tight text-ink-950">
                {tile.value}
              </p>
              <p className="mt-1 text-[12px] text-ink-400">{tile.caption}</p>
            </article>
          ))}
        </div>
      )}

      <ReportCard
        title="Team"
        description="Every user in the shared workspace. Deactivating signs the account out immediately."
        actions={
          <CustomButton
            size="sm"
            icon={UserPlus}
            onClick={() => setAddUserOpen(true)}
          >
            Add member
          </CustomButton>
        }
      >
        {usersLoading ? (
          <TableLoader rows={4} columns={5} />
        ) : (
          <DataTable
            emptyLabel="No users found."
            columns={[
              { key: "name", label: "Name", strong: true },
              { key: "email", label: "Email" },
              {
                key: "role",
                label: "Role",
                render: (row) => (
                  <StatusBadge
                    dot={false}
                    label={row.role === "admin" ? "Admin" : "Finance user"}
                    tone={row.role === "admin" ? "purple" : "neutral"}
                  />
                ),
              },
              {
                key: "isActive",
                label: "Status",
                render: (row) => (
                  <StatusBadge
                    label={row.isActive ? "Active" : "Deactivated"}
                    tone={row.isActive ? "success" : "danger"}
                  />
                ),
              },
              {
                key: "actions",
                label: "",
                align: "right",
                render: (row) =>
                  row._id === currentUser?._id ? (
                    <span className="text-[12px] text-ink-400">You</span>
                  ) : (
                    <CustomButton
                      size="sm"
                      variant={row.isActive ? "dangerGhost" : "subtle"}
                      icon={row.isActive ? ShieldOff : ShieldCheck}
                      onClick={() => setPendingUser(row)}
                    >
                      {row.isActive ? "Deactivate" : "Reactivate"}
                    </CustomButton>
                  ),
              },
            ]}
            rows={itemsOf(users).map((row) => ({ ...row, id: row._id }))}
          />
        )}
      </ReportCard>

      <ReportCard
        title="Audit trail"
        description="Who did what, newest first. Written on every create, update, conversion and status change."
      >
        {auditLoading ? (
          <TableLoader rows={8} columns={5} />
        ) : (
          <>
            <DataTable
              emptyLabel="Nothing recorded yet."
              columns={[
                {
                  key: "createdAt",
                  label: "When",
                  render: (row) => formatDisplayDateTime(row.createdAt),
                },
                {
                  key: "action",
                  label: "Action",
                  render: (row) => (
                    <StatusBadge
                      dot={false}
                      label={row.action.replace(/_/g, " ")}
                      tone={ACTION_TONE[row.action] || "neutral"}
                    />
                  ),
                },
                { key: "entityType", label: "Entity" },
                {
                  key: "docNumber",
                  label: "Document",
                  render: (row) =>
                    row.docNumber ? (
                      <span className="font-mono text-[12px]">
                        {row.docNumber}
                      </span>
                    ) : (
                      <span className="text-ink-300">—</span>
                    ),
                },
                {
                  key: "performedBy",
                  label: "By",
                  render: (row) => row.performedBy?.name || "System",
                },
              ]}
              rows={auditRows.map((row) => ({ ...row, id: row._id }))}
            />

            <Pagination
              page={auditPage}
              limit={LIMIT}
              total={audit?.total || 0}
              onPageChange={setAuditPage}
            />
          </>
        )}
      </ReportCard>

      <TeamMemberModal
        open={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        onSuccess={fetchUsers}
      />

      <ConfirmDialog
        open={Boolean(pendingUser)}
        title={pendingUser?.isActive ? "Deactivate user?" : "Reactivate user?"}
        message={
          pendingUser?.isActive
            ? `${pendingUser?.name} will be signed out immediately and cannot log back in until reactivated.`
            : `${pendingUser?.name} will be able to log in again.`
        }
        confirmLabel={pendingUser?.isActive ? "Deactivate" : "Reactivate"}
        tone={pendingUser?.isActive ? "danger" : "primary"}
        loading={saving}
        onConfirm={onToggleUser}
        onClose={() => setPendingUser(null)}
      />
    </div>
  );
}
