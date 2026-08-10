import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Building2, Plus } from "lucide-react";
import PageHeader from "../custom/pageHeader";
import SearchInput from "../custom/searchInput";
import CustomButton from "../custom/customButton";
import EmptyState from "../custom/emptyState";
import Pagination from "../custom/pagination";
import CardGridLoader from "../loader/cardGridLoader";
import CompanyCard from "./companyCard";
import CompanyModal from "../modal/company/companyModal";
import CompanyAssetModal from "../modal/company/companyAssetModal";
import ConfirmDialog from "../modal/confirmDialog";
import useDebounce from "../../hooks/useDebounce";
import { selectIsAdmin } from "../../ReduxFeature/Authenthicate/LoginSlice";
import {
  handleDeleteCompany,
  handleGetAllCompanies,
} from "../../Services/apiCalling/companyApis";
import { SuccessMessage } from "../../Utlis/Toastify/ToastMessage";

const LIMIT = 12;

export default function Company() {
  const isAdmin = useSelector(selectIsAdmin);
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [formModal, setFormModal] = useState({ open: false, company: null });
  const [assetModal, setAssetModal] = useState({
    open: false,
    company: null,
    assetType: "logo",
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await handleGetAllCompanies(params);
      setCompanies(response?.items || []);
      setTotal(response?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const onDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const result = await handleDeleteCompany(deleteTarget._id);
      if (result) {
        SuccessMessage(
          result.softDeleted
            ? "Company is referenced by documents, so it was deactivated."
            : "Company deleted successfully."
        );
        setDeleteTarget(null);
        fetchCompanies();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Companies"
        description="Your seller profiles. Each document is issued under one of these."
      >
        <SearchInput
          value={search}
          placeholder="Search companies…"
          className="w-full sm:w-64"
          onChange={setSearch}
        />
        <CustomButton
          icon={Plus}
          onClick={() => setFormModal({ open: true, company: null })}
        >
          Add company
        </CustomButton>
      </PageHeader>

      {loading ? (
        <CardGridLoader count={6} />
      ) : companies.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Building2}
            title={search ? "No companies match that search" : "No companies yet"}
            description={
              search
                ? "Try a different name, or clear the search to see everything."
                : "Add your first seller profile — name, GSTIN, bank details and the default terms for each document type."
            }
            actionLabel={search ? "" : "Add company"}
            actionIcon={Plus}
            onAction={
              search ? null : () => setFormModal({ open: true, company: null })
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {companies.map((company) => (
              <CompanyCard
                key={company._id}
                company={company}
                canDelete={isAdmin}
                onEdit={(item) => setFormModal({ open: true, company: item })}
                onDelete={setDeleteTarget}
                onUploadLogo={(item) =>
                  setAssetModal({ open: true, company: item, assetType: "logo" })
                }
                onUploadSignature={(item) =>
                  setAssetModal({
                    open: true,
                    company: item,
                    assetType: "signature",
                  })
                }
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

      <CompanyModal
        open={formModal.open}
        company={formModal.company}
        onClose={() => setFormModal({ open: false, company: null })}
        onSuccess={fetchCompanies}
      />

      <CompanyAssetModal
        open={assetModal.open}
        company={assetModal.company}
        assetType={assetModal.assetType}
        onClose={() =>
          setAssetModal({ open: false, company: null, assetType: "logo" })
        }
        onSuccess={fetchCompanies}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete company?"
        message={`"${deleteTarget?.name}" will be removed. If any document already references it, it is deactivated instead so historical documents keep rendering.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={onDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
