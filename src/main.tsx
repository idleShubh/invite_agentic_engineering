import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Filter,
  FileText,
  Ghost,
  GraduationCap,
  Link,
  Loader2,
  Mic2,
  Moon,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Sun,
  Tags,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Wrench
} from "lucide-react";
import { analyzeProfileWithDeepSeek, generateProposalWithDeepSeek } from "./deepseek";
import { defaultProposal } from "./sampleData";
import { deleteStoredGuest, loadGuests, loadProposal, recordProposalView, saveGuest, slugify, updateStoredGuest } from "./storage";
import { Guest, PipelineStatus, ProposalContent, ProposalTemplate, ghostedStatus, pipelineStatuses } from "./types";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./components/ui/sheet";
import "./styles.css";

const siteName = "Agentic Engineering";
const defaultSeoImage = "/agentic-engineering-logo.png";
const proposalTemplates: Array<{ template: ProposalTemplate; promise: string }> = [
  { template: "Distribution", promise: "Get your ideas in front of more builders." },
  { template: "Technical Legacy", promise: "Create a lasting record of how you think." },
  { template: "Operator's Field Report", promise: "Share hard-earned production lessons." },
  { template: "Research Exchange", promise: "A serious technical discussion, not a marketing podcast." },
  { template: "Category Builder", promise: "Help shape the narrative of an emerging category." },
  { template: "Founding Voice", promise: "Help define the standard for serious engineering conversations." }
];

type GeneratorDraft = {
  name: string;
  role: string;
  company: string;
  linkedinUrl: string;
  photoUrl: string;
  pdfName: string;
  pdfText: string;
  selectedTemplate: ProposalTemplate;
  recommendedTemplate: ProposalTemplate;
  recommendationReason: string;
  researchSignals: string[];
  confidence: string;
};

type ProfileResearchState = Pick<GeneratorDraft, "recommendedTemplate" | "recommendationReason" | "researchSignals" | "confidence">;

const emptyGeneratorDraft: GeneratorDraft = {
  name: "",
  role: "",
  company: "",
  linkedinUrl: "",
  photoUrl: "",
  pdfName: "",
  pdfText: "",
  selectedTemplate: "Distribution",
  recommendedTemplate: "Distribution",
  recommendationReason: "Upload a LinkedIn PDF to get a stronger recommendation.",
  researchSignals: [],
  confidence: "Waiting for profile"
};

function App() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [authState, setAuthState] = useState<"checking" | "authenticated" | "anonymous">("checking");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [proposalGuest, setProposalGuest] = useState<Guest | undefined>();
  const [generatorDraft, setGeneratorDraft] = useState<GeneratorDraft>(emptyGeneratorDraft);
  const [pathname, setPathname] = useState(window.location.pathname);
  const proposalSlug = pathname.match(/^\/proposal\/([^/]+)/)?.[1];
  const selectedGuest = guests.find((guest) => guest.id === selectedId) ?? guests[0];

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    if (!proposalSlug) return;
    setLoading(true);
    loadProposal(proposalSlug)
      .then(setProposalGuest)
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Could not load proposal."))
      .finally(() => setLoading(false));
  }, [proposalSlug]);

  useEffect(() => {
    if (proposalSlug) return;
    checkSession();
  }, [proposalSlug]);

  async function checkSession() {
    setLoading(true);
    setLoadError("");
    try {
      const session = await fetch("/api/session").then((response) => response.json());
      if (!session.authenticated) {
        setAuthState("anonymous");
        setGuests([]);
        return;
      }
      setAuthState("authenticated");
      const nextGuests = await loadGuests();
      setGuests(nextGuests);
      setSelectedId((current) => current || nextGuests[0]?.id || "");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load app data.");
    } finally {
      setLoading(false);
    }
  }

  if (proposalSlug) {
    if (loading) return <RouteLoading label="Loading proposal" />;
    if (loadError) return <RouteError message={loadError} />;
    return <ProposalPage guest={proposalGuest} onViewed={() => markViewed(proposalGuest?.slug)} />;
  }

  if (loading || authState === "checking") {
    return <RouteLoading label="Loading workspace" />;
  }

  if (authState === "anonymous") {
    return <LoginPage onLogin={checkSession} />;
  }

  if (pathname === "/pipeline") {
    return (
      <>
        <SeoManager
          title="Guest Outreach Pipeline | Agentic Engineering"
          description="Track Agentic Engineering podcast guest outreach from reach out to contacted, in process, booked, and done."
          path="/pipeline"
        />
        <AppFrame pathname={pathname} onNavigate={navigate}>
          <PipelinePage
            guests={guests}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={updateGuest}
            onDelete={deleteGuest}
            onNavigate={navigate}
          />
        </AppFrame>
      </>
    );
  }

  if (pathname === "/edit") {
    return (
      <>
        <SeoManager
          title="Edit Podcast Proposals | Agentic Engineering"
          description="Select and edit personalized Agentic Engineering podcast proposals, tune guest-specific copy, and review fixed podcast episode links."
          path="/edit"
        />
        <AppFrame pathname={pathname} onNavigate={navigate}>
          <EditPage guests={guests} selectedId={selectedId} onSelect={setSelectedId} onChange={updateGuest} />
        </AppFrame>
      </>
    );
  }

  if (pathname === "/ghosted") {
    return (
      <>
        <SeoManager
          title="Ghosted Guests | Agentic Engineering"
          description="Review podcast guests who stopped responding without deleting their profiles or proposals."
          path="/ghosted"
        />
        <AppFrame pathname={pathname} onNavigate={navigate}>
          <GhostedPage
            guests={guests}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={updateGuest}
            onDelete={deleteGuest}
            onNavigate={navigate}
          />
        </AppFrame>
      </>
    );
  }

  async function upsertGuest(nextGuest: Guest) {
    const savedGuest = await saveGuest(nextGuest);
    setGuests((current) => {
      const exists = current.some((guest) => guest.id === savedGuest.id);
      return exists
        ? current.map((guest) => (guest.id === savedGuest.id ? savedGuest : guest))
        : [savedGuest, ...current];
    });
    setSelectedId(savedGuest.id);
  }

  function updateGuest(id: string, patch: Partial<Guest>) {
    setGuests((current) =>
      current.map((guest) =>
        guest.id === id ? { ...guest, ...patch, updatedAt: new Date().toISOString() } : guest
      )
    );
    updateStoredGuest(id, patch)
      .then((savedGuest) => {
        setGuests((current) => current.map((guest) => (guest.id === id ? savedGuest : guest)));
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Could not save change."));
  }

  async function deleteGuest(id: string) {
    const guest = guests.find((item) => item.id === id);
    if (!guest) return;
    if (!window.confirm(`Delete ${guest.name}? This removes the profile and public proposal link.`)) return;

    const previousGuests = guests;
    const nextGuests = guests.filter((item) => item.id !== id);
    setGuests(nextGuests);
    setSelectedId((current) => (current === id ? nextGuests[0]?.id || "" : current));

    try {
      await deleteStoredGuest(id);
    } catch (error) {
      setGuests(previousGuests);
      setSelectedId(id);
      setLoadError(error instanceof Error ? error.message : "Could not delete guest.");
    }
  }

  function markViewed(slug?: string) {
    if (!slug) return;
    recordProposalView(slug);
  }

  function navigate(nextPath: string) {
    if (nextPath === pathname) return;
    window.history.pushState({}, "", nextPath);
    setPathname(nextPath);
  }

  return (
    <>
      <SeoManager
        title="Podcast Proposal Generator | Agentic Engineering"
        description="Generate personalized Agentic Engineering podcast invitation pages from LinkedIn profiles, add guest photos, and prepare shareable proposal links for AI engineering leaders."
        path="/"
      />
      <AppFrame pathname={pathname} onNavigate={navigate}>
        {loadError ? <p className="error app-error">{loadError}</p> : null}
        <section className="workspace">
          <header className="topbar">
            <div>
              <p className="eyebrow">Guest outreach studio</p>
              <h1>Personalized podcast proposals, tracked from reach out to done.</h1>
            </div>
            {selectedGuest ? (
              <div className="topbar-actions">
                <button className="secondary-link compact" onClick={() => navigate("/pipeline")}>
                  <Users size={16} />
                  Pipeline
                </button>
                <button className="secondary-link compact" onClick={() => navigate("/edit")}>
                  <PencilLine size={16} />
                  Edit
                </button>
              </div>
            ) : null}
          </header>

          <section className="grid-two" id="generator">
            <GeneratorCard onSave={upsertGuest} onDraftChange={setGeneratorDraft} />
            <GuestInspector
              guest={selectedGuest}
              draft={generatorDraft}
              onChange={updateGuest}
              onDelete={deleteGuest}
            />
          </section>

        </section>
      </AppFrame>
    </>
  );
}

function AppFrame({
  children,
  pathname,
  onNavigate
}: {
  children: React.ReactNode;
  pathname: string;
  onNavigate: (path: string) => void;
}) {
  const [theme, setTheme] = useState(() => localStorage.getItem("ae-theme") || "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ae-theme", theme);
  }, [theme]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img src="/agentic-engineering-logo.png" alt="Agentic Engineering" />
          </div>
          <div>
            <strong>Agentic Engineering</strong>
            <span>Proposal Generator</span>
          </div>
        </div>
        <nav className="side-nav">
          <button className={pathname === "/" ? "active" : ""} onClick={() => onNavigate("/")}>Generator</button>
          <button className={pathname === "/edit" ? "active" : ""} onClick={() => onNavigate("/edit")}>Edit</button>
          <button className={pathname === "/pipeline" ? "active" : ""} onClick={() => onNavigate("/pipeline")}>Pipeline</button>
          <button className={pathname === "/ghosted" ? "active" : ""} onClick={() => onNavigate("/ghosted")}>Ghosted</button>
        </nav>
        <div className="sidebar-footer">
          <div className="theme-switch" aria-label="Theme switcher">
            <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
              <Sun size={14} />
              Light
            </button>
            <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
              <Moon size={14} />
              Dark
            </button>
          </div>
          <button className="secondary-button logout-button" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      {children}
    </main>
  );
}

function ThemeSwitch({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("ae-theme") || "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ae-theme", theme);
  }, [theme]);

  return (
    <div className={`theme-switch ${className}`} aria-label="Theme switcher">
      <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
        <Sun size={14} />
        Light
      </button>
      <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
        <Moon size={14} />
        Dark
      </button>
    </div>
  );
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/";
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("admin@supatest.ai");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Login failed.");
      }
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <SeoManager
        title="Sign In | Agentic Engineering"
        description="Private Agentic Engineering proposal workspace."
        path="/"
        noindex
      />
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">AE</div>
        <div>
          <p className="eyebrow">Private workspace</p>
          <h1>Sign in to manage proposals.</h1>
        </div>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="primary-button wide" disabled={busy}>
          {busy ? <Loader2 className="spin" size={16} /> : <ArrowRight size={16} />}
          {busy ? "Signing in" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function RouteLoading({ label }: { label: string }) {
  return (
    <main className="route-state">
      <Loader2 className="spin" size={24} />
      <p>{label}</p>
    </main>
  );
}

function RouteError({ message }: { message: string }) {
  return (
    <main className="route-state">
      <h1>Something needs attention.</h1>
      <p>{message}</p>
    </main>
  );
}

function SeoManager({
  title,
  description,
  image = defaultSeoImage,
  path,
  type = "website",
  noindex = false,
  jsonLd
}: {
  title: string;
  description: string;
  image?: string;
  path: string;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}) {
  useEffect(() => {
    const canonicalUrl = toAbsoluteUrl(path);
    const imageUrl = toShareImageUrl(image);
    document.title = title;
    setTag("meta", "name", "description", description);
    setTag("meta", "name", "robots", noindex ? "noindex,nofollow" : "index,follow");
    setLink("canonical", canonicalUrl);
    setTag("meta", "property", "og:site_name", siteName);
    setTag("meta", "property", "og:type", type);
    setTag("meta", "property", "og:title", title);
    setTag("meta", "property", "og:description", description);
    setTag("meta", "property", "og:url", canonicalUrl);
    setTag("meta", "property", "og:image", imageUrl);
    setTag("meta", "property", "og:image:width", "1200");
    setTag("meta", "property", "og:image:height", "630");
    setTag("meta", "name", "twitter:card", "summary_large_image");
    setTag("meta", "name", "twitter:title", title);
    setTag("meta", "name", "twitter:description", description);
    setTag("meta", "name", "twitter:image", imageUrl);
    setJsonLd(jsonLd);
  }, [description, image, jsonLd, noindex, path, title, type]);

  return null;
}

function setTag(tagName: "meta", attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`${tagName}[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement(tagName);
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function setJsonLd(jsonLd?: Record<string, unknown>) {
  const id = "route-json-ld";
  document.getElementById(id)?.remove();
  if (!jsonLd) return;
  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(jsonLd);
  document.head.appendChild(script);
}

function toAbsoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return new URL(pathOrUrl, window.location.origin).toString();
}

function toShareImageUrl(image: string) {
  if (!image || image.startsWith("data:")) return toAbsoluteUrl(defaultSeoImage);
  return toAbsoluteUrl(image);
}

function isPublicShareImage(image: string) {
  return Boolean(image && !image.startsWith("data:"));
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function GeneratorCard({
  onSave,
  onDraftChange
}: {
  onSave: (guest: Guest) => Promise<void>;
  onDraftChange: (draft: GeneratorDraft) => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfText, setPdfText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<ProposalTemplate>("Distribution");
  const [profileResearch, setProfileResearch] = useState<ProfileResearchState | undefined>();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const localDraft = analyzeDraftProfile({
      name,
      role,
      company,
      linkedinUrl,
      photoUrl,
      pdfName,
      pdfText,
      selectedTemplate
    });
    onDraftChange(profileResearch ? { ...localDraft, ...profileResearch } : localDraft);
  }, [company, linkedinUrl, name, onDraftChange, pdfName, pdfText, photoUrl, profileResearch, role, selectedTemplate]);

  async function handlePdf(file?: File) {
    if (!file) return;
    setBusy("Extracting PDF");
    setError("");
    try {
      setPdfName(file.name);
      const { extractPdfText } = await import("./pdf");
      const text = await extractPdfText(file);
      setPdfText(text);
      setBusy("Analyzing profile");

      const extracted = inferLinkedInProfile(text);
      const fallbackDraft = analyzeDraftProfile({
        name: extracted.name,
        role: extracted.role,
        company: extracted.company,
        linkedinUrl: extracted.linkedinUrl,
        photoUrl,
        pdfName: file.name,
        pdfText: text,
        selectedTemplate
      });

      const analysis = await analyzeProfileWithDeepSeek({
        name,
        role,
        company,
        linkedinUrl,
        pdfText: text
      });

      const nextName = analysis.name || extracted.name || name;
      const nextRole = analysis.role || extracted.role || role;
      const nextCompany = analysis.company || extracted.company || company;
      const nextLinkedinUrl = analysis.linkedinUrl || extracted.linkedinUrl || linkedinUrl;

      setName(nextName);
      setRole(nextRole);
      setCompany(nextCompany);
      setLinkedinUrl(nextLinkedinUrl);
      setSelectedTemplate(analysis.recommendedTemplate || fallbackDraft.recommendedTemplate);
      setProfileResearch({
        recommendedTemplate: analysis.recommendedTemplate || fallbackDraft.recommendedTemplate,
        recommendationReason: analysis.recommendationReason || fallbackDraft.recommendationReason,
        researchSignals: analysis.researchSignals.length ? analysis.researchSignals : fallbackDraft.researchSignals,
        confidence: "DeepSeek profile research complete"
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not analyze that PDF.";
      setError(`${message} Local extraction is shown as a fallback.`);
      try {
        const { extractPdfText } = await import("./pdf");
        const text = await extractPdfText(file);
        const extracted = inferLinkedInProfile(text);
        const fallbackDraft = analyzeDraftProfile({
          name: extracted.name,
          role: extracted.role,
          company: extracted.company,
          linkedinUrl: extracted.linkedinUrl,
          photoUrl,
          pdfName: file.name,
          pdfText: text,
          selectedTemplate
        });
        setPdfText(text);
        setName(extracted.name || name);
        setRole(extracted.role || role);
        setCompany(extracted.company || company);
        setLinkedinUrl(extracted.linkedinUrl || linkedinUrl);
        setSelectedTemplate(fallbackDraft.recommendedTemplate);
        setProfileResearch({
          recommendedTemplate: fallbackDraft.recommendedTemplate,
          recommendationReason: fallbackDraft.recommendationReason,
          researchSignals: fallbackDraft.researchSignals,
          confidence: "Local profile scan"
        });
      } catch {
        setError("Could not read that PDF.");
      }
    } finally {
      setBusy("");
    }
  }

  async function handlePhoto(file?: File) {
    if (!file) return;
    setPhotoUrl(await fileToDataUrl(file));
  }

  async function generate() {
    const safeName = name.trim() || "New Guest";
    const safeRole = role.trim() || "Practitioner";
    const safeCompany = company.trim() || "their team";
    setBusy("Generating proposal");
    setError("");
    try {
      const proposal = await generateProposalWithDeepSeek({
        name: safeName,
        role: safeRole,
        company: safeCompany,
        linkedinText: pdfText || `${safeName} ${safeRole} ${safeCompany} ${linkedinUrl}`,
        template: selectedTemplate
      });
      const now = new Date().toISOString();
      const guest: Guest = {
        id: crypto.randomUUID(),
        name: safeName,
        email: "",
        role: safeRole,
        company: safeCompany,
        linkedinUrl,
        notes: "",
        status: "Reach Out",
        photoUrl:
          photoUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&background=1b2a55&color=fff`,
        pdfName,
        pdfText,
        slug: slugify(safeName) || crypto.randomUUID(),
        proposal,
        published: true,
        viewed: 0,
        createdAt: now,
        updatedAt: now
      };
      await onSave(guest);
      setName("");
      setRole("");
      setCompany("");
      setLinkedinUrl("");
      setPhotoUrl("");
      setPdfName("");
      setPdfText("");
      setSelectedTemplate("Distribution");
      setProfileResearch(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="panel generator-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Create proposal</p>
          <h2>Upload profile, generate the page.</h2>
        </div>
        <Sparkles size={22} />
      </div>
      <div className="upload-row upload-row-primary">
        <label className="upload-drop">
          <FileText size={18} />
          <span>{pdfName || "LinkedIn PDF"}</span>
          <input type="file" accept="application/pdf" onChange={(event) => handlePdf(event.target.files?.[0])} />
        </label>
        <label className="upload-drop">
          <Upload size={18} />
          <span>{photoUrl ? "Photo attached" : "Guest photo"}</span>
          <input type="file" accept="image/*" onChange={(event) => handlePhoto(event.target.files?.[0])} />
        </label>
      </div>
      <div className="field-grid">
        <label>
          Guest name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Anuj Kumar" />
        </label>
        <label>
          LinkedIn URL
          <input value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} placeholder="https://linkedin.com/in/..." />
        </label>
        <label>
          Role
          <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="VP of Engineering" />
        </label>
        <label>
          Company
          <input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="AI Infra Co." />
        </label>
      </div>
      <div className="template-selector" aria-label="Proposal template">
        {proposalTemplates.map(({ template, promise }) => {
          const Icon = templateIcon(template);
          return (
            <button
              key={template}
              className={selectedTemplate === template ? "active" : ""}
              type="button"
              onClick={() => setSelectedTemplate(template)}
            >
              <span className="template-title">
                <Icon size={17} />
                <strong>{template}</strong>
              </span>
              <span>{promise}</span>
            </button>
          );
        })}
      </div>
      {pdfText ? <p className="extract-note">{pdfText.length.toLocaleString()} characters extracted from PDF.</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <button className="primary-button wide" onClick={generate} disabled={Boolean(busy)}>
        {busy ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
        {busy || "Generate personalized proposal"}
      </button>
    </section>
  );
}

function inferLinkedInProfile(text: string) {
  const lines = profileLines(text);
  const linkedinUrl = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s)]+/i)?.[0] || "";
  const headlineIndex = lines.findIndex((line) => isRoleCompanyLine(line));
  const nameIndex =
    headlineIndex > 0
      ? findNearestNameBefore(lines, headlineIndex)
      : lines.findIndex((line, index) => index < 40 && isLikelyName(line));
  const nameLine = nameIndex >= 0 ? lines[nameIndex] : "";
  const headlineWindow = nameIndex >= 0 ? lines.slice(nameIndex + 1, nameIndex + 12) : lines.slice(0, 20);
  const headlineLine = headlineIndex >= 0 ? lines[headlineIndex] : headlineWindow.find((line) => isRoleCompanyLine(line)) || "";
  const roleCompany = splitRoleCompany(headlineLine);
  const experienceFallback = roleCompany.role && roleCompany.company ? roleCompany : inferExperienceRoleCompany(lines);

  return {
    name: nameLine,
    role: experienceFallback.role,
    company: experienceFallback.company,
    linkedinUrl
  };
}

function findNearestNameBefore(lines: string[], index: number) {
  for (let i = index - 1; i >= Math.max(0, index - 8); i -= 1) {
    if (isLikelyName(lines[i])) return i;
  }
  return -1;
}

function analyzeDraftProfile(input: Omit<GeneratorDraft, "recommendedTemplate" | "recommendationReason" | "researchSignals" | "confidence">): GeneratorDraft {
  const researchSignals = buildResearchSignals(input);
  const recommendedTemplate = recommendProposalTemplate(input);
  const template = proposalTemplates.find((item) => item.template === recommendedTemplate);
  const hasProfile = Boolean(input.name || input.role || input.company || input.pdfText || input.linkedinUrl);

  return {
    ...input,
    recommendedTemplate,
    recommendationReason: hasProfile
      ? template?.promise || "This template best matches the available profile context."
      : "Upload a LinkedIn PDF to get a stronger recommendation.",
    researchSignals,
    confidence: input.pdfText ? `${input.pdfText.length.toLocaleString()} PDF characters analyzed` : "Waiting for LinkedIn PDF"
  };
}

function profileLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => line.length < 140);
}

function isLikelyName(line: string) {
  const blocked =
    /(linkedin|contact|experience|education|activity|about|skills|followers|connections|www\.|@|http|public speaking|research|publications|languages|summary)/i;
  return !blocked.test(line) && /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3}$/.test(line);
}

function isSectionLabel(line: string) {
  return /^(about|activity|experience|education|licenses|skills|projects|publications|contact|recommendations)$/i.test(line);
}

function isRoleCompanyLine(line: string) {
  if (!/\b(at|@)\b/i.test(line) || /linkedin\.com|@.+\.|worked|built|drove|managed|supported|provided|launched/i.test(line)) return false;
  const match = line.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (!match) return false;
  const before = match[1].trim();
  const after = match[2].trim();
  return before.length <= 60 && after.length <= 60 && !/^(a|an|the|early|late)\b/i.test(after) && /^[A-Z0-9]/.test(before);
}

function inferExperienceRoleCompany(lines: string[]) {
  const experienceIndex = lines.findIndex((line) => /^experience$/i.test(line));
  const scoped = experienceIndex >= 0 ? lines.slice(experienceIndex + 1, experienceIndex + 12) : lines.slice(0, 30);
  const companyIndex = scoped.findIndex((line, index) => index < 5 && isLikelyCompanyName(line));
  const companyLine = companyIndex >= 0 ? scoped[companyIndex] : "";
  const titleIndex = scoped.slice(Math.max(companyIndex + 1, 0), Math.max(companyIndex + 6, 6)).findIndex((line) => isLikelyRoleTitle(line));
  if (titleIndex < 0) return { role: "", company: "" };
  const titleLine = scoped[Math.max(companyIndex + 1, 0) + titleIndex];
  return {
    role: cleanRoleTitle(titleLine),
    company: cleanCompanyName(companyLine)
  };
}

function isLikelyRoleTitle(line: string) {
  if (isSectionLabel(line) || isMetadataLine(line) || line.startsWith("–") || line.startsWith("-")) return false;
  return /\b(founder|co-founder|ceo|cto|vp|head|director|engineer|scientist|researcher|manager|lead|architect|associate|intern|consultant|professor|staff)\b/i.test(line);
}

function isLikelyCompanyName(line: string) {
  if (isSectionLabel(line) || isMetadataLine(line) || line.startsWith("–") || line.startsWith("-")) return false;
  if (!/^[A-Z0-9]/.test(line) || /[.!?]$/.test(line)) return false;
  if (/\b(company|initiative|worked|built|drove|managed|supported|provided|launched|directly|across)\b/i.test(line)) return false;
  return line.length <= 70 && !/\b(on-site|onsite|remote|hybrid|india|japan|united states|present|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\b/i.test(line);
}

function isMetadataLine(line: string) {
  return /^(full-time|part-time|contract|internship|self-employed|freelance|present|\d{4}|[A-Z][a-z]{2}\s+\d{4})/i.test(line);
}

function splitRoleCompany(line: string) {
  const normalized = line.replace(/\s+[|•].*$/, "").trim();
  const match = normalized.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (!match) return { role: "", company: "" };
  return {
    role: cleanProfileValue(match[1]),
    company: cleanProfileValue(match[2])
  };
}

function cleanProfileValue(value: string) {
  return value.replace(/\s+-\s+.*$/, "").replace(/\s{2,}/g, " ").trim();
}

function cleanRoleTitle(value: string) {
  return cleanProfileValue(value)
    .replace(/\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}.*$/i, "")
    .replace(/\s+\d{4}\s*[–-].*$/i, "")
    .trim();
}

function cleanCompanyName(value: string) {
  return cleanProfileValue(value).replace(/\s{2,}.*/, "").trim();
}

function buildResearchSignals(input: Pick<GeneratorDraft, "name" | "role" | "company" | "linkedinUrl" | "pdfText">) {
  const text = input.pdfText;
  const lower = `${input.name} ${input.role} ${input.company} ${text}`.toLowerCase();
  const signals: string[] = [];

  if (input.role || input.company) signals.push(`${input.role || "Technical leader"}${input.company ? ` at ${input.company}` : ""}`);
  if (/\b(phd|doctor of philosophy|university|iit|stanford|mit|research|scientist|professor|paper|publication)\b/i.test(text)) {
    signals.push(findLine(text, /\b(phd|doctor of philosophy|university|research|scientist|professor|paper|publication)\b/i) || "Strong research and academic signal in the profile");
  }
  if (/\b(founder|co-founder|ceo|built|launched|started)\b/i.test(lower)) {
    signals.push(findLine(text, /\b(founder|co-founder|ceo|built|launched|started)\b/i) || "Founder/operator background shows a strong personal story");
  }
  if (/\b(funding|backed|investor|vc|accelerator|y combinator|alchemist|sequoia|accel|a16z)\b/i.test(lower)) {
    signals.push(findLine(text, /\b(funding|backed|investor|vc|accelerator|y combinator|alchemist|sequoia|accel|a16z)\b/i) || "Funding and network signals can support a stronger founder narrative");
  }
  if (/\b(scale|millions|orders|latency|infrastructure|platform|commerce|fintech|logistics|reliability|systems)\b/i.test(lower)) {
    signals.push(findLine(text, /\b(scale|millions|orders|latency|infrastructure|platform|commerce|fintech|logistics|reliability|systems)\b/i) || "Operating context suggests production lessons worth unpacking");
  }
  if (input.linkedinUrl) signals.push("LinkedIn URL added for profile-specific context");

  return Array.from(new Set(signals)).slice(0, 5);
}

function findLine(text: string, pattern: RegExp) {
  return profileLines(text).find((line) => pattern.test(line));
}

function recommendProposalTemplate(input: Pick<GeneratorDraft, "role" | "company" | "pdfText">): ProposalTemplate {
  const lower = `${input.role} ${input.company} ${input.pdfText}`.toLowerCase();
  if (/\b(research|scientist|applied scientist|technical staff|phd|paper|publication|professor|lab)\b/.test(lower)) return "Research Exchange";
  if (/\b(cto|vp engineering|head of engineering|infrastructure|platform|commerce|fintech|logistics|reliability|scale|latency|orders)\b/.test(lower)) {
    return "Operator's Field Report";
  }
  if (/\b(100k|industry authority|keynote|creator|newsletter|large audience|thought leader)\b/.test(lower)) return "Founding Voice";
  if (/\b(founder|co-founder|ceo|visionary|category)\b/.test(lower)) return "Category Builder";
  if (/\b(principal|staff engineer|architect|fellow)\b/.test(lower)) return "Technical Legacy";
  return "Distribution";
}

function GuestInspector({
  guest,
  draft,
  onChange,
  onDelete
}: {
  guest?: Guest;
  draft: GeneratorDraft;
  onChange: (id: string, patch: Partial<Guest>) => void;
  onDelete: (id: string) => void;
}) {
  if (hasActiveDraft(draft)) return <DraftResearchPanel draft={draft} />;
  if (!guest) return <EmptyState />;
  const proposal = withProposalDefaults(guest.proposal, guest.name, guest.role, guest.company);

  return (
    <section className="panel inspector-panel">
      <div className="profile-card">
        <img src={guest.photoUrl} alt={guest.name} />
        <div>
          <p className="eyebrow">Selected guest</p>
          <h2>{guest.name}</h2>
          <p>{guest.role} · {guest.company}</p>
        </div>
      </div>
      <a className="primary-button inspector-open-button" href={`/proposal/${guest.slug}`} target="_blank">
        <ExternalLink size={16} />
        Open proposal
      </a>
      <ResearchSignalList signals={proposal.researchSignals} />
      <RecommendedTemplateCard template={proposal.strategy.template} reason={proposal.strategy.corePromise} />
    </section>
  );
}

function DraftResearchPanel({ draft }: { draft: GeneratorDraft }) {
  return (
    <section className="panel inspector-panel">
      <div className="profile-card">
        {draft.photoUrl ? <img src={draft.photoUrl} alt={draft.name || "Guest"} /> : <div className="avatar-placeholder"><Users size={18} /></div>}
        <div>
          <p className="eyebrow">Guest research</p>
          <h2>{draft.name || "Upload a profile"}</h2>
          <p>{[draft.role, draft.company].filter(Boolean).join(" · ") || draft.confidence}</p>
        </div>
      </div>
      <ResearchSignalList signals={draft.researchSignals} />
      <RecommendedTemplateCard template={draft.recommendedTemplate} reason={draft.recommendationReason} />
    </section>
  );
}

function hasActiveDraft(draft: GeneratorDraft) {
  return Boolean(draft.name || draft.role || draft.company || draft.linkedinUrl || draft.pdfName || draft.photoUrl || draft.pdfText);
}

function ResearchSignalList({ signals }: { signals: string[] }) {
  const icons = [GraduationCap, Wrench, Users, TrendingUp, BookOpen];
  return (
    <div className="research-list">
      {signals.length ? (
        signals.map((signal, index) => {
          const Icon = icons[index % icons.length];
          return (
            <div className="research-row" key={`${signal}-${index}`}>
              <Icon size={17} />
              <span>{signal}</span>
            </div>
          );
        })
      ) : (
        <div className="research-empty">
          <FileText size={18} />
          Upload a LinkedIn PDF to extract role, company, research signals, and a template recommendation.
        </div>
      )}
    </div>
  );
}

function RecommendedTemplateCard({ template, reason }: { template: ProposalTemplate; reason: string }) {
  const Icon = templateIcon(template);
  return (
    <div className="recommendation-card">
      <p className="eyebrow">Recommended template</p>
      <div>
        <div className="recommendation-icon">
          <Icon size={18} />
        </div>
        <span>
          <strong>{template}</strong>
          <small>{reason}</small>
        </span>
        <ArrowUpRight size={17} />
      </div>
    </div>
  );
}

function templateIcon(template: ProposalTemplate) {
  if (template === "Technical Legacy") return Code2;
  if (template === "Operator's Field Report") return TrendingUp;
  if (template === "Research Exchange") return BookOpen;
  if (template === "Category Builder") return Tags;
  if (template === "Founding Voice") return Mic2;
  return Wrench;
}

function PipelinePage({
  guests,
  selectedId,
  onSelect,
  onMove,
  onDelete,
  onNavigate
}: {
  guests: Guest[];
  selectedId: string;
  onSelect: (id: string) => void;
  onMove: (id: string, patch: Partial<Guest>) => void;
  onDelete: (id: string) => void;
  onNavigate: (path: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [draggingId, setDraggingId] = useState("");
  const [dropTarget, setDropTarget] = useState<PipelineStatus | "">("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [celebration, setCelebration] = useState<"done" | "ghosted" | "">("");
  const celebrationTimer = useRef<number | undefined>(undefined);
  const normalizedQuery = query.trim().toLowerCase();
  const activeGuests = guests.filter((guest) => guest.status !== ghostedStatus);
  const filteredGuests = normalizedQuery
    ? activeGuests.filter((guest) =>
        [guest.name, guest.role, guest.company, guest.email]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : activeGuests;
  const selectedGuest = guests.find((guest) => guest.id === selectedId);
  const bookedCount = activeGuests.filter((guest) => guest.status === "Booked").length;
  const liveCount = activeGuests.filter((guest) => guest.published).length;

  function openGuest(id: string) {
    onSelect(id);
    setSheetOpen(true);
  }

  function handleDrop(status: PipelineStatus) {
    if (!draggingId) return;
    const guest = guests.find((item) => item.id === draggingId);
    if (guest && guest.status !== status) {
      onMove(draggingId, { status });
      if (status === "Done") triggerCelebration("done");
      if (status === ghostedStatus) triggerCelebration("ghosted");
    }
    setDraggingId("");
    setDropTarget("");
  }

  function triggerCelebration(type: "done" | "ghosted") {
    if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current);
    setCelebration("");
    window.setTimeout(() => setCelebration(type), 20);
    celebrationTimer.current = window.setTimeout(() => setCelebration(""), 2200);
  }

  return (
    <section className="pipeline-page">
      <header className="pipeline-hero">
        <div>
          <h1>Pipeline</h1>
          <p>Drag guests between stages. Click any card for details, edits, and proposal actions.</p>
        </div>
      </header>

      <div className="pipeline-toolbar">
        <div className="pipeline-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guests, roles, companies..." />
        </div>
        <div className="pipeline-stats">
          <Stat value={activeGuests.length.toString()} label="Total guests" />
          <Stat value={liveCount.toString()} label="Published" />
          <Stat value={bookedCount.toString()} label="Booked" />
          <button className="primary-button pipeline-new-button" onClick={() => onNavigate("/")}>
            <Plus size={16} />
            New proposal
          </button>
        </div>
      </div>

      <div className="pipeline-board">
        {pipelineStatuses.map((status) => {
          const columnGuests = filteredGuests.filter((guest) => guest.status === status);
          return (
            <div
              className={`pipeline-column ${dropTarget === status ? "drop-target" : ""}`}
              key={status}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTarget(status);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget("");
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(status);
              }}
            >
              <header>
                <span>{status}</span>
                <Badge variant="secondary">{columnGuests.length}</Badge>
              </header>
              <div className="pipeline-column-list">
              {columnGuests.map((guest) => (
                <Card
                  className={`pipeline-card ${guest.id === selectedId ? "selected" : ""} ${guest.id === draggingId ? "dragging" : ""}`}
                  key={guest.id}
                  draggable
                  onClick={() => openGuest(guest.id)}
                  onDragStart={(event) => {
                    setDraggingId(guest.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", guest.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId("");
                    setDropTarget("");
                  }}
                >
                  <CardContent className="pipeline-card-content">
                    <Avatar>
                      <AvatarImage src={guest.photoUrl} alt={guest.name} />
                      <AvatarFallback>{initials(guest.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3>{guest.name}</h3>
                      <p>{guest.company}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!columnGuests.length ? <div className="pipeline-empty">Drop here</div> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`ghosted-drop-zone ${dropTarget === ghostedStatus ? "drop-target" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropTarget(ghostedStatus);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget("");
        }}
        onDrop={(event) => {
          event.preventDefault();
          handleDrop(ghostedStatus);
        }}
      >
        <Ghost size={22} />
        <span>Ghosted</span>
      </div>

      {celebration ? <PipelineCelebration type={celebration} /> : null}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          {selectedGuest ? (
            <PipelineGuestSheet
              guest={selectedGuest}
              onChange={onMove}
              onDelete={(id) => {
                onDelete(id);
                setSheetOpen(false);
              }}
              onEdit={() => onNavigate("/edit")}
            />
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Guest details</SheetTitle>
                <SheetDescription>Select a guest to see details.</SheetDescription>
              </SheetHeader>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function PipelineCelebration({ type }: { type: "done" | "ghosted" }) {
  if (type === "ghosted") {
    return (
      <div className="pipeline-celebration ghost-rain" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, index) => (
          <Ghost key={index} size={24 + (index % 4) * 5} />
        ))}
      </div>
    );
  }

  return (
    <div className="pipeline-celebration confetti-burst" aria-hidden="true">
      <div className="completion-badge">
        <Sparkles size={22} />
        <strong>Podcast completed</strong>
        <span>Episode moved to Done</span>
      </div>
      <div className="confetti-cannon left" />
      <div className="confetti-cannon right" />
      {Array.from({ length: 96 }).map((_, index) => (
        <span key={index} />
      ))}
      {Array.from({ length: 18 }).map((_, index) => (
        <i key={index} />
      ))}
    </div>
  );
}

function GhostedPage({
  guests,
  selectedId,
  onSelect,
  onChange,
  onDelete,
  onNavigate
}: {
  guests: Guest[];
  selectedId: string;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<Guest>) => void;
  onDelete: (id: string) => void;
  onNavigate: (path: string) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const ghostedGuests = guests.filter((guest) => guest.status === ghostedStatus);
  const selectedGuest = ghostedGuests.find((guest) => guest.id === selectedId) || ghostedGuests[0];

  function openGuest(id: string) {
    onSelect(id);
    setSheetOpen(true);
  }

  return (
    <section className="pipeline-page ghosted-page">
      <header className="pipeline-hero">
        <div>
          <h1>Ghosted</h1>
          <p>Profiles that stopped responding live here, out of the active pipeline but still easy to review.</p>
        </div>
      </header>

      {ghostedGuests.length ? (
        <div className="ghosted-grid">
          {ghostedGuests.map((guest) => (
            <Card
              className={`pipeline-card ${guest.id === selectedId ? "selected" : ""}`}
              key={guest.id}
              onClick={() => openGuest(guest.id)}
            >
              <CardContent className="pipeline-card-content">
                <Avatar>
                  <AvatarImage src={guest.photoUrl} alt={guest.name} />
                  <AvatarFallback>{initials(guest.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3>{guest.name}</h3>
                  <p>{guest.company}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="empty-state ghosted-empty">
          <Ghost size={26} />
          <h2>No ghosted profiles yet.</h2>
          <p>Drag a profile into the Ghosted drop zone from Pipeline when someone stops responding.</p>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          {selectedGuest ? (
            <PipelineGuestSheet
              guest={selectedGuest}
              onChange={onChange}
              onDelete={(id) => {
                onDelete(id);
                setSheetOpen(false);
              }}
              onEdit={() => onNavigate("/edit")}
            />
          ) : (
            <SheetHeader>
              <SheetTitle>Ghosted details</SheetTitle>
              <SheetDescription>Select a ghosted guest to see details.</SheetDescription>
            </SheetHeader>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function formatDate(value: string) {
  if (!value) return "Now";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function PipelineGuestSheet({
  guest,
  onChange,
  onDelete,
  onEdit
}: {
  guest: Guest;
  onChange: (id: string, patch: Partial<Guest>) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
}) {
  const [draft, setDraft] = useState({
    name: guest.name,
    role: guest.role,
    company: guest.company,
    linkedinUrl: guest.linkedinUrl,
    email: guest.email,
    notes: guest.notes
  });
  const shareUrl = `${window.location.origin}/proposal/${guest.slug}`;

  useEffect(() => {
    setDraft({
      name: guest.name,
      role: guest.role,
      company: guest.company,
      linkedinUrl: guest.linkedinUrl,
      email: guest.email,
      notes: guest.notes
    });
  }, [guest.id, guest.name, guest.role, guest.company, guest.linkedinUrl, guest.email, guest.notes]);

  function updateDraft(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function commitField(field: keyof typeof draft) {
    const value = draft[field].trim();
    if (value === guest[field]) return;
    onChange(guest.id, { [field]: value } as Partial<Guest>);
  }

  const linkedinHref = externalProfileUrl(draft.linkedinUrl);

  return (
    <>
      <SheetHeader>
        <div className="sheet-profile">
          <Avatar>
            <AvatarImage src={guest.photoUrl} alt={guest.name} />
            <AvatarFallback>{initials(guest.name)}</AvatarFallback>
          </Avatar>
          <div>
            <SheetTitle>{guest.name}</SheetTitle>
            <SheetDescription>{guest.role} · {guest.company}</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="sheet-stack">
        <div className="share-box">
          <Link size={16} />
          <span>{shareUrl}</span>
          <button onClick={() => navigator.clipboard.writeText(shareUrl)} title="Copy proposal link">
            <Copy size={15} />
          </button>
        </div>

        <div className="sheet-actions">
          <a className="primary-button" href={`/proposal/${guest.slug}`} target="_blank">
            <ExternalLink size={16} />
            Open proposal
          </a>
          <Button variant="outline" onClick={onEdit}>
            <PencilLine size={16} />
            Edit copy
          </Button>
        </div>

        <div className="sheet-section">
          <p className="eyebrow">Guest details</p>
          <div className="sheet-field-grid">
            <label>
              Name
              <input
                value={draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
                onBlur={() => commitField("name")}
                placeholder="Guest name"
              />
            </label>
            <label>
              Role
              <input
                value={draft.role}
                onChange={(event) => updateDraft("role", event.target.value)}
                onBlur={() => commitField("role")}
                placeholder="Role"
              />
            </label>
            <label>
              Company
              <input
                value={draft.company}
                onChange={(event) => updateDraft("company", event.target.value)}
                onBlur={() => commitField("company")}
                placeholder="Company"
              />
            </label>
            <label>
              Email
              <input
                value={draft.email}
                onChange={(event) => updateDraft("email", event.target.value)}
                onBlur={() => commitField("email")}
                placeholder="Add email once secured"
                type="email"
              />
            </label>
            <label className="sheet-field-wide">
              LinkedIn
              <div className="linked-field">
                <input
                  value={draft.linkedinUrl}
                  onChange={(event) => updateDraft("linkedinUrl", event.target.value)}
                  onBlur={() => commitField("linkedinUrl")}
                  placeholder="https://linkedin.com/in/..."
                />
                <a
                  aria-disabled={!linkedinHref}
                  className={`icon-link-button ${linkedinHref ? "" : "disabled"}`}
                  href={linkedinHref || undefined}
                  target="_blank"
                  title="Open LinkedIn profile"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </label>
          </div>
        </div>

        <label className="sheet-notes">
          Notes
          <textarea
            value={draft.notes}
            onChange={(event) => updateDraft("notes", event.target.value)}
            onBlur={() => commitField("notes")}
            placeholder="Add follow-up context, guest preferences, email status, topic ideas, or anything to remember."
          />
        </label>

        <Button variant="outline" className="danger-button" onClick={() => onDelete(guest.id)}>
          <Trash2 size={16} />
          Delete profile
        </Button>
      </div>
    </>
  );
}

function externalProfileUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function EditPage({
  guests,
  selectedId,
  onSelect,
  onChange
}: {
  guests: Guest[];
  selectedId: string;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<Guest>) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedGuest = guests.find((guest) => guest.id === selectedId) ?? guests[0];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredGuests = normalizedQuery
    ? guests.filter((guest) =>
        [guest.name, guest.role, guest.company, guest.proposal.episodeTitle]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : guests;

  return (
    <section className="edit-page">
      <header className="edit-hero">
        <div>
          <p className="eyebrow">Proposal editor</p>
          <h1>Edit one proposal at a time.</h1>
          <p>Select a guest, tune the copy, check the fixed podcast links, and open the live page when it is ready.</p>
        </div>
        {selectedGuest ? (
          <a className="primary-button" href={`/proposal/${selectedGuest.slug}`} target="_blank">
            <ExternalLink size={16} />
            Open proposal
          </a>
        ) : null}
      </header>

      <div className="edit-layout">
        <aside className="proposal-picker">
          <div className="picker-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a proposal..." />
          </div>
          <div className="picker-list">
            {filteredGuests.map((guest) => (
              <button
                className={`picker-card ${guest.id === selectedGuest?.id ? "active" : ""}`}
                key={guest.id}
                onClick={() => onSelect(guest.id)}
              >
                <img src={guest.photoUrl} alt="" />
                <span>
                  <strong>{guest.name}</strong>
                  <small>{guest.role} · {guest.company}</small>
                  <em>{guest.published ? "Live" : "Draft"} · {guest.viewed} views</em>
                </span>
              </button>
            ))}
            {!filteredGuests.length ? <div className="picker-empty">No matching proposals.</div> : null}
          </div>
        </aside>

        <div className="edit-main">
          {selectedGuest ? (
            <ProposalEditor guest={selectedGuest} onChange={onChange} />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </section>
  );
}

function ProposalEditor({
  guest,
  onChange
}: {
  guest: Guest;
  onChange: (id: string, patch: Partial<Guest>) => void;
}) {
  const proposal = withProposalDefaults(guest.proposal, guest.name, guest.role, guest.company);

  function updateProposal(patch: Partial<ProposalContent>) {
    onChange(guest.id, { proposal: { ...proposal, ...patch } });
  }

  async function handleHostPhoto(file?: File) {
    if (!file) return;
    updateProposal({ hostPhotoUrl: await fileToDataUrl(file) });
  }

  return (
    <section className="panel editor-panel" id="proposal">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Proposal copy</p>
          <h2>Edit before sharing.</h2>
        </div>
        <Mic2 size={22} />
      </div>
      <label>
        Hero headline
        <input value={proposal.heroHeadline} onChange={(event) => updateProposal({ heroHeadline: event.target.value })} />
      </label>
      <label>
        Crisp researched intro
        <textarea value={proposal.heroIntro} onChange={(event) => updateProposal({ heroIntro: event.target.value })} />
      </label>
      <div className="editor-split">
        <label>
          Proposal strategy
          <select
            value={proposal.strategy.template}
            onChange={(event) =>
              updateProposal({
                strategy: {
                  ...proposal.strategy,
                  template: event.target.value as ProposalContent["strategy"]["template"]
                }
              })
            }
          >
            {[
              "Distribution",
              "Technical Legacy",
              "Operator's Field Report",
              "Research Exchange",
              "Category Builder",
              "Founding Voice"
            ].map((template) => (
              <option key={template}>{template}</option>
            ))}
          </select>
        </label>
        <label>
          Core promise
          <input
            value={proposal.strategy.corePromise}
            onChange={(event) =>
              updateProposal({ strategy: { ...proposal.strategy, corePromise: event.target.value } })
            }
          />
        </label>
      </div>
      <label>
        Why them
        <textarea value={proposal.whyThem} onChange={(event) => updateProposal({ whyThem: event.target.value })} />
      </label>
      <label>
        Why now
        <textarea value={proposal.whyNow} onChange={(event) => updateProposal({ whyNow: event.target.value })} />
      </label>
      <label>
        Editorial thesis
        <textarea value={proposal.editorialThesis} onChange={(event) => updateProposal({ editorialThesis: event.target.value })} />
      </label>
      <label>
        Supporting angles
        <textarea
          value={proposal.supportingAngles.join("\n")}
          onChange={(event) => updateProposal({ supportingAngles: event.target.value.split("\n").filter(Boolean) })}
        />
      </label>
      <label>
        Research signals
        <textarea
          value={proposal.researchSignals.join("\n")}
          onChange={(event) => updateProposal({ researchSignals: event.target.value.split("\n").filter(Boolean) })}
        />
      </label>
      <label>
        Observation
        <textarea value={proposal.observation} onChange={(event) => updateProposal({ observation: event.target.value })} />
      </label>
      <label>
        Sharp question
        <textarea value={proposal.sharpQuestion} onChange={(event) => updateProposal({ sharpQuestion: event.target.value })} />
      </label>
      <div className="editor-split">
        <label>
          How they help us
          <textarea value={proposal.howTheyHelpUs} onChange={(event) => updateProposal({ howTheyHelpUs: event.target.value })} />
        </label>
        <label>
          How we help them
          <textarea value={proposal.howWeHelpThem} onChange={(event) => updateProposal({ howWeHelpThem: event.target.value })} />
        </label>
      </div>
      <label>
        Episode title
        <input value={proposal.episodeTitle} onChange={(event) => updateProposal({ episodeTitle: event.target.value })} />
      </label>
      <div className="editor-split">
        {proposal.previousEpisodes.map((episode, index) => (
          <div className="nested-editor" key={index}>
            <p className="eyebrow">Fixed podcast {index + 1}</p>
            <strong>{episode.title}</strong>
            <span>{episode.guest}</span>
            <a href={episode.url} target="_blank">{episode.url}</a>
          </div>
        ))}
      </div>
      <label className="upload-drop host-upload">
        <Upload size={18} />
        <span>{proposal.hostPhotoUrl ? "Replace Prasad photo" : "Upload Prasad photo"}</span>
        <input type="file" accept="image/*" onChange={(event) => handleHostPhoto(event.target.files?.[0])} />
      </label>
      <label>
        What we'd cover
        <textarea
          value={proposal.topics.join("\n")}
          onChange={(event) => updateProposal({ topics: event.target.value.split("\n").filter(Boolean) })}
        />
      </label>
      <label>
        Your Host section copy
        <textarea value={proposal.hostFit} onChange={(event) => updateProposal({ hostFit: event.target.value })} />
      </label>
      <label>
        CTA
        <textarea value={proposal.personalizedCta} onChange={(event) => updateProposal({ personalizedCta: event.target.value })} />
      </label>
    </section>
  );
}

function ProposalPage({ guest, onViewed }: { guest?: Guest; onViewed: () => void }) {
  useEffect(() => onViewed(), []);
  useEffect(() => {
    document.documentElement.dataset.theme = localStorage.getItem("ae-theme") || "dark";
  }, []);

  if (!guest || !guest.published) {
    return (
      <>
        <SeoManager
          title="Proposal Not Available | Agentic Engineering"
          description="This Agentic Engineering podcast proposal is unpublished or the link is incorrect."
          path={window.location.pathname}
          noindex
        />
        <main className="proposal-page missing">
          <h1>This proposal is not available.</h1>
          <p>The link may be unpublished or incorrect.</p>
        </main>
      </>
    );
  }

  const proposal = withProposalDefaults(guest.proposal, guest.name, guest.role, guest.company);
  const proposalTitle = `${guest.name}, join Agentic Engineering with Prasad Pilla`;
  const proposalDescription = `Prasad Pilla is inviting ${guest.name} from ${guest.company} to join the Agentic Engineering podcast and share valuable insights with serious AI builders.`;
  const proposalImage = isPublicShareImage(guest.photoUrl) ? guest.photoUrl : defaultSeoImage;
  const proposalSkin = templateClassName(proposal.strategy.template);
  const proposalFrame = proposalFrameForTemplate(proposal.strategy.template);
  const proposalReasons = proposalReasonsForTemplate(proposal.reasons, proposalFrame, proposal.strategy.template);

  return (
    <>
      <SeoManager
        title={proposalTitle}
        description={proposalDescription}
        image={proposalImage}
        path={`/proposal/${guest.slug}`}
        type="profile"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          name: proposalTitle,
          description: proposalDescription,
          image: toShareImageUrl(proposalImage),
          mainEntity: {
            "@type": "Person",
            name: guest.name,
            jobTitle: guest.role,
            worksFor: {
              "@type": "Organization",
              name: guest.company
            }
          },
          publisher: {
            "@type": "Organization",
            name: siteName,
            logo: {
              "@type": "ImageObject",
              url: toShareImageUrl(defaultSeoImage)
            }
          }
        }}
      />
      <main className={`proposal-page ${proposalSkin} proposal-layout-${proposalFrame.layout}`}>
        <ThemeSwitch className="proposal-theme-switch" />
        <section className="proposal-hero">
        <div className="proposal-hero-copy">
          <div className="proposal-logo">AE <span>Agentic Engineering</span></div>
          <h1>{proposal.heroHeadline}</h1>
          <p>{proposal.heroIntro}</p>
          <div className="hero-stats">
            {proposalFrame.heroStats.map((stat) => (
              <Stat key={stat.value} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
        <aside className="hero-guest-card">
          <img src={guest.photoUrl} alt={guest.name} />
          <div>
            <span>Invited guest</span>
            <h2>{guest.name}</h2>
            <p>{guest.role} · {guest.company}</p>
          </div>
        </aside>
        </section>

      <ProposalBand label={proposalFrame.positioningLabel} title={proposalFrame.positioningTitle}>
        <div className="audience-grid">
          {proposalFrame.positioningCards.map((card) => {
            const Icon = card.icon;
            return (
              <div className="mini-card" key={card.title}>
                <Icon size={18} />
                <strong>{card.title}</strong>
                <span>{card.body}</span>
              </div>
            );
          })}
        </div>
        <blockquote>{proposalFrame.positioningQuote || proposal.audienceQuote}</blockquote>
      </ProposalBand>

      <ProposalBand label={proposalFrame.reasonLabel} title={proposalFrame.reasonTitle}>
        <div className="reason-grid">
          {proposalReasons.map((reason, index) => (
            <div className="reason-card" key={reason.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{reason.title}</h3>
              <p>{reason.body}</p>
            </div>
          ))}
        </div>
      </ProposalBand>

      <ProposalBand label={proposalFrame.proofLabel} title={proposalFrame.proofTitle}>
        <div className="proof-grid">
          <div className="proof-card">
            <p className="proposal-label">{proposalFrame.signalLabel}</p>
            {proposal.researchSignals.slice(0, 5).map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
          <div className="proof-card">
            <p className="proposal-label">Observation</p>
            <strong>{proposal.observation}</strong>
          </div>
          <div className="proof-card">
            <p className="proposal-label">Sharp question</p>
            <strong>{proposal.sharpQuestion}</strong>
          </div>
        </div>
      </ProposalBand>

      <ProposalBand label={proposalFrame.episodeLabel} title={proposal.episodeTitle}>
        <div className="episode-brief">
          <p>{proposal.editorialThesis}</p>
        </div>
        <p className="section-copy">{proposalFrame.topicIntro}</p>
        <div className="topic-cloud">
          {proposal.topics.map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
        </div>
      </ProposalBand>

      <ProposalBand label="Recent episodes" title="See what the conversations look like.">
        <div className="episode-grid">
          {proposal.previousEpisodes.slice(0, 2).map((episode) => (
            <EpisodeCard key={`${episode.title}-${episode.url}`} title={episode.title} guest={episode.guest} url={episode.url} />
          ))}
        </div>
      </ProposalBand>

      <ProposalBand label="Your host" title="Practitioner, not pundit.">
        <div className="host-card">
          <img src={proposal.hostPhotoUrl} alt="Prasad Pilla" />
          <div className="host-profile">
            <h3>Prasad Pilla</h3>
            <p className="host-role">Host · Founder & CEO, Supatest</p>
            <div className="host-tags">
              <span>2x Founder</span>
              <span>CEO, Supatest</span>
              <span>AI coding nerd</span>
              <span>Host, Agentic Engineering</span>
            </div>
            <div className="host-socials">
              <a href="https://x.com/prasad_pilla" target="_blank">X @prasad_pilla</a>
              <a href="https://www.linkedin.com/in/prasadpilla/" target="_blank">in LinkedIn</a>
            </div>
          </div>
        </div>
      </ProposalBand>

      <ProposalBand label="What to expect" title="A conversation, not an interview.">
        <div className="expect-grid">
          {[
            "60-90 minutes",
            "Prep questions in advance",
            "Recorded on video & audio",
            "Practitioner-first questions",
            "Audience Q&A option",
            "Content you can repurpose"
          ].map((item) => (
            <div key={item}><CalendarDays size={18} /><strong>{item}</strong></div>
          ))}
        </div>
      </ProposalBand>

      <footer className="proposal-cta">
        <img src={guest.photoUrl} alt={guest.name} />
        <h2>{proposal.personalizedCta}</h2>
        <p>We keep the calendar lean and the conversations meaningful.</p>
        <div>
          <a className="primary-button" href="https://cal.com/prasadsupatest/meet?duration=30" target="_blank">
            Book a conversation <ArrowRight size={16} />
          </a>
          <a className="secondary-link" href="https://www.youtube.com/@TheAgenticEngineering" target="_blank">Watch episodes</a>
        </div>
      </footer>
      </main>
    </>
  );
}

function ProposalBand({
  label,
  title,
  children
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="proposal-band">
      <p className="proposal-label">{label}</p>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function EpisodeCard({ title, guest, url }: { title: string; guest: string; url: string }) {
  const thumbnail = getYouTubeThumbnail(url);
  return (
    <a className="episode-card" href={url} target="_blank">
      <div className="play-thumb" style={thumbnail ? { backgroundImage: `linear-gradient(135deg, rgba(0, 0, 0, 0.08), rgba(79, 118, 255, 0.12)), url("${thumbnail}")` } : undefined}>
        <div className="play-button">▶</div>
      </div>
      <p>Episode</p>
      <h3>{title}</h3>
      <span>{guest}</span>
    </a>
  );
}

function withProposalDefaults(
  proposal: Partial<ProposalContent>,
  name: string,
  role: string,
  company: string
): ProposalContent {
  const defaults = defaultProposal(name, role, company);
  const merged = {
    ...defaults,
    ...proposal,
    strategy: {
      ...defaults.strategy,
      ...proposal.strategy,
      primaryMotivations: proposal.strategy?.primaryMotivations?.length
        ? proposal.strategy.primaryMotivations
        : defaults.strategy.primaryMotivations
    },
    previousEpisodes: defaults.previousEpisodes
  };
  return makeProposalGuestFacing(merged, name);
}

function templateClassName(template: ProposalContent["strategy"]["template"]) {
  return `proposal-${template.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

type ProposalFrame = {
  layout: string;
  heroStats: Array<{ value: string; label: string }>;
  positioningLabel: string;
  positioningTitle: string;
  positioningQuote: string;
  positioningCards: Array<{
    title: string;
    body: string;
    icon: React.ComponentType<{ size?: number }>;
  }>;
  reasonLabel: string;
  reasonTitle: string;
  proofLabel: string;
  proofTitle: string;
  signalLabel: string;
  episodeLabel: string;
  topicIntro: string;
  fallbackReasons: Array<{ title: string; body: string }>;
};

function proposalFrameForTemplate(template: ProposalContent["strategy"]["template"]): ProposalFrame {
  if (template === "Research Exchange") {
    return {
      layout: "research",
      heroStats: [
        { value: "Peers", label: "Technical listeners" },
        { value: "Depth", label: "No simplified takes" },
        { value: "Buildable", label: "Ideas into systems" }
      ],
      positioningLabel: "Why this room",
      positioningTitle: "A technical conversation for people who can actually follow the idea.",
      positioningQuote:
        "You would be speaking to people technical enough to follow the details and practical enough to build from them.",
      positioningCards: [
        {
          title: "Peer-level listeners",
          body: "Researchers, applied builders, and technical leaders who care about the details, not just the headline.",
          icon: GraduationCap
        },
        {
          title: "No marketing layer",
          body: "We keep the conversation close to the work: assumptions, failures, trade-offs, and what the research unlocks.",
          icon: BookOpen
        },
        {
          title: "Buildable translation",
          body: "The goal is to help serious builders understand what they can test, adapt, or question from your work.",
          icon: Wrench
        },
        {
          title: "Durable explanation",
          body: "You leave with a clear public artifact that captures the idea without flattening the technical nuance.",
          icon: FileText
        }
      ],
      reasonLabel: "Why this is worth your time",
      reasonTitle: "Three reasons to bring the idea here.",
      proofLabel: "Research fit",
      proofTitle: "We are starting from the work, not a generic guest bio.",
      signalLabel: "Signals we will build from",
      episodeLabel: "Discussion map",
      topicIntro: "Potential technical threads we would explore with you:",
      fallbackReasons: [
        {
          title: "A serious technical room",
          body: "The point is not reach for its own sake. It is a conversation with people who can follow the research and ask useful questions."
        },
        {
          title: "Translate without flattening",
          body: "We help turn the core idea into a clear public explanation while preserving the assumptions, limits, and technical nuance."
        },
        {
          title: "Make the idea buildable",
          body: "The episode should give applied builders enough context to test, adapt, or challenge the work in real systems."
        }
      ]
    };
  }

  if (template === "Operator's Field Report") {
    return {
      layout: "operator",
      heroStats: [
        { value: "CTOs", label: "Fellow operators" },
        { value: "Systems", label: "Production reality" },
        { value: "Trade-offs", label: "No demo theater" }
      ],
      positioningLabel: "Why this operator room",
      positioningTitle: "Trade notes with people making the same hard calls.",
      positioningQuote:
        "You would be speaking to fellow CTOs, AI tinkerers, and engineering operators who care about what survives contact with production.",
      positioningCards: [
        {
          title: "Fellow CTOs",
          body: "Engineering leaders and AI tinkerers comparing what actually survives inside teams and systems.",
          icon: Users
        },
        {
          title: "Production lessons",
          body: "Reliability, security, cost, governance, team adoption, and the messy parts most talks skip.",
          icon: Wrench
        },
        {
          title: "Useful replay value",
          body: "A conversation other operators can replay when they hit the same decision point.",
          icon: FileText
        },
        {
          title: "Hard-earned judgment",
          body: "We put your operating taste at the center, not a surface-level founder story.",
          icon: TrendingUp
        }
      ],
      reasonLabel: "Why operators listen",
      reasonTitle: "Three reasons this should not feel like another podcast slot.",
      proofLabel: "Operating context",
      proofTitle: "We will anchor the episode in the decisions only you can explain.",
      signalLabel: "Operating signals",
      episodeLabel: "Field report",
      topicIntro: "Potential operating questions we would pressure-test with you:",
      fallbackReasons: [
        {
          title: "Talk to people with the same scars",
          body: "This is for CTOs and operators who know the gap between a promising demo and a system a team can actually trust."
        },
        {
          title: "Share the decision logic",
          body: "The useful part is how you chose trade-offs around reliability, cost, security, process, and adoption."
        },
        {
          title: "Create a field note others replay",
          body: "A good operator episode becomes a reference point for teams about to face the same constraints."
        }
      ]
    };
  }

  if (template === "Category Builder") {
    return {
      layout: "category",
      heroStats: [
        { value: "Narrative", label: "Category language" },
        { value: "Builders", label: "Founder/operator peers" },
        { value: "Asset", label: "Reusable thesis" }
      ],
      positioningLabel: "Why this category moment",
      positioningTitle: "Turn your point of view into the clearest version of the category.",
      positioningQuote:
        "You would be speaking to builders and technical operators who are trying to name this shift while they are living through it.",
      positioningCards: [
        {
          title: "Narrative ownership",
          body: "We help sharpen the language around the market you are building, not just introduce the company.",
          icon: Tags
        },
        {
          title: "Founder peers",
          body: "The room is builders, operators, and technical leaders who can become believers, collaborators, or critics.",
          icon: Users
        },
        {
          title: "Market timing",
          body: "The episode frames why this shift matters now and what old assumptions are breaking.",
          icon: TrendingUp
        },
        {
          title: "Reusable thesis",
          body: "You leave with a public artifact your team can reuse when explaining the category.",
          icon: FileText
        }
      ],
      reasonLabel: "Why shape it here",
      reasonTitle: "Three reasons this helps the category, not just the episode.",
      proofLabel: "Narrative research",
      proofTitle: "We will connect your story to the category shift around it.",
      signalLabel: "Category signals",
      episodeLabel: "Proposed thesis",
      topicIntro: "Potential category angles we would discuss with you:",
      fallbackReasons: [
        {
          title: "Define the category language",
          body: "You get to explain the shift in your own words before the market reduces it to shallow labels."
        },
        {
          title: "Find aligned builders",
          body: "The room is technical enough to understand the category and practical enough to push on what it means in the field."
        },
        {
          title: "Leave with a reusable thesis",
          body: "The conversation becomes a sharper artifact for your team, customers, candidates, and category believers."
        }
      ]
    };
  }

  if (template === "Founding Voice") {
    return {
      layout: "founding",
      heroStats: [
        { value: "Signal", label: "Prepared conversation" },
        { value: "Standard", label: "Raise the bar" },
        { value: "Artifact", label: "Worth pointing to" }
      ],
      positioningLabel: "Why this invitation",
      positioningTitle: "A prepared conversation that respects what you have already built.",
      positioningQuote:
        "This is not a reach play. It is a prepared conversation designed to be worth pointing serious builders toward afterward.",
      positioningCards: [
        {
          title: "No generic circuit",
          body: "We do not need another broad AI take. We want the specific judgment behind your work.",
          icon: Sparkles
        },
        {
          title: "Editorial seriousness",
          body: "The prep is designed to make the conversation worth your time and useful after it airs.",
          icon: BookOpen
        },
        {
          title: "Field standard",
          body: "Your perspective can help define what serious agentic engineering conversations should sound like.",
          icon: Check
        },
        {
          title: "Reusable record",
          body: "The output is a clean asset you can share when people ask how you think about the field.",
          icon: FileText
        }
      ],
      reasonLabel: "Why say yes",
      reasonTitle: "Three reasons this respects your time.",
      proofLabel: "Prepared angle",
      proofTitle: "We will bring a point of view, not a blank interview doc.",
      signalLabel: "What we studied",
      episodeLabel: "Editorial premise",
      topicIntro: "Potential standards-setting threads we would explore:",
      fallbackReasons: [
        {
          title: "A conversation with a point of view",
          body: "We come prepared with an angle strong enough to make the episode worth your time."
        },
        {
          title: "Set a higher bar",
          body: "Your perspective can help define what serious agentic engineering conversations should sound like."
        },
        {
          title: "Create something worth sharing",
          body: "The output should feel like a clear record of your thinking, not a disposable podcast appearance."
        }
      ]
    };
  }

  if (template === "Technical Legacy") {
    return {
      layout: "legacy",
      heroStats: [
        { value: "Taste", label: "How you reason" },
        { value: "Record", label: "Durable thinking" },
        { value: "Depth", label: "Trade-offs preserved" }
      ],
      positioningLabel: "Why record this",
      positioningTitle: "Capture the technical judgment behind the work.",
      positioningQuote:
        "You would be creating a durable record of the principles and trade-offs that shaped your technical decisions.",
      positioningCards: [
        {
          title: "Principles over headlines",
          body: "We focus on the decisions, constraints, and taste that shaped your technical path.",
          icon: Code2
        },
        {
          title: "A useful record",
          body: "The episode becomes something future builders can return to, not a one-week content hit.",
          icon: BookOpen
        },
        {
          title: "Deep trade-offs",
          body: "Architecture, reliability, tooling, and judgment get room to breathe.",
          icon: Wrench
        },
        {
          title: "Practitioner respect",
          body: "The conversation assumes competence and spends time where the real decisions live.",
          icon: Users
        }
      ],
      reasonLabel: "Why preserve it now",
      reasonTitle: "Three reasons your thinking is worth recording.",
      proofLabel: "Technical context",
      proofTitle: "We will build from your actual decisions and constraints.",
      signalLabel: "Signals we will preserve",
      episodeLabel: "Technical record",
      topicIntro: "Potential principles and trade-offs we would unpack:",
      fallbackReasons: [
        {
          title: "Preserve how you think",
          body: "The best part of the episode is not a recap of what you built, it is the reasoning behind the choices."
        },
        {
          title: "Go deep on trade-offs",
          body: "We make room for constraints, taste, architecture, and the judgment that only shows up after real work."
        },
        {
          title: "Give future builders a record",
          body: "The conversation becomes something technical people can return to when facing similar decisions."
        }
      ]
    };
  }

  return {
    layout: "distribution",
    heroStats: [
      { value: "Builders", label: "Relevant reach" },
      { value: "Clips", label: "Reusable assets" },
      { value: "Clear", label: "No fluff story" }
    ],
    positioningLabel: "Why Agentic Engineering",
    positioningTitle: "Get your ideas in front of builders who can use them.",
    positioningQuote: "",
    positioningCards: [
      {
        title: "Relevant builders",
        body: "Founders, engineers, and operators actively learning how agentic workflows are changing teams.",
        icon: Users
      },
      {
        title: "Clear positioning",
        body: "We help make your product, insight, or operating lesson easy for technical people to understand.",
        icon: Mic2
      },
      {
        title: "Reusable assets",
        body: "A focused episode, summary, and clips your team can reuse after recording.",
        icon: FileText
      },
      {
        title: "Practical conversation",
        body: "We keep it specific, useful, and grounded in what you are actually building.",
        icon: Sparkles
      }
    ],
    reasonLabel: "Why join us",
    reasonTitle: "Three reasons to come on Agentic Engineering.",
    proofLabel: "We did the homework",
    proofTitle: "The conversation starts from your actual context.",
    signalLabel: "What we noticed",
    episodeLabel: "Proposed episode",
    topicIntro: "Potential topics we would discuss with you:",
    fallbackReasons: [
      {
        title: "Reach relevant builders",
        body: "The audience is technical enough to understand what you are building and practical enough to try it."
      },
      {
        title: "Make the idea easier to share",
        body: "We help turn your point of view into a clear episode, summary, and clips your team can reuse."
      },
      {
        title: "Keep the conversation practical",
        body: "The episode stays focused on what you have learned, what works, and what builders can take away."
      }
    ]
  };
}

function proposalReasonsForTemplate(
  reasons: ProposalContent["reasons"],
  frame: ProposalFrame,
  template: ProposalContent["strategy"]["template"]
) {
  const available = reasons.slice(0, 3);
  if (template !== "Research Exchange") {
    return available.length === 3 ? available : frame.fallbackReasons;
  }

  const forbidden = /\b(reach|buyers?|customers?|sell|pipeline|audience of|companies like|stripe|databricks|cto'?s?|decision-makers?)\b/i;
  const cleaned = available.map((reason, index) => {
    const text = `${reason.title} ${reason.body}`;
    return forbidden.test(text) ? frame.fallbackReasons[index] : reason;
  });
  return cleaned.length === 3 ? cleaned : frame.fallbackReasons;
}

function makeProposalGuestFacing(proposal: ProposalContent, name: string): ProposalContent {
  return {
    ...proposal,
    audienceQuote: secondPersonCopy(proposal.audienceQuote, name),
    whyThem: secondPersonCopy(proposal.whyThem, name),
    whyNow: secondPersonCopy(proposal.whyNow, name),
    editorialThesis: secondPersonCopy(proposal.editorialThesis, name),
    supportingAngles: proposal.supportingAngles.map((angle) => secondPersonCopy(angle, name)),
    observation: secondPersonCopy(proposal.observation, name),
    sharpQuestion: secondPersonCopy(proposal.sharpQuestion, name),
    howTheyHelpUs: secondPersonCopy(proposal.howTheyHelpUs, name),
    howWeHelpThem: secondPersonCopy(proposal.howWeHelpThem, name),
    reasons: proposal.reasons.map((reason) => ({
      title: secondPersonCopy(reason.title, name),
      body: secondPersonCopy(reason.body, name)
    })),
    personalizedCta: secondPersonCopy(proposal.personalizedCta, name)
  };
}

function secondPersonCopy(value: string, name: string) {
  if (!value) return value;
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value
    .replace(new RegExp(`${escapedName}\\s+is\\s+`, "gi"), "You are ")
    .replace(new RegExp(`${escapedName}\\s+has\\s+`, "gi"), "You have ")
    .replace(new RegExp(`${escapedName}\\s+brings\\s+`, "gi"), "You bring ")
    .replace(new RegExp(`${escapedName}\\s+can\\s+`, "gi"), "You can ")
    .replace(new RegExp(`${escapedName}'s\\s+`, "gi"), "Your ")
    .replace(/\bthis guest\b/gi, "you")
    .replace(/\btheir work\b/gi, "your work")
    .replace(/\btheir perspective\b/gi, "your perspective")
    .replace(/\btheir judgment\b/gi, "your judgment")
    .replace(/\btheir team\b/gi, "your team");
}

function getYouTubeThumbnail(url: string) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : "";
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="panel empty-state">
      <Plus size={28} />
      <h2>Create your first guest proposal.</h2>
      <p>Upload a LinkedIn PDF and a photo, then generate a personalized page.</p>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
