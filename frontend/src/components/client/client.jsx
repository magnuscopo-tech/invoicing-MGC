import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Users } from "lucide-react";
import PageHeader from "../custom/pageHeader";
import SearchInput from "../custom/searchInput";
import CustomButton from "../custom/customButton";
import EmptyState from "../custom/emptyState";
import Pagination from "../custom/pagination";
import CardGridLoader from "../loader/cardGridLoader";
import ClientCard from "./clientCard";
import ClientModal from "../modal/client/clientModal";
import ConfirmDialog from "../modal/confirmDialog";
import useDebounce from "../../hooks/useDebounce";
import { selectIsAdmin } from "../../ReduxFeature/Authenthicate/LoginSlice";
import {
  handleDeleteClient,
  handleGetAllClients,
} from "../../Services/apiCalling/clientApis";
import { SuccessMessage } from "../../Utlis/Toastify/ToastMessage";

const LIMIT = 12;

export default function Client() {
  const isAdmin = useSelector(selectIsAdmin);
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [formModal, setFormModal] = useState({ open: false, client: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await handleGetAllClients(params);
      setClients(response?.items || []);
      setTotal(response?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const onDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const result = await handleDeleteClient(deleteTarget._id);
      if (result) {
        SuccessMessage(
          result.softDeleted
            ? "Client is referenced by documents, so it was deactivated."
            : "Client deleted successfully."
        );
        setDeleteTarget(null);
        fetchClients();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Clients"
        description="Buyer companies you issue documents to."
      >
        <SearchInput
          value={search}
          placeholder="Search name, contact, email…"
          className="w-full sm:w-72"
          onChange={setSearch}
        />
        <CustomButton
          icon={Plus}
          onClick={() => setFormModal({ open: true, client: null })}
        >
          Add client
        </CustomButton>
      </PageHeader>

      {loading ? (
        <CardGridLoader count={6} />
      ) : clients.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title={search ? "No clients match that search" : "No clients yet"}
            description={
              search
                ? "Try a different term, or clear the search to see everything."
                : "Add the buyer companies you invoice. Name and address are required; GSTIN unlocks proforma and tax invoices."
            }
            actionLabel={search ? "" : "Add client"}
            actionIcon={Plus}
            onAction={
              search ? null : () => setFormModal({ open: true, client: null })
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((client) => (
              <ClientCard
                key={client._id}
                client={client}
                canDelete={isAdmin}
                onEdit={(item) => setFormModal({ open: true, client: item })}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>

          <div className="card mt-5">
            <Pagination
              page={page}
              limit={LIMIT}
              total={total}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      <ClientModal
        open={formModal.open}
        client={formModal.client}
        onClose={() => setFormModal({ open: false, client: null })}
        onSuccess={fetchClients}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete client?"
        message={`"${deleteTarget?.name}" will be removed. If any document already references it, it is deactivated instead so historical documents keep rendering.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={onDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
