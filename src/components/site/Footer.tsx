import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import logo from "@/assets/logo.png";
import {
  SERVICES,
  COMPANY,
  EMAIL,
  PHONE,
  PHONE_TEL,
  WHATSAPP,
  ADDRESS_LINES,
} from "@/lib/site-data";

export function Footer() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link
              to="/"
              className="flex items-center gap-2 font-display font-bold text-lg"
            >
              <img
                src={logo}
                alt={`${COMPANY} logo`}
                className="size-8 rounded-lg object-contain"
              />
              <span>SIDDHBALI TECHNOLOGIES</span>
            </Link>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {SERVICES.map((s) => (
                <li key={s.id}>
                  <Link
                    to="/services"
                    hash={s.id}
                    className="hover:text-foreground transition"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/about" className="hover:text-foreground transition">
                  About
                </Link>
              </li>
              <li>
                <Link to="/team" className="hover:text-foreground transition">
                  Leadership
                </Link>
              </li>
              <li>
                <Link
                  to="/services"
                  className="hover:text-foreground transition"
                >
                  Services
                </Link>
              </li>
              <li>
                <Link
                  to="/careers"
                  className="hover:text-foreground transition"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-foreground transition">
                  IT Service Desk
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-foreground transition"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Get in touch</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{ADDRESS_LINES.join(", ")}</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                <a
                  href={`tel:${PHONE_TEL}`}
                  className="hover:text-foreground transition"
                >
                  {PHONE}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                <a
                  href={`https://wa.me/${WHATSAPP}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground transition"
                >
                  WhatsApp
                </a>
              </li>
              <li className="flex items-start gap-2 break-all">
                <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                <a
                  href={`mailto:${EMAIL}`}
                  className="hover:text-foreground transition"
                >
                  {EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {COMPANY}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Gorakhpur, Uttar Pradesh, India
          </p>
        </div>
      </div>
    </footer>
  );
}
