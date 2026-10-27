import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as Updates from "expo-updates";
import { useIsFocused } from "@react-navigation/native";
import { useResume } from "./hooks";
import { ScreenActive } from "./screenActivity";
import { UpdateManager, type UpdateStatus } from "./updateManager";
import { appUpdatesEnabled } from "./appUpdateEnvironment";
import { Button, ErrorNotice, SectionTitle } from "./ui";
import { Text } from "./text";
import { useTheme } from "./themeContext";
import { View } from "react-native";

type UpdateContextValue = { status: UpdateStatus; pending: boolean; busy: boolean; check: () => void; apply: (visible: boolean) => void };
const UpdateContext = createContext<UpdateContextValue | null>(null);

export function AppUpdatesProvider({ children }: { children: ReactNode }) {
  if (!appUpdatesEnabled) return children;
  return <NativeAppUpdatesProvider>{children}</NativeAppUpdatesProvider>;
}

function NativeAppUpdatesProvider({ children }: { children: ReactNode }) {
  const native = Updates.useUpdates();
  const latest = useRef(native); latest.current = native;
  const [status, setStatus] = useState<UpdateStatus>({ phase: "idle" });
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [manager] = useState(() => new UpdateManager({
    enabled: appUpdatesEnabled,
    busy: () => latest.current.isStartupProcedureRunning || latest.current.isChecking || latest.current.isDownloading || latest.current.isRestarting,
    pending: () => latest.current.isUpdatePending,
    check: Updates.checkForUpdateAsync,
    fetch: Updates.fetchUpdateAsync,
    reload: () => Updates.reloadAsync(),
  }, value => { if (mounted.current) setStatus(value); }));
  useResume(() => { void manager.check(); });
  const nativeBusy = native.isStartupProcedureRunning || native.isChecking || native.isDownloading || native.isRestarting;
  return <UpdateContext.Provider value={{
    status: status.phase === "idle" && (native.checkError || native.downloadError)
      ? { phase: "failed", error: native.checkError ?? native.downloadError } : status,
    pending: native.isUpdatePending || status.phase === "ready",
    busy: nativeBusy || ["checking", "downloading", "applying"].includes(status.phase),
    check: () => { void manager.check(true); }, apply: visible => { void manager.apply(visible); },
  }}>{children}</UpdateContext.Provider>;
}

export function AppUpdateControls() {
  const updates = useContext(UpdateContext);
  const screenActive = useContext(ScreenActive);
  const focused = useIsFocused() && screenActive;
  const { styles } = useTheme();
  if (!appUpdatesEnabled || !updates) return null;
  const label = updates.busy ? (updates.status.phase === "applying" ? "Güncelleme uygulanıyor…" : "Güncelleme denetleniyor veya indiriliyor…")
    : updates.pending ? "Yeni güncelleme indirildi. Uygula dediğinde uygulama yeniden başlatılır; önce açık işlemlerini tamamla."
    : updates.status.phase === "current" ? "Kullandığın paket için en güncel sürümdesin."
    : "Güncellemeler arka planda alınır. Buradan da denetleyebilirsin.";
  return <View style={{ gap: 8 }}>
    <SectionTitle>Uygulama güncellemesi</SectionTitle>
    <Text accessibilityLiveRegion="polite" style={styles.muted}>{label}</Text>
    {updates.pending ? <Button compact disabled={updates.busy || !focused} onPress={() => updates.apply(focused)}>Güncellemeyi uygula</Button>
      : <Button compact secondary disabled={updates.busy || !focused} onPress={updates.check}>Güncellemeleri denetle</Button>}
    <ErrorNotice title="Güncelleme işlemi tamamlanamadı" error={updates.status.error} retry={updates.pending ? () => updates.apply(focused) : updates.check} />
  </View>;
}
