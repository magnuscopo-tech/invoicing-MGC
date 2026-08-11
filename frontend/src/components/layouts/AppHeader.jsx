import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { KeyRound, LogOut, Menu, Plus } from "lucide-react";
import CustomButton from "../custom/customButton";
import ChangePasswordModal from "../modal/auth/changePasswordModal";
import {
  logout,
  selectCurrentUser,
} from "../../ReduxFeature/Authenthicate/LoginSlice";
import { handleSignOut } from "../../Services/apiCalling/authApis";
import { ROUTES } from "../../constants/route.constants";
import { initialsOf } from "../../Utlis/Common/commonMethod";

export default function AppHeader({ onMenuClick = () => {} }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const onLogout = async () => {
    setMenuOpen(false);
    await handleSignOut();
    dispatch(logout());
  };

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-ink-100 bg-white/85 px-4 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-ink-600 transition-colors hover:bg-ink-100 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="hidden flex-1 sm:block">
          <p className="text-[13px] font-medium text-ink-500">
            Welcome back,{" "}
            <span className="font-semibold text-ink-800">
              {user?.name || "there"}
            </span>
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <CustomButton
            size="sm"
            icon={Plus}
            onClick={() => navigate(ROUTES.newDocument)}
          >
            <span className="hidden sm:inline">New Document</span>
            <span className="sm:hidden">New</span>
          </CustomButton>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((previous) => !previous)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-[13px] font-bold text-ink-700 transition-all duration-200 hover:bg-primary-100 hover:text-primary-700"
            >
              {initialsOf(user?.name || "U")}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 w-60 animate-scale-in overflow-hidden rounded-xl border border-ink-100 bg-white shadow-pop">
                <div className="border-b border-ink-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {user?.name || "User"}
                  </p>
                  <p className="truncate text-xs text-ink-500">{user?.email}</p>
                  <span className="mt-2 inline-block rounded-md bg-primary-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-700">
                    {user?.role === "admin" ? "Admin" : "Finance User"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setPasswordModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-ink-600 transition-colors hover:bg-ink-50"
                >
                  <KeyRound size={15} /> Change password
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </>
  );
}
