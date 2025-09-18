import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import { FiMenu, FiUser, FiLogOut, FiBell } from 'react-icons/fi';

/**
 * Header Component
 * Top navigation bar with user info and actions
 */
const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={onMenuClick}
      >
        <FiMenu className="h-6 w-6" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Page title */}
        <div className="flex items-center">
          <h1 className="text-lg font-semibold text-gray-900">
            {getPageTitle(router.pathname)}
          </h1>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-x-4 lg:gap-x-6">
          {/* Notifications */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
          >
            <FiBell className="h-6 w-6" />
          </button>

          {/* Separator */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

          {/* User menu */}
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            <div className="hidden lg:block lg:text-sm lg:leading-6">
              <p className="font-semibold text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-gray-600">{user?.role?.name}</p>
            </div>

            {/* User avatar */}
            <div className="flex items-center gap-x-2">
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <FiUser className="h-4 w-4 text-gray-600" />
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-x-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <FiLogOut className="h-4 w-4" />
                <span className="hidden sm:block">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get page title
const getPageTitle = (pathname) => {
  const titles = {
    '/dashboard': 'Dashboard',
    '/users': 'User Management',
    '/roles': 'Role Management',
    '/clients': 'Client Management',
    '/services': 'Service Management',
    '/invoices': 'Invoice Management',
    '/reports': 'Reports',
    '/analytics': 'Analytics',
    '/documents': 'Documents',
    '/templates': 'Templates',
  };

  return titles[pathname] || 'AWS Billing System';
};

export default Header;