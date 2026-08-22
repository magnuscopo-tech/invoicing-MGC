import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import PageHeader from "../custom/pageHeader";
import SearchInput from "../custom/searchInput";
import CustomButton from "../custom/customButton";
import EmptyState from "../custom/emptyState";
import Pagination from "../custom/pagination";
import TableLoader from "../loader/tableLoader";
import StatusBadge from "../custom/statusBadge";
import ServiceModal from "../modal/service/serviceModal";
import ConfirmDialog from "../modal/confirmDialog";
import useDebounce from "../../hooks/useDebounce";
import { selectIsAdmin } from "../../ReduxFeature/Authenthicate/LoginSlice";
import {
  handleDeleteService,
  handleGetAllServices,
} from "../../Services/apiCalling/serviceApis";
import { itemsOf } from "../../Utlis/Common/commonMethod";
import { formatCurrency } from "../../Utlis/currencyFormat";
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
      setServices(itemsOf(response?.items));
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
        <div className="card overflow-hidden p-0">
          <TableLoader rows={6} columns={5} />
        </div>
      ) : itemsOf(services).length === 0 ? (
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
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-ink-50">
                  <tr>
                    <th className="table-head">Service</th>
                    <th className="table-head">Unit</th>
                    <th className="table-head text-right">Default price</th>
                    <th className="table-head text-center">Status</th>
                    <th className="table-head w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {itemsOf(services).map((service) => {
                    const isInactive = service.isActive === false;
                    const includedCount = itemsOf(service.includedServices).length;
                    return (
                      <tr
                        key={service._id}
                        className="animate-fade-in transition-colors hover:bg-ink-50/60"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                              <Package size={16} strokeWidth={2} />
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-ink-950">
                                {service.name}
                              </p>
                              {service.description ? (
                                <p className="mt-0.5 max-w-xl truncate text-[13px] text-ink-500">
                                  {service.description}
                                </p>
                              ) : (
                                <p className="mt-0.5 text-[13px] text-ink-400">
                                  No description
                                </p>
                              )}
                              {includedCount > 0 && (
                                <p className="mt-1 text-[12px] font-semibold text-primary-700">
                                  {includedCount} included service
                                  {includedCount === 1 ? "" : "s"}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="table-cell capitalize">
                          {service.unit || "unit"}
                        </td>
                        <td className="table-cell text-right font-semibold text-ink-950">
                          {formatCurrency(service.defaultUnitPrice)}
                        </td>
                        <td className="table-cell text-center">
                          <StatusBadge
                            label={isInactive ? "Inactive" : "Active"}
                            tone={isInactive ? "danger" : "success"}
                          />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setFormModal({ open: true, service })
                              }
                              className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-primary-50 hover:text-primary-700"
                              title="Edit service"
                            >
                              <Pencil size={15} />
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(service)}
                                className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-red-50 hover:text-red-600"
                                title="Delete service"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
