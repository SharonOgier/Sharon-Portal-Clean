import { useState } from "react";
import { Link } from "react-router-dom";

const pages = [
  { id: "home", label: "Home" },
  { id: "services", label: "Services" },
  { id: "farm-equipment", label: "Farm Equipment" },
  { id: "about", label: "About" },
  { id: "mustered", label: "Mustered", badge: true },
  { id: "why", label: "Why Sharon" },
  { id: "why-mitchell", label: "Why Mitchell" },
  { id: "contact", label: "Contact" },
];

export default function HomePage() {
  const [activePage, setActivePage] = useState("home");

  return (
    <div>
      {/* TOP BAR */}
      <div>
        <Link to="/auth">Mustered Login</Link>
      </div>

      {/* SIDEBAR */}
      <div>
        <Link to="/auth">Mustered Login</Link>
      </div>

      {/* MAIN */}
      {activePage === "home" && (
        <div>
          <h1>Home</h1>

          {/* HERO BUTTON FIXED */}
          <Link to="/auth">Mustered Login</Link>

          {/* PORTAL BUTTON (OPTIONAL) */}
          <Link to="/portal">Go to Portal</Link>
        </div>
      )}

      {activePage === "contact" && (
        <div>
          {/* CONTACT BUTTON FIXED */}
          <Link to="/auth">Mustered Login</Link>
        </div>
      )}
    </div>
  );
}