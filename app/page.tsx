"use client"; 

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, onSnapshot, doc, runTransaction, query, orderBy, getDoc } from 'firebase/firestore';

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SuggestionForm } from '@/components/custom/suggestion-form';
import { Toaster } from "@/components/ui/sonner";
import { Twitter, Instagram, Facebook, Send, MessageCircle, LayoutGrid, MousePointerClick, Vote, Tv, MapPin, Phone, ChevronDown } from 'lucide-react';

// Custom Components
import { CountdownTimer } from '@/components/custom/countdown-timer';
import { VOTING_END_DATE } from '@/lib/config';

// --- NEW, MORE DETAILED TYPES ---
interface Nominee {
  id: string;
  name: string;
  imageUrl: string;
  votes: number;
}

interface Category {
    id: string;
    title: string;
    order: number;
    description: string; 
    iconUrl: string;
}

 
// Data for the voting steps cards
const votingSteps = [
  {
    icon: <LayoutGrid size={28} className="h-8 w-8" />,
    step: "01",
    title: "Select a Category",
    description: "Browse through the award categories using the tabs to find the one you want to vote in."
  },
  {
    icon: <MousePointerClick size={28} className="h-8 w-8" />,
    step: "02",
    title: "Choose Your Nominee",
    description: "Review the nominees in each category and click the 'Cast Your Vote' button for the creator you believe deserves it."
  },
  {
    icon: <Vote size={28} className="h-8 w-8" />,
    step: "03",
    title: "One Vote Matters",
    description: "To ensure fairness, our system is designed for one vote per person. Your choice is final, so make it count!"
  },
  {
    icon: <Tv size={28} className="h-8 w-8" />,
    step: "04",
    title: "See Live Results",
    description: "Watch the vote counts and progress bars update in real-time. Our transparent system lets you see every vote."
  }
];

const heroTextSets = [
  {
    heading: "ለእርስዎ ተወዳጅ የስፖርት ተጽእኖ ፈጣሪ ድምጽ ይስጡ",
    paragraph: "Your vote matters! Help us crown the best in sports content creation."
  },
  {
    heading: "Your vote matters! Help us crown the best in sports content creation.",
    paragraph: "ለእርስዎ ተወዳጅ የስፖርት ተጽእኖ ፈጣሪ ድምጽ ይስጡ"
  }
];

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z" />
  </svg>
);

export default function Home() {
  // --- NEW STATE MANAGEMENT ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [nomineesByCategoryId, setNomineesByCategoryId] = useState<Record<string, Nominee[]>>({});
  const [totalVotesByCategoryId, setTotalVotesByCategoryId] = useState<Record<string, number>>({});
  // const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [votedCategories, setVotedCategories] = useState<Record<string, boolean>>({});
  const [isVotingActive, setIsVotingActive] = useState(true);

  const [textIndex, setTextIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true); // Start fading out

      // Wait for the fade-out animation to finish before changing the text
      setTimeout(() => {
        setTextIndex((prevIndex) => (prevIndex + 1) % heroTextSets.length);
        setIsFading(false); // Start fading back in
      }, 500); // This duration should match your CSS transition duration

    }, 5000); // 10 seconds

    // Cleanup the timer when the component unmounts to prevent memory leaks
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Check the date on component mount and set an interval to re-check
    const checkVotingStatus = () => {
      setIsVotingActive(new Date() < VOTING_END_DATE);
    };

    checkVotingStatus(); // Check immediately
    const interval = setInterval(checkVotingStatus, 1000); // Re-check every second

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedVotes = localStorage.getItem('votedCategories');
      if (storedVotes) {
        setVotedCategories(JSON.parse(storedVotes));
      }
    }
  }, []);

  const shareText = "Vote for your favorite creator in the Bella Sports Awards!";
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const socialLinks = [
    {
      name: 'WhatsApp',
      icon: <MessageCircle size={32} />,
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`
    },
    {
      name: 'Telegram',
      icon: <Send size={32} />,
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    },
    {
      name: 'Instagram',
      icon: <Instagram size={32} />,
      // Instagram doesn't have a direct web share link, so this is a placeholder
      href: 'https://www.instagram.com'
    },
    {
      name: 'X (Twitter)',
      icon: <Twitter size={32} />,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    },
    {
      name: 'Facebook',
      icon: <Facebook size={32} />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    }
  ];


  // --- UPDATED DATA FETCHING LOGIC ---
  useEffect(() => {
    // 1. Fetch all categories once
    const fetchCategories = async () => {
      const categoriesQuery = query(collection(db, "categories"), orderBy("order", "asc"));
      const querySnapshot = await getDocs(categoriesQuery);
      const fetchedCategories: Category[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(fetchedCategories);
      setLoading(false);
      return fetchedCategories;
    };

    // 2. After fetching categories, set up listeners for each category's nominees
    fetchCategories().then(fetchedCategories => {
      const unsubscribes = fetchedCategories.map(category => {
        const nomineesQuery = query(
          collection(db, "categories", category.id, "nominees"),
          orderBy("votes", "desc")
        );
        
        // Return the unsubscribe function for each listener
        return onSnapshot(nomineesQuery, (snapshot) => {
          const newNominees: Nominee[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Nominee));
          const newTotalVotes = newNominees.reduce((sum, nom) => sum + nom.votes, 0);

          // Update the state object at the specific category's key
          setNomineesByCategoryId(prev => ({ ...prev, [category.id]: newNominees }));
          setTotalVotesByCategoryId(prev => ({ ...prev, [category.id]: newTotalVotes }));
        });
      });

      // 3. Return a cleanup function that unsubscribes from all listeners
      return () => {
        unsubscribes.forEach(unsub => unsub());
      };
    }).catch(console.error);
  }, []);

  const handleVote = async (nomineeId: string, categoryId: string | null) => {
    if (!isVotingActive) {
      alert("The voting period has ended.");
      return;
    }

    if (!categoryId || votedCategories[categoryId]) return;
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, nomineeId })
      });
      const result = await response.json();
      if (response.ok) {
        const newVotedCategories = { ...votedCategories, [categoryId]: true };
        
        // Update state
        setVotedCategories(newVotedCategories);
        
        // Update localStorage
        localStorage.setItem('votedCategories', JSON.stringify(newVotedCategories));
        
        // alert('Thank you for voting in this category!');
      } else {
        throw new Error(result.message || 'Voting failed');
      }
    } catch (error) {
      console.error('Voting error:', error);
      alert(`An error occurred while voting. Please try again.`);
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container h-22 flex items-center justify-center">
          {/* Replace with your actual logo if needed */}
          <img src="/images/logo.png" alt="Bella Sports Logo" className="h-10" />
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative text-center overflow-hidden py-30 sm:py-36">
           <div 
          className="hero-background absolute inset-0 bg-cover bg-center bg-no-repeat"
          ></div>
          <div className="absolute inset-0 bg-black/60"></div>
            <div className="relative z-10 container">
            <div className={`transition-opacity duration-500 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-white">
                {heroTextSets[textIndex].heading}
              </h1>
              <p className="max-w-2xl mx-auto mt-4 text-md text-slate-200">
                {heroTextSets[textIndex].paragraph}
              </p>
            </div>
            {isVotingActive ? (
                // If voting is active, show the timer
                <CountdownTimer />
              ) : (
                // If voting is over, show the new message
                <div className="mt-8 text-white">
                  <p className="text-2xl font-semibold mb-4">
                    Voting is over. Come and get your custom jerseys in our shops.
                  </p>
                  <div className="max-w-md mx-auto bg-black/30 backdrop-blur-sm p-6 rounded-lg text-slate-100">
                    <div className="flex flex-col items-center gap-2 text-lg">
                      <span>ሃያሁለት የድሮ ጤና ጣብያ ወደ ኩኩሉ ቺክን በሚወስደው መንገድ</span>
                      <span>ቦሌ ትምህርት ቤት ፊትለፊት ሽልም ታወር 1ኛ ፎቅ ላይ</span>
                      <span>ጋዜቦ አደባባይ ከሰንዓ ሬስቶራንት ፊትለፊት</span>
                    </div>
                  </div>
                </div>
              )}
              <div className={`transition-opacity duration-500 ease-in-out`}>
              <h1 className="py-8 text-xl sm:text-2xl md:text-3xl font-bold tracking-tighter text-white">
                Awarded on August 17, 2025 in Bellevue Hotel And Spa, Megenagna.
              </h1>
              </div>
          </div>

        </section>

        {/* Voting Grid Section */}
        {/* <section className="container py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Creator Nominees</h2>
            <p className="max-w-xl mx-auto mt-2 text-muted-foreground">
              Expand a category to see the nominees and cast your vote.
            </p>
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground">Loading Categories...</div>
          ) : (
            <Accordion type="multiple" className="w-full max-w-4xl mx-auto space-y-4">
              {categories.map((category) => {
                const nominees = nomineesByCategoryId[category.id] || [];
                const totalVotes = totalVotesByCategoryId[category.id] || 0;
                const hasVotedInCategory = !!votedCategories[category.id];
                
                return (
                  <AccordionItem key={category.id} value={category.id} className="border-none">
                    <AccordionTrigger className="p-4 sm:p-6 bg-sky-100 text-sky-900 rounded-lg shadow-sm transition-colors hover:bg-sky-200 data-[state=open]:rounded-b-none">
                      {category.iconUrl && (
                        <img 
                          src={category.iconUrl} 
                          alt={`${category.title} icon`}
                          className="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-white/20"
                        />
                      )}
                      <div className="flex-1 text-left">
                        <h3 className="text-lg font-semibold">{category.title}</h3>
                        <p className="text-sm text-sky-800/80 mt-1">{category.description}</p>
                      </div>
                      <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200" />
                    </AccordionTrigger>
                    <AccordionContent className="bg-white p-4 sm:p-6 border border-t-0 border-slate-200 rounded-b-lg">
                      {(nominees.length === 0) ? (
                        <p className="text-muted-foreground">Loading nominees...</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {nominees.map((nominee) => {
                            const percentage = totalVotes > 0 ? (nominee.votes / totalVotes) * 100 : 0;
                            return (
                              <Card key={nominee.id} className="transition-all hover:shadow-lg">
                                <CardHeader className="p-0"><img src={nominee.imageUrl} alt={nominee.name} className="aspect-video w-full object-cover rounded-t-lg" /></CardHeader>
                                <CardContent className="pt-6">
                                  <CardTitle className="text-xl">{nominee.name}</CardTitle>
                                  <div className="flex items-center gap-4 mt-4">
                                    <Progress value={percentage} className="w-full h-2" />
                                    <span className="font-bold text-sm text-muted-foreground">{percentage.toFixed(1)}%</span>
                                  </div>
                                  <p className="text-center text-muted-foreground mt-2 text-sm">{nominee.votes.toLocaleString()} votes</p>
                                </CardContent>
                                <CardFooter>
                                  <Button className="w-full" size="lg" onClick={() => handleVote(nominee.id, category.id)} disabled={!isVotingActive || hasVotedInCategory}>
                                    {!isVotingActive ? 'Voting Closed' : hasVotedInCategory ? 'Thank You!' : 'Cast Your Vote'}
                                  </Button>
                                </CardFooter>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </section> */}
        <section className="container py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Nomination Phase</h2>
            <p className="max-w-xl mx-auto mt-2 text-muted-foreground">
              Official voting has not yet begun. Use the form below to suggest creators you&apos;d like to see nominated.
            </p>
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground">Loading Categories...</div>
          ) : (
            <SuggestionForm categories={categories} />
          )}
        </section>


         <section className="container px-12 bg-gray-200 py-20 sm:py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              How Voting Works
            </h2>
            <p className="max-w-2xl mx-auto mt-3 text-lg text-muted-foreground">
              Our voting system is simple, fair, and transparent. Follow these steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {votingSteps.map((step) => (
              <Card key={step.title} className="bg-white text-left shadow-sm p-4">
                <CardHeader>
                  <div className="mx-auto flex items-center justify-center bg-sky-100 text-sky-700 w-16 h-16 rounded-full mb-6">
                    {step.icon}
                  </div>
                  {/* <div className="flex items-center justify-center bg-sky-100 text-sky-800 w-12 h-12 rounded-lg">
                    <span className="text-xl font-bold">{step.step}</span>
                  </div> */}
                  <CardTitle className="text-lg font-semibold">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        <section className="bg-white border-y border-slate-200 py-20 sm:py-24">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Spread the Word
            </h2>
            <p className="max-w-xl mx-auto mt-3 text-lg text-muted-foreground">
              Help your favorite creators get more votes by sharing this page with your friends.
            </p>

            {isClient && (<div className="flex justify-center items-center gap-6 mt-12">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Share on ${link.name}`}
                  className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-blue-700 hover:scale-110"
                >
                  {link.icon}
                </a>
              ))}
            </div>)}
          </div>
        </section>
         <section className="bg-slate-200 py-20 sm:py-24">
          <div className="container grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            
            {/* Left Column: Image */}
            <div className="w-full px-10">
              <img
                src="/images/BellaSports.jpg"
                alt="Bella Sports"
                className="w-full h-100 object-cover rounded-xl shadow-lg"
              />
            </div>

            {/* Right Column: Text Content */}
            <div className="text-left">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                About Bella Sports
              </h2>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Bella Sports is at the forefront of the digital sports revolution. Founded on the principle of celebrating creativity and passion, we provide a platform for fans to connect with the creators who are redefining sports entertainment. From insightful analysis to breathtaking highlight reels, we believe in recognizing the dedication that goes into making great content. These awards are our tribute to the community and the incredible individuals who make it special.
              </p>
            </div>
            
          </div>
        </section>
      </main>
      
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 px-20">
         <div className="container">
          
          {/* Top Section: Two-Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 py-16">
            {/* Column 1: Bella Sports & Socials */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Our Social Links</h3>
            <div className="flex items-center gap-4 mt-6">
              {/* Telegram Link */}
              <a href="https://t.me/bellasportswear" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="text-muted-foreground hover:text-white transition-colors">
                <Send className="h-6 w-6" />
              </a>
              
              {/* Instagram Link */}
              <a href="https://www.instagram.com/bella_sportswear?igsh=MTR3eXd3Nzlkd203cA==" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted-foreground hover:text-white transition-colors">
                <Instagram className="h-6 w-6" />
              </a>

              {/* TikTok Link */}
              <a href="https://www.tiktok.com/@bellasportswear?_t=ZS-8yI0SkyJo7c&_r=1" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-muted-foreground hover:text-white transition-colors">
                <TikTokIcon className="h-6 w-6" />
              </a>
          </div>
          </div>

            {/* Column 2: Contact Us */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Contact Us</h3>
              <ul className="space-y-4">
                 <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-sky-400 shrink-0 mt-1" />
                  <span>ሃያሁለት የድሮ ጤና ጣብያ ወደ ኩኩሉ ቺክን በሚወስደው መንገድ</span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-sky-400 shrink-0 mt-1" />
                  <span>ቦሌ ትምህርት ቤት ፊትለፊት ሽልም ታወር 1ኛ ፎቅ ላይ</span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-sky-400 shrink-0 mt-1" />
                  <span>ጋዜቦ አደባባይ ከሰንዓ ሬስቶራንት ፊትለፊት</span>
                </li>
                {/* <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-sky-400 shrink-0" />
                  <a href="mailto:contact@bellasports.com" className="hover:text-white transition-colors">
                    contact@bellasports.com
                  </a>
                </li> */}
                <div className="flex items-center gap-3"></div>
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-sky-400 shrink-0" />
                  <div className='flex flex-col'>
                    <a href="tel:+251942216474" className="hover:text-white transition-colors">
                      +251942216474
                    </a>
                    <a href="tel:+251945037777" className="hover:text-white transition-colors">
                      +251945037777
                    </a>
                  </div>
                </li>
              </ul>
            </div>

          </div>

          {/* Separator Line */}
          <hr className="border-slate-800" />

          {/* Bottom Section: Copyright */}
          <div className="text-center py-8 text-sm text-muted-foreground">
            © {new Date().getFullYear()} Bella Sports. All Rights Reserved.
          </div>
          <div className="text-center py-8 text-sm text-muted-foreground">
            Developed by <a href="mailto:sehulaklilu@gmail.com" className="hover:text-white transition-colors">Sehulaklilu</a>
          </div>
        </div>
      </footer>
    </div>
  );
}