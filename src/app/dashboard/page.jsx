import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  ChevronDown,
  Key,
  LogOut,
  User,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import ChangePassword from "@/app/auth/ChangePassword";
import Profile from "@/app/auth/Profile";

// eslint-disable-next-line react/prop-types
export default function Page({ children, defaultCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/home" || location.pathname === "/";
  const userName = localStorage.getItem("name") || "Admin";

  const isWorkOrderCreateOrEdit =
    defaultCollapsed !== undefined
      ? defaultCollapsed
      : location.pathname.includes("create-work-order") ||
        location.pathname.includes("edit-work-order");

  // On create/edit work order, start collapsed (icon-only mode) so wide order items tables have full space.
  // On all other pages, respect normal sidebar state (default open).
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (isWorkOrderCreateOrEdit) {
      return false;
    }
    const stored = localStorage.getItem("sidebar:state");
    return stored !== null ? JSON.parse(stored) : true;
  });

  useEffect(() => {
    if (isWorkOrderCreateOrEdit) {
      setSidebarOpen(false);
    } else {
      const stored = localStorage.getItem("sidebar:state");
      setSidebarOpen(stored !== null ? JSON.parse(stored) : true);
    }
  }, [isWorkOrderCreateOrEdit, location.pathname]);

  const handleSidebarOpenChange = (newOpen) => {
    setSidebarOpen(newOpen);
    if (!isWorkOrderCreateOrEdit) {
      localStorage.setItem("sidebar:state", JSON.stringify(newOpen));
    }
  };

  const [open, setOpen] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);

  const handleLogout = async () => {
    localStorage.clear();
    navigate("/");
    window.location.reload();
  };

  const handleBackClick = (e) => {
    e.preventDefault();
    navigate(-1);
  };

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date());
  }, []);

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarOpenChange}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200/80 bg-white px-4 sm:px-6 md:px-8">
          {/* Left: Sidebar Trigger & Breadcrumb */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <SidebarTrigger className="-ml-1 h-8 w-8 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors" />
            
            {!isHomePage && (
              <>
                <Separator orientation="vertical" className="h-4 bg-stone-200" />
                <Breadcrumb className="w-full">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        href="#"
                        onClick={handleBackClick}
                        className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Back</span>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </>
            )}
          </div>

          {/* Right: Date & User Avatar Dropdown */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-stone-400 hidden md:inline-block">
              {formattedDate}
            </span>

            <div className="pl-2 border-l border-stone-200/80">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 select-none shadow-none"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8B6B55] text-white font-bold text-xs shadow-xs">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden sm:block text-left text-xs leading-tight">
                      <p className="font-bold text-stone-800 capitalize">{userName}</p>
                      <p className="text-[10px] text-stone-400">Onzone CRM</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-stone-400 hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 rounded-xl bg-[#1C1D1F] text-stone-200 border border-stone-800 shadow-2xl z-50 p-1.5"
                  side="bottom"
                  align="end"
                  sideOffset={8}
                >
                  <div className="px-2.5 py-1.5 border-b border-white/5 mb-1">
                    <p className="text-xs font-bold text-white capitalize">{userName}</p>
                    <p className="text-[10px] text-stone-400">Administrator</p>
                  </div>
                  <DropdownMenuItem
                    onClick={() => setOpenProfile(true)}
                    className="cursor-pointer text-xs hover:bg-white/10 text-stone-300 hover:text-white rounded-lg px-2.5 py-2"
                  >
                    <User className="h-4 w-4 mr-2.5" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setOpen(true)}
                    className="cursor-pointer text-xs hover:bg-white/10 text-stone-300 hover:text-white rounded-lg px-2.5 py-2"
                  >
                    <Key className="h-4 w-4 mr-2.5" />
                    <span>Change Password</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-stone-800 my-1" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg px-2.5 py-2"
                  >
                    <LogOut className="h-4 w-4 mr-2.5" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <ChangePassword setOpen={setOpen} open={open} />
        <Profile setOpen={setOpenProfile} open={openProfile} />

        <main className="flex-1 px-4 sm:px-6 md:px-8 py-3.5">
          <div className="mx-auto w-full">
            <div className="w-full">{children}</div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
