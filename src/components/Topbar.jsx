import { FaBell, FaSearch, FaUserCircle } from 'react-icons/fa';
import logo from './tips-g-logo.png';

const Topbar = () => {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-white px-4 py-4 shadow-sm sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap lg:justify-between">
        <div className="relative flex w-full items-center justify-center gap-3 sm:w-auto lg:hidden">
          <img
            src={logo}
            alt="TIPS-G Alwar"
            className="h-10 w-auto"
          />
        </div>

        <div className="order-3 w-full lg:order-1 lg:max-w-xl lg:flex-1">
          <div className="group relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-600" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-2xl border-none bg-gray-50 py-3 pl-12 pr-4 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100 sm:placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="order-2 ml-auto flex items-center gap-1 sm:gap-4 lg:order-2 lg:ml-6">
          <div className="flex items-center gap-2 sm:border-r sm:border-gray-200 sm:pr-4 lg:pr-6">
            <button className="group relative rounded-xl bg-gray-50 p-3 text-gray-600 transition-all hover:bg-blue-50 hover:text-blue-700">
              <FaBell />
              <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full border-2 border-white bg-red-500 shadow-sm ring-2 ring-red-200"></span>
            </button>
          </div>

          <div className="flex cursor-pointer items-center gap-3 rounded-2xl border border-transparent p-2 transition-all hover:border-gray-100 hover:bg-gray-50">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold leading-none text-gray-900">Admin User</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">Super Admin</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-[2px] shadow-lg shadow-blue-100">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[10px] bg-white">
                <FaUserCircle className="text-3xl text-gray-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
