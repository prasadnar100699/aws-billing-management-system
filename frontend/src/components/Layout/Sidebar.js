import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  FiHome,
  FiUsers,
  FiShield,
  FiUserCheck,
  FiServer,
  FiFileText,
  FiBarChart3,
  FiPieChart,
  FiFolder,
  FiLayout,
  FiX
} from 'react-icons/fi';

/**
 * Sidebar Navigation Component
 * Enterprise-level navigation with role-based access
 */
const Sidebar = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { user, hasPermission } = useAuth();

  // Navigation items with permissions
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: FiHome,
      permission: 'dashboard.view'
    },
    {
      name: 'User Management',
      href: '/users',
      icon: FiUsers,
      permission: 'users.view'
    },
    {
      name: 'Role Management',
      href: '/roles',
      icon: FiShield,
      permission: 'roles.view'
    },
    {
      name: 'Client Management',
      href: '/clients',
      icon: FiUserCheck,
      permission: 'clients.view'
    },
    {
      name: 'Service Management',
      href: '/services',
      icon: FiServer,
      permission: 'services.view'
    },
    {
      name: 'Invoice Management',
      href: '/invoices',
      icon: FiFileText,
      permission: 'invoices.view'
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: FiBarChart3,
      permission: 'reports.view'
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: FiPieChart,
      permission: 'analytics.view'
    },
    {
      name: 'Documents',
      href: '/documents',
      icon: FiFolder,
      permission: 'documents.view'
    },
    {
      name: 'Templates',
      href: '/templates',
      icon: FiLayout,
      permission: 'templates.view'
    }
  ];

  // Filter navigation items based on user permissions
  const filteredNavigation = navigationItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/80" onClick={onClose} />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white px-6 pb-4">
            <SidebarContent 
              navigation={filteredNavigation} 
              currentPath={router.pathname}
              onClose={onClose}
              user={user}
              isMobile={true}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
          <SidebarContent 
            navigation={filteredNavigation} 
            currentPath={router.pathname}
            user={user}
            isMobile={false}
          />
        </div>
      </div>
    </>
  );
};

// Sidebar content component
const SidebarContent = ({ navigation, currentPath, onClose, user, isMobile }) => {
  return (
    <>
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">AWS</span>
          </div>
          <span className="ml-3 text-lg font-semibold text-gray-900">
            Billing System
          </span>
        </div>
        {isMobile && (
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700"
            onClick={onClose}
          >
            <FiX className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* User info */}
      <div className="flex items-center gap-x-3 rounded-lg bg-gray-50 px-3 py-2">
        <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {user?.role?.name}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={isMobile ? onClose : undefined}
                      className={`
                        group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                        ${isActive
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                        }
                      `}
                    >
                      <item.icon
                        className={`h-6 w-6 shrink-0 ${
                          isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600'
                        }`}
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        </ul>
      </nav>
    </>
  );
};

export default Sidebar;