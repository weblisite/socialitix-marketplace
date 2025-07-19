import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth.tsx";
import { useLocation } from "wouter";

interface NavigationProps {
  onShowAuth: (type: 'login' | 'register') => void;
}

export default function Navigation({ onShowAuth }: NavigationProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleDashboardClick = () => {
    if (user?.role === 'buyer') {
      setLocation('/buyer');
    } else if (user?.role === 'provider') {
      setLocation('/provider');
    } else if (user?.role === 'admin') {
      setLocation('/admin');
    }
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
          
          <div className="md:hidden">
            <Button variant="ghost" size="sm">
              <i className="fas fa-bars"></i>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
