import "./navbar.css";
import logo2 from "../../assets/images/logo2.png";
import search from "../../assets/images/search.png";
import { useEffect, useRef, useState } from "react";
  import { useNavigate } from "react-router-dom";
const Navbar = () => {
  const sections = ["home", "services", "doctors", "partners", "testimonials", "footer"];
  const [active, setActive] = useState("home");
  const [underlineStyle, setUnderlineStyle] = useState({});
  const navRefs = useRef({});
  const navigate = useNavigate();
  // Theme state
  const [theme, setTheme] = useState("light");

  // Load saved theme on mount
 useEffect(() => {
  const savedTheme = localStorage.getItem("theme") || "light";
  setTheme(savedTheme);
  document.body.classList.toggle("dark", savedTheme === "dark"); // 👈 match CSS
}, []);

// Handle toggle
const toggleTheme = () => {
  const newTheme = theme === "dark" ? "light" : "dark";
  setTheme(newTheme);
  localStorage.setItem("theme", newTheme);

  if (newTheme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
};

  // scrollspy observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { threshold: 0.6 }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // update underline when active changes
  useEffect(() => {
    const el = navRefs.current[active];
    if (el) {
      setUnderlineStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [active]);






  return (
    <div className="navbar-container">
      <div className="logo">
        <img src={logo2} alt="medic-logo" />
      </div>

      <div className="nav-items">
        {sections.map((id, i) => (
          <a
            key={id}
            href={`#${id}`}
            ref={(el) => (navRefs.current[id] = el)}
            className={active === id ? "active" : ""}
          >
            {i === 0 && "Home"}
            {i === 1 && "Our Services"}
            {i === 2 && "Our Doctors"}
            {i === 3 && "Our Health Partners"}
            {i === 4 && "Testimonials"}
            {i === 5 && "Contact Us"}
          </a>
        ))}

        {/* underline element */}
        <span
          className="underline"
          style={{
            left: underlineStyle.left || 0,
            width: underlineStyle.width || 0,
          }}
        />
      </div>

      
      <div className="side-nav-items">
        <button onClick={() => navigate("/login")} className="navbarBtn">
          Login
        </button>

        
      </div>
    </div>
  );
};

export default Navbar;
