import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { translations, localizedError, formatHeaderDate } from './i18n.js';
import './styles.css';

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.error || 'Something went wrong. Please try again.'); error.code = data.code; throw error; }
  return data;
}

function translateWeatherSummary(summary, t, language) {
  if (!summary || language !== 'or') return summary;
  let text = summary.replace(/humidity/gi, 'ଆର୍ଦ୍ରତା');
  for (const [english, odia] of Object.entries(t.weatherConditions).sort(([a], [b]) => b.length - a.length)) text = text.replaceAll(english, odia);
  if (text.includes('Current weather could not be retrieved')) return t.errWeather;
  if (text.includes('Set your farm location')) return t.errSetLocation;
  return text;
}

function translateProvider(provider, t, language) {
  if (language !== 'or') return provider;
  return provider?.replace('Local demo mode', 'ସ୍ଥାନୀୟ ଡେମୋ ମୋଡ୍').replace('Local symptom guide', 'ସ୍ଥାନୀୟ ଲକ୍ଷଣ ଗାଇଡ୍').replace('Gemini image analysis', 'Gemini ଫଟୋ ବିଶ୍ଳେଷଣ');
}

function getGreeting(t, date) {
  const hour = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).formatToParts(date).find((part) => part.type === 'hour')?.value ?? date.getHours());
  if (hour >= 5 && hour < 12) return t.greetingMorning;
  if (hour >= 12 && hour < 17) return t.greetingAfternoon;
  if (hour >= 21 || hour < 5) return t.greetingNight;
  return t.greetingEvening;
}

function formatIndiaTime(date, language) {
  return new Intl.DateTimeFormat(language === 'or' ? 'or-IN' : 'en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(date);
}

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home');
  const [history, setHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [language, setLanguage] = useState(() => localStorage.getItem('km-language') === 'or' ? 'or' : 'en');
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState(null);
  const [translationStatus, setTranslationStatus] = useState('');
  const resultRef = useRef(null);
  const [gpsPlace, setGpsPlace] = useState(null);
  const [locationNote, setLocationNote] = useState('');
  const [locating, setLocating] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [cropAnalysisStatus, setCropAnalysisStatus] = useState(null);
  const [soilSaving, setSoilSaving] = useState(false);
  const [soilNotice, setSoilNotice] = useState('');
  const [soilFormOpen, setSoilFormOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const t = translations[language];
  const locale = language === 'or' ? 'or-IN' : 'en-IN';
  const filteredHistory = history.filter((item) => [item.crop, item.growthStage, item.village, item.block, item.district, item.probableIssue].filter(Boolean).join(' ').toLocaleLowerCase(locale).includes(historySearch.trim().toLocaleLowerCase(locale)));
  const exportHistory = () => {
    const csvCell = (value) => {
      let text = String(value ?? '').replaceAll('"', '""');
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text}"`;
    };
    const rows = [[t.csvDate, t.csvCrop, t.csvStage, t.csvLocation, t.csvAssessment], ...filteredHistory.map((item) => [new Date(item.createdAt).toLocaleString(locale), item.crop, item.growthStage, [item.village, item.block, item.district].filter(Boolean).join(', '), item.probableIssue])];
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = href; link.download = `krushi-mitra-history-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  useEffect(() => { document.documentElement.lang = language === 'or' ? 'or' : 'en'; }, [language]);
  useEffect(() => { const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { api('/api/status').then((status) => setCropAnalysisStatus(status.integrations?.cropAnalysis || null)).catch(() => {}); }, []);
  useEffect(() => { api('/api/auth/me').then((u) => { setUser(u); setLanguage(u.language || 'en'); localStorage.setItem('km-language', u.language || 'en'); }).catch(() => {}); }, []);
  useEffect(() => { if (user) refreshWeather().catch(() => {}); }, [user?.id]);
  useEffect(() => { if (user && (view === 'history' || view === 'home')) api('/api/diagnoses').then(setHistory).catch(() => setHistory([])); }, [user, view]);
  useEffect(() => {
    if (!result?.id || view !== 'diagnose' || result.language === language) { setTranslationStatus(''); return; }
    let active = true;
    setTranslationStatus('loading');
    api('/api/diagnoses/translate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: result.id, language }) })
      .then((translated) => { if (active) { setResult((current) => current?.id === result.id ? translated : current); setTranslationStatus(''); } })
      .catch(() => { if (active) setTranslationStatus('failed'); });
    return () => { active = false; };
  }, [result?.id, result?.language, view, language]);
  useEffect(() => {
    if (!result || view !== 'diagnose') return;
    const frame = requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      resultRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [result, view]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const changeLanguage = async (value) => {
    setLanguage(value); localStorage.setItem('km-language', value);
    if (user) {
      try {
        const updated = await api('/api/auth/me', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language: value }) });
        setUser(updated);
      } catch { /* The interface preference still applies for this session. */ }
    }
  };
  const login = async (event) => {
    event.preventDefault(); setBusy(true); setAuthError('');
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    body.language = language;
    try {
      const nextUser = await api(`/api/auth/${authMode === 'login' ? 'login' : 'register'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      setWeather(null); setWeatherError(''); setUser(nextUser); setLanguage(nextUser.language || language); localStorage.setItem('km-language', nextUser.language || language);
    } catch (error) { setAuthError(localizedError(error.message, t)); } finally { setBusy(false); }
  };
  const logout = async () => { try { await api('/api/auth/logout', { method: 'POST' }); } finally { setUser(null); setView('home'); setHistory([]); setResult(null); setWeather(null); setWeatherError(''); setLocationNote(''); } };
  const saveAssessmentPdf = (report) => {
    const previousTitle = document.title;
    const cropSlug = String(report?.crop || 'crop').normalize('NFKD').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'crop';
    document.title = `Krushi-Mitra-${cropSlug}-Assessment`;
    document.body.classList.add('printing-assessment');
    try { window.print(); }
    finally { document.body.classList.remove('printing-assessment'); document.title = previousTitle; }
  };
  const refreshWeather = async (coords) => {
    setWeatherBusy(true); setWeatherError('');
    try {
      const query = coords ? `?latitude=${encodeURIComponent(coords.latitude)}&longitude=${encodeURIComponent(coords.longitude)}` : '';
      const current = await api(`/api/weather/current${query}`); setWeather(current); return current;
    } catch (error) { setWeatherError(localizedError(error.message, t)); throw error; } finally { setWeatherBusy(false); }
  };
  const saveSoil = async (event) => {
    event.preventDefault(); setSoilSaving(true); setSoilNotice('');
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(['soilPh', 'soilNitrogen', 'soilPhosphorus', 'soilPotassium', 'soilOrganicCarbon'].map((key) => {
      const value = form.get(key);
      return [key, value === '' ? null : Number(value)];
    }));
    try {
      const updated = await api('/api/auth/me', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      setUser(updated); setSoilNotice(t.soilSaved); setSoilFormOpen(false);
    } catch { setSoilNotice(t.soilSaveError); } finally { setSoilSaving(false); }
  };
  const saveFarmerProfile = async (event) => {
    event.preventDefault(); setProfileSaving(true); setProfileNotice('');
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    body.farmSizeAcres = body.farmSizeAcres === '' ? null : Number(body.farmSizeAcres);
    body.farmingExperienceYears = body.farmingExperienceYears === '' ? null : Number(body.farmingExperienceYears);
    try {
      const updated = await api('/api/auth/me', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      setUser(updated); setProfileNotice(t.profileSaved);
    } catch { setProfileNotice(t.profileSaveError); } finally { setProfileSaving(false); }
  };
  const locate = () => {
    if (!navigator.geolocation) { setLocationNote(t.locUnavailable); return; }
    setWeatherError(''); setLocating(true); setLocationNote(t.requestingLocation);
    navigator.geolocation.getCurrentPosition(async (position) => {
      setLocating(false);
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      try {
        let place = null;
        try { place = (await api(`/api/location/reverse?latitude=${encodeURIComponent(coords.latitude)}&longitude=${encodeURIComponent(coords.longitude)}`)).location; } catch { /* Coordinates still work if place lookup is unavailable. */ }
        const updated = await api('/api/auth/me', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...coords, ...(place?.village ? { village: place.village } : {}), ...(place?.district ? { district: place.district } : {}) }) });
        setUser(updated); setGpsPlace(place);
        setLocationNote(place ? `${t.gpsUsing}: ${place.displayName}` : `${t.gpsUsing} (${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}).`);
      } catch (error) { setLocationNote(localizedError(error.message, t)); }
      refreshWeather(coords).catch(() => {});
    }, (error) => {
      setLocating(false);
      setLocationNote(error.code === 1 ? t.permissionDenied : error.code === 3 ? t.gpsTimeout : t.gpsFailed);
    }, { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 });
  };
  const diagnose = async (event) => {
    event.preventDefault(); setBusy(true); setFormError(''); setNotice(t.checking);
    const form = new FormData(event.currentTarget);
    try {
      form.set('language', language);
      const resultData = await api('/api/diagnoses', { method: 'POST', body: form });
      setResult(resultData); setNotice(t.saved); setHistory((items) => [resultData, ...items]);
      try {
        const profile = await api('/api/auth/me', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ district: form.get('district'), block: form.get('block'), village: form.get('village') }) });
        setUser(profile); setGpsPlace(null);
      } catch { /* The diagnosis has already been saved successfully. */ }
      refreshWeather().catch(() => {});
    } catch (error) { setFormError(t[error.code] || localizedError(error.message, t)); setNotice(''); } finally { setBusy(false); }
  };
  const go = (next) => { setView(next); setNotice(''); setFormError(''); if (next !== 'diagnose') setResult(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const latest = history[0];
  const hasSoilData = ['soilPh', 'soilNitrogen', 'soilPhosphorus', 'soilPotassium', 'soilOrganicCarbon'].some((key) => user?.[key] != null);
  const profilePlace = [user?.village, user?.district].filter(Boolean).join(', ');
  const headerLocation = gpsPlace?.displayName || profilePlace || (user?.latitude != null && user?.longitude != null ? `${t.gpsLocation} (${Number(user.latitude).toFixed(3)}, ${Number(user.longitude).toFixed(3)})` : t.setLocation);

  if (!user) return <main className="auth-page">
    <div className="auth-brand"><span className="logo-mark">✳</span><span>krushi<span className="brand-muted">mitra</span><small>{t.subtitle}</small></span><select aria-label={t.lang} value={language} onChange={(e) => changeLanguage(e.target.value)}><option value="en">EN</option><option value="or">ଓଡ଼ିଆ</option></select></div>
    <div className="auth-wrap"><div className="auth-intro"><p className="eyebrow">{t.tagline}</p><h1>{t.authTitle}<br/><em>{t.authTitleEm}</em></h1><p>{t.authIntro}</p><span className="trust">✦ &nbsp; {t.trust}</span></div>
      <form className="auth-card" onSubmit={login}><div className="auth-tabs"><button type="button" className={authMode === 'login' ? 'selected' : ''} onClick={() => { setAuthMode('login'); setAuthError(''); }}>{t.login}</button><button type="button" className={authMode === 'register' ? 'selected' : ''} onClick={() => { setAuthMode('register'); setAuthError(''); }}>{t.signup}</button></div>
        <h2>{authMode === 'login' ? t.welcome : t.join}</h2><p className="muted">{authMode === 'login' ? t.loginHint : t.signupHint}</p>
        {authMode === 'register' && <label>{t.name}<input name="name" required maxLength="100" autoComplete="name"/></label>}
        <label>{t.email}<input type="email" name="email" required autoComplete="email" placeholder={t.emailPlaceholder}/></label>
        <label>{t.password}<input type="password" name="password" required minLength="8" maxLength="100" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} placeholder={t.passwordPlaceholder}/></label>
        <button disabled={busy} className="button full">{busy ? t.wait : authMode === 'login' ? t.login : t.signup} <span>→</span></button>{authError && <p className="error">{authError}</p>}<p className="form-note">{t.privateNote}</p>
      </form>
    </div>
  </main>;

  return <div className="layout"><aside className="sidebar"><a className="brand" href="#" onClick={(e) => { e.preventDefault(); go('home'); }}><span className="logo-mark">✳</span><span>krushi<span className="brand-muted">mitra</span><small>{t.subtitle}</small></span></a>
    <div className="nav-label">{t.workspace}</div><button className={view === 'home' ? 'nav-item active' : 'nav-item'} onClick={() => go('home')}><span>⌂</span>{t.overview}</button><button className={view === 'diagnose' ? 'nav-item active' : 'nav-item'} onClick={() => go('diagnose')}><span>⌕</span>{t.diagnose}</button><button className={view === 'history' ? 'nav-item active' : 'nav-item'} onClick={() => go('history')}><span>◷</span>{t.history}</button><button className={view === 'profile' ? 'nav-item active' : 'nav-item'} onClick={() => go('profile')}><span>♙</span>{t.profileNav}</button>
    <div className="sidebar-bottom"><div className="advisor-card"><span>✦</span><b>{t.note}</b><p>{t.adviceCopy}</p></div><div className="user-mini"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span className="user-label"><b>{user.name}</b><small>{user.district || (language === 'or' ? 'ଓଡ଼ିଶା, ଭାରତ' : 'Odisha, India')}</small></span><button className="logout" title={t.signOut} aria-label={t.signOut} onClick={logout}><span aria-hidden="true">↗</span><span className="logout-label">{t.signOut}</span></button></div></div>
  </aside>
  <main className="main"><header className="topbar"><div><div className="eyebrow">{formatHeaderDate(new Date(), language)}</div><b className="page-title">{t.pageTitle}</b></div><div className="top-actions"><span className="location-top" title={headerLocation}>⌖ {headerLocation}</span><select aria-label={t.lang} value={language} onChange={(e) => changeLanguage(e.target.value)}><option value="en">EN</option><option value="or">ଓଡ଼ିଆ</option></select><span className="avatar top-avatar">{user.name.slice(0, 1).toUpperCase()}</span><button type="button" className="top-logout" onClick={logout}><span aria-hidden="true">↗</span><span>{t.signOut}</span></button></div></header>
    {view === 'home' && <section className="page"><div className="hero"><div className="landscape"><i className="sun"/><i className="hill one"/><i className="hill two"/><span>♧</span></div><div className="hero-copy"><p className="eyebrow">✳ &nbsp;{t.today}</p><h1>{getGreeting(t, currentTime)}<br/><em>{user.name.split(' ')[0]}.</em></h1><p>{language === 'or' ? 'ଆଜିର ଛୋଟ, ସଠିକ୍ ପଦକ୍ଷେପ ଅମଳରେ ଭଲ ଫଳ ଦେଇପାରେ।' : 'Small, informed steps today can make a difference at harvest.'}</p><small className="hero-local-time"><span aria-hidden="true">◷</span>{t.indiaTime} · {formatIndiaTime(currentTime, language)}</small><button className="button" onClick={() => go('diagnose')}>{t.check} <span>→</span></button></div></div>
      <article className="farmer-profile"><div className="profile-avatar">{user.name.slice(0, 1).toUpperCase()}</div><div className="profile-identity"><span>{t.farmerProfile}</span><strong>{user.name}</strong><small>{user.email}</small></div><div className="profile-location"><span>{t.farmDetails}</span><strong>{profilePlace || t.locationNotSet}</strong></div><button type="button" className="profile-edit-button" onClick={() => go('profile')}>{t.editProfile}</button><span className="profile-mark">✳</span></article>
      <div className="section-head"><div><p className="eyebrow">{t.snapshot}</p><h2>{t.field}</h2></div><button className="link-button" onClick={() => go('diagnose')}>{language === 'or' ? 'ନୂଆ ଫସଲ ଯାଞ୍ଚ' : 'Start a diagnosis'} →</button></div>
      <div className="snapshot-grid"><article className="snapshot weather"><div className="snap-label">{t.weather}<span>☀</span></div><strong>{weather ? `${weather.temperatureC} °C` : '—'}</strong><p>{weather ? `${weather.language === 'or' ? weather.conditionOdia : (language === 'or' ? t.weatherConditions[weather.condition] : weather.condition) || weather.condition}${Number.isFinite(weather.humidity) ? ` · ${language === 'or' ? 'ଆର୍ଦ୍ରତା' : 'humidity'} ${weather.humidity}%` : ''}` : weatherError || translateWeatherSummary(latest?.weather, t, language) || t.currentWeatherFallback}</p>
        <div className="weather-actions"><button className="link-button" disabled={weatherBusy} onClick={() => refreshWeather().catch(() => {})}>{weatherBusy ? t.loadingWeather : `↻ ${t.refreshWeather}`}</button><button className="location-button" disabled={weatherBusy || locating} onClick={locate}>{locating ? t.gettingLocation : `⌖ ${t.useGps}`}</button></div>{locationNote && <p className="small-muted weather-location-note" role="status">{locationNote}</p>}
        {weather && <div className="weather-details" aria-label={language === 'or' ? 'ପାଣିପାଗର ଅଧିକ ସୂଚନା' : 'More weather details'}>
          <div><span>{t.feelsLike}</span><b>{Number.isFinite(weather.feelsLikeC) ? `${weather.feelsLikeC}°` : '—'}</b></div>
          <div><span>{t.humidity}</span><b>{Number.isFinite(weather.humidity) ? `${weather.humidity}%` : '—'}</b></div>
          <div><span>{t.rainfall}</span><b>{Number.isFinite(weather.precipitation) ? `${weather.precipitation} ${t.millimeters}` : '—'}</b></div>
          <div><span>{t.wind}</span><b>{Number.isFinite(weather.windSpeedKmh) ? `${weather.windSpeedKmh} km/h` : '—'}</b></div>
        </div>}
        <footer>⌖ {[user.village, user.district].filter(Boolean).join(', ') || (user.latitude != null ? t.gpsSaved : t.locationNotSet)}{weather?.observedAt ? ` · ${new Date(weather.observedAt).toLocaleTimeString(locale)}` : ''}</footer><div className="weather-attribution">{weather?.provider === 'Open-Meteo' && <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather: Open-Meteo</a>}{weather?.provider === 'Open-Meteo' && gpsPlace && <span> · </span>}{gpsPlace && <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>}</div></article>
        <article className="snapshot soil-snapshot"><div className="snap-label">{t.soil}<span>⌁</span></div><strong className="small-strong">{hasSoilData ? t.soilTestValues : t.localInsight}</strong>
          {hasSoilData ? <p className="soil-values">{[[t.soilPh, user.soilPh], [t.soilNitrogen, user.soilNitrogen], [t.soilPhosphorus, user.soilPhosphorus], [t.soilPotassium, user.soilPotassium], [t.soilOrganicCarbon, user.soilOrganicCarbon]].filter(([, value]) => value != null).map(([label, value]) => `${label}: ${value}`).join(' · ')}</p> : <p>{t.soilUnavailable}</p>}
          <button type="button" className="link-button soil-toggle" onClick={() => { setSoilFormOpen((open) => !open); setSoilNotice(''); }}>{soilFormOpen ? t.cancel : hasSoilData ? t.editSoil : t.addSoil}</button>{soilNotice && <p className="small-muted" role="status">{soilNotice}</p>}
          {soilFormOpen && <form className="soil-form" onSubmit={saveSoil}><h4>{t.soilFormTitle}</h4><p className="small-muted">{t.soilFormHint}</p><div className="soil-fields">
            <label>{t.soilPh}<input name="soilPh" type="number" min="0" max="14" step="0.1" defaultValue={user.soilPh ?? ''} placeholder="6.5"/></label>
            <label>{t.soilNitrogen}<input name="soilNitrogen" type="number" min="0" max="100000" step="any" defaultValue={user.soilNitrogen ?? ''} placeholder="e.g. 280"/></label>
            <label>{t.soilPhosphorus}<input name="soilPhosphorus" type="number" min="0" max="100000" step="any" defaultValue={user.soilPhosphorus ?? ''} placeholder="e.g. 22"/></label>
            <label>{t.soilPotassium}<input name="soilPotassium" type="number" min="0" max="100000" step="any" defaultValue={user.soilPotassium ?? ''} placeholder="e.g. 180"/></label>
            <label>{t.soilOrganicCarbon}<input name="soilOrganicCarbon" type="number" min="0" max="100" step="any" defaultValue={user.soilOrganicCarbon ?? ''} placeholder="e.g. 0.6"/></label>
          </div><button className="button soil-save-button" disabled={soilSaving}>{soilSaving ? t.wait : t.saveSoil}</button></form>}
          <footer>{t.soilNoGuess}</footer></article>
        <article className="snapshot"><div className="snap-label">{t.count}<span>✳</span></div><strong>{history.length}<small> {t.checks}</small></strong><p>{t.pastObservations}</p><button className="link-button" onClick={() => go('history')}>{t.viewHistory} →</button></article></div>
      <div className="advice-note"><span>✳</span><p><b>{t.note}</b><br/>{t.adviceCopy}</p><a href="https://kvk.icar.gov.in/" target="_blank" rel="noreferrer">{t.findKvk} ↗</a></div></section>}
    {view === 'diagnose' && <section className="page"><div className="section-head"><div><p className="eyebrow">{t.closerLook}</p><h2>{t.checkCrop}</h2><p className="muted">{t.diagnosisHint}</p></div></div>
      <form onSubmit={diagnose} className="diagnose-grid"><div className="form-card crop-details-card"><Step n="01" text={t.stepCrop}/><label>{t.crop}<input name="crop" required maxLength="100" placeholder={t.cropPlaceholder}/></label>
        <label>{t.stage}<select name="growthStage"><option value="">{t.chooseKnown}</option><option value="Seedling">{t.seedling}</option><option value="Vegetative">{t.vegetative}</option><option value="Flowering">{t.flowering}</option><option value="Fruiting / grain filling">{t.fruiting}</option><option value="Maturity">{t.maturity}</option></select></label>
        <label>{t.mainSymptom}<select name="symptom" defaultValue="" required><option value="" disabled>{t.chooseSymptom}</option><option value="yellowing">{t.symptomYellowing}</option><option value="brown-spots">{t.symptomSpots}</option><option value="holes">{t.symptomHoles}</option><option value="white-powder">{t.symptomWhite}</option><option value="curling">{t.symptomCurling}</option><option value="wilting">{t.symptomWilting}</option><option value="rotting">{t.symptomRotting}</option><option value="slow-growth">{t.symptomSlowGrowth}</option><option value="unsure">{t.symptomUnsure}</option></select></label>{t.symptomNote && <p className="small-muted">{t.symptomNote}</p>}
        <Step n="02" text={t.stepWhere}/><div className="three-fields"><label>{t.district}<input name="district" defaultValue={user.district || ''}/></label><label>{t.block}<input name="block" defaultValue={user.block || ''}/></label><label>{t.village}<input name="village" defaultValue={user.village || ''}/></label></div>
        <button type="button" className="location-button" disabled={locating || weatherBusy} onClick={locate}>{locating ? t.gettingLocation : `⌖ ${t.useGps}`}</button><p className="small-muted" role="status">{locationNote}</p>{gpsPlace && <p className="small-muted source-credit"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></p>}
      </div><div className="form-card upload-card"><Step n="03" text={t.stepPhoto}/><label className="upload-drop"><input type="file" name="image" accept="image/jpeg,image/png,image/webp" required onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size > 8 * 1024 * 1024) { e.target.value = ''; setFormError(t.errImageSize); setSelectedFile(null); setPreview(''); return; } if (f && !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { e.target.value = ''; setFormError(t.errImageType); setSelectedFile(null); setPreview(''); return; } setFormError(''); setSelectedFile(f || null); setPreview(f ? URL.createObjectURL(f) : ''); }}/>{preview ? <img src={preview} alt={language === 'or' ? 'ଫସଲର ଫଟୋ ପୂର୍ବଦୃଶ୍ୟ' : 'Crop photo preview'}/> : <><span>↥</span><b>{t.photo}</b><small>{t.jpeg}</small><em>{t.browse}</em></>}</label>
        {selectedFile && <p className="file-label">{selectedFile.name}</p>}<p className="upload-tip">✦ &nbsp;{t.uploadTip}</p><button disabled={busy} className="button full">{busy ? t.reviewing : t.submit} <span>→</span></button>{t.probableNote && <p className="form-note">{t.probableNote}</p>}
      </div></form>{formError && <p className="error" role="alert">{formError}</p>}{notice && <p className="notice" role="status">{notice}</p>}{translationStatus === 'loading' && <p className="report-translation-status" role="status">{t.translatingReport}</p>}{translationStatus === 'failed' && <p className="report-translation-error" role="alert">{t.translationFailed}</p>}{result && <Result result={result} farmer={user} t={t} locale={locale} resultRef={resultRef} onDownloadPdf={saveAssessmentPdf}/>}
    </section>}
    {view === 'profile' && <section className="page profile-page"><div className="section-head"><div><p className="eyebrow">{t.farmerProfile}</p><h2>{t.profileTitle}</h2><p className="muted">{t.profileIntro}</p></div></div>
      <form className="form-card farmer-profile-form" onSubmit={saveFarmerProfile}>
        <div className="profile-form-heading"><span className="profile-avatar">{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div>
        <div className="profile-fields">
          <label>{t.farmSize}<input name="farmSizeAcres" type="number" min="0" max="100000" step="any" defaultValue={user.farmSizeAcres ?? ''} placeholder={t.farmSizePlaceholder}/></label>
          <label>{t.farmingExperience}<input name="farmingExperienceYears" type="number" min="0" max="100" step="1" defaultValue={user.farmingExperienceYears ?? ''} placeholder={t.experiencePlaceholder}/></label>
          <label>{t.soilType}<select name="soilType" defaultValue={user.soilType || ''}><option value="">{t.selectOption}</option><option value="Alluvial">{t.soilAlluvial}</option><option value="Clay">{t.soilClay}</option><option value="Sandy">{t.soilSandy}</option><option value="Loamy">{t.soilLoamy}</option><option value="Red laterite">{t.soilRedLaterite}</option><option value="Other">{t.other}</option></select></label>
          <label>{t.irrigationSource}<select name="irrigationSource" defaultValue={user.irrigationSource || ''}><option value="">{t.selectOption}</option><option value="Rain-fed">{t.irrigationRain}</option><option value="Canal">{t.irrigationCanal}</option><option value="Borewell / tube well">{t.irrigationBorewell}</option><option value="Open well">{t.irrigationWell}</option><option value="Pond / reservoir">{t.irrigationPond}</option><option value="Drip / sprinkler">{t.irrigationDrip}</option><option value="Other">{t.other}</option></select></label>
        </div>
        <p className="profile-context-hint">{t.profileContextHint}</p>
        {profileNotice && <p className="profile-notice" role="status">{profileNotice}</p>}
        <div className="profile-form-actions"><button className="button" disabled={profileSaving}>{profileSaving ? t.wait : t.profileSave}</button><button type="button" className="button button-secondary" onClick={() => go('home')}>{t.cancel}</button></div>
      </form>
    </section>}
    {view === 'history' && <section className="page"><div className="section-head"><div><p className="eyebrow">{t.journal}</p><h2>{t.past}</h2><p className="muted">{t.review}</p></div><div className="history-actions">{history.length > 0 && <button className="button button-secondary" onClick={exportHistory}>{t.exportHistory} ↓</button>}<button className="button" onClick={() => go('diagnose')}>{t.newCheck} →</button></div></div>
      {history.length > 0 && <label className="history-search"><span aria-hidden="true">⌕</span><input type="search" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder={t.searchHistory} aria-label={t.searchHistory}/>{historySearch && <button type="button" onClick={() => setHistorySearch('')} aria-label={t.clearSearch}>×</button>}</label>}
      {history.length ? filteredHistory.length ? <div className="history-list">{filteredHistory.map((item) => <button key={item.id} className="history-row" onClick={() => { setResult(item); setView('diagnose'); }}><span className="crop-symbol">♧</span><span className="history-main"><b>{item.crop}</b><small>{new Date(item.createdAt).toLocaleString(locale)} · {item.probableIssue}</small></span><span className="badge">{t.assessment}</span><span>→</span></button>)}</div> : <div className="empty-state"><span>⌕</span><h3>{t.noMatches}</h3><button className="button button-secondary" onClick={() => setHistorySearch('')}>{t.clearSearch}</button></div> : <div className="empty-state"><span>✳</span><h3>{t.emptyTitle}</h3><p>{t.emptyHint}</p><button className="button" onClick={() => go('diagnose')}>{t.check} →</button></div>}
    </section>}
    <footer className="app-footer"><b>✳ KRUSHI MITRA</b><span>{t.footer}</span><span>{t.madeFor}</span></footer>
  </main></div>;
}

function Step({ n, text }) { return <div className="step-label"><span>{n}</span>{text}</div>; }
const pesticideNameExamples = [
  { crops: /\b(rice|paddy)\b|ଧାନ/i, pests: /brown plant ?hopper|\bBPH\b|white.?backed plant ?hopper|green leaf ?hopper|ବ୍ରାଉନ୍ ପ୍ଲାଣ୍ଟ ହପର୍/i, target: { en: 'Rice / paddy — brown plant hopper (BPH)', or: 'ଧାନ — ବ୍ରାଉନ୍ ପ୍ଲାଣ୍ଟ ହପର୍ (BPH)' }, names: 'Flonicamid 50% WG; Dinotefuran 20% SG', url: 'https://ppqs.gov.in/sites/default/files/pop_for_managment_of_rice_bph.pdf' },
  { crops: /\b(rice|paddy)\b|ଧାନ/i, pests: /yellow stem ?borer|stem ?borer|leaf ?folder|କାଣ୍ଡ ଛେଦକ|ପତ୍ର ମୋଡ଼ା/i, target: { en: 'Rice / paddy — yellow stem borer or leaf folder', or: 'ଧାନ — ହଳଦିଆ କାଣ୍ଡ ଛେଦକ କିମ୍ବା ପତ୍ର ମୋଡ଼ା କୀଟ' }, names: 'Spinetoram 11.7% SC', url: 'https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf' },
  { crops: /\b(brinjal|eggplant|aubergine|baingan)\b|ବାଇଗଣ/i, pests: /shoot.{0,8}fruit ?borer|fruit.{0,8}shoot ?borer|leucinodes|କାଣ୍ଡ.{0,8}ଫଳ ଛେଦକ/i, target: { en: 'Brinjal — shoot and fruit borer', or: 'ବାଇଗଣ — କାଣ୍ଡ ଓ ଫଳ ଛେଦକ' }, names: 'Spinetoram 11.7% SC', url: 'https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf' },
  { crops: /\b(chilli|chili|pepper)\b|ଲଙ୍କା/i, pests: /fruit ?borer|thrips|helicoverpa|scirtothrips|ଫଳ ଛେଦକ|ଥ୍ରିପ୍ସ/i, target: { en: 'Chilli — fruit borer or thrips', or: 'ଲଙ୍କା — ଫଳ ଛେଦକ କିମ୍ବା ଥ୍ରିପ୍ସ' }, names: 'Spinetoram 11.7% SC', url: 'https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf' },
  { crops: /\b(tomato)\b|ଟମାଟୋ/i, pests: /fruit ?borer|leaf ?miner|aphid|thrips|white ?fly|helicoverpa|ଫଳ ଛେଦକ/i, target: { en: 'Tomato — fruit borer, leaf miner, aphids, thrips or whitefly', or: 'ଟମାଟୋ — ଫଳ ଛେଦକ, ପତ୍ର ଖଣିକ, ଜାଉ ପୋକ, ଥ୍ରିପ୍ସ କିମ୍ବା ଧଳା ମାଛି' }, names: 'Cyantraniliprole 10.26% OD', url: 'https://ppqs.gov.in/sites/default/files/cyantraniliprole_10.26_od93ffmc_india_private_limited_1.pdf' },
  { crops: /\b(cabbage)\b|ବନ୍ଧାକୋବି/i, pests: /diamond.?back.?moth|caterpillar|aphid|ଶୂକ/i, target: { en: 'Cabbage — diamondback moth, caterpillars or aphids', or: 'ବନ୍ଧାକୋବି — ଡାଇମଣ୍ଡବ୍ୟାକ୍ ମଥ୍, ଶୂକ କିମ୍ବା ଜାଉ ପୋକ' }, names: 'Cyantraniliprole 10.26% OD', url: 'https://ppqs.gov.in/sites/default/files/cyantraniliprole_10.26_od93ffmc_india_private_limited_1.pdf' },
  { crops: /\b(watermelon)\b|ତରଭୁଜ/i, pests: /thrips|white ?fly|aphid|leaf ?miner|ଥ୍ରିପ୍ସ|ଧଳା ମାଛି/i, target: { en: 'Watermelon — thrips, whitefly, aphids or leaf miner', or: 'ତରଭୁଜ — ଥ୍ରିପ୍ସ, ଧଳା ମାଛି, ଜାଉ ପୋକ କିମ୍ବା ପତ୍ର ଖଣିକ' }, names: 'Cyantraniliprole 10.26% OD', url: 'https://ppqs.gov.in/sites/default/files/cyantraniliprole_10.26_od93ffmc_india_private_limited_1.pdf' },
  { crops: /\b(ridge ?gourd|luffa)\b|ଜହ୍ନି/i, pests: /thrips|white ?fly|aphid|leaf ?miner|pumpkin caterpillar|ଥ୍ରିପ୍ସ|ଧଳା ମାଛି/i, target: { en: 'Ridge gourd — thrips, whitefly, aphids, leaf miner or pumpkin caterpillar', or: 'ଜହ୍ନି — ଥ୍ରିପ୍ସ, ଧଳା ମାଛି, ଜାଉ ପୋକ, ପତ୍ର ଖଣିକ କିମ୍ବା କଖାରୁ ଶୂକ' }, names: 'Cyantraniliprole 10.26% OD', url: 'https://ppqs.gov.in/sites/default/files/cyantraniliprole_10.26_od93ffmc_india_private_limited_1.pdf' },
  { crops: /\b(okra|bhindi|lady.?finger)\b|ଭେଣ୍ଡି/i, pests: /fruit ?borer|shoot.{0,8}fruit ?borer|hel[iy]coverpa|earias|ଫଳ ଛେଦକ/i, target: { en: 'Okra — fruit or shoot-and-fruit borer', or: 'ଭେଣ୍ଡି — ଫଳ କିମ୍ବା କାଣ୍ଡ-ଫଳ ଛେଦକ' }, names: 'Spinetoram 11.7% SC', url: 'https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf' },
  { crops: /\b(cotton)\b|କପା/i, pests: /boll ?worm|spotted bollworm|tobacco caterpillar|thrips|ଥ୍ରିପ୍ସ/i, target: { en: 'Cotton — bollworms or thrips', or: 'କପା — ବୋଲ୍ୱର୍ମ କିମ୍ବା ଥ୍ରିପ୍ସ' }, names: 'Spinetoram 11.7% SC', url: 'https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf' },
  { crops: /\b(chickpea|chick pea|gram|chana)\b|ଚଣା/i, pests: /pod ?borer|helicoverpa|ଡାଲି ଛେଦକ/i, target: { en: 'Chickpea — pod borer', or: 'ଚଣା — ଡାଲି ଛେଦକ' }, names: 'Spinetoram 11.7% SC', url: 'https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf' },
  { crops: /\b(red ?gram|pigeon ?pea|arhar|tur)\b|ହରଡ଼/i, pests: /pod ?borer|helicoverpa|maruca|ଡାଲି ଛେଦକ/i, target: { en: 'Red gram — pod borer', or: 'ହରଡ଼ — ଡାଲି ଛେଦକ' }, names: 'Spinetoram 11.7% SC', url: 'https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf' },
  { crops: /\b(soybean|soya)\b|ସୋୟାବିନ୍/i, pests: /tobacco caterpillar|spodoptera|army ?worm|ଶୂକ/i, target: { en: 'Soybean — tobacco caterpillar', or: 'ସୋୟାବିନ୍ — ତମାଖୁ ଶୂକ' }, names: 'Spinetoram 11.7% SC', url: 'https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf' },
  { crops: /\b(grape|grapes)\b|ଅଙ୍ଗୁର/i, pests: /thrips|scirtothrips|ଥ୍ରିପ୍ସ/i, target: { en: 'Grapes — thrips', or: 'ଅଙ୍ଗୁର — ଥ୍ରିପ୍ସ' }, names: 'Spinetoram 11.7% SC', url: 'https://ppqs.gov.in/sites/default/files/spinetoram_11.7_1-merged.pdf' },
];
function Result({ result, farmer, t, locale, resultRef, onDownloadPdf }) {
  const rows = [[t.possibleCauses, result.causes], [t.organic, result.organicAlternatives], [t.prevention, result.prevention], [t.irrigation, result.irrigation], [t.timing, result.timing], [t.weather, result.weather], [t.soil, result.soil]];
  const aiCandidate = result.provider?.toLowerCase().includes('gemini image analysis') ? result.activeIngredients?.trim() : '';
  const pesticideSuggestion = aiCandidate || t.pesticideNoGeminiCandidate;
  const reportId = `KM-${new Date(result.createdAt).getFullYear()}-${String(result.id).padStart(6, '0')}`;
  const reportLocation = [result.village, result.block, result.district].filter(Boolean).join(', ') || t.locationMissing;
  return <article className="result-card" ref={resultRef} tabIndex="-1">
    <header className="print-report-masthead print-only"><div className="print-brand"><strong>KRUSHI MITRA</strong><span>{t.pdfSubtitle}</span></div><div className="print-report-heading"><h1>{t.pdfTitle}</h1><b>{reportId}</b><span>{formatHeaderDate(new Date(result.createdAt), languageFromLocale(locale))}</span></div></header>
    <section className="print-farmer-details print-only"><h4>{t.pdfFarmerDetails}</h4><div className="print-farmer-grid"><div><b>{t.pdfFarmerName}</b><span>{farmer?.name || t.notAvailable}</span></div><div><b>{t.pdfContact}</b><span>{farmer?.phone || farmer?.email || t.notAvailable}</span></div><div><b>{t.pdfFarmLocation}</b><span>{reportLocation}</span></div><div><b>{t.farmSize}</b><span>{farmer?.farmSizeAcres != null ? `${farmer.farmSizeAcres} ${locale === 'or-IN' ? 'ଏକର' : 'acres'}` : t.notAvailable}</span></div></div></section>
    <div className="result-head"><div><p className="eyebrow">{t.cropCheck} · {new Date(result.createdAt).toLocaleString(locale)}</p><h3>{result.crop} · {result.growthStage || t.growthUnspecified}</h3><p className="muted">{reportLocation}</p></div><div className="result-actions"><span className="badge">{t.assessment}</span><button type="button" className="button pdf-button" onClick={() => onDownloadPdf(result)}><span aria-hidden="true">⇩</span><span>{t.downloadPdf}</span></button></div></div>
    <div className="result-issue"><b>{t.issue}</b><p>{result.probableIssue}</p></div><h4 className="report-details-title">{t.reportDetails}</h4><div className="result-grid">{rows.map(([label, value]) => <div key={label}><b>{label}</b><p>{label === t.weather ? translateWeatherSummary(value, t, locale === 'or-IN' ? 'or' : 'en') || t.notAvailable : value || t.notAvailable}</p></div>)}</div><section className="pesticide-suggestion-card" aria-labelledby="pesticide-suggestion-title"><div className="pesticide-suggestion-heading"><span aria-hidden="true">✿</span><h4 id="pesticide-suggestion-title">{t.activeIngredients}</h4></div><p className="pesticide-suggestion-text">{pesticideSuggestion}</p><p className="pesticide-suggestion-note">{t.pesticideGuideNote}</p></section><section className="pesticide-guide" aria-labelledby="pesticide-guide-title"><div className="pesticide-guide-heading"><span aria-hidden="true">✳</span><h4 id="pesticide-guide-title">{t.pesticideGuideTitle}</h4></div><p>{t.pesticideGuideIntro}</p><details><summary>{t.pesticideMoreSafety}</summary><ol>{t.pesticideGuideSteps.map((step) => <li key={step}>{step}</li>)}</ol></details></section>
    <section className="print-officer-review print-only"><h4>{t.pdfOfficerReview}</h4><div className="print-review-grid"><div><b>{t.pdfOfficerName}</b><span/></div><div><b>{t.pdfDesignation}</b><span/></div><div><b>{t.pdfRemarks}</b><span/></div><div><b>{t.pdfDate}</b><span/></div><div><b>{t.pdfSignature}</b><span/></div><div><b>{t.pdfStamp}</b><span/></div></div></section>
    <p className="print-report-disclaimer print-only">{t.pdfDisclaimer}</p>
  </article>;
}

function languageFromLocale(locale) { return locale === 'or-IN' ? 'or' : 'en'; }

createRoot(document.getElementById('root')).render(<App/>);
