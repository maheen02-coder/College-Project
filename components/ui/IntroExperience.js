"use client";

import { useEffect, useRef, useState } from "react";
import { GraduationCap, School, Sparkles } from "lucide-react";

const OPEN_MS = 5800;
const DONE_MS = 7050;

const INTRO_NAMES = ["Maheen Abrar", "Esha Shahid", "Alina Ahmad"];

export default function IntroExperience() {
  const [state, setState] = useState("intro");
  const [live, setLive] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("ceh-intro-lock");
    setLive(true);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timers.current.push(
      setTimeout(() => {
        setState("open");
        window.dispatchEvent(new Event("ceh:intro-open"));
      }, reduced ? 1600 : OPEN_MS),
    );
    timers.current.push(
      setTimeout(() => {
        setState("done");
        window.dispatchEvent(new Event("ceh:intro-done"));
      }, reduced ? 2600 : DONE_MS),
    );

    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current = [];
      root.classList.remove("ceh-intro-lock");
    };
  }, []);

  useEffect(() => {
    if (state === "done") document.documentElement.classList.remove("ceh-intro-lock");
  }, [state]);

  if (state === "done") return null;

  return (
    <div
      id="ceh-intro"
      data-state={state}
      data-live={live}
      className="ceh-intro"
      role="dialog"
      aria-label="Welcome to the KIPS College Campus Event Hub"
    >
      <div className="intro-gate intro-gate-left" aria-hidden="true">
        <span className="intro-gate-glow" />
      </div>
      <div className="intro-gate intro-gate-right" aria-hidden="true">
        <span className="intro-gate-glow" />
      </div>

      <div className="intro-content">
        <div className="intro-halo" aria-hidden="true" />
        <div className="intro-beam" aria-hidden="true" />
        <span className="intro-spark" style={{ left: "19%", top: "28%", animationDelay: "0s" }} aria-hidden="true" />
        <span className="intro-spark" style={{ left: "78%", top: "23%", animationDelay: "-1.6s" }} aria-hidden="true" />
        <span className="intro-spark" style={{ left: "13%", top: "66%", animationDelay: "-3.1s" }} aria-hidden="true" />
        <span className="intro-spark" style={{ left: "85%", top: "63%", animationDelay: "-2.2s" }} aria-hidden="true" />
        <span className="intro-spark" style={{ left: "66%", top: "80%", animationDelay: "-4.4s" }} aria-hidden="true" />

        <div className="intro-seal">
          <span className="intro-seal-ring" aria-hidden="true" />
          <span className="intro-seal-mark">
            <img src="/kips%20logo.png" alt="KIPS College" width="447" height="447" className="intro-seal-logo" />
          </span>
        </div>

        <p className="intro-eyebrow">KIPS College · Campus Event Hub</p>
        <p className="intro-made">Made by</p>
        <div className="intro-names">
          {INTRO_NAMES.map((name) => (
            <p className="intro-name" key={name}>
              {name}
            </p>
          ))}
        </div>
        <span className="intro-divider" aria-hidden="true" />

        <div className="intro-meta">
          <span className="intro-chip">
            <School size={15} aria-hidden="true" />
            <span>
              <em>Institute</em>
              KIPS College
            </span>
          </span>
          <span className="intro-chip">
            <GraduationCap size={15} aria-hidden="true" />
            <span>
              <em>Class</em>
              RICSG — 1st Year
            </span>
          </span>
        </div>

        <p className="intro-tagline">
          <Sparkles size={12} aria-hidden="true" /> One hub for every KIPS moment
        </p>

        <div className="intro-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
