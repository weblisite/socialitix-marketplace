import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { supabase, createUserProfile } from '@/lib/supabase';

export default function ModernLanding() {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authOpen, setAuthOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'buyer' as 'buyer' | 'provider'
  });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Redirect logged-in users to their dashboard - only if we have user data
  useEffect(() => {
    if (user) {
      const userRole = user.role || 'buyer';
      setLocation(`/${userRole}`);
    }
  }, [user, setLocation]);

  // Authentication mutations
  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // First, sign up with Supabase Auth
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role,
          }
        }
      });
      if (error) throw error;
      
      // Then, create user profile in our database
      if (authData.user) {
        await createUserProfile({
          email: data.email,
          name: data.name,
          role: data.role,
        });
      }
      
      return authData;
    },
    onSuccess: (data) => {
      if (data.user) {
        setAuthOpen(false);
        toast({
          title: 'Account Created Successfully!',
          description: 'Please sign in with your new account to continue.'
        });
        // Switch to login mode for the user to sign in
        setAuthMode('login');
        setFormData(prev => ({ 
          ...prev, 
          email: formData.email, 
          password: '',
          name: '',
          role: formData.role 
        }));
        // Reopen the modal in login mode
        setTimeout(() => setAuthOpen(true), 500);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (data: Pick<typeof formData, 'email' | 'password'>) => {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      return authData;
    },
    onSuccess: async (data) => {
      if (data.user) {
        try {
          // Fetch user profile to get the correct role
          const response = await fetch(`http://localhost:5000/api/user/profile`, {
            headers: {
              'Authorization': `Bearer ${data.session?.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const userProfile = await response.json();
            const userRole = userProfile.role || data.user.user_metadata?.role || 'buyer';
            const userName = userProfile.name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User';
            
            login(data.user.email!, userName);
            setAuthOpen(false);
            toast({
              title: 'Welcome back!',
              description: `Successfully signed in to your ${userRole} account.`
            });
            setLocation(`/${userRole}`);
          } else {
            // Fallback to metadata if profile fetch fails
            const userRole = data.user.user_metadata?.role || 'buyer';
            const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User';
            
            login(data.user.email!, userName);
            setAuthOpen(false);
            toast({
              title: 'Welcome back!',
              description: `Successfully signed in to your ${userRole} account.`
            });
            setLocation(`/${userRole}`);
          }
        } catch (error) {
          // Fallback to metadata if profile fetch fails
          const userRole = data.user.user_metadata?.role || 'buyer';
          const userName = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User';
          
          login(data.user.email!, userName);
          setAuthOpen(false);
          toast({
            title: 'Welcome back!',
            description: `Successfully signed in to your ${userRole} account.`
          });
          setLocation(`/${userRole}`);
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive'
      });
    }
  });

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMode === 'register') {
      if (!formData.name || !formData.email || !formData.password) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }
      registerMutation.mutate(formData);
    } else {
      if (!formData.email || !formData.password) {
        toast({
          title: 'Missing Information',
          description: 'Please enter your email and password',
          variant: 'destructive'
        });
        return;
      }
      loginMutation.mutate({
        email: formData.email,
        password: formData.password
      });
    }
  };

  const openAuthModal = (mode: 'login' | 'register', role: 'buyer' | 'provider' = 'buyer') => {
    setAuthMode(mode);
    setFormData(prev => ({ ...prev, role }));
    setAuthOpen(true);
  };

  const features = [
    {
      icon: 'fas fa-rocket',
      title: 'Instant Growth',
      description: 'Watch your social media presence explode with authentic engagement from real users',
      color: 'from-blue-600 to-purple-600'
    },
    {
      icon: 'fas fa-shield-alt',
      title: '100% Authentic',
      description: 'Every action comes from verified real accounts - no bots, no fake engagement',
      color: 'from-green-600 to-teal-600'
    },
    {
      icon: 'fas fa-clock',
      title: 'Lightning Fast',
      description: 'Start seeing results within minutes of placing your order',
      color: 'from-orange-600 to-red-600'
    },
    {
      icon: 'fas fa-dollar-sign',
      title: 'Earn While You Engage',
      description: 'Make money by providing authentic engagement to other creators',
      color: 'from-purple-600 to-pink-600'
    }
  ];

  const platforms = [
    { name: 'Instagram', icon: 'fab fa-instagram', color: 'text-pink-600', users: '2M+' },
    { name: 'YouTube', icon: 'fab fa-youtube', color: 'text-red-600', users: '1.5M+' },
    { name: 'Twitter', icon: 'fab fa-twitter', color: 'text-blue-500', users: '800K+' },
    { name: 'TikTok', icon: 'fab fa-tiktok', color: 'text-black', users: '1.2M+' }
  ];

  const services = [
    { 
      icon: 'fas fa-user-plus', 
      name: 'Followers', 
      description: 'Get real followers who engage with your content',
      price: '5 KES',
      popular: false
    },
    { 
      icon: 'fas fa-heart', 
      name: 'Likes', 
      description: 'Boost your posts with authentic likes',
      price: '5 KES',
      popular: true
    },
    { 
      icon: 'fas fa-eye', 
      name: 'Views', 
      description: 'Increase your video views organically',
      price: '5 KES',
      popular: false
    },
    { 
      icon: 'fas fa-comments', 
      name: 'Comments', 
      description: 'Get meaningful comments on your posts',
      price: '5 KES',
      popular: false
    },
    { 
      icon: 'fas fa-bell', 
      name: 'Subscribers', 
      description: 'Grow your subscriber base naturally',
      price: '5 KES',
      popular: false
    },
    { 
      icon: 'fas fa-share', 
      name: 'Shares', 
      description: 'Amplify your reach with authentic shares',
      price: '5 KES',
      popular: false
    }
  ];

  const testimonials = [
    {
      name: 'Sarah K.',
      role: 'Content Creator',
      avatar: 'https://ui-avatars.com/api/?name=Sarah+K&background=6366f1&color=fff',
      rating: 5,
      text: 'EngageMarket transformed my Instagram! I went from 500 to 50K followers in just 3 months. The engagement is 100% authentic!'
    },
    {
      name: 'Michael R.',
      role: 'YouTuber',
      avatar: 'https://ui-avatars.com/api/?name=Michael+R&background=ef4444&color=fff',
      rating: 5,
      text: 'As a provider, I\'ve made over $2,000 this month just by engaging with content I actually enjoy. It\'s a win-win!'
    },
    {
      name: 'Jessica L.',
      role: 'Influencer',
      avatar: 'https://ui-avatars.com/api/?name=Jessica+L&background=10b981&color=fff',
      rating: 5,
      text: 'The quality of engagement here is unmatched. Real people, real interactions, real growth. Highly recommended!'
    }
  ];

  const stats = [
    { number: '5M+', label: 'Actions Completed', icon: 'fas fa-tasks' },
    { number: '500K+', label: 'Active Users', icon: 'fas fa-users' },
    { number: '99.9%', label: 'Success Rate', icon: 'fas fa-check-circle' },
    { number: '24/7', label: 'Support Available', icon: 'fas fa-headset' }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-green-900/20"></div>
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at ${50 + scrollY * 0.01}% ${50 + Math.sin(scrollY * 0.001) * 10}%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)`,
          }}
        ></div>
        <div className="absolute inset-0" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
        }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 px-6 py-4 bg-black/50 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <i className="fas fa-rocket text-white text-xl"></i>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              EngageMarket
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
            <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors">Reviews</a>
            <a href="#platforms" className="text-gray-300 hover:text-white transition-colors">Platforms</a>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <Button 
                onClick={() => setLocation(`/${user.role}`)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10"
                  onClick={() => openAuthModal('login')}
                >
                  Sign In
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => openAuthModal('register', 'buyer')}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20 md:py-32">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Badge className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 border-blue-500/50">
              🚀 The Future of Social Media Growth
            </Badge>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
              Skyrocket Your
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Social Media Presence
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
            Connect with <span className="text-blue-400 font-semibold">500,000+ active users</span> who provide 
            <span className="text-purple-400 font-semibold"> authentic engagement</span> across all major social platforms. 
            Start growing today or earn money by engaging with others.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            {user ? (
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4 rounded-xl"
                onClick={() => setLocation(`/${user.role}`)}
              >
                <i className="fas fa-rocket mr-2"></i>
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4 rounded-xl"
                  onClick={() => openAuthModal('register', 'buyer')}
                >
                  <i className="fas fa-rocket mr-2"></i>
                  Start Growing Now
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-4 rounded-xl"
                  onClick={() => openAuthModal('register', 'provider')}
                >
                  <i className="fas fa-money-bill-wave mr-2"></i>
                  Earn Money
                </Button>
              </>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <i className="fas fa-shield-alt text-green-400"></i>
              <span>100% Authentic Users</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fas fa-lock text-blue-400"></i>
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fas fa-clock text-purple-400"></i>
              <span>Instant Results</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fas fa-headset text-orange-400"></i>
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Stats */}
      <section className="relative px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardContent className="p-6 text-center">
                  <i className={`${stat.icon} text-3xl text-blue-400 mb-4`}></i>
                  <div className="text-3xl font-bold text-white mb-2">{stat.number}</div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Features Section */}
      <section id="features" className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Why Choose EngageMarket?
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Experience the most advanced social media growth platform with cutting-edge features designed for maximum results
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {features.map((feature, index) => (
                <Card 
                  key={index}
                  className={`bg-white/5 border-white/10 backdrop-blur-xl transition-all duration-500 cursor-pointer ${
                    activeFeature === index ? 'border-blue-500/50 bg-blue-500/10' : ''
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center`}>
                        <i className={`${feature.icon} text-white text-xl`}></i>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                        <p className="text-gray-300">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-8 backdrop-blur-xl border border-white/10">
                <div className="w-full h-full flex items-center justify-center">
                  <div className={`w-32 h-32 rounded-full bg-gradient-to-r ${features[activeFeature].color} flex items-center justify-center animate-pulse`}>
                    <i className={`${features[activeFeature].icon} text-white text-4xl`}></i>
                  </div>
                </div>
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Platforms */}
      <section id="platforms" className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              All Your Favorite Platforms
            </span>
          </h2>
          <p className="text-xl text-gray-300 mb-16 max-w-3xl mx-auto">
            Grow your presence across every major social media platform with our unified marketplace
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {platforms.map((platform, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 group">
                <CardContent className="p-8 text-center">
                  <i className={`${platform.icon} ${platform.color} text-4xl mb-4 group-hover:scale-110 transition-transform`}></i>
                  <h3 className="text-xl font-bold text-white mb-2">{platform.name}</h3>
                  <p className="text-gray-400">{platform.users} active users</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services & Pricing */}
      <section id="pricing" className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Transparent, Affordable Pricing
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Fixed pricing across all platforms. No hidden fees, no subscriptions - pay only for what you need.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <Card 
                key={index} 
                className={`bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 relative ${
                  service.popular ? 'border-yellow-500/50 bg-yellow-500/10' : ''
                }`}
              >
                {service.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold">
                      MOST POPULAR
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className={`${service.icon} text-white text-2xl`}></i>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{service.name}</h3>
                  <p className="text-gray-300 mb-4 text-sm">{service.description}</p>
                  <div className="text-3xl font-bold text-blue-400 mb-4">{service.price}</div>
                  <p className="text-xs text-gray-400 mb-6">per action</p>
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    onClick={() => openAuthModal('register', 'buyer')}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Earning Opportunity */}
          <Card className="mt-16 bg-gradient-to-r from-green-600/20 to-teal-600/20 border-green-500/30 backdrop-blur-xl">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                <i className="fas fa-coins text-yellow-400 mr-2"></i>
                Want to Earn Money Instead?
              </h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Join as a Provider and earn <span className="text-green-400 font-bold">2 KES per action</span> by providing 
                authentic engagement. With thousands of orders daily, you can earn substantial income!
              </p>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                onClick={() => openAuthModal('register', 'provider')}
              >
                <i className="fas fa-handshake mr-2"></i>
                Become a Provider
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Success Stories
              </span>
            </h2>
            <p className="text-xl text-gray-300">
              See what our community is saying about their growth journey
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <i key={i} className="fas fa-star text-yellow-400"></i>
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6 italic">"{testimonial.text}"</p>
                  <div className="flex items-center">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full mr-4"
                    />
                    <div>
                      <div className="text-white font-semibold">{testimonial.name}</div>
                      <div className="text-gray-400 text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 backdrop-blur-xl">
            <CardContent className="p-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Ready to Transform Your Social Media?
                </span>
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Join hundreds of thousands of creators who have already discovered the power of authentic engagement
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                {user ? (
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4 rounded-xl"
                    onClick={() => setLocation(`/${user.role}`)}
                  >
                    <i className="fas fa-rocket mr-2"></i>
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4 rounded-xl"
                      onClick={() => openAuthModal('register', 'buyer')}
                    >
                      <i className="fas fa-rocket mr-2"></i>
                      Start Growing Today
                    </Button>
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-lg px-8 py-4 rounded-xl"
                      onClick={() => openAuthModal('register', 'provider')}
                    >
                      <i className="fas fa-money-bill-wave mr-2"></i>
                      Start Earning Now
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <i className="fas fa-check text-green-400"></i>
                  <span>No setup fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fas fa-check text-green-400"></i>
                  <span>Instant delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fas fa-check text-green-400"></i>
                  <span>24/7 support</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-6 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-rocket text-white text-xl"></i>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                EngageMarket
              </span>
            </div>
            
            <div className="flex items-center space-x-6 text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-gray-400">
            <p>&copy; 2025 EngageMarket. All rights reserved. Empowering authentic social media growth.</p>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="bg-black/95 border-white/10 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              {authMode === 'register' ? (
                <>
                  <i className="fas fa-rocket text-blue-400 mr-2"></i>
                  Join EngageMarket
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt text-blue-400 mr-2"></i>
                  Welcome Back
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAuthSubmit} className="space-y-6">
            {authMode === 'register' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-white">Account Type</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: 'buyer' | 'provider') => setFormData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buyer">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-shopping-cart text-blue-500"></i>
                          <div>
                            <div className="font-medium">Buyer</div>
                            <div className="text-xs text-gray-500">Buy engagement services</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="provider">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-handshake text-green-500"></i>
                          <div>
                            <div className="font-medium">Provider</div>
                            <div className="text-xs text-gray-500">Earn money providing engagement</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                placeholder="Create a strong password"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg py-3"
              disabled={registerMutation.isPending || loginMutation.isPending}
            >
              {registerMutation.isPending || loginMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Processing...
                </>
              ) : authMode === 'register' ? (
                <>
                  <i className="fas fa-rocket mr-2"></i>
                  Create Account
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Sign In
                </>
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'register' ? 'login' : 'register')}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {authMode === 'register' ? 'Already have an account? Sign in' : "Don't have an account? Join now"}
              </button>
            </div>

            {authMode === 'register' && (
              <div className="text-xs text-gray-400 text-center space-y-2">
                <p>By creating an account, you agree to our Terms of Service and Privacy Policy</p>
                {formData.role === 'provider' && (
                  <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <i className="fas fa-info-circle"></i>
                      <span className="font-medium">Provider Benefits</span>
                    </div>
                    <ul className="text-xs mt-2 space-y-1 text-green-300">
                      <li>• Earn 2 KES per completed action</li>
                      <li>• Flexible work schedule</li>
                      <li>• Instant payment processing</li>
                      <li>• No minimum commitment</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}