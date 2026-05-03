import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";

export default function SalonNavigation() {
  const [activeTab, setActiveTab] = useState("services");

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      // Offset for sticky header
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveTab(id);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["services", "reviews", "about", "location"];
      let current = "services";
      
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150) {
            current = section;
          }
        }
      }
      setActiveTab(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0">
      <Tabs value={activeTab} onValueChange={scrollTo} className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 rounded-2xl h-auto p-1.5 gap-1 overflow-x-auto no-scrollbar flex-nowrap">
          {[
            { id: "services", label: "Services" },
            { id: "reviews", label: "Reviews" },
            { id: "about", label: "About & Team" },
            { id: "location", label: "Location" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 data-[state=inactive]:text-muted-foreground hover:text-foreground shrink-0"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
