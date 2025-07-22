import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth.tsx";
import { useLocation } from "wouter";

interface NavigationProps {
  onShowAuth: (type: 'login' | 'register') => void;
}

export default function Navigation({ onShowAuth }: NavigationProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleDashboardClick = () => {
    if (user?.role === 'buyer') {
      setLocation('/buyer');
    } else if (user?.role === 'provider') {
      setLocation('/provider');
    } else if (user?.role === 'admin') {
      setLocation('/admin');
    }
    setMobileMenuOpen(false);
  };

  const handleAuthClick = (type: 'login' | 'register') => {
    onShowAuth(type);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 
                className="text-xl font-bold text-primary cursor-pointer"
                onClick={() => setLocation('/')}
              >
                EngageMarket
              </h1>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {!user ? (
                <>
                  <a href="#home" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Home</a>
                  <a href="#services" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Services</a>
                  <a href="#pricing" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Pricing</a>
                  <Button 
                    variant="ghost" 
                    onClick={() => onShowAuth('login')}
                    className="text-primary hover:text-primary-dark"
                  >
                    Login
                  </Button>
                  <Button 
                    onClick={() => onShowAuth('register')}
                    className="bg-primary hover:bg-primary-dark text-white"
                  >
                    Sign Up
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={handleDashboardClick}
                  >
                    Dashboard
                  </Button>
                  <span className="text-sm text-gray-600">
                    Welcome, {user.name}
                  </span>
                  <Button 
                    variant="ghost" 
                    onClick={logout}
                  >
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2"
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {!user ? (
                <>
                  <a 
                    href="#home" 
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Home
                  </a>
                  <a 
                    href="#services" 
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Services
                  </a>
                  <a 
                    href="#pricing" 
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Pricing
                  </a>
                  <div className="pt-4 pb-3 border-t border-gray-200">
                    <div className="flex flex-col space-y-2">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleAuthClick('login')}
                        className="text-primary hover:text-primary-dark justify-start"
                      >
                        Login
                      </Button>
                      <Button 
                        onClick={() => handleAuthClick('register')}
                        className="bg-primary hover:bg-primary-dark text-white justify-start"
                      >
                        Sign Up
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-3 py-2 border-b border-gray-200">
                    <p className="text-sm text-gray-600">Welcome, {user.name}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={handleDashboardClick}
                    className="w-full justify-start"
                  >
                    Dashboard
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-start text-red-600 hover:text-red-700"
                  >
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
