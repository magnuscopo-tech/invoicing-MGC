import { useEffect, useState } from "react";
import { handleGetAllCompanies } from "../Services/apiCalling/companyApis";
import { handleGetAllClients } from "../Services/apiCalling/clientApis";
import { handleGetAllServices } from "../Services/apiCalling/serviceApis";
import { itemsOf } from "../Utlis/Common/commonMethod";

// Loads the three dropdown sources the document wizard depends on.
export default function useMasterData() {
  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [companyList, clientList, serviceList] = await Promise.all([
          handleGetAllCompanies({ page: 1, limit: 100, isActive: true }),
          handleGetAllClients({ page: 1, limit: 200, isActive: true }),
          handleGetAllServices({ page: 1, limit: 200, isActive: true }),
        ]);

        setCompanies(itemsOf(companyList?.items));
        setClients(itemsOf(clientList?.items));
        setServices(itemsOf(serviceList?.items));
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return { companies, clients, services, loading };
}
