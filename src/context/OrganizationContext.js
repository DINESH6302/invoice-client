'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const OrganizationContext = createContext();

export function OrganizationProvider({ children }) {
  const [organizations, setOrganizations_state] = useState([]);
  const [currentOrgId, setCurrentOrgId] = useState(null);

  const currentOrg = organizations.find(o => o.org_id === currentOrgId);

  const addOrganization = (name, orgId) => {
    const newOrg = { org_id: orgId, org_name: name };
    const exists = organizations.some(o => o.org_id === orgId);
    if (!exists) {
      setOrganizations_state([...organizations, newOrg]);
    }
    setCurrentOrgId(orgId);
  };

  const setOrganizations = (orgs) => {
    // Normalize org data to have org_id and org_name
    const normalized = orgs.map(org => ({
      org_id: org.org_id || org.id,
      org_name: org.org_name || org.name
    }));
    setOrganizations_state(normalized);
  };

  const switchOrganization = (orgId) => {
    setCurrentOrgId(orgId);
  };

  return (
    <OrganizationContext.Provider value={{ 
      organizations, 
      currentOrg, 
      currentOrgId, 
      addOrganization, 
      switchOrganization,
      setOrganizations
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  return useContext(OrganizationContext);
}
