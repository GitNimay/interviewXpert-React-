import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, FileText, Mic, CheckCircle } from 'lucide-react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

// --- Components ---

// Magnet Button UI Component
const MagnetButton: React.FC<{ children: React.ReactNode; variant?: 'primary' | 'secondary'; className?: string }> = ({ children, variant = 'primary', className = '' }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`rounded-full font-medium transition-colors ${
        variant === 'primary' 
          ? 'bg-blue-600 text-white hover:bg-blue-700' 
          : 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
      } ${className}`}
    >
      {children}
    </motion.button>
  );
};

const NeuralBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
    const particleCount = Math.min(Math.floor(width / 15), 80); 
    const connectionDistance = 150;
    const mouseDistance = 200;

    let mouse = { x: -1000, y: -1000 };

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < mouseDistance) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (mouseDistance - distance) / mouseDistance;
          p.vx += forceDirectionX * force * 0.05;
          p.vy += forceDirectionY * force * 0.05;
        }
        
        p.vx *= 0.99;
        p.vy *= 0.99;
        
        if (Math.abs(p.vx) < 0.1) p.vx += (Math.random() - 0.5) * 0.01;
        if (Math.abs(p.vy) < 0.1) p.vy += (Math.random() - 0.5) * 0.01;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(148, 163, 184, ${0.15 * (1 - distance / connectionDistance)})`;
            ctx.lineWidth = 1;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
        
        const dx = particles[i].x - mouse.x;
        const dy = particles[i].y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < connectionDistance) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.3 * (1 - distance / connectionDistance)})`;
            ctx.lineWidth = 1;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
        }
      }

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.width = canvasRef.current.offsetWidth;
        height = canvasRef.current.height = canvasRef.current.offsetHeight;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (canvasRef.current && e.touches.length > 0) {
        const rect = canvasRef.current.getBoundingClientRect();
        mouse.x = e.touches[0].clientX - rect.left;
        mouse.y = e.touches[0].clientY - rect.top;
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/20 dark:bg-purple-600/10 rounded-full blur-3xl animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-blue-200/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-pink-200/20 dark:bg-pink-600/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
    </div>
  );
};

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const { theme, toggleTheme, isDark } = useTheme();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "How it Works", href: "#process" },
    { name: "Pricing", href: "#pricing" },
    { name: "FAQ", href: "#faq" },
  ];

  return (
    <>
      <motion.nav
        className={`fixed top-0 inset-x-0 z-navbar flex justify-center pt-4 md:pt-6 px-4 transition-all duration-300`}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div
          className={`
            relative flex items-center justify-between px-6 py-3 rounded-full transition-all duration-300 border
            ${isScrolled
              ? isDark
                ? 'w-full max-w-4xl bg-black/80 backdrop-blur-md border-white/10 shadow-2xl shadow-indigo-500/10'
                : 'w-full max-w-4xl bg-white/80 backdrop-blur-md border-slate-200 shadow-xl shadow-slate-200/50'
              : 'w-full max-w-7xl bg-transparent border-transparent'
            }
          `}
        >
          {/* Logo */}
          <a href="#" className={`flex items-center gap-2 font-display font-bold text-xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <img src="https://i.ibb.co/3y9DKsB6/Yellow-and-Black-Illustrative-Education-Logo-1.png" alt="InterviewXpert Logo" className="w-8 h-8 rounded-lg object-cover" />
            <span>InterviewXpert</span>
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={`text-sm font-medium transition-colors ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all duration-300 ${isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              aria-label="Toggle theme"
            >
              <motion.div
                initial={false}
                animate={{ rotate: isDark ? 0 : 180, scale: [1, 0.8, 1] }}
                transition={{ duration: 0.3 }}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </motion.div>
            </button>
            <Link to="/auth" className={`text-sm font-medium ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Log in</Link>
            <Link to="/auth">
              <MagnetButton variant="primary" className="!px-4 !py-2 !text-sm">
                Get Started
              </MagnetButton>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all duration-300 ${isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className={`p-1 ${isDark ? 'text-white' : 'text-slate-900'}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed inset-0 z-40 pt-24 px-6 md:hidden ${isDark ? 'bg-slate-950/95' : 'bg-white/95 backdrop-blur-md'}`}
        >
          <div className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-2xl font-display font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
              >
                {link.name}
              </a>
            ))}
            <div className={`h-px my-4 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <Link to="/auth" className={`text-xl font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Log in</Link>
            <Link to="/auth">
              <MagnetButton variant="primary" className="w-full justify-center py-3">
                Get Started
              </MagnetButton>
            </Link>
          </div>
        </motion.div>
      )}
    </>
  );
};

const DynamicIslandHero = () => {
  const [index, setIndex] = useState(0);
  const messages = [
    { text: "AI Resume Analysis", icon: FileText, width: 200 },
    { text: "Mock Interview Ready", icon: Mic, width: 220 },
    { text: "Hired at Google", icon: CheckCircle, width: 180 }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-center mb-6 md:mb-10 h-12 items-center">
      <motion.div 
        className="bg-slate-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-slate-900 shadow-2xl relative overflow-hidden"
        animate={{ width: messages[index].width }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ height: 44 }}
      >
        <AnimatePresence mode='wait'>
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2.5 px-4 absolute"
          >
             {React.createElement(messages[index].icon, { size: 16, className: "text-blue-400 dark:text-blue-600" })}
             <span className="text-sm font-semibold whitespace-nowrap">{messages[index].text}</span>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const Hero: React.FC = () => (
  <div className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
      <div className="text-center max-w-4xl mx-auto">
        <DynamicIslandHero />
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6 md:mb-8 leading-tight">
          Master Your Next <br className="hidden sm:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-600 to-primary bg-300% animate-pulse">Interview with AI</span>
        </h1>
        <p className="mt-4 text-lg sm:text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-8 md:mb-12 max-w-3xl mx-auto leading-relaxed">
          From building a perfect resume to mastering the interview. <br className="hidden md:block"/>
          Our fully automated AI platform prepares you for your dream job.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 sm:px-0">
          <Link to="/auth" className="px-8 py-4 bg-primary text-white rounded-full font-bold text-lg hover:bg-primary-dark transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 flex items-center justify-center gap-2">
            <i className="fa-solid fa-rocket"></i> Start Practicing Free
          </Link>
          <Link to="/auth" className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-full font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:shadow-lg hover:-translate-y-1 flex items-center justify-center gap-2">
            <i className="fa-solid fa-chart-line"></i> View Demo
          </Link>
        </div>
        
        <div className="mt-12 md:mt-16 pt-8 border-t border-slate-200/60 dark:border-slate-700/60">
            <p className="text-sm text-slate-400 font-medium mb-6 uppercase tracking-widest">Trusted by candidates applying to</p>
            <div className="flex flex-wrap justify-center gap-6 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500 dark:brightness-200 dark:contrast-100">
              <i className="fab fa-google text-3xl hover:text-[#4285F4] transition-colors cursor-pointer"></i>
              <i className="fab fa-microsoft text-3xl hover:text-[#00a4ef] transition-colors cursor-pointer"></i>
              <i className="fab fa-amazon text-3xl hover:text-[#FF9900] transition-colors cursor-pointer"></i>
              <i className="fab fa-meta text-3xl hover:text-[#0668E1] transition-colors cursor-pointer"></i>
              <i className="fab fa-apple text-3xl hover:text-[#000000] transition-colors cursor-pointer"></i>
            </div>
        </div>
      </div>
    </div>
  </div>
);

const WhoItsFor: React.FC = () => (
  <section className="py-16 md:py-24">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Who is InterviewXpert for?</h2>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">Tailored solutions for every stage of your career journey.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="p-8 rounded-2xl bg-slate-50 dark:bg-black/80 backdrop-blur-sm border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 transition-all hover:shadow-lg">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 text-xl mb-6"><i className="fas fa-user-graduate"></i></div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Students & Grads</h3>
          <p className="text-slate-600 dark:text-slate-400">Land your first internship or full-time role with resume optimization and basic interview prep.</p>
        </div>
        <div className="p-8 rounded-2xl bg-slate-50 dark:bg-black/80 backdrop-blur-sm border border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-900 transition-all hover:shadow-lg">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 text-xl mb-6"><i className="fas fa-briefcase"></i></div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Professionals</h3>
          <p className="text-slate-600 dark:text-slate-400">Level up your career. Practice advanced behavioral questions and system design scenarios.</p>
        </div>
        <div className="p-8 rounded-2xl bg-slate-50 dark:bg-black/80 backdrop-blur-sm border border-slate-100 dark:border-slate-800 hover:border-orange-200 dark:hover:border-orange-900 transition-all hover:shadow-lg">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 text-xl mb-6"><i className="fas fa-random"></i></div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Career Switchers</h3>
          <p className="text-slate-600 dark:text-slate-400">Transition smoothly into tech or management with role-specific guidance and skill gap analysis.</p>
        </div>
      </div>
    </div>
  </section>
);

const Features: React.FC = () => (
  <section id="features" className="py-16 md:py-24 relative">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-20">
        <h2 className="text-primary font-bold tracking-wide uppercase text-sm mb-2">All-in-One Platform</h2>
        <p className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
          Complete Career Acceleration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Feature 1 */}
          <div className="group relative bg-white dark:bg-black/80 backdrop-blur-sm rounded-3xl p-8 hover:bg-blue-600 dark:hover:bg-blue-700 transition-all duration-300 hover:-translate-y-2 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl text-blue-600 dark:text-blue-400 mb-6 shadow-sm group-hover:scale-110 transition-transform group-hover:bg-white dark:group-hover:bg-slate-900">
                <i className="fa-solid fa-file-pen"></i>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 group-hover:text-white">AI Resume Builder</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed group-hover:text-blue-100">
                Create professional, ATS-friendly resumes in minutes. Choose from modern templates and let AI suggest improvements.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group relative bg-white dark:bg-black/80 backdrop-blur-sm rounded-3xl p-8 hover:bg-purple-600 dark:hover:bg-purple-700 transition-all duration-300 hover:-translate-y-2 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-16 h-16 bg-purple-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl text-purple-600 dark:text-purple-400 mb-6 shadow-sm group-hover:scale-110 transition-transform group-hover:bg-white dark:group-hover:bg-slate-900">
                <i className="fa-solid fa-magnifying-glass-chart"></i>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 group-hover:text-white">Smart Resume Analysis</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed group-hover:text-purple-100">
                Get instant feedback on your resume. Our AI scores your resume against job descriptions and highlights missing keywords.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group relative bg-white dark:bg-black/80 backdrop-blur-sm rounded-3xl p-8 hover:bg-orange-500 dark:hover:bg-orange-600 transition-all duration-300 hover:-translate-y-2 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-16 h-16 bg-orange-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl text-orange-500 dark:text-orange-400 mb-6 shadow-sm group-hover:scale-110 transition-transform group-hover:bg-white dark:group-hover:bg-slate-900">
                <i className="fa-solid fa-video"></i>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 group-hover:text-white">AI Mock Interviews</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed group-hover:text-orange-100">
                Practice with a fully automated AI interviewer that adapts to your responses and provides real-time performance metrics.
            </p>
          </div>
      </div>
    </div>
  </section>
);

const HowItWorks: React.FC = () => (
  <section id="process" className="py-16 md:py-24 overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <div className="w-full md:w-1/2">
            <h2 className="text-4xl font-bold mb-6 text-slate-900 dark:text-white">Your Path to Success</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-8">
                Stop guessing and start preparing with data-driven insights. Our platform guides you through every step of the recruitment process.
            </p>
            
            <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl border border-blue-200 dark:border-blue-800">1</div>
                  <div>
                      <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Build & Optimize</h4>
                      <p className="text-slate-600 dark:text-slate-400">Create a standout resume using our builder and check its ATS score.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xl border border-purple-200 dark:border-purple-800">2</div>
                  <div>
                      <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Practice Interviews</h4>
                      <p className="text-slate-600 dark:text-slate-400">Take role-specific AI interviews with real-time voice and video analysis.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-xl border border-green-200 dark:border-green-800">3</div>
                  <div>
                      <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Get Hired</h4>
                      <p className="text-slate-600 dark:text-slate-400">Apply to top jobs with confidence and track your application status.</p>
                  </div>
                </div>
            </div>
          </div>
          <div className="w-full md:w-1/2 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-2xl opacity-10 animate-pulse"></div>
            <div className="relative bg-white dark:bg-black/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-2xl">
                {/* Mock UI Element */}
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="text-slate-400 text-xs">AI Analysis Report</div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-300">Overall Score</span>
                      <span className="text-green-600 dark:text-green-400 font-bold text-xl">92/100</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '92%'}}></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Communication</div>
                        <div className="text-blue-600 dark:text-blue-400 font-bold">Excellent</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Technical</div>
                        <div className="text-purple-600 dark:text-purple-400 font-bold">Strong</div>
                      </div>
                  </div>
                </div>
            </div>
          </div>
      </div>
    </div>
  </section>
);

const LiveDemo: React.FC = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startSimulation = async () => {
    try {
      // Request permission immediately on user click to satisfy browser security policies
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      
      setIsSimulating(true);
      
      // Wait for state update to render video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera error", err);
      let msg = "Could not access camera. Please allow permissions to try the simulation.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Camera permission denied. Please allow access in your browser settings (usually icon in address bar).";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = "No camera found on this device.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = "Camera is currently in use by another application.";
      }

      alert(msg);
      setIsSimulating(false);
    }
  };

  const stopSimulation = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsSimulating(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">See it in Action</h2>
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-black aspect-video flex items-center justify-center max-w-4xl mx-auto">
            {!isSimulating ? (
                <div className="text-center bg-white dark:bg-black/80 backdrop-blur-sm w-full h-full flex flex-col items-center justify-center">
                    <i className="fas fa-laptop-code text-6xl text-slate-300 dark:text-slate-700 mb-4"></i>
                    <p className="text-slate-400 dark:text-slate-500 font-medium">Interactive Dashboard Preview</p>
                    <button onClick={startSimulation} className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition shadow-lg hover:shadow-blue-500/30 hover:-translate-y-1">
                        <i className="fas fa-camera"></i> Try AI Simulation
                    </button>
                </div>
            ) : (
                <div className="relative w-full h-full bg-black">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1] opacity-90"></video>
                    
                    {/* Scan Line */}
                    <motion.div 
                      initial={{ top: "0%" }}
                      animate={{ top: "100%" }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.6)] z-10"
                    />

                    {/* Analysis Overlay */}
                    <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-black/60 backdrop-blur-md text-white p-3 sm:p-4 rounded-xl text-left text-[10px] sm:text-xs font-mono border border-white/10 z-20 w-40 sm:w-48">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <span className="font-bold text-red-400">LIVE ANALYSIS</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between"><span className="text-slate-400">Eye Contact</span><span className="text-green-400 font-bold">94%</span></div>
                            <div className="w-full bg-white/10 rounded-full h-1"><div className="bg-green-500 h-1 rounded-full" style={{width: '94%'}}></div></div>
                            <div className="flex justify-between mt-2"><span className="text-slate-400">Posture</span><span className="text-blue-400 font-bold">Stable</span></div>
                            <div className="flex justify-between mt-2"><span className="text-slate-400">Confidence</span><span className="text-yellow-400 font-bold">High</span></div>
                        </div>
                    </div>

                    {/* Face Tracking Box */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 border border-blue-500/30 rounded-2xl z-10">
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-blue-500"></div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-blue-500"></div>
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-blue-500"></div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-blue-500"></div>
                    </div>

                    <button onClick={stopSimulation} className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-2 bg-red-600/90 hover:bg-red-600 text-white rounded-full text-sm font-bold transition backdrop-blur-sm z-30 flex items-center gap-2">
                        <i className="fas fa-stop-circle"></i> Stop Simulation
                    </button>
                </div>
            )}
      </div>
      </div>
    </section>
  );
};

const Pricing: React.FC = () => (
  <section id="pricing" className="py-16 md:py-24">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Simple, Transparent Pricing</h2>
        <p className="mt-4 text-slate-600 dark:text-slate-400">Start for free, upgrade for more power.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
        {/* Free Plan */}
        <div className="bg-slate-50 dark:bg-black/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Starter</h3>
          <div className="my-4"><span className="text-4xl font-bold text-slate-900 dark:text-white">₹0</span><span className="text-slate-500 dark:text-slate-400">/mo</span></div>
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400 mb-8">
            <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> 1 AI Interview / month</li>
            <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Basic Resume Analysis</li>
            <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Job Board Access</li>
          </ul>
          <Link to="/auth" className="block w-full py-3 text-center border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 rounded-xl font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">Sign Up Free</Link>
        </div>
        {/* Pro Plan */}
        <div className="bg-white dark:bg-black/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border-2 border-blue-600 relative transform md:-translate-y-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase">Most Popular</div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Pro</h3>
          <div className="my-4"><span className="text-4xl font-bold text-slate-900 dark:text-white">₹1499</span><span className="text-slate-500 dark:text-slate-400">/mo</span></div>
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300 mb-8">
            <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Unlimited Interviews</li>
            <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Advanced Resume Builder</li>
            <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Detailed AI Feedback</li>
            <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Priority Support</li>
          </ul>
          <Link to="/auth" className="block w-full py-3 text-center bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">Get Started</Link>
        </div>
        {/* Enterprise Plan */}
        <div className="bg-slate-50 dark:bg-black/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Enterprise</h3>
          <div className="my-4"><span className="text-4xl font-bold text-slate-900 dark:text-white">Custom</span></div>
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400 mb-8">
            <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> For Recruitment Teams</li>
            <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Custom Job Roles</li>
            <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> API Access</li>
          </ul>
          <a href="mailto:sales@interviewxpert.com" className="block w-full py-3 text-center border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition">Contact Sales</a>
        </div>
      </div>
    </div>
  </section>
);

const FAQ: React.FC<{ openFaq: number | null, toggleFaq: (i: number) => void }> = ({ openFaq, toggleFaq }) => (
  <section id="faq" className="py-16 md:py-24">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {[
          { q: "Is the AI interview realistic?", a: "Yes, our AI adapts to your responses and asks follow-up questions just like a real interviewer." },
          { q: "Can I use the resume builder for free?", a: "Yes, the basic resume builder is free to use. Advanced templates require a Pro subscription." },
          { q: "How is the score calculated?", a: "We use a weighted average of your technical accuracy, communication clarity, and resume match score." }
        ].map((item, idx) => (
          <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-black/80 backdrop-blur-sm">
            <button 
              onClick={() => toggleFaq(idx)}
              className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <span className="font-semibold text-slate-900 dark:text-white">{item.q}</span>
              <i className={`fas fa-chevron-down transition-transform ${openFaq === idx ? 'rotate-180' : ''} text-slate-500 dark:text-slate-400`}></i>
            </button>
            {openFaq === idx && (
              <div className="p-4 bg-white dark:bg-black/80 backdrop-blur-sm text-slate-600 dark:text-slate-400 text-sm border-t border-slate-200 dark:border-slate-800">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
);

const FinalCTA: React.FC = () => (
  <section className="py-16 md:py-24 text-center">
    <div className="max-w-4xl mx-auto px-4">
      <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-900 dark:text-white">Ready to Land Your Dream Job?</h2>
      <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl mb-10">Join thousands of candidates who are mastering their interviews today.</p>
      <Link to="/auth" className="inline-block px-10 py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 transition shadow-lg hover:shadow-xl hover:-translate-y-1">
        Start Your Journey
      </Link>
    </div>
  </section>
);

const Footer: React.FC = () => (
  <footer className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-8 md:py-12 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-6">
        <div className="flex items-center gap-2">
          <img src="https://i.ibb.co/3y9DKsB6/Yellow-and-Black-Illustrative-Education-Logo-1.png" alt="Logo" className="w-12 h-12 rounded-xl" />
          <span className="font-bold text-xl text-slate-900 dark:text-white">InterviewXpert</span>
        </div>
        
        <div className="text-center md:text-right">
          <div className="text-slate-500 dark:text-slate-400 text-sm mb-2 font-medium">
            Developed & Designed by
          </div>
          <div className="flex flex-wrap justify-center md:justify-end items-center gap-x-2 text-sm text-slate-600 dark:text-slate-300">
            {/* Aaradhya Pathak with Hover Effect */}
            <div className="relative group inline-block cursor-pointer">
              <span className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors border-b border-dashed border-blue-400/50 pb-0.5">Aaradhya Pathak</span>
              
              {/* Hover Card */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 bg-white dark:bg-black/80 backdrop-blur-sm text-slate-900 dark:text-white p-5 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 transform group-hover:-translate-y-2 border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <div className="absolute inset-0 bg-primary rounded-full blur opacity-40"></div>
                    <img 
                      src="https://i.ibb.co/hxk52kkC/Whats-App-Image-2025-03-21-at-20-13-16.jpg" 
                      alt="Aaradhya Pathak" 
                      className="relative w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-lg"
                    />
                  </div>
                  <h4 className="font-bold text-lg text-slate-900 dark:text-white">Aaradhya Pathak</h4>
                  <div className="text-xs font-bold text-primary bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full mb-3 mt-1">Full Stack Developer</div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 text-justify mb-4">
                    Passionate and driven Full Stack Web Developer proficient in the MERN (MongoDB, Express.js, React.js, Node.js) stack and possessing a strong foundation in Data Structures and Algorithms (DSA) using Java. With a Bachelor's degree in Engineering and experience in developing diverse projects, including robust web applications and AI-driven platforms, I bring a keen understanding of web development principles and proven problem-solving abilities.
                  </p>
                  <a href="https://portfolioaaradhya.netlify.app/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold px-5 py-2 rounded-full hover:from-blue-700 hover:to-blue-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                    <i className="fa-solid fa-globe"></i> View Portfolio
                  </a>
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-2 border-8 border-transparent border-t-white dark:border-t-slate-900"></div>
              </div>
            </div>
            <span>,</span>
            <span className="hover:text-slate-900 dark:hover:text-white transition-colors">Nimesh Kulkarni</span>
            <span>,</span>
            <span className="hover:text-slate-900 dark:hover:text-white transition-colors">Bhavesh Patil</span>
            <span>,</span>
            <span className="hover:text-slate-900 dark:hover:text-white transition-colors">Sanika Wadnekar</span>
          </div>
          <div className="text-slate-400 dark:text-slate-600 text-xs mt-4">
            &copy; {new Date().getFullYear()} InterviewXpert. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  </footer>
);

const Home: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <ThemeProvider>
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-500/30 selection:text-blue-900 dark:selection:text-blue-200 transition-colors duration-300">
      <Navbar />
      <main>
        <NeuralBackground />
        <Hero />
        <WhoItsFor />
        <Features />
        <HowItWorks />
        <LiveDemo />
        <Pricing />
        <FAQ openFaq={openFaq} toggleFaq={toggleFaq} />
        <FinalCTA />
      </main>
      <Footer />
    </div>
    </ThemeProvider>
  );
};

export default Home;
