import { NavLink } from 'react-router-dom';
import {
  FaBook,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaUsers,
  FaCog,
  FaSignOutAlt,
  FaTimes
} from 'react-icons/fa';
import logo from './tips-g-logo.png';

const Sidebar = ({ isMobile = false, isOpen = false, onClose }) => {
  const menuItems = [
    { title: 'Courses', path: '/courses', icon: <FaBook /> },
    { title: 'Students', path: '/students', icon: <FaUserGraduate /> },
    { title: 'Employees', path: '/employees', icon: <FaChalkboardTeacher /> },
    { title: 'Batches', path: '/batches', icon: <FaUsers /> },
    { title: 'Settings', path: '/settings', icon: <FaCog /> },
  ];

  // Desktop Sidebar
  if (!isMobile) {
    return (
      <aside className="fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r border-gray-100 bg-white shadow-lg">
        <div className="relative flex h-24 flex-col items-center justify-center border-b border-gray-100 bg-white px-6">
          <img src={logo} alt="TIPS-G Alwar" className="h-34 w-34" />
        </div>

        <nav className="mt-4 flex-1 overflow-y-auto px-3 sm:px-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 group ${
                      isActive
                        ? 'bg-blue-50 text-blue-900 shadow-sm border-l-4 border-blue-600'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="text-xl transition-transform group-hover:scale-110">
                    {item.icon}
                  </span>
                  <span className="font-medium text-sm">{item.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-gray-100 p-4">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-500 transition-all duration-200 hover:bg-red-50 group"
            onClick={() => alert("Logging out...")}
          >
            <span className="text-xl transition-transform group-hover:scale-110">
              <FaSignOutAlt />
            </span>
            <span className="font-medium text-sm text-gray-700">Logout</span>
          </button>
        </div>
      </aside>
    );
  }

  // Mobile Sidebar (Drawer with animation)
  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col
        border-r border-gray-100 bg-white shadow-2xl
        transition-transform duration-300 ease-in-out
        lg:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
        <img src={logo} alt="TIPS-G Alwar" className="h-12 w-auto" />
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <FaTimes className="text-xl" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 group ${
                    isActive
                      ? 'bg-blue-50 text-blue-900 shadow-sm border-l-4 border-blue-600'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <span className="text-xl transition-transform group-hover:scale-110">
                  {item.icon}
                </span>
                <span className="font-medium text-sm">{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-100 p-4">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-500 transition-all duration-200 hover:bg-red-50 group"
          onClick={() => {
            alert("Logging out...");
            onClose();
          }}
        >
          <span className="text-xl transition-transform group-hover:scale-110">
            <FaSignOutAlt />
          </span>
          <span className="font-medium text-sm text-gray-700">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;