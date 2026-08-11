import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Package, Plus } from "lucide-react";
import PageHeader from "../custom/pageHeader";
import SearchInput from "../custom/searchInput";
import CustomButton from "../custom/customButton";
import EmptyState from "../custom/emptyState";
import Pagination from "../custom/pagination";
import CardGridLoader from "../loader/cardGridLoader";
import ServiceCard from "./serviceCard";
import ServiceModal from "../modal/service/serviceModal";
import ConfirmDialog from "../modal/confirmDialog";
import useDebounce from "../../hooks/useDebounce";
import { selectIsAdmin } from "../../ReduxFeature/Authenthicate/LoginSlice";
import {
  handleDeleteService,
  handleGetAllServices,
} from "../../Services/apiCalling/serviceApis";
import { SuccessMessage } from "../../Utlis/Toastify/ToastMessage";

const LIMIT = 12;

export default function Service() {
  const isAdmin = useSelector(selectIsAdmin);
  const [services, setServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [formModal, setFormModal] = useState({ open: false, service: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await handleGetAllServices(params);
      setServices(response?.items || []);
      setTotal(response?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const onDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const result = await handleDeleteService(deleteTarget._id);
      if (result) {
        SuccessMessage(
          result.softDeleted
            ? "Service is referenced by documents, so it was deactivated."
            : "Service deleted successfully."
        );
        setDeleteTarget(null);
        fetchServices();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Service Catalog"
        description="Reusable line items that pre-fill the document builder."
      >
        <SearchInput
          value={search}
          placeholder="Search services…"
          className="w-full sm:w-64"
          onChange={setSearch}
        />
        <CustomButton
          icon={Plus}
          onClick={() => setFormModal({ open: true, service: null })}
        >
          Add service
        </CustomButton>
      </PageHeader>

      {loading ? (
        <CardGridLoader count={6} />
      ) : services.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title={search ? "No services match that search" : "No services yet"}
            description={
              search
                ? "Try a different term, or clear the search to see everything."
                : "Add the services you sell. Only a name is required — price and unit are defaults you can override on any document line."
            }
            actionLabel={search ? "" : "Add service"}
            actionIcon={Plus}
            onAction={
              search ? null : () => setFormModal({ open: true, service: null })
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <ServiceCard
                key={service._id}
                service={service}
                canDelete={isAdmin}
                onEdit={(item) => setFormModal({ open: true, service: item })}
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

      <ServiceModal
        open={formModal.open}
        service={formModal.service}
        onClose={() => setFormModal({ open: false, service: null })}
        onSuccess={fetchServices}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete service?"
        message={`"${deleteTarget?.name}" will be removed from the catalog. Documents that already use it keep their line items unchanged.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={onDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
