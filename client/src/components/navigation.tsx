import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth.tsx";
import { useLocation } from "wouter";

export default function Navigation() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <nav className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 
                className="text-2xl font-bold bg-gradient-to-r from-lime-500 to-lime-400 bg-clip-text text-transparent cursor-pointer"
                onClick={() => setLocation("/")}
              >
                SocialMarketplace
              </h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <button
                onClick={() => setLocation("/")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location === "/"
                    ? "bg-lime-500/20 text-lime-400 border border-lime-500/30"
                    : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                }`}
              >
                Home
              </button>
              
              {user ? (
                <>
                  <button
                    onClick={() => setLocation(user.role === 'buyer' ? '/buyer' : '/provider')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      location.startsWith('/buyer') || location.startsWith('/provider')
                        ? "bg-lime-500/20 text-lime-400 border border-lime-500/30"
                        : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                    }`}
                  >
                    Dashboard
                  </button>
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="border-gray-700 bg-gray-800 text-white hover:border-lime-500 hover:text-lime-500 hover:bg-gray-700"
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setLocation("/auth")}
                  className="bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white font-semibold px-6 py-2 rounded-xl shadow-lg hover:shadow-lime-500/25 transition-all duration-300"
                >
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Get Started
                </Button>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-300 hover:text-lime-500 hover:bg-gray-800"
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-900/95 backdrop-blur-lg border-t border-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <button
              onClick={() => {
                setLocation("/");
                setMobileMenuOpen(false);
              }}
              className={`block px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                location === "/"
                  ? "bg-lime-500/20 text-lime-400 border border-lime-500/30"
                  : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
              }`}
            >
              Home
            </button>
            
            {user ? (
              <>
                <button
                  onClick={() => {
                    setLocation(user.role === 'buyer' ? '/buyer' : '/provider');
                    setMobileMenuOpen(false);
                  }}
                  className={`block px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                    location.startsWith('/buyer') || location.startsWith('/provider')
                      ? "bg-lime-500/20 text-lime-400 border border-lime-500/30"
                      : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all duration-200"
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setLocation("/auth");
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium bg-gradient-to-r from-lime-500 to-lime-600 text-white hover:from-lime-600 hover:to-lime-700 transition-all duration-200"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Get Started
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
