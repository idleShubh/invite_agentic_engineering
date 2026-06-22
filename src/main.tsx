import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Copy,
  Eye,
  ExternalLink,
  FileText,
  Link,
  Loader2,
  Mic2,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Upload,
  Users
} from "lucide-react";
import { generateProposalWithDeepSeek } from "./deepseek";
import { extractPdfText, fileToDataUrl } from "./pdf";
import { defaultProposal } from "./sampleData";
import { loadGuests, saveGuests, slugify } from "./storage";
import { Guest, PipelineStatus, ProposalContent, pipelineStatuses } from "./types";
import "./styles.css";

const siteName = "Agentic Engineering";
const defaultSeoImage = "/agentic-engineering-logo.png";

function App() {
  const [guests, setGuests] = useState<Guest[]>(loadGuests);
  const [selectedId, setSelectedId] = useState(guests[0]?.id ?? "");
  const pathname = window.location.pathname;
  const proposalSlug = window.location.pathname.match(/^\/proposal\/([^/]+)/)?.[1];
  const selectedGuest = guests.find((guest) => guest.id === selectedId) ?? guests[0];

  useEffect(() => saveGuests(guests), [guests]);

  if (proposalSlug) {
    const guest = guests.find((item) => item.slug === proposalSlug);
    return <ProposalPage guest={guest} onViewed={() => markViewed(guest?.id)} />;
  }

  if (pathname === "/pipeline") {
    return (
      <>
        <SeoManager
          title="Guest Outreach Pipeline | Agentic Engineering"
          description="Track Agentic Engineering podcast guest outreach from reach out to contacted, in process, booked, and done."
          path="/pipeline"
        />
        <AppFrame>
          <PipelinePage guests={guests} selectedId={selectedId} onSelect={setSelectedId} onMove={updateGuest} />
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
        <AppFrame>
          <EditPage guests={guests} selectedId={selectedId} onSelect={setSelectedId} onChange={updateGuest} />
        </AppFrame>
      </>
    );
  }

  function upsertGuest(nextGuest: Guest) {
    setGuests((current) => {
      const exists = current.some((guest) => guest.id === nextGuest.id);
      return exists
        ? current.map((guest) => (guest.id === nextGuest.id ? nextGuest : guest))
        : [nextGuest, ...current];
    });
    setSelectedId(nextGuest.id);
  }

  function updateGuest(id: string, patch: Partial<Guest>) {
    setGuests((current) =>
      current.map((guest) =>
        guest.id === id ? { ...guest, ...patch, updatedAt: new Date().toISOString() } : guest
      )
    );
  }

  function markViewed(id?: string) {
    if (!id) return;
    setGuests((current) =>
      current.map((guest) => (guest.id === id ? { ...guest, viewed: guest.viewed + 1 } : guest))
    );
  }

  return (
    <>
      <SeoManager
        title="Podcast Proposal Generator | Agentic Engineering"
        description="Generate personalized Agentic Engineering podcast invitation pages from LinkedIn profiles, add guest photos, and prepare shareable proposal links for AI engineering leaders."
        path="/"
      />
      <AppFrame>
        <section className="workspace">
          <header className="topbar">
            <div>
              <p className="eyebrow">Guest outreach studio</p>
              <h1>Personalized podcast proposals, tracked from reach out to done.</h1>
            </div>
            {selectedGuest ? (
              <div className="topbar-actions">
                <a className="secondary-link compact" href="/pipeline">
                  <Users size={16} />
                  Pipeline
                </a>
                <a className="secondary-link compact" href="/edit">
                  <PencilLine size={16} />
                  Edit
                </a>
                <a className="primary-button" href={`/proposal/${selectedGuest.slug}`} target="_blank">
                  <ExternalLink size={16} />
                  Open proposal
                </a>
              </div>
            ) : null}
          </header>

          <section className="grid-two" id="generator">
            <GeneratorCard onSave={upsertGuest} />
            <GuestInspector guest={selectedGuest} onChange={updateGuest} />
          </section>

        </section>
      </AppFrame>
    </>
  );
}

function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = window.location.pathname;
  const [apiKey, setApiKey] = useState(localStorage.getItem("deepseek-api-key") ?? "");

  useEffect(() => {
    localStorage.setItem("deepseek-api-key", apiKey);
  }, [apiKey]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AE</div>
          <div>
            <strong>Agentic Engineering</strong>
            <span>Proposal Generator</span>
          </div>
        </div>
        <nav className="side-nav">
          <a className={pathname === "/" ? "active" : ""} href="/">Generator</a>
          <a className={pathname === "/edit" ? "active" : ""} href="/edit">Edit</a>
          <a className={pathname === "/pipeline" ? "active" : ""} href="/pipeline">Pipeline</a>
        </nav>
        <div className="sidebar-note">
          <Sparkles size={16} />
          DeepSeek drafts the personalization. You keep editorial control before sharing.
        </div>
        <div className="sidebar-api">
          <div>
            <p className="eyebrow">DeepSeek API</p>
            <span>{apiKey.trim() ? "Saved for this browser" : "Add once, use everywhere"}</span>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-..."
            aria-label="DeepSeek API key"
          />
        </div>
      </aside>
      {children}
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

function GeneratorCard({ onSave }: { onSave: (guest: Guest) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfText, setPdfText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function handlePdf(file?: File) {
    if (!file) return;
    setBusy("Extracting PDF");
    setError("");
    try {
      setPdfName(file.name);
      setPdfText(await extractPdfText(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that PDF.");
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
        apiKey: localStorage.getItem("deepseek-api-key") ?? "",
        name: safeName,
        role: safeRole,
        company: safeCompany,
        linkedinText: pdfText || `${safeName} ${safeRole} ${safeCompany} ${linkedinUrl}`
      });
      const now = new Date().toISOString();
      const guest: Guest = {
        id: crypto.randomUUID(),
        name: safeName,
        email,
        role: safeRole,
        company: safeCompany,
        linkedinUrl,
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
      onSave(guest);
      setName("");
      setEmail("");
      setRole("");
      setCompany("");
      setLinkedinUrl("");
      setPhotoUrl("");
      setPdfName("");
      setPdfText("");
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
      <div className="field-grid">
        <label>
          Guest name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Anuj Kumar" />
        </label>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="anuj@company.com" />
        </label>
        <label>
          Role
          <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="VP of Engineering" />
        </label>
        <label>
          Company
          <input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="AI Infra Co." />
        </label>
        <label>
          LinkedIn URL
          <input value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} placeholder="https://linkedin.com/in/..." />
        </label>
      </div>
      <div className="upload-row">
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
      {pdfText ? <p className="extract-note">{pdfText.length.toLocaleString()} characters extracted from PDF.</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <button className="primary-button wide" onClick={generate} disabled={Boolean(busy)}>
        {busy ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
        {busy || "Generate personalized proposal"}
      </button>
    </section>
  );
}

function GuestInspector({
  guest,
  onChange
}: {
  guest?: Guest;
  onChange: (id: string, patch: Partial<Guest>) => void;
}) {
  if (!guest) return <EmptyState />;
  const shareUrl = `${window.location.origin}/proposal/${guest.slug}`;

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
      <div className="metrics-row">
        <Stat value={guest.status} label="Pipeline" />
        <Stat value={guest.viewed.toString()} label="Views" />
        <Stat value={guest.published ? "Live" : "Draft"} label="Proposal" />
      </div>
      <label>
        Pipeline stage
        <select value={guest.status} onChange={(event) => onChange(guest.id, { status: event.target.value as PipelineStatus })}>
          {pipelineStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      <div className="share-box">
        <Link size={16} />
        <span>{shareUrl}</span>
        <button onClick={() => navigator.clipboard.writeText(shareUrl)} title="Copy proposal link">
          <Copy size={15} />
        </button>
      </div>
      <button className="secondary-button" onClick={() => onChange(guest.id, { published: !guest.published })}>
        <Check size={16} />
        {guest.published ? "Mark as draft" : "Publish proposal"}
      </button>
    </section>
  );
}

function PipelinePage({
  guests,
  selectedId,
  onSelect,
  onMove
}: {
  guests: Guest[];
  selectedId: string;
  onSelect: (id: string) => void;
  onMove: (id: string, patch: Partial<Guest>) => void;
}) {
  const [query, setQuery] = useState("");
  const [draggingId, setDraggingId] = useState("");
  const [dropTarget, setDropTarget] = useState<PipelineStatus | "">("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredGuests = normalizedQuery
    ? guests.filter((guest) =>
        [guest.name, guest.role, guest.company, guest.email]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : guests;
  const bookedCount = guests.filter((guest) => guest.status === "Booked").length;
  const liveCount = guests.filter((guest) => guest.published).length;
  const viewedCount = guests.reduce((total, guest) => total + guest.viewed, 0);

  function handleDrop(status: PipelineStatus) {
    if (!draggingId) return;
    const guest = guests.find((item) => item.id === draggingId);
    if (guest && guest.status !== status) {
      onMove(draggingId, { status });
    }
    setDraggingId("");
    setDropTarget("");
  }

  return (
    <section className="pipeline-page">
      <header className="pipeline-hero">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h1>Guest outreach board.</h1>
          <p>Move each guest from first reach out to done without crowding the proposal generator.</p>
        </div>
        <a className="primary-button" href="/">
          <Plus size={16} />
          New proposal
        </a>
      </header>

      <div className="pipeline-toolbar">
        <div className="pipeline-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guests, roles, companies..." />
        </div>
        <div className="pipeline-stats">
          <Stat value={guests.length.toString()} label="Total guests" />
          <Stat value={liveCount.toString()} label="Published" />
          <Stat value={bookedCount.toString()} label="Booked" />
          <Stat value={viewedCount.toString()} label="Proposal views" />
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
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDropTarget("");
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(status);
              }}
            >
              <header>
                <div>
                  <strong>{status}</strong>
                  <span>{columnGuests.length} {columnGuests.length === 1 ? "guest" : "guests"}</span>
                </div>
                <small>{Math.round((columnGuests.length / Math.max(filteredGuests.length, 1)) * 100)}%</small>
              </header>
              {columnGuests.map((guest) => (
                <article
                  className={`pipeline-card ${guest.id === selectedId ? "selected" : ""} ${guest.id === draggingId ? "dragging" : ""}`}
                  key={guest.id}
                  draggable
                  onClick={() => onSelect(guest.id)}
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
                  <div className="pipeline-card-head">
                    <img src={guest.photoUrl} alt="" />
                    <div>
                      <h3>{guest.name}</h3>
                      <p>{guest.role}</p>
                    </div>
                  </div>
                  <p className="pipeline-company">{guest.company}</p>
                  <div className="pipeline-card-meta">
                    <span className={guest.published ? "live-pill" : "draft-pill"}>
                      {guest.published ? "Live" : "Draft"}
                    </span>
                    <span><Eye size={13} /> {guest.viewed}</span>
                  </div>
                  <select
                    value={guest.status}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onMove(guest.id, { status: event.target.value as PipelineStatus })}
                  >
                    {pipelineStatuses.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <div className="pipeline-card-actions">
                    <a href={`/proposal/${guest.slug}`} target="_blank" onClick={(event) => event.stopPropagation()}>
                      Open <ChevronRight size={14} />
                    </a>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        navigator.clipboard.writeText(`${window.location.origin}/proposal/${guest.slug}`);
                      }}
                    >
                      <Copy size={14} /> Copy link
                    </button>
                  </div>
                </article>
              ))}
              {!columnGuests.length ? (
                <div className="pipeline-empty">No guests here yet.</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
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
  const proposalTitle = `${guest.name} Podcast Invitation | Agentic Engineering`;
  const proposalDescription = `A personalized Agentic Engineering podcast proposal for ${guest.name}, ${guest.role} at ${guest.company}, with audience context, episode topics, and booking details.`;
  const proposalImage = isPublicShareImage(guest.photoUrl) ? guest.photoUrl : defaultSeoImage;

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
      <main className="proposal-page">
        <section className="proposal-hero">
        <div className="proposal-hero-copy">
          <div className="proposal-logo">AE <span>Agentic Engineering</span></div>
          <h1>{proposal.heroHeadline}</h1>
          <p>{proposal.heroIntro}</p>
          <div className="hero-stats">
            <Stat value="170+" label="CTOs & VPs in community" />
            <Stat value="Active" label="Decision-makers" />
            <Stat value="Growing" label="Agentic engineering community" />
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

      <ProposalBand label="The audience" title="You are not talking to an audience. You are talking to a room of buyers.">
        <div className="audience-grid">
          {["CTOs", "VPs of Engineering", "Staff Engineers", "AI-native founders"].map((item) => (
            <div className="mini-card" key={item}>
              <Mic2 size={18} />
              <strong>{item}</strong>
              <span>People evaluating what to build, buy, deploy, and trust.</span>
            </div>
          ))}
        </div>
        <blockquote>{proposal.audienceQuote}</blockquote>
      </ProposalBand>

      <ProposalBand label="Why you" title="Three reasons to say yes.">
        <div className="reason-grid">
          {proposal.reasons.slice(0, 3).map((reason, index) => (
            <div className="reason-card" key={reason.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{reason.title}</h3>
              <p>{reason.body}</p>
            </div>
          ))}
        </div>
      </ProposalBand>

      <ProposalBand label="What we'd cover" title="Real systems. Real problems. No hype.">
        <p className="section-copy">A proposed episode: <strong>{proposal.episodeTitle}</strong></p>
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
          <img src={proposal.hostPhotoUrl} alt="Prasad Pillai" />
          <div className="host-profile">
            <h3>Prasad Pillai</h3>
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
  return { ...defaults, ...proposal, previousEpisodes: defaults.previousEpisodes };
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
