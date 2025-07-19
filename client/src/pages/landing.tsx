import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/navigation";
import AuthModal from "@/components/auth-modal";
import { useAuth } from "@/lib/auth.tsx";
import { useLocation } from "wouter";

export default function Landing() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      if (user.role === 'buyer') {
        setLocation('/buyer');
      } else if (user.role === 'provider') {
        setLocation('/provider');
      } else if (user.role === 'admin') {
        setLocation('/admin');
      }
    }
  }, [user, setLocation]);

  const showAuth = (type: 'login' | 'register') => {
    setAuthMode(type);
    setAuthModalOpen(true);
  };

  const services = [
    {
      name: "Followers",
      description: "Gain authentic followers across all platforms",
      icon: "fas fa-users",
      color: "blue"
    },
    {
      name: "Likes",
      description: "Boost engagement with authentic likes",
      icon: "fas fa-heart",
      color: "red"
    },
    {
      name: "Views",
      description: "Increase your content visibility",
      icon: "fas fa-eye",
      color: "green"
    },
    {
      name: "Comments",
      description: "Get meaningful comments on your posts",
      icon: "fas fa-comment",
      color: "yellow"
    }
  ];

  const platforms = [
    { name: "Instagram", icon: "fab fa-instagram", gradient: "from-purple-500 to-pink-500" },
    { name: "YouTube", icon: "fab fa-youtube", gradient: "from-red-600 to-red-600" },
    { name: "Twitter", icon: "fab fa-twitter", gradient: "from-blue-500 to-blue-500" },
    { name: "TikTok", icon: "fab fa-tiktok", gradient: "from-black to-black" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onShowAuth={showAuth} />
      
      {/* Hero Section */}
      <section id="home" className="bg-gradient-to-r from-primary to-primary-dark text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Boost Your Social Media Presence
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Connect with authentic providers to grow your followers, likes, views, and engagement across all major platforms.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => showAuth('register')}
                className="bg-white text-primary hover:bg-gray-100 px-8 py-3 text-lg h-12"
              >
                Start Buying
              </Button>
              <Button 
                onClick={() => showAuth('register')}
                variant="outline"
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary px-8 py-3 text-lg h-12"
              >
                Start Earning
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Available Services</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose from a variety of engagement services across all major social media platforms
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className={`w-12 h-12 bg-${service.color}-100 rounded-lg flex items-center justify-center mx-auto mb-4`}>
                    <i className={`${service.icon} text-${service.color === 'red' ? 'red-500' : service.color === 'green' ? 'green-500' : service.color === 'yellow' ? 'yellow-500' : 'primary'} text-xl`}></i>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  <div className="text-2xl font-bold text-primary mb-2">5 Shillings</div>
                  <div className="text-sm text-gray-500">per {service.name.toLowerCase().slice(0, -1)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Supported Platforms</h2>
            <p className="text-xl text-gray-600">We support all major social media platforms</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {platforms.map((platform, index) => (
              <div key={index} className="text-center">
                <div className={`w-16 h-16 bg-gradient-to-r ${platform.gradient} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                  <i className={`${platform.icon} text-white text-2xl`}></i>
                </div>
                <h3 className="font-semibold">{platform.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold text-primary mb-4">EngageMarket</h3>
              <p className="text-gray-600 text-sm">The trusted marketplace for authentic social media engagement.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">For Buyers</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#services" className="hover:text-gray-900">Browse Services</a></li>
                <li><a href="#services" className="hover:text-gray-900">Pricing</a></li>
                <li><a href="#services" className="hover:text-gray-900">How it Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">For Providers</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Start Earning</a></li>
                <li><a href="#" className="hover:text-gray-900">Payment Info</a></li>
                <li><a href="#" className="hover:text-gray-900">Guidelines</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Help Center</a></li>
                <li><a href="#" className="hover:text-gray-900">Contact Us</a></li>
                <li><a href="#" className="hover:text-gray-900">Terms of Service</a></li>
                <li><a href="#" className="hover:text-gray-900">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-600">
            <p>&copy; 2023 EngageMarket. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <AuthModal 
        open={authModalOpen} 
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />
    </div>
  );
}
