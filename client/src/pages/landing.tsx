import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth.tsx";
import { useLocation } from "wouter";

export default function Landing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    if (user) {
      setLocation(user.role === 'buyer' ? '/buyer' : '/provider');
    } else {
      setLocation('/auth');
    }
  };

  const platformIcons: Record<string, string> = {
    instagram: "fab fa-instagram text-pink-500",
    youtube: "fab fa-youtube text-red-500",
    twitter: "fab fa-twitter text-blue-500",
    tiktok: "fab fa-tiktok text-black",
    facebook: "fab fa-facebook text-blue-600",
  };

  const services = [
    {
      platform: "instagram",
      type: "followers",
      name: "Instagram Followers",
      description: "Get real Instagram followers to boost your social media presence",
      price: "10.00",
      icon: platformIcons.instagram,
    },
    {
      platform: "instagram",
      type: "likes",
      name: "Instagram Likes",
      description: "Increase engagement with authentic Instagram likes",
      price: "10.00",
      icon: platformIcons.instagram,
    },
    {
      platform: "youtube",
      type: "views",
      name: "YouTube Views",
      description: "Boost your video visibility with real YouTube views",
      price: "10.00",
      icon: platformIcons.youtube,
    },
    {
      platform: "twitter",
      type: "followers",
      name: "Twitter Followers",
      description: "Grow your Twitter audience with real followers",
      price: "10.00",
      icon: platformIcons.twitter,
    },
    {
      platform: "tiktok",
      type: "followers",
      name: "TikTok Followers",
      description: "Expand your TikTok reach with genuine followers",
      price: "10.00",
      icon: platformIcons.tiktok,
    },
    {
      platform: "facebook",
      type: "followers",
      name: "Facebook Followers",
      description: "Get real Facebook followers to boost your page engagement",
      price: "10.00",
      icon: platformIcons.facebook,
    },
  ];

  const features = [
    {
      icon: "fas fa-shield-alt",
      title: "Secure & Authentic",
      description: "All engagements are from real users, ensuring your social media growth is genuine and compliant"
    },
    {
      icon: "fas fa-globe",
      title: "Multi-Platform Support",
      description: "Support for all major social media platforms including Instagram, YouTube, Twitter, TikTok, and Facebook"
    },
    {
      icon: "fas fa-lock",
      title: "Privacy Protected",
      description: "Your account information and data are encrypted and protected with enterprise-grade security"
    }
  ];

  const stats = [
    { number: "50K+", label: "Orders Completed", description: "Successfully delivered engagements" },
    { number: "99.9%", label: "Uptime", description: "Reliable service availability" },
    { number: "24/7", label: "Support", description: "Round-the-clock customer service" }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Promotional Bar */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center py-2 text-sm">
        <span>🚀 New: Instant delivery for all services! Get started today.</span>
      </div>

      {/* Navigation */}
      <nav className="bg-black/90 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-white">
                  SocialMarketplace
                </h1>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#platform" className="text-gray-300 hover:text-white transition-colors">Platform</a>
              <a href="#solutions" className="text-gray-300 hover:text-white transition-colors">Solutions</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="#resources" className="text-gray-300 hover:text-white transition-colors">Resources</a>
              <a href="#company" className="text-gray-300 hover:text-white transition-colors">Company</a>
              <a href="#support" className="text-gray-300 hover:text-white transition-colors">Support</a>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <Button
                  onClick={() => setLocation(user.role === 'buyer' ? '/buyer' : '/provider')}
                  className="bg-lime-500 hover:bg-lime-600 text-black font-semibold px-6 py-2 rounded-lg transition-all duration-300"
                >
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="border-gray-600 text-white hover:border-lime-500 hover:text-lime-500 px-6 py-2 rounded-lg transition-all duration-300"
                  >
                    Book a Demo
                  </Button>
                  <Button
                    onClick={() => setLocation('/auth')}
                    className="bg-lime-500 hover:bg-lime-600 text-black font-semibold px-6 py-2 rounded-lg transition-all duration-300"
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Go Beyond Traditional
            <span className="block bg-gradient-to-r from-lime-500 to-lime-400 bg-clip-text text-transparent">
              Social Media Growth
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            The SocialMarketplace platform connects buyers and providers for authentic social media engagement. 
            Get real followers, likes, and views from genuine users.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={handleGetStarted}
              className="bg-lime-500 hover:bg-lime-600 text-black font-semibold px-8 py-4 rounded-lg text-lg transition-all duration-300 shadow-lg hover:shadow-lime-500/25"
            >
              Try SocialMarketplace Now
            </Button>
            <a href="#learn-more" className="text-lime-500 hover:text-lime-400 underline text-lg transition-colors">
              Learn More
            </a>
          </div>
        </div>
        
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-lime-500/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl"></div>
        </div>

        {/* Code Editor Mockup */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="text-sm text-gray-300 font-mono">
              <div className="flex">
                <div className="w-16 text-gray-500 mr-4">
                  <div>1</div>
                  <div>2</div>
                  <div>3</div>
                  <div>4</div>
                  <div>5</div>
                </div>
                <div className="flex-1">
                  <div><span className="text-blue-400">const</span> <span className="text-green-400">socialGrowth</span> = {`{`}</div>
                  <div className="ml-4"><span className="text-yellow-400">platform</span>: <span className="text-orange-400">'instagram'</span>,</div>
                  <div className="ml-4"><span className="text-yellow-400">service</span>: <span className="text-orange-400">'followers'</span>,</div>
                  <div className="ml-4"><span className="text-yellow-400">quantity</span>: <span className="text-purple-400">1000</span>,</div>
                  <div className="ml-4"><span className="text-yellow-400">authentic</span>: <span className="text-green-400">true</span></div>
                  <div>{`}`};</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-lime-500 to-lime-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <i className={`${feature.icon} text-2xl text-white`}></i>
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Abstract Visual Element */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-12 border border-gray-700">
            <div className="absolute inset-0 bg-gradient-to-r from-lime-500/5 to-blue-500/5 rounded-2xl"></div>
            <h2 className="text-3xl font-bold text-white mb-6">
              Verify engagement requests before they leave the device
            </h2>
            <p className="text-gray-300 mb-8">
              Our platform ensures all social media interactions are genuine and comply with platform guidelines
            </p>
            <Button className="bg-lime-500 hover:bg-lime-600 text-black font-semibold px-6 py-3 rounded-lg transition-all duration-300">
              Learn More
            </Button>
          </div>
        </div>
        
        {/* Abstract Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-lime-500/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Platform Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              The SocialMarketplace Platform
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Connect with real users to grow your social media presence across all major platforms
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-3xl font-bold text-white mb-6">
                Social media growth built for the modern creator
              </h3>
              <p className="text-gray-300 mb-8 text-lg">
                Whether you're an influencer, business, or content creator, our platform provides authentic 
                engagement that helps you grow your audience organically.
              </p>
              <Button className="bg-lime-500 hover:bg-lime-600 text-black font-semibold px-6 py-3 rounded-lg transition-all duration-300 mb-6">
                Learn More
              </Button>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-300">
                  <i className="fas fa-check text-lime-500 mr-3"></i>
                  Authentic user engagement
                </li>
                <li className="flex items-center text-gray-300">
                  <i className="fas fa-check text-lime-500 mr-3"></i>
                  Multi-platform support
                </li>
                <li className="flex items-center text-gray-300">
                  <i className="fas fa-check text-lime-500 mr-3"></i>
                  Secure payment processing
                </li>
                <li className="flex items-center text-gray-300">
                  <i className="fas fa-check text-lime-500 mr-3"></i>
                  24/7 customer support
                </li>
              </ul>
            </div>
            <div className="bg-gray-900 border border-lime-500 rounded-xl p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center">
                    <i className="fab fa-instagram text-pink-500 mr-3"></i>
                    <span className="text-white">Instagram Followers</span>
                  </div>
                  <span className="text-lime-500 font-semibold">1,000</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center">
                    <i className="fab fa-youtube text-red-500 mr-3"></i>
                    <span className="text-white">YouTube Views</span>
                  </div>
                  <span className="text-lime-500 font-semibold">5,000</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center">
                    <i className="fab fa-twitter text-blue-500 mr-3"></i>
                    <span className="text-white">Twitter Followers</span>
                  </div>
                  <span className="text-lime-500 font-semibold">500</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Secure social media access from anywhere
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Access our comprehensive suite of social media services with enterprise-grade security
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="bg-gray-900 border border-purple-500 rounded-xl p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white">Network Access</span>
                  <div className="w-12 h-6 bg-lime-500 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">DNS Filtering</span>
                  <div className="w-12 h-6 bg-lime-500 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Content Moderation</span>
                  <div className="w-12 h-6 bg-gray-600 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-white mb-6">
                Enterprise-grade security for your social media growth
              </h3>
              <p className="text-gray-300 mb-8 text-lg">
                Our platform ensures all interactions are secure, compliant, and authentic. 
                We use advanced encryption and verification systems to protect your data.
              </p>
              <Button className="bg-lime-500 hover:bg-lime-600 text-black font-semibold px-6 py-3 rounded-lg transition-all duration-300 mb-6">
                Learn More
              </Button>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-300">
                  <i className="fas fa-check text-lime-500 mr-3"></i>
                  End-to-end encryption
                </li>
                <li className="flex items-center text-gray-300">
                  <i className="fas fa-check text-lime-500 mr-3"></i>
                  GDPR compliance
                </li>
                <li className="flex items-center text-gray-300">
                  <i className="fas fa-check text-lime-500 mr-3"></i>
                  Real-time monitoring
                </li>
                <li className="flex items-center text-gray-300">
                  <i className="fas fa-check text-lime-500 mr-3"></i>
                  Fraud detection
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-16">
            Powerful social media growth deployed in minutes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl font-bold text-lime-500 mb-4">{stat.number}</div>
                <div className="text-xl font-semibold text-white mb-2">{stat.label}</div>
                <div className="text-gray-300">{stat.description}</div>
                <Button className="mt-6 bg-transparent border border-lime-500 text-lime-500 hover:bg-lime-500 hover:text-black font-semibold px-6 py-2 rounded-lg transition-all duration-300">
                  Learn More
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              We've helped thousands of creators grow their social media presence
            </h2>
            <Button className="bg-lime-500 hover:bg-lime-600 text-black font-semibold px-6 py-3 rounded-lg transition-all duration-300">
              Read Customer Stories
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="bg-black/80 border-gray-800 hover:border-lime-500/30 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <i className={`${service.icon} text-3xl`}></i>
                    <span className="text-2xl font-bold text-lime-500">{service.price} KES</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{service.name}</h3>
                  <p className="text-gray-300 mb-4">{service.description}</p>
                  <Button 
                    onClick={handleGetStarted}
                    className="w-full bg-lime-500 hover:bg-lime-600 text-black font-semibold py-2 rounded-lg transition-all duration-300"
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            The social media growth platform your audience will love.
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of creators who trust SocialMarketplace for authentic social media growth
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleGetStarted}
              className="bg-lime-500 hover:bg-lime-600 text-black font-semibold px-8 py-4 rounded-lg text-lg transition-all duration-300"
            >
              Try SocialMarketplace Now
            </Button>
            <Button
              variant="outline"
              className="border-gray-600 text-white hover:border-lime-500 hover:text-lime-500 px-8 py-4 rounded-lg text-lg transition-all duration-300"
            >
              Book a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Solutions</h3>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">For Creators</a></li>
                <li><a href="#" className="hover:text-white transition-colors">For Businesses</a></li>
                <li><a href="#" className="hover:text-white transition-colors">For Agencies</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <h3 className="text-white font-bold">SocialMarketplace</h3>
              <span className="text-gray-400">© 2024 All rights reserved.</span>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className="fab fa-linkedin text-xl"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className="fab fa-github text-xl"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className="fab fa-youtube text-xl"></i>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
