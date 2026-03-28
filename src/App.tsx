import { useState, useEffect, useRef, useCallback, CSSProperties } from "react";

const CIRCUMFERENCE = 741.4;

type ModeKey = "pomodoro" | "short" | "long";

interface ModeConfig {
  label: string;
  sessionLabel: string;
  color: string;
}

interface Settings {
  pomodoro: number;
  short: number;
  long: number;
}

interface Stats {
  sessions: number;
  minutes: number;
  streak: number;
}

interface NotifState {
  show: boolean;
  msg: string;
}

const MODES: Record<ModeKey, ModeConfig> = {
  pomodoro: { label: "Pomodoro", sessionLabel: "FOCUS", color: "#e85d3c" },
  short: { label: "Pauză scurtă", sessionLabel: "PAUZĂ", color: "#4caf82" },
  long: { label: "Pauză lungă", sessionLabel: "PAUZĂ LUNGĂ", color: "#f5a623" },
};

const defaultSettings: Settings = { pomodoro: 25, short: 5, long: 15 };

function loadStats(): Stats {
  try {
    const saved = localStorage.getItem("pomo_stats");
    if (saved) return JSON.parse(saved) as Stats;
  } catch (_) {}
  return { sessions: 0, minutes: 0, streak: 0 };
}

function saveStats(stats: Stats): void {
  try {
    localStorage.setItem("pomo_stats", JSON.stringify(stats));
  } catch (_) {}
}

export default function PomodoroApp() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mode, setMode] = useState<ModeKey>("pomodoro");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [timeLeft, setTimeLeft] = useState<number>(
    defaultSettings.pomodoro * 60
  );
  const [totalTime, setTotalTime] = useState<number>(
    defaultSettings.pomodoro * 60
  );
  const [running, setRunning] = useState<boolean>(false);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [sessionInCycle, setSessionInCycle] = useState<number>(0);
  const [notification, setNotification] = useState<NotifState>({
    show: false,
    msg: "",
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );
  const notifTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const isDark = theme === "dark";

  const colors = {
    bg: isDark ? "#0f0f0f" : "#f5f2ed",
    surface: isDark ? "#1a1a1a" : "#ffffff",
    surface2: isDark ? "#242424" : "#ece9e3",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    text: isDark ? "#f0ede8" : "#1a1a1a",
    muted: "#888",
    ringBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
  };

  const accent = MODES[mode].color;

  const resetTimer = useCallback((newMode: ModeKey, newSettings: Settings) => {
    clearInterval(intervalRef.current);
    setRunning(false);
    const secs = newSettings[newMode] * 60;
    setTimeLeft(secs);
    setTotalTime(secs);
  }, []);

  // Reset when mode changes
  useEffect(() => {
    resetTimer(mode, settings);
  }, [mode]); // eslint-disable-line

  // Tick
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          handleSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]); // eslint-disable-line

  function handleSessionComplete() {
    if (mode === "pomodoro") {
      setStats((prev) => {
        const next: Stats = {
          sessions: prev.sessions + 1,
          minutes: prev.minutes + settings.pomodoro,
          streak: prev.streak + 1,
        };
        saveStats(next);
        return next;
      });
      setSessionInCycle((prev) => {
        const next = prev + 1;
        if (next >= 4) {
          showNotif("Pomodoro completat! Ia o pauză lungă.");
          setTimeout(() => setMode("long"), 1200);
          return 0;
        }
        showNotif("Pomodoro completat! Ia o pauză scurtă.");
        setTimeout(() => setMode("short"), 1200);
        return next;
      });
    } else {
      showNotif("Pauză terminată! Hai la treabă.");
      setTimeout(() => setMode("pomodoro"), 1200);
    }
  }

  function showNotif(msg: string) {
    setNotification({ show: true, msg });
    clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(
      () => setNotification({ show: false, msg }),
      3000
    );
  }

  function toggleTimer() {
    setRunning((r) => !r);
  }

  function skip() {
    clearInterval(intervalRef.current);
    setRunning(false);
    handleSessionComplete();
  }

  function adjustSetting(key: ModeKey, delta: number) {
    const max = key === "pomodoro" ? 90 : 30;
    setSettings((prev) => {
      const next: Settings = {
        ...prev,
        [key]: Math.max(1, Math.min(max, prev[key] + delta)),
      };
      if (key === mode) {
        const secs = next[key] * 60;
        setTimeLeft(secs);
        setTotalTime(secs);
        setRunning(false);
        clearInterval(intervalRef.current);
      }
      return next;
    });
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;
  const offset = CIRCUMFERENCE * (1 - progress);

  // ── Styles ────────────────────────────────────────────────────────────────

  const app: CSSProperties = {
    fontFamily: "'Syne', sans-serif",
    background: colors.bg,
    color: colors.text,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "2rem 1rem 3rem",
    transition: "background 0.3s, color 0.3s",
  };

  const header: CSSProperties = {
    width: "100%",
    maxWidth: 480,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2.5rem",
  };

  const tabs: CSSProperties = {
    display: "flex",
    gap: 6,
    background: colors.surface,
    border: `0.5px solid ${colors.border}`,
    borderRadius: 50,
    padding: 4,
    marginBottom: "2.5rem",
  };

  const tab = (active: boolean): CSSProperties => ({
    padding: "7px 20px",
    borderRadius: 50,
    border: "none",
    background: active ? accent : "transparent",
    fontFamily: "'Syne', sans-serif",
    fontSize: 13,
    fontWeight: active ? 700 : 400,
    color: active ? "#fff" : colors.muted,
    cursor: "pointer",
  });

  const timerWrap: CSSProperties = {
    position: "relative",
    width: 260,
    height: 260,
    marginBottom: "2.5rem",
  };

  const timerInner: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  };

  const controls: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: "2.5rem",
  };

  const btnPrimary: CSSProperties = {
    background: accent,
    color: "#fff",
    border: "none",
    borderRadius: 50,
    padding: "14px 48px",
    fontFamily: "'Syne', sans-serif",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: 0.5,
  };

  const btnIcon: CSSProperties = {
    background: colors.surface,
    border: `0.5px solid ${colors.border}`,
    borderRadius: "50%",
    width: 44,
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: colors.muted,
    fontSize: 18,
    flexShrink: 0,
  };

  const dotsRow: CSSProperties = {
    display: "flex",
    gap: 8,
    marginBottom: "2.5rem",
  };

  const dot = (done: boolean): CSSProperties => ({
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: done ? accent : colors.ringBg,
    border: `1px solid ${done ? accent : colors.border}`,
    transition: "all 0.3s",
  });

  const statsGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    width: "100%",
    maxWidth: 480,
    marginBottom: "2rem",
  };

  const statCard: CSSProperties = {
    background: colors.surface,
    border: `0.5px solid ${colors.border}`,
    borderRadius: 14,
    padding: "16px 14px",
    textAlign: "center",
  };

  const statValue = (color: string): CSSProperties => ({
    fontFamily: "'DM Mono', monospace",
    fontSize: 26,
    fontWeight: 500,
    lineHeight: 1,
    marginBottom: 6,
    color,
  });

  const statLabel: CSSProperties = {
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontFamily: "'DM Mono', monospace",
  };

  const settingsCard: CSSProperties = {
    background: colors.surface,
    border: `0.5px solid ${colors.border}`,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 480,
  };

  const settingsTitle: CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 16,
    fontFamily: "'DM Mono', monospace",
  };

  const settingRow = (last: boolean): CSSProperties => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: last ? "none" : `0.5px solid ${colors.border}`,
  });

  const settingControls: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
  };

  const settingBtn: CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: colors.surface2,
    border: `0.5px solid ${colors.border}`,
    color: colors.text,
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const settingValue: CSSProperties = {
    fontFamily: "'DM Mono', monospace",
    fontSize: 15,
    fontWeight: 500,
    minWidth: 32,
    textAlign: "center",
  };

  const notif: CSSProperties = {
    position: "fixed",
    bottom: 24,
    left: "50%",
    transform: `translateX(-50%) translateY(${notification.show ? 0 : 80}px)`,
    background: accent,
    color: "#fff",
    padding: "12px 28px",
    borderRadius: 50,
    fontSize: 14,
    fontWeight: 700,
    transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
    pointerEvents: "none",
    whiteSpace: "nowrap",
    fontFamily: "'DM Mono', monospace",
  };

  const settingKeys: { key: ModeKey; label: string }[] = [
    { key: "pomodoro", label: "Pomodoro" },
    { key: "short", label: "Pauză scurtă" },
    { key: "long", label: "Pauză lungă" },
  ];

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;700;800&display=swap"
        rel="stylesheet"
      />

      <div style={app}>
        {/* Header */}
        <header style={header}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>
            pomo<span style={{ color: accent }}>.</span>
          </div>
          <button
            style={{
              background: colors.surface2,
              border: `0.5px solid ${colors.border}`,
              borderRadius: 50,
              padding: "6px 14px",
              fontSize: 13,
              fontFamily: "'DM Mono', monospace",
              color: colors.muted,
              cursor: "pointer",
            }}
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          >
            {isDark ? "light" : "dark"}
          </button>
        </header>

        {/* Mode tabs */}
        <div style={tabs}>
          {(Object.keys(MODES) as ModeKey[]).map((key) => (
            <button
              key={key}
              style={tab(mode === key)}
              onClick={() => setMode(key)}
            >
              {MODES[key].label}
            </button>
          ))}
        </div>

        {/* Timer ring */}
        <div style={timerWrap}>
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              transform: "rotate(-90deg)",
            }}
            viewBox="0 0 260 260"
          >
            <circle
              cx="130"
              cy="130"
              r="118"
              fill="none"
              stroke={colors.ringBg}
              strokeWidth="6"
            />
            <circle
              cx="130"
              cy="130"
              r="118"
              fill="none"
              stroke={accent}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s" }}
            />
          </svg>
          <div style={timerInner}>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 54,
                fontWeight: 500,
                letterSpacing: -2,
                lineHeight: 1,
              }}
            >
              {(minutes < 10 ? "0" : "") + minutes}:
              {(seconds < 10 ? "0" : "") + seconds}
            </div>
            <div
              style={{
                fontSize: 12,
                color: colors.muted,
                letterSpacing: 2,
                textTransform: "uppercase" as const,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {MODES[mode].sessionLabel}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={controls}>
          <button style={btnIcon} onClick={() => resetTimer(mode, settings)}>
            ↺
          </button>
          <button style={btnPrimary} onClick={toggleTimer}>
            {running
              ? "PAUZĂ"
              : timeLeft < settings[mode] * 60
              ? "CONTINUĂ"
              : "START"}
          </button>
          <button style={btnIcon} onClick={skip}>
            ⟶
          </button>
        </div>

        {/* Session dots */}
        <div style={dotsRow}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={dot(i < sessionInCycle % 5)} />
          ))}
        </div>

        {/* Stats */}
        <div style={statsGrid}>
          <div style={statCard}>
            <div style={statValue("#e85d3c")}>{stats.sessions}</div>
            <div style={statLabel}>Sesiuni</div>
          </div>
          <div style={statCard}>
            <div style={statValue("#f5a623")}>{stats.minutes}</div>
            <div style={statLabel}>Minute</div>
          </div>
          <div style={statCard}>
            <div style={statValue("#4caf82")}>{stats.streak}</div>
            <div style={statLabel}>Streak</div>
          </div>
        </div>

        {/* Settings */}
        <div style={settingsCard}>
          <div style={settingsTitle}>Setări</div>
          {settingKeys.map(({ key, label }, idx) => (
            <div key={key} style={settingRow(idx === settingKeys.length - 1)}>
              <span style={{ fontSize: 14 }}>{label}</span>
              <div style={settingControls}>
                <button
                  style={settingBtn}
                  onClick={() => adjustSetting(key, -1)}
                >
                  −
                </button>
                <span style={settingValue}>{settings[key]}</span>
                <button
                  style={settingBtn}
                  onClick={() => adjustSetting(key, 1)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification */}
      <div style={notif}>{notification.msg}</div>
    </>
  );
}
