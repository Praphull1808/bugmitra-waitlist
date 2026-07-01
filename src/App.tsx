/**
 * src/App.tsx
 *
 * Highly polished, production-ready, dark premium waitlist landing page for BugMitra.
 * Implements client-side logic, real-time validations, custom confetti animation,
 * social media sharing, dynamic statistics, and a secure fully-featured admin dashboard.
 */

import { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  Terminal, 
  ChevronDown, 
  Users, 
  Share2, 
  Copy, 
  Check, 
  Twitter, 
  Linkedin, 
  MessageCircle, 
  AlertCircle, 
  Sparkles, 
  Code, 
  Flame, 
  Award, 
  CheckCircle, 
  BookOpen, 
  Plus, 
  Search, 
  Trash2, 
  Mail, 
  Download, 
  Lock, 
  X, 
  TrendingUp, 
  Calendar 
} from 'lucide-react';
import { trackEvent, initAnalytics } from './lib/analytics';
import { getReferralRewards, getUserBadge } from './lib/referral';
import { WaitlistUser, WaitlistStats } from './types';

// Standard Hinglish questions and answers for FAQ
const FAQS = [
  {
    id: 'faq-1',
    question: 'BugMitra kya hai?',
    answer: 'BugMitra ek developer community hai jahan beginners apne coding errors aur bugs ko Hindi/Hinglish me share kar sakte hain. Aapko yahan instant AI explanations ke sath-sath experienced community members se live support bhi milega.'
  },
  {
    id: 'faq-2',
    question: 'Kya ye service completely free hogi?',
    answer: 'Yes! Community support aur primary feature rooms sabhi ke liye hamesha free rahenge. Waitlist users ke liye special "Beta Member" aur reward badges lifetime access features ko unlock karenge.'
  },
  {
    id: 'faq-3',
    question: 'Kis coding languages me help milegi?',
    answer: 'BugMitra par aap HTML, CSS, JavaScript, Python, C/C++, Java, React, Node.js, and Android development samet lagbhag sabhi major languages aur frameworks ke solutions poochh sakte hain.'
  },
  {
    id: 'faq-4',
    question: 'BugMitra kab launch hoga?',
    answer: 'Hum features ko intensively test kar rahe hain. BugMitra Beta Version Q3 2026 me official launch ke liye scheduled hai. Early access waitlist members ko launch se 1 week pehle private invitation link mil jayega.'
  }
];

export default function App() {
  // Waitlist form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [skillLevel, setSkillLevel] = useState('Beginner');
  const [codingProblem, setCodingProblem] = useState('HTML');
  const [referredBy, setReferredBy] = useState<string | null>(null);

  // Status and responses
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = useState<WaitlistUser | null>(null);
  const [justSignedUp, setJustSignedUp] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Public statistics
  const [stats, setStats] = useState<WaitlistStats>({
    totalUsers: 527,
    todaySignups: 14,
    referralLeaderboard: []
  });

  // Accordion FAQ state
  const [activeFaq, setActiveFaq] = useState<string | null>(null);

  // Admin section states
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<WaitlistUser[]>([]);
  const [adminSearch, setAdminSearch] = useState('');
  
  // Broadcast Email states
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);

  // Confetti canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Initialize Analytics and Fetch stats
  useEffect(() => {
    initAnalytics();

    // Check for referral code in query string
    const params = new URLSearchParams(window.location.search);
    const adminParam = params.get('admin');
    if (adminParam === 'true') {
      setShowAdminModal(true);
    }
    const refCode = params.get('ref') || params.get('referred_by');
    if (refCode) {
      setReferredBy(refCode);
      trackEvent('Referral_Visit', { code: refCode });
    }

    // Check if user is already registered in local session
    const storedUser = localStorage.getItem('bugmitra_waitlist_user');
    if (storedUser) {
      try {
        setRegisteredUser(JSON.parse(storedUser));
      } catch (e) {
        // Reset corrupt local storage
        localStorage.removeItem('bugmitra_waitlist_user');
      }
    }

    fetchStats();
  }, []);

  // Fetch updated stats from server
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn('Fallback to local state statistics.', e);
    }
  };

  // 2. Custom Canvas Confetti Logic
  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 600;
    canvas.height = canvas.parentElement?.clientHeight || 400;

    interface Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }

    const particles: Particle[] = [];
    const colors = ['#3b82f6', '#8b5cf6', '#a78bfa', '#60a5fa', '#f59e0b', '#ec4899'];

    // Generate particles
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2 + 50,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 12,
        speedY: (Math.random() - 0.7) * 15 - 5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 5
      });
    }

    let animationFrameId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let alive = false;
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += 0.35; // Gravity
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height && p.x > 0 && p.x < canvas.width) {
          alive = true;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (alive) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  };

  // Run confetti when waitlist matches signup success
  useEffect(() => {
    if (justSignedUp) {
      const cleanup = triggerConfetti();
      return cleanup;
    }
  }, [justSignedUp]);

  // 3. Handle Waitlist Submission
  const handleJoinWaitlist = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    // Frontend validations
    if (!fullName.trim()) {
      setSubmitError('Naam likhna zaroori hai!');
      setIsSubmitting(false);
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSubmitError('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }

    try {
      trackEvent('Waitlist_Submit_Attempt', { skill: skillLevel, problem: codingProblem });
      
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          skill_level: skillLevel,
          coding_problem: codingProblem,
          referred_by: referredBy
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setRegisteredUser(result.user);
        // Persist in local storage for refresh experience
        localStorage.setItem('bugmitra_waitlist_user', JSON.stringify(result.user));
        
        if (result.isNew) {
          setJustSignedUp(true);
          trackEvent('Waitlist_Signup_Success', { skill: skillLevel, problem: codingProblem });
        } else {
          trackEvent('Waitlist_Existing_Login');
        }

        // Refresh stats
        fetchStats();
      } else {
        setSubmitError(result.message || 'Kuchh gaddbad hui. Please try again.');
        trackEvent('Waitlist_Signup_Failed', { error: result.message });
      }
    } catch (err) {
      setSubmitError('Network failure. Server is disconnected.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Copy referral link
  const getReferralUrl = () => {
    if (!registeredUser) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bugmitra.com';
    return `${origin}/?ref=${registeredUser.referral_code}`;
  };

  const copyReferralLink = () => {
    const link = getReferralUrl();
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    trackEvent('Copy_Referral_Link');
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // 5. Admin authentication
  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);

    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: adminPasscode })
      });

      const data = await res.json();
      if (data.success) {
        setIsAdminLoggedIn(true);
        trackEvent('Admin_Login_Success');
        fetchAdminUsers();
      } else {
        setAdminLoginError('Wrong passcode. Pehle check karein!');
        trackEvent('Admin_Login_Failed');
      }
    } catch (e) {
      setAdminLoginError('Server authentication failed.');
    }
  };

  // Admin Actions: Fetch Users
  const fetchAdminUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'x-admin-passcode': adminPasscode }
      });
      const data = await res.json();
      if (data.success) {
        setAdminUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Admin Actions: Delete User
  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this user?')) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-passcode': adminPasscode }
      });
      const data = await res.json();
      if (data.success) {
        trackEvent('Admin_Delete_User', { id });
        fetchAdminUsers();
        fetchStats();
      }
    } catch (e) {
      alert('Failed to delete user.');
    }
  };

  // Admin Actions: Broadcast Announcement
  const handleBroadcastEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject || !broadcastBody) return;

    setIsBroadcasting(true);
    setBroadcastStatus('Sending emails to everyone on the waitlist...');

    try {
      const res = await fetch('/api/admin/email-all', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-passcode': adminPasscode
        },
        body: JSON.stringify({ subject: broadcastSubject, body: broadcastBody })
      });

      const data = await res.json();
      if (data.success) {
        setBroadcastStatus(`Success: ${data.message}`);
        setBroadcastSubject('');
        setBroadcastBody('');
        trackEvent('Admin_Broadcast_Success');
      } else {
        setBroadcastStatus(`Failed: ${data.message}`);
      }
    } catch (err) {
      setBroadcastStatus('Broadcast failed due to transmission error.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Admin Actions: Export CSV
  const exportUsersCSV = () => {
    if (adminUsers.length === 0) return;

    const headers = ['ID', 'Full Name', 'Email', 'Skill Level', 'Coding Problem', 'Referrals Given', 'Referral Code', 'Referred By', 'Position', 'Joined At'];
    const rows = adminUsers.map(u => [
      u.id,
      `"${u.full_name}"`,
      u.email,
      u.skill_level,
      u.coding_problem,
      u.referral_count,
      u.referral_code,
      u.referred_by || '',
      u.position,
      u.joined_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bugmitra_waitlist_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    trackEvent('Admin_Export_CSV');
  };

  // Social Sharing formulas
  const shareTwitter = () => {
    const text = `Join early access to BugMitra - premium Hinglish Coding Community for beginners! I'm #${registeredUser?.position} on the waitlist. Join using my referral link:`;
    const url = encodeURIComponent(getReferralUrl());
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`, '_blank');
    trackEvent('Social_Share', { network: 'Twitter' });
  };

  const shareWhatsApp = () => {
    const text = `Code Atka? BugMitra se poocho! Join the early access waitlist for BugMitra - India's premium Hinglish developer community. Use my link to join: ${getReferralUrl()}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    trackEvent('Social_Share', { network: 'WhatsApp' });
  };

  const shareLinkedIn = () => {
    const url = encodeURIComponent(getReferralUrl());
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    trackEvent('Social_Share', { network: 'LinkedIn' });
  };

  // Calculate stats and levels
  const rewards = registeredUser ? getReferralRewards(registeredUser.referral_count) : [];
  const currentBadge = registeredUser ? getUserBadge(registeredUser.referral_count) : null;
  const filteredUsers = adminUsers.filter(u => 
    u.full_name.toLowerCase().includes(adminSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(adminSearch.toLowerCase()) ||
    u.referral_code.toLowerCase().includes(adminSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans bg-[#050510] text-white">
      
      {/* Dynamic Background Glowing Accents */}
      <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-[#3b82f6] blur-[80px] opacity-25 pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-[#a855f7] blur-[80px] opacity-25 pointer-events-none z-0" />

      {/* TOP DECORATIVE GRID LINES */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-white/10 bg-white/[0.02] backdrop-blur-md sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <a href="#" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-[#3b82f6] to-[#a855f7] flex items-center justify-center shadow-lg shadow-blue-500/10 transition-transform group-hover:scale-105 duration-300">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold font-display tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                BugMitra
              </span>
              <span className="text-[10px] block font-mono text-white/40 font-medium leading-none">CODE RESOLVED</span>
            </div>
          </a>

          {/* Nav Actions */}
          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline-flex items-center text-xs font-mono px-3 py-1.5 rounded-full bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-[#3b82f6] font-semibold gap-1.5 relative overflow-hidden">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3b82f6] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3b82f6]"></span>
              </span>
              <span>{stats.totalUsers} Developers Joined</span>
            </span>
            <a 
              href="#join-form-section" 
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#3b82f6]/95 hover:to-[#8b5cf6]/95 text-white shadow-lg shadow-blue-500/15 transition-all duration-300 hover:translate-y-[-1px]"
              onClick={() => trackEvent('Navbar_Join_Click')}
            >
              Join Early Access
            </a>
          </div>
        </div>
      </header>

      {/* Hero Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative z-10">
        
        {/* HERO SECTION */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#8b5cf6]/15 text-[#8b5cf6] text-xs font-semibold border border-[#8b5cf6]/30 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fix Bugs. Learn Together.</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold font-display tracking-tight text-white mb-6 leading-tight">
            Code Atka? <br />
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
              BugMitra Se Poochho.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/70 leading-relaxed mb-8 max-w-2xl mx-auto">
            BugMitra is a Hinglish developer community where beginners share coding errors, get AI help, and solve bugs with other coders.
          </p>

          <div className="flex justify-center items-center space-x-8 mb-12">
            <div className="text-center">
              <span className="block text-3xl sm:text-4xl font-extrabold text-white font-mono">
                #{registeredUser ? registeredUser.position : (stats.totalUsers + 284)}
              </span>
              <span className="text-xs text-white/50 font-mono uppercase tracking-wider">Your Position</span>
            </div>
            <div className="w-[1px] h-10 bg-white/10" />
            <div className="text-center">
              <span className="block text-3xl sm:text-4xl font-extrabold text-white font-mono">
                Top 1%
              </span>
              <span className="text-xs text-white/50 font-mono uppercase tracking-wider">Referral Status</span>
            </div>
          </div>
        </div>

        {/* Dynamic State Form Card: Success vs Signup */}
        <div id="join-form-section" className="max-w-xl mx-auto mb-28 scroll-mt-24">
          <div className="relative rounded-[24px] glass glass-glow p-8 shadow-2xl">
            
            {/* Absolute element for confetti canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full rounded-[24px] pointer-events-none z-20" />

            {!registeredUser ? (
              /* SIGNUP FORM */
              <form onSubmit={handleJoinWaitlist} className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight mb-2 flex items-center">
                    <Code className="w-5 h-5 text-[#3b82f6] mr-2" />
                    Join Early Access
                  </h3>
                  <p className="text-sm text-white/60">Be among the first 100 beta users for free access.</p>
                </div>

                {submitError && (
                  <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {referredBy && (
                  <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
                    <Award className="w-4 h-4 shrink-0" />
                    <span>Referred by custom link! Your spot rank multiplier is active.</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5 font-sans font-medium">
                      Full Name
                    </label>
                    <input 
                      type="text" 
                      placeholder="Anurag Singh" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#8b5cf6]/50 text-sm transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5 font-sans font-medium">
                      Email Address
                    </label>
                    <input 
                      type="email" 
                      placeholder="anurag@dev.in" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#8b5cf6]/50 text-sm transition-all"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5 font-sans font-medium">
                        Skill Level
                      </label>
                      <select 
                        value={skillLevel}
                        onChange={(e) => setSkillLevel(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0a0a1a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#8b5cf6]/50 text-sm transition-all"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Student">Student</option>
                        <option value="Freelancer">Freelancer</option>
                        <option value="Developer">Developer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5 font-sans font-medium">
                        Main Language
                      </label>
                      <select 
                        value={codingProblem}
                        onChange={(e) => setCodingProblem(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0a0a1a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#8b5cf6]/50 text-sm transition-all"
                      >
                        <option value="HTML">HTML / CSS</option>
                        <option value="JavaScript">JavaScript</option>
                        <option value="React">ReactJS</option>
                        <option value="Python">Python</option>
                        <option value="Other">Other Issues</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#3b82f6]/90 hover:to-[#8b5cf6]/90 disabled:from-blue-850 disabled:to-purple-850 rounded-lg text-white font-bold tracking-wide flex items-center justify-center space-x-2 transition-all duration-300 transform active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Joining...</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-5 h-5" />
                      <span>Claim Your Spot</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-white/40">Secure signup. No spam, only solutions.</p>
              </form>
            ) : (
              /* SUCCESS / REFERRAL CARD */
              <div className="space-y-6 text-center">
                
                {justSignedUp ? (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-2">
                    <Check className="w-3.5 h-3.5" />
                    <span>Registered Successfully!</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mb-2">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Welcome Back, {registeredUser.full_name}!</span>
                  </div>
                )}

                <div>
                  <h3 className="text-3xl font-extrabold tracking-tight text-white mb-2 font-display">
                    You're on the list! 🎉
                  </h3>
                  <p className="text-sm text-slate-400 px-4">
                    Thank you! You are on the BugMitra early access list. Hum jald hi aapse contact karenge!
                  </p>
                </div>

                {/* Queue Stats Card */}
                <div className="bg-[#0a0a1a]/60 border border-white/10 rounded-xl p-5 grid grid-cols-2 gap-4">
                  <div className="text-center border-r border-white/10">
                    <span className="block text-2xl font-extrabold text-[#3b82f6] font-mono">
                      #{registeredUser.position}
                    </span>
                    <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider">Waitlist Rank</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-2xl font-extrabold text-[#8b5cf6] font-mono">
                      {registeredUser.referral_count}
                    </span>
                    <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider">Referrals Made</span>
                  </div>
                </div>

                {/* Badge showcase if earned */}
                {currentBadge && (
                  <div className={`p-3 rounded-lg flex items-center justify-center space-x-2 text-xs font-bold uppercase tracking-wider ${currentBadge.color}`}>
                    <Award className="w-4 h-4" />
                    <span>Unlocked Badge: {currentBadge.badge}</span>
                  </div>
                )}

                {/* Referral Link Copy Area */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-white/50 font-mono uppercase tracking-wider text-left">
                    Invite friends to skip waitlist positions:
                  </label>
                  <div className="flex bg-[#0a0a1a]/80 border border-white/10 rounded-lg overflow-hidden p-1">
                    <input 
                      type="text" 
                      readOnly 
                      value={getReferralUrl()}
                      className="bg-transparent text-white/80 text-xs px-3 focus:outline-none w-full font-mono overflow-ellipsis"
                    />
                    <button
                      onClick={copyReferralLink}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-md text-white/80 hover:text-white flex items-center space-x-1 hover:bg-white/10 transition-colors text-xs shrink-0"
                    >
                      {copySuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Social sharing grid */}
                <div className="space-y-2">
                  <span className="block text-[10px] text-white/40 font-mono uppercase tracking-wider">Quick Share On:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={shareWhatsApp}
                      className="py-2.5 rounded-lg border border-white/10 bg-[#0a0a1a]/60 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-white/80 hover:text-emerald-400 text-xs font-semibold transition-all duration-200 flex items-center justify-center space-x-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={shareTwitter}
                      className="py-2.5 rounded-lg border border-white/10 bg-[#0a0a1a]/60 hover:bg-blue-500/10 hover:border-blue-500/30 text-white/80 hover:text-blue-400 text-xs font-semibold transition-all duration-200 flex items-center justify-center space-x-1.5"
                    >
                      <Twitter className="w-3.5 h-3.5 text-blue-400" />
                      <span>X / Twitter</span>
                    </button>
                    <button
                      onClick={shareLinkedIn}
                      className="py-2.5 rounded-lg border border-white/10 bg-[#0a0a1a]/60 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-white/80 hover:text-indigo-400 text-xs font-semibold transition-all duration-200 flex items-center justify-center space-x-1.5"
                    >
                      <Linkedin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>LinkedIn</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    localStorage.removeItem('bugmitra_waitlist_user');
                    setRegisteredUser(null);
                    setFullName('');
                    setEmail('');
                    setJustSignedUp(false);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-400 underline transition-colors"
                >
                  Register another email
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 1. SECTION: PROBLEM */}
        <section className="mb-28">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold font-display tracking-tight text-white mb-4">
              Aapko Bhi Coding Doubts Me Ye Problems Aati Hain?
            </h2>
            <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-[#8b5cf6] mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-[24px] glass p-6 flex flex-col justify-between hover:scale-[1.01] hover:bg-white/[0.05] transition-all duration-300">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center font-bold">
                  🧩
                </div>
                <h3 className="text-lg font-bold text-[#3b82f6] tracking-tight">
                  Errors Samajhna Difficult Hai
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  Compiler ya terminal ka stack trace beginners ke liye foreign language jaisa lagta hai. Pata nahi chalta ki error kya bol raha hai.
                </p>
              </div>
              <div className="pt-4 border-t border-white/10 mt-6 text-xs font-mono text-white/40">
                #BeginnerFears
              </div>
            </div>

            <div className="rounded-[24px] glass p-6 flex flex-col justify-between hover:scale-[1.01] hover:bg-white/[0.05] transition-all duration-300">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold">
                  🇬🇧
                </div>
                <h3 className="text-lg font-bold text-[#3b82f6] tracking-tight">
                  English Forums Confusing Hain
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  StackOverflow ya GitHub par high-level discussions aur English terminology beginners ke sir ke upar se nikal jaati hai.
                </p>
              </div>
              <div className="pt-4 border-t border-white/10 mt-6 text-xs font-mono text-white/40">
                #CommunicationGap
              </div>
            </div>

            <div className="rounded-[24px] glass p-6 flex flex-col justify-between hover:scale-[1.01] hover:bg-white/[0.05] transition-all duration-300">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  💬
                </div>
                <h3 className="text-lg font-bold text-[#3b82f6] tracking-tight">
                  Telegram/Discord Noise
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  Standard chat groups me questions aur answers scroll-up ke noise me kho jaate hain. Koi formal archive ya search system nahi hota.
                </p>
              </div>
              <div className="pt-4 border-t border-white/10 mt-6 text-xs font-mono text-white/40">
                #InformationLost
              </div>
            </div>
          </div>
        </section>

        {/* 2. SECTION: SOLUTION */}
        <section className="mb-28">
          <div className="rounded-[24px] glass p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold border border-purple-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>The BugMitra Approach</span>
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white leading-tight">
                  Sahi Explanation, <br />
                  <span className="bg-gradient-to-r from-blue-400 to-[#8b5cf6] bg-clip-text text-transparent">
                    Aapki Apni Bhasha Me.
                  </span>
                </h2>

                <p className="text-white/70 leading-relaxed">
                  BugMitra community me hum standard StackOverflow approach ko replace karte hain friendly local Hinglish and Hindi terms ke sath. Hamara focus complex jargon ko simple and understandable banana hai.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs shrink-0 mt-0.5">✓</div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Hinglish Code Conversations</h4>
                      <p className="text-xs text-white/60">Poochhein waise hi jaise dosto se baat karte hain bina kisi English constraint ke.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs shrink-0 mt-0.5">✓</div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Interactive Error Screenshot Sharing</h4>
                      <p className="text-xs text-white/60">Apne code and screenshot ko ek sath share karein, clean readable design me.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs shrink-0 mt-0.5">✓</div>
                    <div>
                      <h4 className="text-sm font-bold text-white">AI Explainer + Community Review</h4>
                      <p className="text-xs text-white/60">Post karte hi 1st response hamare friendly AI se milega, followed by core developers.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side Screen Mockup Panel */}
              <div className="bg-[#0a0a1a]/80 border border-white/10 rounded-xl p-6 shadow-2xl font-mono text-xs text-slate-300 relative">
                <div className="absolute top-2 left-2 flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <div className="text-white/40 text-center border-b border-white/10 pb-3 mb-4">
                  bugmitra_example.py
                </div>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-red-400">TypeError:</span> can only concatenate str (not "int") to str
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 rounded p-3.5 space-y-2">
                    <div className="text-blue-400 font-bold flex items-center">
                      <Sparkles className="w-3 h-3 mr-1" />
                      BugMitra Assistant (Hinglish):
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      "Aap print statement me string (text) ke sath integer (number) ko directly plus <span className="text-amber-500 font-semibold">(+)</span> sign se jod rahe hain. Python confused hai! 
                      <br /><br />
                      <strong>Solution:</strong> Is number ko <span className="text-emerald-400 font-semibold">str(number)</span> likh kar string me convert kar lijiye!"
                    </p>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 text-[11px] text-blue-400">
                    💡 <strong>Pro Tip:</strong> string + str(10) =&gt; work karega perfectly!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. SECTION: MILESTONE REWARDS */}
        {registeredUser && (
          <section className="mb-28 max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-4">
                <Flame className="w-4 h-4 animate-bounce" />
                <span>Referral Milestones Station</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
                Share More, Climb Faster & Unlock Perks
              </h2>
            </div>

            <div className="space-y-6">
              {rewards.map((rew, i) => (
                <div 
                  key={i} 
                  className={`rounded-[18px] border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-300 ${
                    rew.unlocked 
                      ? 'bg-gradient-to-r from-[#3b82f6]/10 to-[#8b5cf6]/10 border-[#8b5cf6]/40 shadow-lg' 
                      : 'glass rounded-[18px]'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg font-bold ${
                      rew.unlocked ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-white/40 border border-white/10'
                    }`}>
                      {rew.unlocked ? '✓' : rew.countNeeded}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-white text-base">{rew.tier}</h4>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono ${
                          rew.unlocked ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-white/5 text-white/40 border border-white/10'
                        }`}>
                          {rew.badge}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 mt-1 max-w-md">{rew.perks}</p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="block text-xs text-white/40 font-mono">Needed</span>
                    <strong className="block text-base text-[#3b82f6] font-mono">
                      {Math.max(0, rew.countNeeded - registeredUser.referral_count)} referrals left
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. SECTION: FEATURES COMING SOON */}
        <section className="mb-28">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold font-display tracking-tight text-white mb-4">
              BugMitra Features - Coming Soon
            </h2>
            <p className="text-sm text-white/60">Hum ek solid interactive application taiyyar kar rahe hain aap sabhi ke liye.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border border-white/10 glass rounded-[24px] p-5 hover:border-white/20 hover:scale-[1.02] hover:bg-white/[0.05] transition-all duration-300">
              <span className="text-2xl block mb-3">📸</span>
              <h4 className="text-sm font-bold text-white mb-1.5">Error Post with Screenshot</h4>
              <p className="text-xs text-white/60 leading-relaxed">Apne compiler codes aur image screenshots ko ek hi click me direct paste karke posts banayein.</p>
            </div>

            <div className="border border-white/10 glass rounded-[24px] p-5 hover:border-white/20 hover:scale-[1.02] hover:bg-white/[0.05] transition-all duration-300">
              <span className="text-2xl block mb-3">🤖</span>
              <h4 className="text-sm font-bold text-white mb-1.5">AI First Reply</h4>
              <p className="text-xs text-white/60 leading-relaxed">Koi bhi error post hote hi hamara smart assistant use read karke 10 seconds me simplified solution suggest karega.</p>
            </div>

            <div className="border border-white/10 glass rounded-[24px] p-5 hover:border-white/20 hover:scale-[1.02] hover:bg-white/[0.05] transition-all duration-300">
              <span className="text-2xl block mb-3">💬</span>
              <h4 className="text-sm font-bold text-white mb-1.5">Topic-wise Chatrooms</h4>
              <p className="text-xs text-white/60 leading-relaxed">Python, JavaScript, ReactJS aur Java development ke alag alag active rooms jahan developers connect honge.</p>
            </div>

            <div className="border border-white/10 glass rounded-[24px] p-5 hover:border-white/20 hover:scale-[1.02] hover:bg-white/[0.05] transition-all duration-300">
              <span className="text-2xl block mb-3">✓</span>
              <h4 className="text-sm font-bold text-white mb-1.5">Solved Verified Badge</h4>
              <p className="text-xs text-white/60 leading-relaxed">Answers resolve hote hi "Solved" checkmark lagaya jayega taaki baaki students use easily search karke follow kar sakein.</p>
            </div>

            <div className="border border-white/10 glass rounded-[24px] p-5 hover:border-white/20 hover:scale-[1.02] hover:bg-white/[0.05] transition-all duration-300">
              <span className="text-2xl block mb-3">👑</span>
              <h4 className="text-sm font-bold text-white mb-1.5">Reputation & Leaderboard</h4>
              <p className="text-xs text-white/60 leading-relaxed">Answers resolve karke points kamayein. Leaderboard par top rankers ke liye technical goodies aur badges honge.</p>
            </div>

            <div className="border border-white/10 glass rounded-[24px] p-5 hover:border-white/20 hover:scale-[1.02] hover:bg-white/[0.05] transition-all duration-300">
              <span className="text-2xl block mb-3">🔥</span>
              <h4 className="text-sm font-bold text-white mb-1.5">Daily Code Challenges</h4>
              <p className="text-xs text-white/60 leading-relaxed">Har subah ek small code challenge milega jahan aap error spot karke apni coding accuracy ko monitor kar sakte hain.</p>
            </div>
          </div>
        </section>

        {/* 5. SECTION: FAQ ACCORDION */}
        <section className="mb-28 max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold font-display tracking-tight text-white mb-4">
              Frequently Asked Questions (FAQ)
            </h2>
            <p className="text-sm text-white/60">Kuchh aam sawal jo developers waitlist join karne se pehle poochhte hain.</p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq) => {
              const isOpen = activeFaq === faq.id;
              return (
                <div 
                  key={faq.id} 
                  className="rounded-[18px] border border-white/10 glass overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => {
                      setActiveFaq(isOpen ? null : faq.id);
                      trackEvent('FAQ_Toggle', { id: faq.id });
                    }}
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                  >
                    <span className="font-bold text-white text-sm sm:text-base">{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 text-white/60 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isOpen && (
                    <div className="p-5 border-t border-white/10 bg-[#0a0a1a]/40 text-xs sm:text-sm text-white/70 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-white/[0.01] backdrop-blur-md py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 text-center sm:text-left">
          
          <div className="space-y-2">
            <span className="text-lg font-bold font-display bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              BugMitra
            </span>
            <p className="text-xs text-slate-500 max-w-xs mx-auto sm:mx-0">
              Fix Bugs. Learn Together. India's Hinglish community for beginner developers.
            </p>
          </div>

          <div className="space-y-3 font-mono text-[11px] text-slate-500">
            <div>BugMitra &copy; 2026. Made with love for developers in India.</div>
            <div className="flex justify-center sm:justify-end space-x-4">
              <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-slate-400 transition-colors">Terms of Use</a>
            </div>
          </div>
        </div>
      </footer>

      {/* =======================================================
          ADMIN DASHBOARD MODAL PANEL
          ======================================================= */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative border border-white/10">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0a0a1a]/40">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-[#8b5cf6]" />
                <h3 className="text-base font-bold text-white tracking-tight">BugMitra Admin Control Tower</h3>
              </div>
              <button 
                onClick={() => {
                  setShowAdminModal(false);
                  setIsAdminLoggedIn(false);
                  setAdminPasscode('');
                  setAdminLoginError(null);
                }} 
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto">
              {!isAdminLoggedIn ? (
                /* ADMIN LOGIN CHALLENGE */
                <form onSubmit={handleAdminLogin} className="max-w-md mx-auto py-12 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h4 className="text-xl font-bold text-white tracking-tight">Enter Secret Passcode</h4>
                    <p className="text-xs text-white/50">BugMitra administrative interface is passcode-protected for privacy.</p>
                  </div>

                  {adminLoginError && (
                    <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                      {adminLoginError}
                    </div>
                  )}

                  <div className="space-y-4">
                    <input 
                      type="password" 
                      placeholder="Passcode enters here..." 
                      value={adminPasscode}
                      onChange={(e) => setAdminPasscode(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 text-center font-mono focus:outline-none focus:border-[#8b5cf6]/50 transition-colors"
                      required
                      autoFocus
                    />
                    
                    <button
                      type="submit"
                      className="w-full py-3 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:opacity-95 text-white font-bold rounded-lg transition-all text-sm"
                    >
                      Authenticate Admin
                    </button>
                  </div>
                </form>
              ) : (
                /* ADMIN DASHBOARD INTERACTIVE VIEW */
                <div className="space-y-8">
                  
                  {/* Metric Cards grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-[#0a0a1a]/60 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider block">Total Signups</span>
                        <span className="text-2xl font-black font-mono text-white">{adminUsers.length}</span>
                      </div>
                      <Users className="w-8 h-8 text-blue-500/20" />
                    </div>

                    <div className="bg-[#0a0a1a]/60 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider block">Referred Signups</span>
                        <span className="text-2xl font-black font-mono text-white">
                          {adminUsers.filter(u => u.referred_by !== null).length}
                        </span>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-500/20" />
                    </div>

                    <div className="bg-[#0a0a1a]/60 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider block">Active Referrers</span>
                        <span className="text-2xl font-black font-mono text-white">
                          {adminUsers.filter(u => u.referral_count > 0).length}
                        </span>
                      </div>
                      <Award className="w-8 h-8 text-amber-500/20" />
                    </div>
                  </div>

                  {/* Broadcast Email Engine */}
                  <div className="bg-[#0a0a1a]/40 border border-white/10 rounded-xl p-5 space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-purple-400" />
                      Email Broadcast Station (Resend integration)
                    </h4>
                    <p className="text-xs text-white/50">Send an updates newsletter or announcements directly to all {adminUsers.length} waitlist members.</p>

                    {broadcastStatus && (
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-white/80 text-xs">
                        {broadcastStatus}
                      </div>
                    )}

                    <form onSubmit={handleBroadcastEmail} className="space-y-3">
                      <input 
                        type="text" 
                        placeholder="Subject (e.g., BugMitra Alpha Testing Invites!)" 
                        value={broadcastSubject}
                        onChange={(e) => setBroadcastSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0a0a1a]/60 border border-white/10 rounded-lg text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#8b5cf6]/50"
                        required
                      />
                      <textarea 
                        rows={4}
                        placeholder="Type your markdown-ready email announcement here..." 
                        value={broadcastBody}
                        onChange={(e) => setBroadcastBody(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0a0a1a]/60 border border-white/10 rounded-lg text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#8b5cf6]/50 font-sans"
                        required
                      />
                      <button
                        type="submit"
                        disabled={isBroadcasting}
                        className="px-4 py-2 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors"
                      >
                        {isBroadcasting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Broadcasting...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3.5 h-3.5" />
                            <span>Send Broadcast Email</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Users Table Header Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                      <input 
                        type="text" 
                        placeholder="Search waitlist users by name, email or code..." 
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-[#0a0a1a]/60 border border-white/10 rounded-lg text-white placeholder-white/30 text-xs focus:outline-none focus:border-[#8b5cf6]/50"
                      />
                    </div>
                    
                    <button
                      onClick={exportUsersCSV}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>

                  {/* Users Data Table */}
                  <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0a0a1a]/20">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse font-mono text-[11px]">
                        <thead>
                          <tr className="bg-[#0a0a1a]/80 text-white/50 border-b border-white/10">
                            <th className="p-3">Rank</th>
                            <th className="p-3">Name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Skill</th>
                            <th className="p-3">Problem</th>
                            <th className="p-3">Code</th>
                            <th className="p-3">Referred By</th>
                            <th className="p-3 text-center">Referrals</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="p-6 text-center text-white/40">No matching waitlist users registered.</td>
                            </tr>
                          ) : (
                            filteredUsers.map((user) => (
                              <tr key={user.id} className="hover:bg-white/5 text-white/80">
                                <td className="p-3 text-blue-400 font-bold">#{user.position}</td>
                                <td className="p-3 text-white font-sans font-semibold">{user.full_name}</td>
                                <td className="p-3 font-sans">{user.email}</td>
                                <td className="p-3">{user.skill_level}</td>
                                <td className="p-3">{user.coding_problem}</td>
                                <td className="p-3 text-purple-400 font-bold">{user.referral_code}</td>
                                <td className="p-3 text-white/40">{user.referred_by || '-'}</td>
                                <td className="p-3 text-center font-bold text-amber-500">{user.referral_count}</td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="p-1.5 hover:bg-red-500/15 hover:text-red-400 text-white/40 rounded transition-colors"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
