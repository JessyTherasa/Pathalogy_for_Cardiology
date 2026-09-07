/**
 * CardioEvidence — Role Context
 * Role is derived exclusively from the authenticated user (AuthContext).
 * The free "setRole" switcher has been permanently removed.
 * Imaging Specialist is a distinct role with its own permission set.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { UserRole } from '../types';
import { useAuth } from './AuthContext';

interface RoleContextType {
  currentRole: UserRole;
  currentUser: {
    name: string;
    title: string;
    department: string;
  };
  allowedPages: string[];
  isPageAllowed: (pageKey: string) => boolean;
}

// ─── Role → display persona map ───────────────────────────────────────────────
const ROLE_USER_MAP: Record<UserRole, { name: string; title: string; department: string }> = {
  Cardiologist: {
    name: 'Dr. Elena Vance, MD',
    title: 'Attending Cardiologist',
    department: 'Cardiovascular Medicine'
  },
  Pathologist: {
    name: 'Dr. Marcus Thorne, MD, FCAP',
    title: 'Senior Cardiovascular Pathologist',
    department: 'Anatomic & Clinical Pathology'
  },
  'Imaging Specialist': {
    name: 'Dr. Priya Desai, MD',
    title: 'Cardiovascular Imaging Specialist',
    department: 'Cardiac Imaging & Radiology'
  },
  'Molecular Specialist': {
    name: 'Dr. Sarah Lin, PhD, FACMG',
    title: 'Lead Clinical Molecular Geneticist',
    department: 'Genomic Medicine'
  },
  Reviewer: {
    name: 'Dr. James Holloway, MD',
    title: 'Multidisciplinary Panel Lead / Quality Reviewer',
    department: 'Clinical Governance'
  },
  Administrator: {
    name: 'System Admin',
    title: 'Health Informatics Systems Administrator',
    department: 'Clinical IT Operations'
  }
};

// ─── RBAC page-access matrix ──────────────────────────────────────────────────
// Only pages a role CAN access appear here.
// Everything else is implicitly denied.
export const ROLE_PAGE_ACCESS: Record<UserRole, string[]> = {
  // Cardiologist: full multidisciplinary access
  Cardiologist: [
    'dashboard', 'cases', 'timeline', 'pathology', 'imaging', 'molecular',
    'lineage', 'reviews', 'audit', 'failures', 'experiment',
    'workflow_map', 'feedback', 'error_analysis'
  ],

  // Pathologist: pathology + specimen lineage only
  Pathologist: [
    'dashboard', 'cases', 'pathology', 'lineage', 'workflow_map', 'feedback'
  ],

  // Imaging Specialist: imaging only
  'Imaging Specialist': [
    'dashboard', 'cases', 'imaging', 'workflow_map', 'feedback'
  ],

  // Molecular Specialist: molecular + lineage (for specimen context)
  'Molecular Specialist': [
    'dashboard', 'cases', 'molecular', 'lineage', 'workflow_map', 'feedback'
  ],

  // Reviewer: full read access + reviews + audit; no specialist editing
  Reviewer: [
    'dashboard', 'cases', 'timeline', 'pathology', 'imaging', 'molecular',
    'lineage', 'reviews', 'audit', 'experiment', 'error_analysis',
    'workflow_map', 'feedback'
  ],

  // Administrator: system/admin access — no clinical editing by default
  Administrator: [
    'dashboard', 'audit', 'failures', 'ingestion', 'experiment',
    'error_analysis', 'workflow_map', 'feedback', 'settings'
  ]
};

// ─── Workspace tab access per role ────────────────────────────────────────────
// Controls which tabs are visible inside a CaseWorkspace.
export const ROLE_WORKSPACE_TABS: Record<UserRole, string[]> = {
  Cardiologist:       ['overview', 'timeline', 'pathology', 'imaging', 'molecular', 'lineage', 'reviews', 'audit'],
  Pathologist:        ['overview', 'pathology', 'lineage'],
  'Imaging Specialist': ['overview', 'imaging'],
  'Molecular Specialist': ['overview', 'molecular', 'lineage'],
  Reviewer:           ['overview', 'timeline', 'pathology', 'imaging', 'molecular', 'lineage', 'reviews', 'audit'],
  Administrator:      ['overview', 'audit']
};

// ─── Context ──────────────────────────────────────────────────────────────────
const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const currentRole = (user?.role as UserRole) ?? 'Cardiologist';

  const allowedPages = ROLE_PAGE_ACCESS[currentRole] ?? [];

  const currentUser = useMemo(() => {
    if (user) {
      return {
        name: user.name,
        title: user.title,
        department: user.department
      };
    }
    return ROLE_USER_MAP[currentRole];
  }, [user, currentRole]);

  const isPageAllowed = (pageKey: string) => allowedPages.includes(pageKey);

  return (
    <RoleContext.Provider value={{ currentRole, currentUser, allowedPages, isPageAllowed }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
};
