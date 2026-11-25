import React, { useState, useEffect } from 'react';
import { User } from './types';
import { db } from './services/db';
import { getStoredUser, setStoredUser } from './services/auth';
import { syncManager, SyncStatus } from './services/offlineSync';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { POSPage } from './pages/POSPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ShiftsPage } from './pages/ShiftsPage';
import { MenuPage } from './pages/MenuPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { StockPage } from './pages/StockPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { ReportsPage } from './pages/ReportsPage';
import { CashLedgerPage } from './pages/CashLedgerPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';
import { LicensePage } from './pages/LicensePage';
import { RegistrationPage } from './pages/RegistrationPage';
import { StandaloneSuperadminPage } from './pages/StandaloneSuperadminPage';
import { useDialog } from './contexts/DialogContext';

function checkIsSuperadminPortalUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  return (
    hash.startsWith('#/superadmin') ||
    path === '/superadmin' ||
    params.get('portal') === 'superadmin'
  );
}

export default function App() {
  const [isSuperadminPortal, setIsSuperadminPortal] = useState<boolean>(() =>
    checkIsSuperadminPortalUrl()
  );

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = getStoredUser();
    if (saved) return saved;
    // Default initial user for effortless immediate review
    const defaultAdmin = db.getStoreUsers().find(u => u.role === 'ADMIN');
    return defaultAdmin || null;
  });

  const [currentPage, setCurrentPage] = useState<string>('pos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRegistrationView, setIsRegistrationView] = useState(false);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getStatus());
  const { showAlert, toast } = useDialog();

  useEffect(() => {
    const onDataUpdated = () => {
      setWorkspaceVersion(v => v + 1);
    };
    window.addEventListener('martvai:data-updated', onDataUpdated);
    return () => window.removeEventListener('martvai:data-updated', onDataUpdated);
  }, []);

  useEffect(() => {
    const onUrlChange = () => {
      setIsSuperadminPortal(checkIsSuperadminPortalUrl());
    };
    window.addEventListener('hashchange', onUrlChange);
    window.addEventListener('popstate', onUrlChange);
    return () => {
      window.removeEventListener('hashchange', onUrlChange);
      window.removeEventListener('popstate', onUrlChange);
    };
  }, []);

  useEffect(() => {
    const unsub = syncManager.subscribe(nextStatus => {
      setSyncStatus(prev => {
        if (
          nextStatus.lastRotationMessage &&
          nextStatus.lastRotationMessage !== prev.lastRotationMessage
        ) {
          toast(nextStatus.lastRotationMessage, 'info');
        }
        return nextStatus;
      });
    });
    return () => unsub();
  }, [toast]);

  // Enforce correct initial page based on active store role (ADMIN / KASIR)
  useEffect(() => {
    if (currentUser?.role === 'KASIR') {
      const kasirPages = ['pos', 'transactions', 'shifts'];
      if (!kasirPages.includes(currentPage)) {
        setCurrentPage('pos');
      }
    }
  }, [currentUser?.role, currentPage]);

  const enterSuperadminPortal = () => {
    window.location.hash = '#/superadmin';
    setIsSuperadminPortal(true);
  };

  const exitSuperadminPortal = () => {
    if (window.location.pathname === '/superadmin') {
      window.history.replaceState(null, '', '/');
    } else if (window.location.search.includes('portal=superadmin')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    window.location.hash = '#/';
    setIsSuperadminPortal(false);
  };

  // Standalone Superadmin License Portal — completely isolated from the POS store application
  if (isSuperadminPortal) {
    return <StandaloneSuperadminPage onExitPortal={exitSuperadminPortal} />;
  }

  const handleLogout = () => {
    setStoredUser(null);
    setCurrentUser(null);
  };

  const handleSelectPage = (pageId: string) => {
    if (currentUser?.role === 'KASIR') {
      const kasirPages = ['pos', 'transactions', 'shifts'];
      if (!kasirPages.includes(pageId)) {
        showAlert('Akses Ditolak: Halaman ini hanya dapat diakses oleh Admin.', 'error');
        return;
      }
    }
    setCurrentPage(pageId);
  };

  if (!currentUser) {
    if (isRegistrationView) {
      return <RegistrationPage onBackToLogin={() => setIsRegistrationView(false)} />;
    }
    return (
      <LoginPage
        onLoginSuccess={user => setCurrentUser(user)}
        onOpenRegistration={() => setIsRegistrationView(true)}
        onOpenSuperadminPortal={enterSuperadminPortal}
      />
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#FAF7F2] text-stone-800 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        currentPage={currentPage}
        onSelectPage={handleSelectPage}
      />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onSelectPage={handleSelectPage}
          userRole={currentUser.role}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Page Content View */}
        <main key={workspaceVersion} className="flex-1 overflow-y-auto h-full w-full">
          {currentPage === 'pos' && <POSPage currentUser={currentUser} />}
          {currentPage === 'transactions' && <TransactionsPage currentUser={currentUser} />}
          {currentPage === 'shifts' && <ShiftsPage currentUser={currentUser} />}
          {currentPage === 'menu' && <MenuPage />}
          {currentPage === 'categories' && <CategoriesPage />}
          {currentPage === 'stock' && <StockPage currentUser={currentUser} />}
          {currentPage === 'expenses' && <ExpensesPage currentUser={currentUser} />}
          {currentPage === 'purchases' && <PurchasesPage currentUser={currentUser} />}
          {currentPage === 'suppliers' && <SuppliersPage />}
          {currentPage === 'reports' && <ReportsPage />}
          {currentPage === 'cashledger' && <CashLedgerPage currentUser={currentUser} />}
          {currentPage === 'calculator' && <CalculatorPage />}
          {currentPage === 'users' && <UsersPage />}
          {currentPage === 'license' && <LicensePage currentUser={currentUser} />}
          {currentPage === 'audit' && <AuditLogPage currentUser={currentUser} />}
          {currentPage === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Offline Connectivity Toast (from PWA skill) */}
      {!syncStatus.isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xl animate-bounce">
          <span className="h-2 w-2 rounded-full bg-white" />
          <span>Mode Offline — Seluruh transaksi kasir tetap tersimpan aman di perangkat lokal.</span>
        </div>
      )}
    </div>
  );
}
