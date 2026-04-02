import { NavLink } from 'react-router-dom';
import {
  FaBook,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaUsers,
  FaCog,
  FaSignOutAlt
} from 'react-icons/fa';
import logo from './tips-g-logo.png';

const Sidebar = () => {
  const menuItems = [
    { title: 'Courses', path: '/courses', icon: <FaBook /> },
    { title: 'Students', path: '/students', icon: <FaUserGraduate /> },
    { title: 'Employees', path: '/employees', icon: <FaChalkboardTeacher /> },
    { title: 'Batches', path: '/batches', icon: <FaUsers /> },
    { title: 'Settings', path: '/settings', icon: <FaCog /> },
  ];

  return (
    <aside
      className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-r lg:border-gray-100 lg:bg-white lg:shadow-lg"
    >
      <div className="relative flex h-24 flex-col items-center justify-center border-b border-gray-100 bg-white px-6">
        <img
          src={logo}
          alt="TIPS-G Alwar"
          className="h-34 w-34"
        />
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
                      ? 'bg-blue-50 text-blue-900 shadow-sm'
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
            // handle logout logic here
            alert("Logging out...");
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
