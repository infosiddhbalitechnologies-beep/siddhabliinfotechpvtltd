import {
  Headset,
  Code2,
  Globe,
  BrainCircuit,
  Workflow,
  Palette,
  FileText,
  TicketCheck,
} from "lucide-react";

export const COMPANY = "SIDDHBALI TECHNOLOGIES";
export const PHONE = "+91 84236 75645";
export const PHONE_TEL = "+918423675645";
export const WHATSAPP = "918423675645";
export const EMAIL = "info@siddhbalitechnologies.com";
export const ADDRESS_LINES = [
  "EWS 137, Lalitapuram Colony",
  "Rajendra Nagar, Gorakh Nath",
  "Gorakhpur, Uttar Pradesh, India",
];
export const MAP_EMBED =
  "https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d17176.420641079316!2d83.36825295!3d26.79482645!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2sin!4v1786255509419!5m2!1sen!2sin";

export type Service = {
  id: string;
  name: string;
  Icon: any;
  summary: string;
  highlights: string[];
};

// The 8 services Siddhbali Technologies actually provides.
export const SERVICES: Service[] = [
  {
    id: "it-support",
    name: "IT Support & Service Desk",
    Icon: Headset,
    summary:
      "Technical support, troubleshooting, system assistance, and IT service desk operations.",
    highlights: [
      "Day-to-day technical support",
      "Troubleshooting & system assistance",
      "Structured service desk operations",
    ],
  },
  {
    id: "software-development",
    name: "Software Development",
    Icon: Code2,
    summary:
      "Custom software solutions designed around business and operational requirements.",
    highlights: [
      "Custom business software",
      "Internal tools & platforms",
      "Requirement-driven engineering",
    ],
  },
  {
    id: "web-app-development",
    name: "Web & Application Development",
    Icon: Globe,
    summary:
      "Modern, responsive websites and web applications for business and digital operations.",
    highlights: [
      "Responsive websites",
      "Web applications",
      "Business & digital operations support",
    ],
  },
  {
    id: "ai-data-solutions",
    name: "AI & Data Solutions",
    Icon: BrainCircuit,
    summary:
      "AI, data analysis, intelligent solutions, and data-driven applications.",
    highlights: [
      "Applied AI solutions",
      "Data analysis",
      "Data-driven applications",
    ],
  },
  {
    id: "automation-solutions",
    name: "Automation Solutions",
    Icon: Workflow,
    summary:
      "Workflow and process automation to reduce repetitive manual work and improve efficiency.",
    highlights: [
      "Workflow automation",
      "Process automation",
      "Efficiency improvements",
    ],
  },
  {
    id: "graphic-design",
    name: "Graphic Design",
    Icon: Palette,
    summary:
      "Professional graphics, digital creatives, branding assets, and visual design solutions.",
    highlights: [
      "Digital creatives",
      "Branding assets",
      "Visual design solutions",
    ],
  },
  {
    id: "research-technical-writing",
    name: "Research & Technical Writing",
    Icon: FileText,
    summary:
      "Technical research, documentation, reports, and professional technical writing.",
    highlights: [
      "Technical research",
      "Documentation & reports",
      "Professional technical writing",
    ],
  },
  {
    id: "ticket-management",
    name: "Ticket Raising & Issue Management",
    Icon: TicketCheck,
    summary:
      "IT ticket creation, issue tracking, escalation, and structured issue management.",
    highlights: [
      "Ticket creation & tracking",
      "Escalation handling",
      "Structured issue management",
    ],
  },
];
