import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { translations, localizedError, formatHeaderDate } from "./i18n.js";
import "./styles.css";

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.error || "Something went wrong. Please try again.",
    );
    error.code = data.code;
    throw error;
  }
  return data;
}

function translateWeatherSummary(summary, t, language) {
  if (!summary || language !== "or") return summary;
  let text = summary.replace(/humidity/gi, "ଆର୍ଦ୍ରତା");
  for (const [english, odia] of Object.entries(t.weatherConditions).sort(
    ([a], [b]) => b.length - a.length,
  ))
    text = text.replaceAll(english, odia);
  if (text.includes("Current weather could not be retrieved"))
    return t.errWeather;
  if (text.includes("Set your farm location")) return t.errSetLocation;
  return text;
}

function translateProvider(provider, t, language) {
  if (language !== "or") return provider;
  return provider
    ?.replace("Local demo mode", "ସ୍ଥାନୀୟ ଡେମୋ ମୋଡ୍")
    .replace("Local symptom guide", "ସ୍ଥାନୀୟ ଲକ୍ଷଣ ଗାଇଡ୍")
    .replace("Gemini image analysis", "Gemini ଫଟୋ ବିଶ୍ଳେଷଣ");
}

function getGreeting(t, date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Kolkata",
    })
      .formatToParts(date)
      .find((part) => part.type === "hour")?.value ?? date.getHours(),
  );
  if (hour >= 5 && hour < 12) return t.greetingMorning;
  if (hour >= 12 && hour < 17) return t.greetingAfternoon;
  if (hour >= 21 || hour < 5) return t.greetingNight;
  return t.greetingEvening;
}

function formatIndiaTime(date, language) {
  return new Intl.DateTimeFormat(language === "or" ? "or-IN" : "en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("home");
  const [history, setHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [adminData, setAdminData] = useState(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState("all");
  const [adminEventFilter, setAdminEventFilter] = useState("all");
  const [adminTo, setAdminTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [adminFrom, setAdminFrom] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const [language, setLanguage] = useState(() =>
    localStorage.getItem("km-language") === "or" ? "or" : "en",
  );
  const [authMode, setAuthMode] = useState("login");
  const [adminSetupAvailable, setAdminSetupAvailable] = useState(false);
  const [adminContactEmail, setAdminContactEmail] = useState("");
  const [approvedReset, setApprovedReset] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [translationStatus, setTranslationStatus] = useState("");
  const resultRef = useRef(null);
  const resetRequestsRef = useRef(null);
  const [gpsPlace, setGpsPlace] = useState(null);
  const [locationNote, setLocationNote] = useState("");
  const [locating, setLocating] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [cropAnalysisStatus, setCropAnalysisStatus] = useState(null);
  const [soilSaving, setSoilSaving] = useState(false);
  const [soilNotice, setSoilNotice] = useState("");
  const [soilFormOpen, setSoilFormOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const t = translations[language];
  const adminText = (english, odia) => language === "or" ? odia : english;
  const adminEventLabel = (event) => language !== "or" ? event : event
    .replace("login_success", "ସଫଳ ସାଇନ୍-ଇନ୍").replace("admin_login_success", "ପ୍ରଶାସକ ସାଇନ୍-ଇନ୍ ସଫଳ")
    .replace("login_failed", "ସାଇନ୍-ଇନ୍ ବିଫଳ").replace("admin_login_failed", "ପ୍ରଶାସକ ସାଇନ୍-ଇନ୍ ବିଫଳ")
    .replace("login_blocked", "ସାଇନ୍-ଇନ୍ ଅବରୋଧ").replace("logout", "ଲଗ୍ ଆଉଟ୍")
    .replace("account_created", "ଖାତା ତିଆରି").replace("password_reset_requested", "ପାସୱାର୍ଡ ପୁନଃସେଟ୍ ଅନୁରୋଧ")
    .replace("password_reset_resolved", "ପାସୱାର୍ଡ ପୁନଃସେଟ୍ ସମାଧାନ").replace("password_reset_rejected", "ପାସୱାର୍ଡ ପୁନଃସେଟ୍ ଅଗ୍ରାହ୍ୟ");
  const locale = language === "or" ? "or-IN" : "en-IN";
  const filteredHistory = history.filter((item) =>
    [
      item.crop,
      item.growthStage,
      item.village,
      item.block,
      item.district,
      item.probableIssue,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase(locale)
      .includes(historySearch.trim().toLocaleLowerCase(locale)),
  );
  const filteredAdminFarmers = (adminData?.farmers || []).filter((farmer) => {
    const query = adminSearch.trim().toLowerCase();
    const matchesQuery = !query || `${farmer.name} ${farmer.email}`.toLowerCase().includes(query);
    const matchesStatus = adminStatusFilter === "all" || (adminStatusFilter === "active" ? farmer.is_active : !farmer.is_active);
    return matchesQuery && matchesStatus;
  });
  const filteredAdminEvents = (adminData?.events || []).filter((event) => {
    const query = adminSearch.trim().toLowerCase();
    const matchesQuery = !query || `${event.email} ${event.event}`.toLowerCase().includes(query);
    return matchesQuery && (adminEventFilter === "all" || event.event.includes(adminEventFilter));
  });
  const adminOverviewUrl = () => `/api/admin/overview?from=${encodeURIComponent(adminFrom)}&to=${encodeURIComponent(adminTo)}`;
  const refreshAdminOverview = async () => {
    if (!adminData) setAdminBusy(true);
    setAdminMessage("");
    try {
      setAdminData(await api(adminOverviewUrl()));
    } catch (error) {
      setAdminMessage(error.message);
    } finally {
      setAdminBusy(false);
    }
  };
  const exportHistory = () => {
    const csvCell = (value) => {
      let text = String(value ?? "").replaceAll('"', '""');
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text}"`;
    };
    const rows = [
      [t.csvDate, t.csvCrop, t.csvStage, t.csvLocation, t.csvAssessment],
      ...filteredHistory.map((item) => [
        new Date(item.createdAt).toLocaleString(locale),
        item.crop,
        item.growthStage,
        [item.village, item.block, item.district].filter(Boolean).join(", "),
        item.probableIssue,
      ]),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `krushi-mitra-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  useEffect(() => {
    document.documentElement.lang = language === "or" ? "or" : "en";
  }, [language]);
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    api("/api/status")
      .then((status) => {
        setCropAnalysisStatus(status.integrations?.cropAnalysis || null);
        setAdminSetupAvailable(Boolean(status.adminSetupAvailable));
        setAdminContactEmail(status.adminContactEmail || "");
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    api("/api/auth/me")
      .then((u) => {
        setUser(u);
        setLanguage(u.language || "en");
        localStorage.setItem("km-language", u.language || "en");
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (user) refreshWeather().catch(() => {});
  }, [user?.id]);
  useEffect(() => {
    if (user && (view === "history" || view === "home"))
      api("/api/diagnoses")
        .then(setHistory)
        .catch(() => setHistory([]));
  }, [user, view]);
  useEffect(() => {
    if (user?.role === "admin" && view === "admin") {
      refreshAdminOverview();
    }
  }, [user, view]);
  useEffect(() => {
    if (!result?.id || view !== "diagnose" || result.language === language) {
      setTranslationStatus("");
      return;
    }
    let active = true;
    setTranslationStatus("loading");
    api("/api/diagnoses/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: result.id, language }),
    })
      .then((translated) => {
        if (active) {
          setResult((current) =>
            current?.id === result.id ? translated : current,
          );
          setTranslationStatus("");
        }
      })
      .catch(() => {
        if (active) setTranslationStatus("failed");
      });
    return () => {
      active = false;
    };
  }, [result?.id, result?.language, view, language]);
  useEffect(() => {
    if (!result || view !== "diagnose") return;
    const frame = requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      resultRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [result, view]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const changeLanguage = async (value) => {
    setLanguage(value);
    localStorage.setItem("km-language", value);
    if (user) {
      try {
        const updated = await api("/api/auth/me", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ language: value }),
        });
        setUser(updated);
      } catch {
        /* The interface preference still applies for this session. */
      }
    }
  };
  const login = async (event) => {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    body.language = language;
    try {
      if (authMode === "forgot") {
        if (!adminContactEmail) throw new Error("Administrator email is not configured. Set ADMIN_EMAIL in the backend .env and restart the server.");
        const gmailTab = window.open("about:blank", "_blank");
        await api("/api/auth/password-reset-request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: body.email }) });
        const subject = encodeURIComponent("Krushi Mitra password reset request");
        const message = encodeURIComponent(`Hello Administrator,\n\nI cannot access my Krushi Mitra account and request a password reset.\n\nRegistered email: ${body.email}\n\nPlease verify my identity before issuing a temporary password.\n\nThank you.`);
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(adminContactEmail)}&su=${subject}&body=${message}`;
        if (gmailTab) gmailTab.location.href = gmailUrl;
        else window.location.assign(gmailUrl);
        setAuthNotice(t.authGmailNotice);
        setBusy(false);
        return;
      }
      const nextUser = await api(
        authMode === "admin-setup"
          ? "/api/admin/setup"
          : authMode === "admin-login"
            ? "/api/admin/login"
            : `/api/auth/${authMode === "login" ? "login" : "register"}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      setWeather(null);
      setWeatherError("");
      if (authMode === "admin-setup") setAdminSetupAvailable(false);
      setUser(nextUser);
      setLanguage(nextUser.language || language);
      localStorage.setItem("km-language", nextUser.language || language);
    } catch (error) {
      setAuthError(localizedError(error.message, t));
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setView("home");
      setHistory([]);
      setResult(null);
      setWeather(null);
      setWeatherError("");
      setLocationNote("");
    }
  };
  const updateAdminAccount = async (farmerId, changes) => {
    setAdminMessage("");
    try {
      await api(`/api/admin/farmers/${farmerId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(changes),
      });
      setAdminData(await api(adminOverviewUrl()));
      setAdminMessage(changes.active === undefined ? "Account role updated." : changes.active ? "Account enabled." : "Account disabled; its sessions were ended.");
    } catch (error) { setAdminMessage(error.message); }
  };
  const revokeAdminSessions = async (farmerId) => {
    setAdminMessage("");
    try {
      const result = await api(`/api/admin/farmers/${farmerId}/revoke-sessions`, { method: "POST" });
      setAdminData(await api(adminOverviewUrl()));
      setAdminMessage(`${result.revoked} session(s) ended.`);
    } catch (error) { setAdminMessage(error.message); }
  };
  const exportAdminCsv = (rows, filename) => {
    const cell = (value) => {
      let text = String(value ?? "").replaceAll('"', '""');
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text}"`;
    };
    const csv = `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;
    const href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = href; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };
  const saveAssessmentPdf = (report) => {
    const previousTitle = document.title;
    const cropSlug =
      String(report?.crop || "crop")
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9-]+/g, "-")
        .replace(/^-|-$/g, "") || "crop";
    document.title = `Krushi-Mitra-${cropSlug}-Assessment`;
    document.body.classList.add("printing-assessment");
    try {
      window.print();
    } finally {
      document.body.classList.remove("printing-assessment");
      document.title = previousTitle;
    }
  };
  const refreshWeather = async (coords) => {
    setWeatherBusy(true);
    setWeatherError("");
    try {
      const query = coords
        ? `?latitude=${encodeURIComponent(coords.latitude)}&longitude=${encodeURIComponent(coords.longitude)}`
        : "";
      const current = await api(`/api/weather/current${query}`);
      setWeather(current);
      return current;
    } catch (error) {
      setWeatherError(localizedError(error.message, t));
      throw error;
    } finally {
      setWeatherBusy(false);
    }
  };
  const saveSoil = async (event) => {
    event.preventDefault();
    setSoilSaving(true);
    setSoilNotice("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(
      [
        "soilPh",
        "soilNitrogen",
        "soilPhosphorus",
        "soilPotassium",
        "soilOrganicCarbon",
      ].map((key) => {
        const value = form.get(key);
        return [key, value === "" ? null : Number(value)];
      }),
    );
    try {
      const updated = await api("/api/auth/me", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      setUser(updated);
      setSoilNotice(t.soilSaved);
      setSoilFormOpen(false);
    } catch {
      setSoilNotice(t.soilSaveError);
    } finally {
      setSoilSaving(false);
    }
  };
  const saveFarmerProfile = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileNotice("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    body.farmSizeAcres =
      body.farmSizeAcres === "" ? null : Number(body.farmSizeAcres);
    body.farmingExperienceYears =
      body.farmingExperienceYears === ""
        ? null
        : Number(body.farmingExperienceYears);
    try {
      const updated = await api("/api/auth/me", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      setUser(updated);
      setProfileNotice(t.profileSaved);
    } catch {
      setProfileNotice(t.profileSaveError);
    } finally {
      setProfileSaving(false);
    }
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setLocationNote(t.locUnavailable);
      return;
    }
    setWeatherError("");
    setLocating(true);
    setLocationNote(t.requestingLocation);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocating(false);
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        try {
          let place = null;
          try {
            place = (
              await api(
                `/api/location/reverse?latitude=${encodeURIComponent(coords.latitude)}&longitude=${encodeURIComponent(coords.longitude)}`,
              )
            ).location;
          } catch {
            /* Coordinates still work if place lookup is unavailable. */
          }
          const updated = await api("/api/auth/me", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              ...coords,
              ...(place?.village ? { village: place.village } : {}),
              ...(place?.district ? { district: place.district } : {}),
            }),
          });
          setUser(updated);
          setGpsPlace(place);
          setLocationNote(
            place
              ? `${t.gpsUsing}: ${place.displayName}`
              : `${t.gpsUsing} (${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}).`,
          );
        } catch (error) {
          setLocationNote(localizedError(error.message, t));
        }
        refreshWeather(coords).catch(() => {});
      },
      (error) => {
        setLocating(false);
        setLocationNote(
          error.code === 1
            ? t.permissionDenied
            : error.code === 3
              ? t.gpsTimeout
              : t.gpsFailed,
        );
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 },
    );
  };
  const diagnose = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    setNotice(t.checking);
    const form = new FormData(event.currentTarget);
    try {
      form.set("language", language);
      const resultData = await api("/api/diagnoses", {
        method: "POST",
        body: form,
      });
      setResult(resultData);
      setNotice(t.saved);
      setHistory((items) => [resultData, ...items]);
      try {
        const profile = await api("/api/auth/me", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            district: form.get("district"),
            block: form.get("block"),
            village: form.get("village"),
          }),
        });
        setUser(profile);
        setGpsPlace(null);
      } catch {
        /* The diagnosis has already been saved successfully. */
      }
      refreshWeather().catch(() => {});
    } catch (error) {
      setFormError(t[error.code] || localizedError(error.message, t));
      setNotice("");
    } finally {
      setBusy(false);
    }
  };
  const go = (next) => {
    setView(next);
    setNotice("");
    setFormError("");
    if (next !== "diagnose") setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const latest = history[0];
  const hasSoilData = [
    "soilPh",
    "soilNitrogen",
    "soilPhosphorus",
    "soilPotassium",
    "soilOrganicCarbon",
  ].some((key) => user?.[key] != null);
  const profilePlace = [user?.village, user?.district]
    .filter(Boolean)
    .join(", ");
  const headerLocation =
    gpsPlace?.displayName ||
    profilePlace ||
    (user?.latitude != null && user?.longitude != null
      ? `${t.gpsLocation} (${Number(user.latitude).toFixed(3)}, ${Number(user.longitude).toFixed(3)})`
      : t.setLocation);

  if (!user)
    return (
      <main className="auth-page">
        <div className="auth-brand">
          <span className="logo-mark">✳</span>
          <span>
            krushi<span className="brand-muted">mitra</span>
            <small>{t.subtitle}</small>
          </span>
          <select
            aria-label={t.lang}
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
          >
            <option value="en">EN</option>
            <option value="or">ଓଡ଼ିଆ</option>
          </select>
        </div>
        <div className="auth-wrap">
          <div className="auth-intro">
            <p className="eyebrow">{t.tagline}</p>
            <h1>
              {t.authTitle}
              <br />
              <em>{t.authTitleEm}</em>
            </h1>
            <p>{t.authIntro}</p>
            <div className="auth-feature-list">
              <div><span className="auth-feature-icon">⌕</span><b>{t.authFeatureCrop}</b></div>
              <div><span className="auth-feature-icon">☼</span><b>{t.authFeatureWeather}</b></div>
              <div><span className="auth-feature-icon">♧</span><b>{t.authFeatureRecords}</b></div>
            </div>
            <span className="trust">✦ &nbsp; {t.trust}</span>
          </div>
          <form className="auth-card" onSubmit={login}>
            <div className="auth-card-brand"><span>✳</span><div><b>KRUSHI MITRA</b><small>{t.authBrandCaption}</small></div></div>
            <div className="auth-tabs">
              {authMode === "admin-login" ? (
                <>
                  <button type="button" className="selected">{t.authAdmin}</button>
                  <button type="button" onClick={() => { setAuthMode("login"); setAuthError(""); }}>{t.authFarmer}</button>
                </>
              ) : (
                <>
              <button
                type="button"
                className={authMode === "login" ? "selected" : ""}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
              >
                {t.login}
              </button>
              <button
                type="button"
                className={authMode === "register" ? "selected" : ""}
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                }}
              >
                {t.signup}
              </button>
              {adminSetupAvailable && (
                  <button type="button" className={authMode === "admin-setup" ? "selected" : ""} onClick={() => { setAuthMode("admin-setup"); setAuthError(""); }}>
                  {t.authSetup}
                </button>
              )}
                </>
              )}
            </div>
            <h2>{authMode === "forgot" ? t.authForgotTitle : authMode === "admin-login" ? t.authAdmin : authMode === "login" ? t.welcome : authMode === "admin-setup" ? t.authCreateAdmin : t.join}</h2>
            <p className="muted">
              {authMode === "forgot" ? t.authForgotIntro : authMode === "admin-login" ? t.authAdminIntro : authMode === "login" ? t.loginHint : authMode === "admin-setup" ? t.authSetupIntro : t.signupHint}
            </p>
            {(authMode === "register" || authMode === "admin-setup") && (
              <label>
                {t.name}
                <input
                  name="name"
                  required
                  maxLength="100"
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              {t.email}
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder={t.emailPlaceholder}
              />
            </label>
            {authMode === "forgot" && <p className="auth-forgot-contact">{t.authDraftTo} <b>{adminContactEmail || "Administrator email is not set"}</b></p>}
            {authMode === "admin-setup" && (
              <label>
                {t.authAdminSetupKey}
                <input type="password" name="setupKey" required autoComplete="off" />
              </label>
            )}
            {authMode !== "forgot" && <label>
              {t.password}
              <input
                type="password"
                name="password"
                required
                minLength="8"
                maxLength="100"
                autoComplete={
                  authMode === "login" ? "current-password" : "new-password"
                }
                placeholder={t.passwordPlaceholder}
              />
            </label>}
            <button disabled={busy} className="button full">
              {busy ? t.wait : authMode === "forgot" ? t.authForgotButton : authMode === "admin-login" ? t.authAdmin : authMode === "login" ? t.login : authMode === "admin-setup" ? t.authCreateAdmin : t.signup}{" "}
              <span>→</span>
            </button>
            {authError && <p className="error">{authError}</p>}
            {authNotice && <p role="status" className="auth-success">{authNotice}</p>}
            <p className="form-note">{t.privateNote}</p>
            {authMode === "login" && <div className="auth-links"><button type="button" className="auth-admin-link" onClick={() => { setAuthMode("forgot"); setAuthError(""); setAuthNotice(""); }}><span>Forgot password?</span><b>Request help <span aria-hidden="true">→</span></b></button><button type="button" className="auth-admin-link" onClick={() => { setAuthMode("admin-login"); setAuthError(""); }}><span>Administrator</span><b>Admin sign in <span aria-hidden="true">↗</span></b></button></div>}
            {authMode === "forgot" && <button type="button" className="auth-back-link" onClick={() => { setAuthMode("login"); setAuthError(""); setAuthNotice(""); }}>← {t.authBack}</button>}
          </form>
        </div>
      </main>
    );

  return (
    <div className="layout">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
        >
          <span className="logo-mark">✳</span>
          <span>
            krushi<span className="brand-muted">mitra</span>
            <small>{t.subtitle}</small>
          </span>
        </a>
        <div className="nav-label">{t.workspace}</div>
        <button
          className={view === "home" ? "nav-item active" : "nav-item"}
          onClick={() => go("home")}
        >
          <span>⌂</span>
          {t.overview}
        </button>
        <button
          className={view === "diagnose" ? "nav-item active" : "nav-item"}
          onClick={() => go("diagnose")}
        >
          <span>⌕</span>
          {t.diagnose}
        </button>
        <button
          className={view === "history" ? "nav-item active" : "nav-item"}
          onClick={() => go("history")}
        >
          <span>◷</span>
          {t.history}
        </button>
        <button
          className={view === "profile" ? "nav-item active" : "nav-item"}
          onClick={() => go("profile")}
        >
          <span>♙</span>
          {t.profileNav}
        </button>
        {user.role === "admin" && (
          <button className={view === "admin" ? "nav-item active" : "nav-item"} onClick={() => go("admin")}>
            <span>⚙</span>{t.adminNav}
          </button>
        )}
        <div className="sidebar-bottom">
          <div className="advisor-card">
            <span>✦</span>
            <b>{t.note}</b>
            <p>{t.adviceCopy}</p>
          </div>
          <div className="user-mini">
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="user-label">
              <b>{user.name}</b>
              <small>
                {user.district ||
                  (language === "or" ? "ଓଡ଼ିଶା, ଭାରତ" : "Odisha, India")}
              </small>
            </span>
            <button
              className="logout"
              title={t.signOut}
              aria-label={t.signOut}
              onClick={logout}
            >
              <span aria-hidden="true">↗</span>
              <span className="logout-label">{t.signOut}</span>
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              {formatHeaderDate(new Date(), language)}
            </div>
            <b className="page-title">{t.pageTitle}</b>
          </div>
          <div className="top-actions">
            <span className="location-top" title={headerLocation}>
              ⌖ {headerLocation}
            </span>
            <select
              aria-label={t.lang}
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
            >
              <option value="en">EN</option>
              <option value="or">ଓଡ଼ିଆ</option>
            </select>
            <span className="avatar top-avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <button type="button" className="top-logout" onClick={logout}>
              <span aria-hidden="true">↗</span>
              <span>{t.signOut}</span>
            </button>
          </div>
        </header>
        {view === "home" && (
          <section className="page">
            <div className="hero">
              <div className="landscape">
                <i className="sun" />
                <i className="hill one" />
                <i className="hill two" />
                <span>♧</span>
              </div>
              <div className="hero-copy">
                <p className="eyebrow">✳ &nbsp;{t.today}</p>
                <h1>
                  {getGreeting(t, currentTime)}
                  <br />
                  <em>{user.name.split(" ")[0]}.</em>
                </h1>
                <p>
                  {language === "or"
                    ? "ଆଜିର ଛୋଟ, ସଠିକ୍ ପଦକ୍ଷେପ ଅମଳରେ ଭଲ ଫଳ ଦେଇପାରେ।"
                    : "Small, informed steps today can make a difference at harvest."}
                </p>
                <small className="hero-local-time">
                  <span aria-hidden="true">◷</span>
                  {t.indiaTime} · {formatIndiaTime(currentTime, language)}
                </small>
                <button className="button" onClick={() => go("diagnose")}>
                  {t.check} <span>→</span>
                </button>
              </div>
            </div>
            <article className="farmer-profile">
              <div className="profile-avatar">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="profile-identity">
                <span>{t.farmerProfile}</span>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </div>
              <div className="profile-location">
                <span>{t.farmDetails}</span>
                <strong>{profilePlace || t.locationNotSet}</strong>
              </div>
              <button
                type="button"
                className="profile-edit-button"
                onClick={() => go("profile")}
              >
                {t.editProfile}
              </button>
              <span className="profile-mark">✳</span>
            </article>
            <div className="section-head">
              <div>
                <p className="eyebrow">{t.snapshot}</p>
                <h2>{t.field}</h2>
              </div>
              <button className="link-button" onClick={() => go("diagnose")}>
                {language === "or" ? "ନୂଆ ଫସଲ ଯାଞ୍ଚ" : "Start a diagnosis"} →
              </button>
            </div>
            <div className="snapshot-grid">
              <article className="snapshot weather">
                <div className="snap-label">
                  {t.weather}
                  <span>☀</span>
                </div>
                <strong>{weather ? `${weather.temperatureC} °C` : "—"}</strong>
                <p>
                  {weather
                    ? `${weather.language === "or" ? weather.conditionOdia : (language === "or" ? t.weatherConditions[weather.condition] : weather.condition) || weather.condition}${Number.isFinite(weather.humidity) ? ` · ${language === "or" ? "ଆର୍ଦ୍ରତା" : "humidity"} ${weather.humidity}%` : ""}`
                    : weatherError ||
                      translateWeatherSummary(latest?.weather, t, language) ||
                      t.currentWeatherFallback}
                </p>
                <div className="weather-actions">
                  <button
                    className="link-button"
                    disabled={weatherBusy}
                    onClick={() => refreshWeather().catch(() => {})}
                  >
                    {weatherBusy ? t.loadingWeather : `↻ ${t.refreshWeather}`}
                  </button>
                  <button
                    className="location-button"
                    disabled={weatherBusy || locating}
                    onClick={locate}
                  >
                    {locating ? t.gettingLocation : `⌖ ${t.useGps}`}
                  </button>
                </div>
                {locationNote && (
                  <p
                    className="small-muted weather-location-note"
                    role="status"
                  >
                    {locationNote}
                  </p>
                )}
                {weather && (
                  <div
                    className="weather-details"
                    aria-label={
                      language === "or"
                        ? "ପାଣିପାଗର ଅଧିକ ସୂଚନା"
                        : "More weather details"
                    }
                  >
                    <div>
                      <span>{t.feelsLike}</span>
                      <b>
                        {Number.isFinite(weather.feelsLikeC)
                          ? `${weather.feelsLikeC}°`
                          : "—"}
                      </b>
                    </div>
                    <div>
                      <span>{t.humidity}</span>
                      <b>
                        {Number.isFinite(weather.humidity)
                          ? `${weather.humidity}%`
                          : "—"}
                      </b>
                    </div>
                    <div>
                      <span>{t.rainfall}</span>
                      <b>
                        {Number.isFinite(weather.precipitation)
                          ? `${weather.precipitation} ${t.millimeters}`
                          : "—"}
                      </b>
                    </div>
                    <div>
                      <span>{t.wind}</span>
                      <b>
                        {Number.isFinite(weather.windSpeedKmh)
                          ? `${weather.windSpeedKmh} km/h`
                          : "—"}
                      </b>
                    </div>
                  </div>
                )}
                <footer>
                  ⌖{" "}
                  {[user.village, user.district].filter(Boolean).join(", ") ||
                    (user.latitude != null ? t.gpsSaved : t.locationNotSet)}
                  {weather?.observedAt
                    ? ` · ${new Date(weather.observedAt).toLocaleTimeString(locale)}`
                    : ""}
                </footer>
                <div className="weather-attribution">
                  {weather?.provider === "Open-Meteo" && (
                    <a
                      href="https://open-meteo.com/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Weather: Open-Meteo
                    </a>
                  )}
                  {weather?.provider === "Open-Meteo" && gpsPlace && (
                    <span> · </span>
                  )}
                  {gpsPlace && (
                    <a
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noreferrer"
                    >
                      © OpenStreetMap contributors
                    </a>
                  )}
                </div>
              </article>
              <article className="snapshot soil-snapshot">
                <div className="snap-label">
                  {t.soil}
                  <span>⌁</span>
                </div>
                <strong className="small-strong">
                  {hasSoilData ? t.soilTestValues : t.localInsight}
                </strong>
                {hasSoilData ? (
                  <p className="soil-values">
                    {[
                      [t.soilPh, user.soilPh],
                      [t.soilNitrogen, user.soilNitrogen],
                      [t.soilPhosphorus, user.soilPhosphorus],
                      [t.soilPotassium, user.soilPotassium],
                      [t.soilOrganicCarbon, user.soilOrganicCarbon],
                    ]
                      .filter(([, value]) => value != null)
                      .map(([label, value]) => `${label}: ${value}`)
                      .join(" · ")}
                  </p>
                ) : (
                  <p>{t.soilUnavailable}</p>
                )}
                <button
                  type="button"
                  className="link-button soil-toggle"
                  onClick={() => {
                    setSoilFormOpen((open) => !open);
                    setSoilNotice("");
                  }}
                >
                  {soilFormOpen
                    ? t.cancel
                    : hasSoilData
                      ? t.editSoil
                      : t.addSoil}
                </button>
                {soilNotice && (
                  <p className="small-muted" role="status">
                    {soilNotice}
                  </p>
                )}
                {soilFormOpen && (
                  <form className="soil-form" onSubmit={saveSoil}>
                    <h4>{t.soilFormTitle}</h4>
                    <p className="small-muted">{t.soilFormHint}</p>
                    <div className="soil-fields">
                      <label>
                        {t.soilPh}
                        <input
                          name="soilPh"
                          type="number"
                          min="0"
                          max="14"
                          step="0.1"
                          defaultValue={user.soilPh ?? ""}
                          placeholder="6.5"
                        />
                      </label>
                      <label>
                        {t.soilNitrogen}
                        <input
                          name="soilNitrogen"
                          type="number"
                          min="0"
                          max="100000"
                          step="any"
                          defaultValue={user.soilNitrogen ?? ""}
                          placeholder="e.g. 280"
                        />
                      </label>
                      <label>
                        {t.soilPhosphorus}
                        <input
                          name="soilPhosphorus"
                          type="number"
                          min="0"
                          max="100000"
                          step="any"
                          defaultValue={user.soilPhosphorus ?? ""}
                          placeholder="e.g. 22"
                        />
                      </label>
                      <label>
                        {t.soilPotassium}
                        <input
                          name="soilPotassium"
                          type="number"
                          min="0"
                          max="100000"
                          step="any"
                          defaultValue={user.soilPotassium ?? ""}
                          placeholder="e.g. 180"
                        />
                      </label>
                      <label>
                        {t.soilOrganicCarbon}
                        <input
                          name="soilOrganicCarbon"
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          defaultValue={user.soilOrganicCarbon ?? ""}
                          placeholder="e.g. 0.6"
                        />
                      </label>
                    </div>
                    <button
                      className="button soil-save-button"
                      disabled={soilSaving}
                    >
                      {soilSaving ? t.wait : t.saveSoil}
                    </button>
                  </form>
                )}
                <footer>{t.soilNoGuess}</footer>
              </article>
              <article className="snapshot">
                <div className="snap-label">
                  {t.count}
                  <span>✳</span>
                </div>
                <strong>
                  {history.length}
                  <small> {t.checks}</small>
                </strong>
                <p>{t.pastObservations}</p>
                <button className="link-button" onClick={() => go("history")}>
                  {t.viewHistory} →
                </button>
              </article>
            </div>
            <div className="advice-note">
              <span>✳</span>
              <p>
                <b>{t.note}</b>
                <br />
                {t.adviceCopy}
              </p>
              <a
                href="https://kvk.icar.gov.in/"
                target="_blank"
                rel="noreferrer"
              >
                {t.findKvk} ↗
              </a>
            </div>
          </section>
        )}
        {view === "diagnose" && (
          <section className="page">
            <div className="section-head">
              <div>
                <p className="eyebrow">{t.closerLook}</p>
                <h2>{t.checkCrop}</h2>
                <p className="muted">{t.diagnosisHint}</p>
              </div>
            </div>
            <form onSubmit={diagnose} className="diagnose-grid">
              <div className="form-card crop-details-card">
                <Step n="01" text={t.stepCrop} />
                <label>
                  {t.crop}
                  <input
                    name="crop"
                    required
                    maxLength="100"
                    placeholder={t.cropPlaceholder}
                  />
                </label>
                <label>
                  {t.stage}
                  <select name="growthStage">
                    <option value="">{t.chooseKnown}</option>
                    <option value="Seedling">{t.seedling}</option>
                    <option value="Vegetative">{t.vegetative}</option>
                    <option value="Flowering">{t.flowering}</option>
                    <option value="Fruiting / grain filling">
                      {t.fruiting}
                    </option>
                    <option value="Maturity">{t.maturity}</option>
                  </select>
                </label>
                <label>
                  {t.mainSymptom}
                  <select name="symptom" defaultValue="" required>
                    <option value="" disabled>
                      {t.chooseSymptom}
                    </option>
                    <option value="yellowing">{t.symptomYellowing}</option>
                    <option value="brown-spots">{t.symptomSpots}</option>
                    <option value="holes">{t.symptomHoles}</option>
                    <option value="white-powder">{t.symptomWhite}</option>
                    <option value="curling">{t.symptomCurling}</option>
                    <option value="wilting">{t.symptomWilting}</option>
                    <option value="rotting">{t.symptomRotting}</option>
                    <option value="slow-growth">{t.symptomSlowGrowth}</option>
                    <option value="unsure">{t.symptomUnsure}</option>
                  </select>
                </label>
                {t.symptomNote && (
                  <p className="small-muted">{t.symptomNote}</p>
                )}
                <Step n="02" text={t.stepWhere} />
                <div className="three-fields">
                  <label>
                    {t.district}
                    <input name="district" defaultValue={user.district || ""} />
                  </label>
                  <label>
                    {t.block}
                    <input name="block" defaultValue={user.block || ""} />
                  </label>
                  <label>
                    {t.village}
                    <input name="village" defaultValue={user.village || ""} />
                  </label>
                </div>
                <button
                  type="button"
                  className="location-button"
                  disabled={locating || weatherBusy}
                  onClick={locate}
                >
                  {locating ? t.gettingLocation : `⌖ ${t.useGps}`}
                </button>
                <p className="small-muted" role="status">
                  {locationNote}
                </p>
                {gpsPlace && (
                  <p className="small-muted source-credit">
                    <a
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noreferrer"
                    >
                      © OpenStreetMap contributors
                    </a>
                  </p>
                )}
              </div>
              <div className="form-card upload-card">
                <Step n="03" text={t.stepPhoto} />
                <label className="upload-drop">
                  <input
                    type="file"
                    name="image"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size > 8 * 1024 * 1024) {
                        e.target.value = "";
                        setFormError(t.errImageSize);
                        setSelectedFile(null);
                        setPreview("");
                        return;
                      }
                      if (
                        f &&
                        !["image/jpeg", "image/png", "image/webp"].includes(
                          f.type,
                        )
                      ) {
                        e.target.value = "";
                        setFormError(t.errImageType);
                        setSelectedFile(null);
                        setPreview("");
                        return;
                      }
                      setFormError("");
                      setSelectedFile(f || null);
                      setPreview(f ? URL.createObjectURL(f) : "");
                    }}
                  />
                  {preview ? (
                    <img
                      src={preview}
                      alt={
                        language === "or"
                          ? "ଫସଲର ଫଟୋ ପୂର୍ବଦୃଶ୍ୟ"
                          : "Crop photo preview"
                      }
                    />
                  ) : (
                    <>
                      <span>↥</span>
                      <b>{t.photo}</b>
                      <small>{t.jpeg}</small>
                      <em>{t.browse}</em>
                    </>
                  )}
                </label>
                {selectedFile && (
                  <p className="file-label">{selectedFile.name}</p>
                )}
                <p className="upload-tip">✦ &nbsp;{t.uploadTip}</p>
                <button disabled={busy} className="button full">
                  {busy ? t.reviewing : t.submit} <span>→</span>
                </button>
                {t.probableNote && (
                  <p className="form-note">{t.probableNote}</p>
                )}
              </div>
            </form>
            {formError && (
              <p className="error" role="alert">
                {formError}
              </p>
            )}
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
            {translationStatus === "loading" && (
              <p className="report-translation-status" role="status">
                {t.translatingReport}
              </p>
            )}
            {translationStatus === "failed" && (
              <p className="report-translation-error" role="alert">
                {t.translationFailed}
              </p>
            )}
            {result && (
              <Result
                result={result}
                farmer={user}
                t={t}
                locale={locale}
                resultRef={resultRef}
                onDownloadPdf={saveAssessmentPdf}
              />
            )}
          </section>
        )}
        {view === "profile" && (
          <section className="page profile-page">
            <div className="section-head">
              <div>
                <p className="eyebrow">{t.farmerProfile}</p>
                <h2>{t.profileTitle}</h2>
                <p className="muted">{t.profileIntro}</p>
              </div>
            </div>
            <form
              className="form-card farmer-profile-form"
              onSubmit={saveFarmerProfile}
            >
              <div className="profile-form-heading">
                <span className="profile-avatar">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </div>
              </div>
              <div className="profile-fields">
                <label>
                  {t.farmSize}
                  <input
                    name="farmSizeAcres"
                    type="number"
                    min="0"
                    max="100000"
                    step="any"
                    defaultValue={user.farmSizeAcres ?? ""}
                    placeholder={t.farmSizePlaceholder}
                  />
                </label>
                <label>
                  {t.farmingExperience}
                  <input
                    name="farmingExperienceYears"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    defaultValue={user.farmingExperienceYears ?? ""}
                    placeholder={t.experiencePlaceholder}
                  />
                </label>
                <label>
                  {t.soilType}
                  <select name="soilType" defaultValue={user.soilType || ""}>
                    <option value="">{t.selectOption}</option>
                    <option value="Alluvial">{t.soilAlluvial}</option>
                    <option value="Clay">{t.soilClay}</option>
                    <option value="Sandy">{t.soilSandy}</option>
                    <option value="Loamy">{t.soilLoamy}</option>
                    <option value="Red laterite">{t.soilRedLaterite}</option>
                    <option value="Other">{t.other}</option>
                  </select>
                </label>
                <label>
                  {t.irrigationSource}
                  <select
                    name="irrigationSource"
                    defaultValue={user.irrigationSource || ""}
                  >
                    <option value="">{t.selectOption}</option>
                    <option value="Rain-fed">{t.irrigationRain}</option>
                    <option value="Canal">{t.irrigationCanal}</option>
                    <option value="Borewell / tube well">
                      {t.irrigationBorewell}
                    </option>
                    <option value="Open well">{t.irrigationWell}</option>
                    <option value="Pond / reservoir">{t.irrigationPond}</option>
                    <option value="Drip / sprinkler">{t.irrigationDrip}</option>
                    <option value="Other">{t.other}</option>
                  </select>
                </label>
              </div>
              <p className="profile-context-hint">{t.profileContextHint}</p>
              {profileNotice && (
                <p className="profile-notice" role="status">
                  {profileNotice}
                </p>
              )}
              <div className="profile-form-actions">
                <button className="button" disabled={profileSaving}>
                  {profileSaving ? t.wait : t.profileSave}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => go("home")}
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </section>
        )}
        {view === "history" && (
          <section className="page">
            <div className="section-head">
              <div>
                <p className="eyebrow">{t.journal}</p>
                <h2>{t.past}</h2>
                <p className="muted">{t.review}</p>
              </div>
              <div className="history-actions">
                {history.length > 0 && (
                  <button
                    className="button button-secondary"
                    onClick={exportHistory}
                  >
                    {t.exportHistory} ↓
                  </button>
                )}
                <button className="button" onClick={() => go("diagnose")}>
                  {t.newCheck} →
                </button>
              </div>
            </div>
            {history.length > 0 && (
              <label className="history-search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.target.value)}
                  placeholder={t.searchHistory}
                  aria-label={t.searchHistory}
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => setHistorySearch("")}
                    aria-label={t.clearSearch}
                  >
                    ×
                  </button>
                )}
              </label>
            )}
            {history.length ? (
              filteredHistory.length ? (
                <div className="history-list">
                  {filteredHistory.map((item) => (
                    <button
                      key={item.id}
                      className="history-row"
                      onClick={() => {
                        setResult(item);
                        setView("diagnose");
                      }}
                    >
                      <span className="crop-symbol">♧</span>
                      <span className="history-main">
                        <b>{item.crop}</b>
                        <small>
                          {new Date(item.createdAt).toLocaleString(locale)} ·{" "}
                          {item.probableIssue}
                        </small>
                      </span>
                      <span className="badge">{t.assessment}</span>
                      <span>→</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span>⌕</span>
                  <h3>{t.noMatches}</h3>
                  <button
                    className="button button-secondary"
                    onClick={() => setHistorySearch("")}
                  >
                    {t.clearSearch}
                  </button>
                </div>
              )
            ) : (
              <div className="empty-state">
                <span>✳</span>
                <h3>{t.emptyTitle}</h3>
                <p>{t.emptyHint}</p>
                <button className="button" onClick={() => go("diagnose")}>
                  {t.check} →
                </button>
              </div>
            )}
          </section>
        )}
        {view === "admin" && user.role === "admin" && (
          <section className="page admin-page">
            <div className="section-head admin-heading"><div><p className="eyebrow">{language === "or" ? "ସିଷ୍ଟମ୍ ପରିଚାଳନା" : "SYSTEM MANAGEMENT"}</p><h2>{t.adminTitle}</h2><p className="muted">{t.adminIntro}</p></div><button className="button button-secondary admin-refresh" onClick={refreshAdminOverview} disabled={adminBusy}><span aria-hidden="true">↻</span> {t.adminRefresh}</button></div>
            {adminMessage && <p role="status" className="admin-notice">{adminMessage}</p>}
            {adminBusy ? <p>{adminText("Loading administrator data…","ପ୍ରଶାସକ ସୂଚନା ଲୋଡ୍ ହେଉଛି…")}</p> : adminData && <>
              <div className="admin-stats"><article><span>{adminText("Accounts","ଖାତା")}</span><b>{adminData.farmers.length}</b><small>{adminText("Registered farmers and administrators","ପଞ୍ଜୀକୃତ ଚାଷୀ ଓ ପ୍ରଶାସକ")}</small></article><article><span>{adminText("Active accounts","ସକ୍ରିୟ ଖାତା")}</span><b>{adminData.farmers.filter(f => f.is_active).length}</b><small>{adminText("Currently enabled","ବର୍ତ୍ତମାନ ସକ୍ରିୟ")}</small></article><article><span>{adminText("Active sessions","ସକ୍ରିୟ ସେସନ୍")}</span><b>{adminData.activeSessions.length}</b><small>{adminText("Signed-in users","ସାଇନ୍-ଇନ୍ କରିଥିବା ବ୍ୟବହାରକାରୀ")}</small></article><article><span>{adminText("Saved assessments","ସଞ୍ଚିତ ମୂଲ୍ୟାଙ୍କନ")}</span><b>{adminData.farmers.reduce((sum, f) => sum + Number(f.assessment_count || 0), 0)}</b><small>{adminText("Across all accounts","ସମସ୍ତ ଖାତାରେ")}</small></article></div>
              <nav className="admin-jump-nav" aria-label={adminText("Administrator sections","ପ୍ରଶାସକ ବିଭାଗଗୁଡ଼ିକ")}>
                <a href="#admin-health">{adminText("System health","ସିଷ୍ଟମ୍ ସ୍ଥିତି")}</a><a href="#admin-activity">{t.adminActivity}</a><a href="#admin-requests">{t.adminResetRequests}</a><a href="#admin-accounts">{t.adminAccounts}</a><a href="#admin-audit">{t.adminAudit}</a><a href="#admin-sessions">{t.adminSessions}</a>
              </nav>
              <article id="admin-health" className="admin-card admin-health-card">
                <div className="admin-card-head"><div><h3>{t.adminHealth}</h3><p className="muted">{t.adminHealthNote}</p></div><span className="health-status"><i /> API {language === "or" ? "ସୁସ୍ଥ" : "healthy"}</span></div>
                <div className="admin-health-grid">
                  <div><span>{t.adminApplicationApi}</span><b>{language === "or" ? "ସୁସ୍ଥ" : (adminData.health?.api || "unknown")}</b></div>
                  <div><span>{t.adminDatabase}</span><b>{language === "or" ? "ସଂଯୁକ୍ତ" : (adminData.health?.database || "unknown")}</b></div>
                  <div><span>{t.adminCropAnalysis}</span><b>{language === "or" ? (adminData.health?.cropAnalysis?.includes("not configured") ? "ସେଟ୍ ହୋଇନାହିଁ" : "ସେଟ୍ ହୋଇଛି · ସଜୀବ ଯାଞ୍ଚ ହୋଇନାହିଁ") : (adminData.health?.cropAnalysis || "unknown")}</b></div>
                  <div><span>{t.adminWeather}</span><b>{language === "or" ? "Open-Meteo ଉପଲବ୍ଧ · ପାଣିପାଗ ସେବା ସ୍ଥିତି ଯାଞ୍ଚ କରନ୍ତୁ" : (adminData.health?.weather || "unknown")}</b></div>
                  <div><span>{t.adminImageStorage}</span><b>{language === "or" ? "ବ୍ୟକ୍ତିଗତ ସ୍ଥାନୀୟ ଫାଇଲ୍ ସଂରକ୍ଷଣ" : (adminData.health?.storage || "unknown")}</b></div>
                  <div><span>{t.adminUptime}</span><b>{Math.floor((adminData.health?.uptimeSeconds || 0) / 3600)}h {Math.floor(((adminData.health?.uptimeSeconds || 0) % 3600) / 60)}m</b></div>
                </div>
              </article>
              <article id="admin-activity" className="admin-card admin-activity-card">
                <div className="admin-card-head"><div><h3>{t.adminActivity}</h3><p className="muted">{t.adminActivityNote}</p></div><div className="admin-date-filter"><label>{t.adminFrom}<input type="date" value={adminFrom} max={adminTo} onChange={e => setAdminFrom(e.target.value)} /></label><label>{t.adminTo}<input type="date" value={adminTo} min={adminFrom} onChange={e => setAdminTo(e.target.value)} /></label><button className="button button-secondary" onClick={refreshAdminOverview} disabled={adminBusy}>{t.adminApplyDates}</button></div></div>
                {(() => {
                  const days = adminData.activity || [];
                  const totals = days.reduce((sum, day) => ({ accounts: sum.accounts + Number(day.accounts), logins: sum.logins + Number(day.logins), assessments: sum.assessments + Number(day.assessments) }), { accounts: 0, logins: 0, assessments: 0 });
                  const maxValue = Math.max(1, ...days.flatMap(day => [Number(day.accounts), Number(day.logins), Number(day.assessments)]));
                  return <>
                    <div className="activity-totals"><span><b>{totals.accounts}</b> {adminText("new accounts","ନୂତନ ଖାତା")}</span><span><b>{totals.logins}</b> {adminText("successful sign-ins","ସଫଳ ସାଇନ୍-ଇନ୍")}</span><span><b>{totals.assessments}</b> {adminText("assessments","ମୂଲ୍ୟାଙ୍କନ")}</span></div>
                    <div className="activity-legend"><span><i className="activity-account" />{adminText("Accounts","ଖାତା")}</span><span><i className="activity-login" />{adminText("Sign-ins","ସାଇନ୍-ଇନ୍")}</span><span><i className="activity-assessment" />{adminText("Assessments","ମୂଲ୍ୟାଙ୍କନ")}</span></div>
                    <div className="activity-chart-scroll"><div className="activity-chart" role="img" aria-label={`Daily activity from ${adminData.range.from} through ${adminData.range.to}`}>
                      {days.map(day => <div className="activity-day" key={day.date} title={`${day.date}: ${day.accounts} accounts, ${day.logins} sign-ins, ${day.assessments} assessments`}><div className="activity-bars"><i className="activity-account" style={{ height: `${Math.max(day.accounts ? 4 : 0, Number(day.accounts) / maxValue * 100)}%` }} /><i className="activity-login" style={{ height: `${Math.max(day.logins ? 4 : 0, Number(day.logins) / maxValue * 100)}%` }} /><i className="activity-assessment" style={{ height: `${Math.max(day.assessments ? 4 : 0, Number(day.assessments) / maxValue * 100)}%` }} /></div><small>{new Date(`${day.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small></div>)}
                    </div></div>
                  </>;
                })()}
              </article>
              <div className="admin-toolbar"><input type="search" value={adminSearch} onChange={e => setAdminSearch(e.target.value)} placeholder={t.adminSearch} aria-label={t.adminSearch}/><select aria-label={language === "or" ? "ଖାତା ସ୍ଥିତି ଛାଣନ୍ତୁ" : "Filter accounts by status"} value={adminStatusFilter} onChange={e => setAdminStatusFilter(e.target.value)}><option value="all">{language === "or" ? "ସମସ୍ତ ଖାତା" : "All account statuses"}</option><option value="active">{language === "or" ? "ସକ୍ରିୟ" : "Active only"}</option><option value="disabled">{language === "or" ? "ନିଷ୍କ୍ରିୟ" : "Disabled only"}</option></select></div>
              <article id="admin-requests" className="admin-card admin-data-card"><h3>{t.adminResetRequests}</h3><p className="muted">{t.adminResetVerify}</p>{approvedReset && <div className="reset-password-panel"><div><b>{adminText(`Password for ${approvedReset.email}`, `${approvedReset.email} ପାଇଁ ପାସୱାର୍ଡ`)}</b><code>{approvedReset.password}</code></div><button className="button button-secondary" onClick={() => navigator.clipboard.writeText(approvedReset.password).then(() => setAdminMessage("Password copied." )).catch(() => setAdminMessage("Select and copy the password shown above."))}>{t.adminCopyPassword}</button><a className="button button-secondary" target="_blank" rel="noreferrer" href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(approvedReset.email)}&su=${encodeURIComponent("Krushi Mitra password reset")}&body=${encodeURIComponent(`Hello,\n\nYour Krushi Mitra password has been reset. Use this temporary password to sign in:\n\n${approvedReset.password}\n\nPlease change it after signing in.\n`)}`}>{t.adminDraftReply}</a></div>}<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{adminText("Requested","ଅନୁରୋଧ")}</th><th>{t.email}</th><th>{adminText("Status","ସ୍ଥିତି")}</th><th>{adminText("Actions","କାର୍ଯ୍ୟ")}</th></tr></thead><tbody>{(adminData.passwordResetRequests || []).map(r => <tr key={r.id}><td>{new Date(`${r.created_at}Z`).toLocaleString()}</td><td>{r.email}</td><td><span className={`reset-status reset-${r.status}`}>{r.status === "pending" ? t.adminResetPending : r.status === "resolved" ? t.adminResetResolved : t.adminResetRejected}</span></td><td>{r.status === "pending" ? <div className="admin-controls"><button className="button button-secondary" onClick={async () => { setAdminMessage("Approving reset request…"); try { const result = await api(`/api/admin/password-reset-requests/${r.id}/resolve`, { method: "POST" }); setApprovedReset({ email: r.email, password: result.temporaryPassword }); await refreshAdminOverview(); try { await navigator.clipboard.writeText(result.temporaryPassword); } catch {} setAdminMessage("Approved. Review the generated password and use Draft Gmail reply to send it."); } catch (error) { setAdminMessage(`Could not approve request: ${error.message}`); } }}>{t.adminApproveReset}</button><button className="button button-danger" onClick={async () => { if (!window.confirm(`Reject the reset request from ${r.email}?`)) return; setAdminMessage("Rejecting reset request…"); try { await api(`/api/admin/password-reset-requests/${r.id}/reject`, { method: "POST" }); await refreshAdminOverview(); setAdminMessage("Reset request rejected. The farmer’s password was not changed."); } catch (error) { setAdminMessage(`Could not reject request: ${error.message}`); } }}>{t.adminReject}</button></div> : <span className="muted">{t.adminResetClosed}</span>}</td></tr>)}</tbody></table></div></article>
              <article id="admin-accounts" className="admin-card admin-data-card"><div className="admin-card-head"><h3>{t.adminAccounts}</h3><button className="button button-secondary" onClick={() => exportAdminCsv([["Name","Email","Role","Status","Created","Last login","Assessments","Active sessions"], ...filteredAdminFarmers.map(f => [f.name,f.email,f.role,f.is_active ? "Active" : "Disabled",f.created_at,f.last_login,f.assessment_count,f.active_sessions])], "krushi-mitra-admin-accounts.csv")}>{adminText("Export accounts CSV","ଖାତା CSV ରପ୍ତାନି")}</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{adminText("Farmer","ଚାଷୀ")}</th><th>{adminText("Role / status","ଭୂମିକା / ସ୍ଥିତି")}</th><th>{adminText("Created","ତିଆରି")}</th><th>{adminText("Last login","ଶେଷ ସାଇନ୍-ଇନ୍")}</th><th>{adminText("Assessments","ମୂଲ୍ୟାଙ୍କନ")}</th><th>{adminText("Sessions","ସେସନ୍")}</th><th>{adminText("Controls","ନିୟନ୍ତ୍ରଣ")}</th></tr></thead><tbody>{filteredAdminFarmers.map(f => <tr key={f.id}><td><b>{f.name}</b><small>{f.email}</small></td><td>{language === "or" ? (f.role === "admin" ? "ପ୍ରଶାସକ" : "ଚାଷୀ") : f.role} · {f.is_active ? adminText("Active","ସକ୍ରିୟ") : adminText("Disabled","ନିଷ୍କ୍ରିୟ")}</td><td>{new Date(`${f.created_at}Z`).toLocaleString()}</td><td>{f.last_login ? new Date(`${f.last_login}Z`).toLocaleString() : adminText("Never","କେବେ ନୁହେଁ")}</td><td>{f.assessment_count}</td><td>{f.active_sessions}</td><td><div className="admin-controls"><select aria-label={`Role for ${f.email}`} value={f.role} disabled={f.id === user.id} onChange={e => updateAdminAccount(f.id, { role: e.target.value })}><option value="farmer">Farmer</option><option value="admin">Admin</option></select><button className="button button-secondary" disabled={f.id === user.id} onClick={() => updateAdminAccount(f.id, { active: !f.is_active })}>{f.is_active ? "Disable" : "Enable"}</button><button className="button button-secondary" onClick={() => revokeAdminSessions(f.id)}>{adminText("End sessions","ସେସନ୍ ବନ୍ଦ କରନ୍ତୁ")}</button></div></td></tr>)}</tbody></table></div></article>
              <article id="admin-audit" className="admin-card admin-data-card"><div className="admin-card-head"><h3>{t.adminAudit}</h3><div className="admin-controls"><select aria-label="Filter audit events" value={adminEventFilter} onChange={e => setAdminEventFilter(e.target.value)}><option value="all">{adminText("All events","ସମସ୍ତ ଘଟଣା")}</option><option value="login_success">{adminText("Successful logins","ସଫଳ ସାଇନ୍-ଇନ୍")}</option><option value="login_failed">{adminText("Failed logins","ବିଫଳ ସାଇନ୍-ଇନ୍")}</option><option value="logout">{adminText("Logouts","ଲଗ୍ ଆଉଟ୍")}</option><option value="role_changed">{adminText("Role changes","ଭୂମିକା ପରିବର୍ତ୍ତନ")}</option><option value="account_">{adminText("Account controls","ଖାତା ନିୟନ୍ତ୍ରଣ")}</option><option value="sessions_revoked">{adminText("Session revocations","ସେସନ୍ ବାତିଲ୍")}</option></select><button className="button button-secondary" onClick={() => exportAdminCsv([["Timestamp (UTC)","Email","Event","Account ID"], ...filteredAdminEvents.map(e => [e.created_at,e.email,e.event,e.farmer_id])], "krushi-mitra-auth-audit.csv")}>{adminText("Export audit CSV","ଅଡିଟ୍ CSV ରପ୍ତାନି")}</button></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{adminText("When (server time)","ସମୟ")}</th><th>{adminText("Account","ଖାତା")}</th><th>{adminText("Event","ଘଟଣା")}</th></tr></thead><tbody>{filteredAdminEvents.map(e => <tr key={e.id}><td>{new Date(`${e.created_at}Z`).toLocaleString()}</td><td>{e.email}</td><td>{adminEventLabel(e.event)}</td></tr>)}</tbody></table></div></article>
              <article id="admin-sessions" className="admin-card admin-data-card"><h3>{t.adminSessions}</h3><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Farmer</th><th>Email</th><th>{adminText("Session expires","ସେସନ୍ ମିଆଦ")}</th></tr></thead><tbody>{adminData.activeSessions.map((s,i) => <tr key={`${s.farmer_id}-${i}`}><td>{s.name}</td><td>{s.email}</td><td>{new Date(s.expires_at).toLocaleString()}</td></tr>)}</tbody></table></div></article>
            </>}
          </section>
        )}
        <footer className="app-footer">
          <b>✳ KRUSHI MITRA</b>
          <span>{t.footer}</span>
          <span>{t.madeFor}</span>
        </footer>
      </main>
    </div>
  );
}

function Step({ n, text }) {
  return (
    <div className="step-label">
      <span>{n}</span>
      {text}
    </div>
  );
}
const pesticideNameExamples = [
  {
    crops: /\b(rice|paddy)\b|ଧାନ/i,
    pests:
      /brown plant ?hopper|\bBPH\b|white.?backed plant ?hopper|green leaf ?hopper|ବ୍ରାଉନ୍ ପ୍ଲାଣ୍ଟ ହପର୍/i,
    target: {
      en: "Rice / paddy — brown plant hopper (BPH)",
      or: "ଧାନ — ବ୍ରାଉନ୍ ପ୍ଲାଣ୍ଟ ହପର୍ (BPH)",
    },
    names: "Flonicamid 50% WG; Dinotefuran 20% SG",
    url: "https://ppqs.gov.in/sites/default/files/pop_for_managment_of_rice_bph.pdf",
  },
  {
    crops: /\b(rice|paddy)\b|ଧାନ/i,
    pests: /yellow stem ?borer|stem ?borer|leaf ?folder|କାଣ୍ଡ ଛେଦକ|ପତ୍ର ମୋଡ଼ା/i,
    target: {
      en: "Rice / paddy — yellow stem borer or leaf folder",
      or: "ଧାନ — ହଳଦିଆ କାଣ୍ଡ ଛେଦକ କିମ୍ବା ପତ୍ର ମୋଡ଼ା କୀଟ",
    },
    names: "Spinetoram 11.7% SC",
    url: "https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf",
  },
  {
    crops: /\b(brinjal|eggplant|aubergine|baingan)\b|ବାଇଗଣ/i,
    pests:
      /shoot.{0,8}fruit ?borer|fruit.{0,8}shoot ?borer|leucinodes|କାଣ୍ଡ.{0,8}ଫଳ ଛେଦକ/i,
    target: {
      en: "Brinjal — shoot and fruit borer",
      or: "ବାଇଗଣ — କାଣ୍ଡ ଓ ଫଳ ଛେଦକ",
    },
    names: "Spinetoram 11.7% SC",
    url: "https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf",
  },
  {
    crops: /\b(chilli|chili|pepper)\b|ଲଙ୍କା/i,
    pests: /fruit ?borer|thrips|helicoverpa|scirtothrips|ଫଳ ଛେଦକ|ଥ୍ରିପ୍ସ/i,
    target: {
      en: "Chilli — fruit borer or thrips",
      or: "ଲଙ୍କା — ଫଳ ଛେଦକ କିମ୍ବା ଥ୍ରିପ୍ସ",
    },
    names: "Spinetoram 11.7% SC",
    url: "https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf",
  },
  {
    crops: /\b(tomato)\b|ଟମାଟୋ/i,
    pests:
      /fruit ?borer|leaf ?miner|aphid|thrips|white ?fly|helicoverpa|ଫଳ ଛେଦକ/i,
    target: {
      en: "Tomato — fruit borer, leaf miner, aphids, thrips or whitefly",
      or: "ଟମାଟୋ — ଫଳ ଛେଦକ, ପତ୍ର ଖଣିକ, ଜାଉ ପୋକ, ଥ୍ରିପ୍ସ କିମ୍ବା ଧଳା ମାଛି",
    },
    names: "Cyantraniliprole 10.26% OD",
    url: "https://ppqs.gov.in/sites/default/files/cyantraniliprole_10.26_od93ffmc_india_private_limited_1.pdf",
  },
  {
    crops: /\b(cabbage)\b|ବନ୍ଧାକୋବି/i,
    pests: /diamond.?back.?moth|caterpillar|aphid|ଶୂକ/i,
    target: {
      en: "Cabbage — diamondback moth, caterpillars or aphids",
      or: "ବନ୍ଧାକୋବି — ଡାଇମଣ୍ଡବ୍ୟାକ୍ ମଥ୍, ଶୂକ କିମ୍ବା ଜାଉ ପୋକ",
    },
    names: "Cyantraniliprole 10.26% OD",
    url: "https://ppqs.gov.in/sites/default/files/cyantraniliprole_10.26_od93ffmc_india_private_limited_1.pdf",
  },
  {
    crops: /\b(watermelon)\b|ତରଭୁଜ/i,
    pests: /thrips|white ?fly|aphid|leaf ?miner|ଥ୍ରିପ୍ସ|ଧଳା ମାଛି/i,
    target: {
      en: "Watermelon — thrips, whitefly, aphids or leaf miner",
      or: "ତରଭୁଜ — ଥ୍ରିପ୍ସ, ଧଳା ମାଛି, ଜାଉ ପୋକ କିମ୍ବା ପତ୍ର ଖଣିକ",
    },
    names: "Cyantraniliprole 10.26% OD",
    url: "https://ppqs.gov.in/sites/default/files/cyantraniliprole_10.26_od93ffmc_india_private_limited_1.pdf",
  },
  {
    crops: /\b(ridge ?gourd|luffa)\b|ଜହ୍ନି/i,
    pests:
      /thrips|white ?fly|aphid|leaf ?miner|pumpkin caterpillar|ଥ୍ରିପ୍ସ|ଧଳା ମାଛି/i,
    target: {
      en: "Ridge gourd — thrips, whitefly, aphids, leaf miner or pumpkin caterpillar",
      or: "ଜହ୍ନି — ଥ୍ରିପ୍ସ, ଧଳା ମାଛି, ଜାଉ ପୋକ, ପତ୍ର ଖଣିକ କିମ୍ବା କଖାରୁ ଶୂକ",
    },
    names: "Cyantraniliprole 10.26% OD",
    url: "https://ppqs.gov.in/sites/default/files/cyantraniliprole_10.26_od93ffmc_india_private_limited_1.pdf",
  },
  {
    crops: /\b(okra|bhindi|lady.?finger)\b|ଭେଣ୍ଡି/i,
    pests:
      /fruit ?borer|shoot.{0,8}fruit ?borer|hel[iy]coverpa|earias|ଫଳ ଛେଦକ/i,
    target: {
      en: "Okra — fruit or shoot-and-fruit borer",
      or: "ଭେଣ୍ଡି — ଫଳ କିମ୍ବା କାଣ୍ଡ-ଫଳ ଛେଦକ",
    },
    names: "Spinetoram 11.7% SC",
    url: "https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf",
  },
  {
    crops: /\b(cotton)\b|କପା/i,
    pests: /boll ?worm|spotted bollworm|tobacco caterpillar|thrips|ଥ୍ରିପ୍ସ/i,
    target: {
      en: "Cotton — bollworms or thrips",
      or: "କପା — ବୋଲ୍ୱର୍ମ କିମ୍ବା ଥ୍ରିପ୍ସ",
    },
    names: "Spinetoram 11.7% SC",
    url: "https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf",
  },
  {
    crops: /\b(chickpea|chick pea|gram|chana)\b|ଚଣା/i,
    pests: /pod ?borer|helicoverpa|ଡାଲି ଛେଦକ/i,
    target: { en: "Chickpea — pod borer", or: "ଚଣା — ଡାଲି ଛେଦକ" },
    names: "Spinetoram 11.7% SC",
    url: "https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf",
  },
  {
    crops: /\b(red ?gram|pigeon ?pea|arhar|tur)\b|ହରଡ଼/i,
    pests: /pod ?borer|helicoverpa|maruca|ଡାଲି ଛେଦକ/i,
    target: { en: "Red gram — pod borer", or: "ହରଡ଼ — ଡାଲି ଛେଦକ" },
    names: "Spinetoram 11.7% SC",
    url: "https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf",
  },
  {
    crops: /\b(soybean|soya)\b|ସୋୟାବିନ୍/i,
    pests: /tobacco caterpillar|spodoptera|army ?worm|ଶୂକ/i,
    target: { en: "Soybean — tobacco caterpillar", or: "ସୋୟାବିନ୍ — ତମାଖୁ ଶୂକ" },
    names: "Spinetoram 11.7% SC",
    url: "https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf",
  },
  {
    crops: /\b(grape|grapes)\b|ଅଙ୍ଗୁର/i,
    pests: /thrips|scirtothrips|ଥ୍ରିପ୍ସ/i,
    target: { en: "Grapes — thrips", or: "ଅଙ୍ଗୁର — ଥ୍ରିପ୍ସ" },
    names: "Spinetoram 11.7% SC",
    url: "https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf",
  },
];
function Result({ result, farmer, t, locale, resultRef, onDownloadPdf }) {
  const rows = [
    [t.possibleCauses, result.causes],
    [t.organic, result.organicAlternatives],
    [t.prevention, result.prevention],
    [t.irrigation, result.irrigation],
    [t.timing, result.timing],
    [t.weather, result.weather],
    [t.soil, result.soil],
  ];
  const aiCandidate = result.provider
    ?.toLowerCase()
    .includes("gemini image analysis")
    ? result.activeIngredients?.trim()
    : "";
  const pesticideSuggestion = aiCandidate || t.pesticideNoGeminiCandidate;
  const reportId = `KM-${new Date(result.createdAt).getFullYear()}-${String(result.id).padStart(6, "0")}`;
  const reportLocation =
    [result.village, result.block, result.district]
      .filter(Boolean)
      .join(", ") || t.locationMissing;
  return (
    <article className="result-card" ref={resultRef} tabIndex="-1">
      <header className="print-report-masthead print-only">
        <div className="print-brand">
          <strong>KRUSHI MITRA</strong>
          <span>{t.pdfSubtitle}</span>
        </div>
        <div className="print-report-heading">
          <h1>{t.pdfTitle}</h1>
          <b>{reportId}</b>
          <span>
            {formatHeaderDate(
              new Date(result.createdAt),
              languageFromLocale(locale),
            )}
          </span>
        </div>
      </header>
      <section className="print-farmer-details print-only">
        <h4>{t.pdfFarmerDetails}</h4>
        <div className="print-farmer-grid">
          <div>
            <b>{t.pdfFarmerName}</b>
            <span>{farmer?.name || t.notAvailable}</span>
          </div>
          <div>
            <b>{t.pdfContact}</b>
            <span>{farmer?.phone || farmer?.email || t.notAvailable}</span>
          </div>
          <div>
            <b>{t.pdfFarmLocation}</b>
            <span>{reportLocation}</span>
          </div>
          <div>
            <b>{t.farmSize}</b>
            <span>
              {farmer?.farmSizeAcres != null
                ? `${farmer.farmSizeAcres} ${locale === "or-IN" ? "ଏକର" : "acres"}`
                : t.notAvailable}
            </span>
          </div>
        </div>
      </section>
      <div className="result-head">
        <div>
          <p className="eyebrow">
            {t.cropCheck} · {new Date(result.createdAt).toLocaleString(locale)}
          </p>
          <h3>
            {result.crop} · {result.growthStage || t.growthUnspecified}
          </h3>
          <p className="muted">{reportLocation}</p>
        </div>
        <div className="result-actions">
          <span className="badge">{t.assessment}</span>
          <button
            type="button"
            className="button pdf-button"
            onClick={() => onDownloadPdf(result)}
          >
            <span aria-hidden="true">⇩</span>
            <span>{t.downloadPdf}</span>
          </button>
        </div>
      </div>
      <div className="result-issue">
        <b>{t.issue}</b>
        <p>{result.probableIssue}</p>
      </div>
      <h4 className="report-details-title">{t.reportDetails}</h4>
      <div className="result-grid">
        {rows.map(([label, value]) => (
          <div key={label}>
            <b>{label}</b>
            <p>
              {label === t.weather
                ? translateWeatherSummary(
                    value,
                    t,
                    locale === "or-IN" ? "or" : "en",
                  ) || t.notAvailable
                : value || t.notAvailable}
            </p>
          </div>
        ))}
      </div>
      <section
        className="pesticide-suggestion-card"
        aria-labelledby="pesticide-suggestion-title"
      >
        <div className="pesticide-suggestion-heading">
          <span aria-hidden="true">✿</span>
          <h4 id="pesticide-suggestion-title">{t.activeIngredients}</h4>
        </div>
        <p className="pesticide-suggestion-text">{pesticideSuggestion}</p>
        <p className="pesticide-suggestion-note">{t.pesticideGuideNote}</p>
      </section>
      <section
        className="pesticide-guide"
        aria-labelledby="pesticide-guide-title"
      >
        <div className="pesticide-guide-heading">
          <span aria-hidden="true">✳</span>
          <h4 id="pesticide-guide-title">{t.pesticideGuideTitle}</h4>
        </div>
        <p>{t.pesticideGuideIntro}</p>
        <details>
          <summary>{t.pesticideMoreSafety}</summary>
          <ol>
            {t.pesticideGuideSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </details>
      </section>
      <section className="print-officer-review print-only">
        <h4>{t.pdfOfficerReview}</h4>
        <div className="print-review-grid">
          <div>
            <b>{t.pdfOfficerName}</b>
            <span />
          </div>
          <div>
            <b>{t.pdfDesignation}</b>
            <span />
          </div>
          <div>
            <b>{t.pdfRemarks}</b>
            <span />
          </div>
          <div>
            <b>{t.pdfDate}</b>
            <span />
          </div>
          <div>
            <b>{t.pdfSignature}</b>
            <span />
          </div>
          <div>
            <b>{t.pdfStamp}</b>
            <span />
          </div>
        </div>
      </section>
      <p className="print-report-disclaimer print-only">{t.pdfDisclaimer}</p>
    </article>
  );
}

function languageFromLocale(locale) {
  return locale === "or-IN" ? "or" : "en";
}

createRoot(document.getElementById("root")).render(<App />);
