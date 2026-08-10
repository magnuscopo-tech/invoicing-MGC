import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleDollarSign, FileClock, FileText, Wallet } from "lucide-react";
import PageHeader from "../custom/pageHeader";
import CardGridLoader from "../loader/cardGridLoader";
import StatCard from "./statCard";
import RecentDocuments from "./recentDocuments";
import QuickActions from "./quickActions";
import { handleGetAllDocuments } from "../../Services/apiCalling/documentApis";
import { formatCompactCurrency } from "../../Utlis/currencyFormat";
import { ROUTES } from "../../constants/route.constants";
import { DOC_STATUS, DOC_TYPES } from "../../constants/document.constants";

const sumTotals = (documents) =>
  documents.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

export default function Dashboard() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        // The dashboard summarises the most recent slice of history rather
        // than pulling every document into the browser.
        const response = await handleGetAllDocuments({ page: 1, limit: 100 });
        setDocuments(response?.items || []);
        setTotal(response?.total || 0);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const invoices = documents.filter(
    (item) => item.docType === DOC_TYPES.invoice
  );
  const paid = invoices.filter((item) => item.status === DOC_STATUS.paid);
  const outstanding = invoices.filter(
    (item) =>
      item.status !== DOC_STATUS.paid && item.status !== DOC_STATUS.cancelled
  );
  const drafts = documents.filter(
    (item) => item.status === DOC_STATUS.draft
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A snapshot of your most recent 100 documents."
      />

      {loading ? (
        <CardGridLoader count={4} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total documents"
              value={total}
              caption="Across every type and status"
              icon={FileText}
              tone="primary"
              delay={0}
              onClick={() => navigate(ROUTES.history)}
            />
            <StatCard
              label="Invoiced value"
              value={formatCompactCurrency(sumTotals(invoices))}
              caption={`${invoices.length} tax invoices`}
              icon={CircleDollarSign}
              tone="purple"
              delay={70}
            />
            <StatCard
              label="Collected"
              value={formatCompactCurrency(sumTotals(paid))}
              caption={`${paid.length} marked paid`}
              icon={Wallet}
              tone="success"
              delay={140}
            />
            <StatCard
              label="Outstanding"
              value={formatCompactCurrency(sumTotals(outstanding))}
              caption={`${drafts.length} still in draft`}
              icon={FileClock}
              tone="warning"
              delay={210}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentDocuments
                documents={documents.slice(0, 8)}
                onOpen={(document) =>
                  navigate(ROUTES.documentDetailPath(document._id))
                }
                onSeeAll={() => navigate(ROUTES.history)}
              />
            </div>

            <QuickActions />
          </div>
        </>
      )}
    </>
  );
}
