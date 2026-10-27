import { Text } from "./text";
import { BrandWordmark, loadBrandFont } from "./wordmark";
import { BrandLogo } from "./brandLogo";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ScrollViewInstance } from "react-native";
import { KeyboardAvoidingView, BackHandler, Keyboard, Platform, ScrollView, View } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useIsFocused,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ArrowLeft } from "./icons";
import type { ExamAttempt, StudyContext, User } from "@oggaq/shared-types";
import { ApiError } from "@oggaq/api-client";
import { api, sessionExpiredHandler } from "./api";
import { session, verifyPreviewStorage } from "./storage";
import { Login } from "./auth";
import { useResource, useResume, useTask } from "./hooks";
import {
  Button,
  Card,
  ErrorNotice,
  Heading,
  IconButton,
  Loading,
  TextLink,
} from "./ui";
import { Review, Stats } from "./review";
import { Exam } from "./exams";
import { ExamList, Results } from "./sinavlar";
import { Home } from "./home";
import { MotionProvider } from "./motion";
import { ScoreCalculator } from "./scoring";
import { ExamCalendarScreen } from "./calendar";
import { Jobs } from "./jobs";
import { DocumentBuilder } from "./documents";
import { FaqScreen } from "./faq";
import { vocabulary } from "@oggaq/study-core";
import { AccountScreen } from "./account";
import { Profile } from "./profile";
import {
  MainHeader,
  PrimaryNavigation,
  SideMenu,
  type MainTab,
} from "./navigation";
import { ThemeProvider, useBody, useLayout, useTheme } from "./themeContext";
import { ScreenActive } from "./screenActivity";
import { restoreApplication, type Prepared } from "./startup";
import { textSizeFactors } from "./textSize";
import { isTransientReadError, recoverRead } from "./readRecovery";
import { AppUpdatesProvider } from "./appUpdates";

type Routes = {
  Main: undefined;
  Exam: { id: string; initialExam?: ExamAttempt };
  Account: undefined;
};
const Stack = createNativeStackNavigator<Routes>();
const primaryTabs: readonly MainTab[] = ["home", "deneme", "ders", "history", "profile"];
function ConnectionNotice({ retry }: { retry: () => void }) {
  const { styles, palette } = useTheme();
  return <View testID="connection-notice" accessibilityRole="alert" style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: palette.softPrimary }}>
    <Text style={styles.muted}>Bağlantı yenilenemedi. Kayıtlı bilgilerin korunuyor; yeni işlemler için bağlantını kontrol et.</Text>
    <TextLink onPress={retry}>Bağlantıyı yeniden dene</TextLink>
  </View>;
}
type PreparedContexts = Prepared<StudyContext[]>;
function MainTabs({
  user,
  context,
  contexts,
  choose,
  logout,
  pending,
  exam,
  account,
  refresh,
}: {
  user: User;
  context: StudyContext;
  contexts: StudyContext[];
  choose: (id: string) => void;
  logout: () => void;
  pending: boolean;
  exam: (id: string, initialExam?: ExamAttempt) => void;
  account: () => void;
  refresh: () => void;
}) {
  const { styles } = useTheme();
  const layout = useLayout();
  const [tab, setTab] = useState<MainTab>("home");
  const [visited, setVisited] = useState<MainTab[]>(["home"]);
  function activateTab(next: MainTab) {
    if (primaryTabs.includes(next))
      setVisited(previous => previous.includes(next) ? previous : [...previous, next]);
    setTab(next);
  }
  const [menuOpen, setMenuOpen] = useState(false);
  const [subject, setSubject] = useState<string>();
  const [calendarYear, setCalendarYear] = useState<number>();
  const [subjectRequest, setSubjectRequest] = useState(0);
  const content = useRef<ScrollViewInstance>(null);
  const focused = useIsFocused();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardOpen(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardOpen(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    if (!focused || tab === "home") return;
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      activateTab("home");
      return true;
    });
    return () => back.remove();
  }, [focused, tab]);
  function ders(subjectId?: string) {
    setSubject(subjectId);
    setSubjectRequest(value => value + 1);
    activateTab("ders");
  }
  function selectTab(id: MainTab) {
    if (id === "ders") setSubject(undefined);
    if (tab === id) content.current?.scrollTo({ y: 0, animated: true });
    else activateTab(id);
  }
  // Lists and grids use the whole content area; forms (profile, review) stay a reading column.
  const body = useBody(["home", "deneme", "ders", "history", "stats"].includes(tab));
  return (
    <>
      <SafeAreaView
        style={styles.shell}
        edges={["top", "left", "right"]}
        accessibilityElementsHidden={menuOpen}
        aria-hidden={menuOpen}
        importantForAccessibility={menuOpen ? "no-hide-descendants" : "auto"}
      >
        <View
          style={{ flex: 1, flexDirection: layout.railed ? "row" : "column" }}
        >
          {layout.railed && <PrimaryNavigation tab={tab} select={selectTab} placement="rail" />}
          <View style={{ flex: 1 }}>
            <MainHeader
              context={context}
              expanded={menuOpen}
              menu={() => setMenuOpen(true)}
              home={() => selectTab("home")}
            />
            {(primaryTabs.includes(tab) ? visited : [...visited, tab]).map(page => (
              <ScreenActive.Provider key={page} value={focused && page === tab}>
                <View style={{ flex: 1, display: page === tab ? "flex" : "none" }}
                  accessibilityElementsHidden={page !== tab}
                  importantForAccessibility={page === tab ? "auto" : "no-hide-descendants"}
                  aria-hidden={page !== tab}>
                <ScrollView
                  ref={page === tab ? content : undefined}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={body}
                >
                  {page === "home" ? (
                    <Home
                      user={user}
                      context={context}
                      deneme={() => activateTab("deneme")}
                      ders={ders}
                      history={() => activateTab("history")}
                      review={() => activateTab("review")}
                      stats={() => activateTab("stats")}
                      calendar={(year) => { setCalendarYear(year); activateTab("calendar"); }}
                      exam={exam}
                    />
                  ) : page === "deneme" ? (
                    <ExamList context={context} kind="deneme" open={exam} />
                  ) : page === "ders" ? (
                    <ExamList
                      key={subjectRequest}
                      context={context}
                      kind="ders"
                      open={exam}
                      initialSubject={subject}
                    />
                  ) : page === "history" ? (
                    <Results context={context} openExam={exam} />
                  ) : page === "review" ? (
                    <Review context={context} openExam={exam} />
                  ) : page === "score" ? (
                    <ScoreCalculator />
                  ) : page === "calendar" ? (
                    <ExamCalendarScreen initialYear={calendarYear} back={() => selectTab("home")} />
                  ) : page === "jobs" ? (
                    <Jobs user={user} refresh={refresh} />
                  ) : page === "petition" || page === "report" ? (
                    <DocumentBuilder kind={page === "petition" ? "petition" : "report"} user={user} />
                  ) : page === "faq" ? (
                    <FaqScreen />
                  ) : page === "stats" ? (
                    <Stats context={context} />
                  ) : (
                    <Profile
                      user={user}
                      context={context}
                      contexts={contexts}
                      choose={choose}
                      logout={logout}
                      pending={pending}
                      account={account}
                      home={() => selectTab("home")}
                    />
                  )}
                </ScrollView>
                </View>
              </ScreenActive.Provider>
            ))}
            {!layout.railed && !keyboardOpen && (
              <PrimaryNavigation tab={tab} select={selectTab} placement="bottom" />
            )}
          </View>
        </View>
      </SafeAreaView>
      {menuOpen && (
        <SideMenu
          user={user}
          context={context}
          contexts={contexts}
          selected={tab}
          select={selectTab}
          choose={choose}
          logout={logout}
          pending={pending}
          close={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
function Workspace({
  user,
  logout,
  pending,
  refresh,
  signedOut,
  prepared,
  connectionWarning,
}: {
  user: User;
  logout: () => void;
  pending: boolean;
  refresh: () => void;
  signedOut: () => void;
  prepared?: PreparedContexts;
  connectionWarning: boolean;
}) {
  const { palette, styles, scheme, textSize } = useTheme();
  const body = useBody();
  const navigationTheme = useMemo(
    () => ({
      ...(scheme === "dark" ? DarkTheme : DefaultTheme),
      colors: {
        ...(scheme === "dark" ? DarkTheme : DefaultTheme).colors,
        primary: palette.primary,
        background: palette.paper,
        card: palette.paper,
        text: palette.ink,
        border: palette.line,
      },
    }),
    [scheme, palette],
  );
  const initialContexts = useRef(prepared);
  const query = useResource(
    async (signal) => {
      if (initialContexts.current) {
        const pending = initialContexts.current;
        initialContexts.current = undefined;
        const result = await pending;
        if ("error" in result) throw result.error;
        return result.data;
      }
      return (await api.request("get", "/api/v1/me/contexts", { signal })).data;
    },
    [user.id],
    true, { manageResume: false },
  );
  const verification = useRef(user.email_verified_at);
  useEffect(() => {
    if (verification.current !== user.email_verified_at) {
      verification.current = user.email_verified_at;
      // Keep the current screen mounted when verification unlocks institutional contexts.
      void query.reload(true);
    }
  }, [user.email_verified_at, query.reload]);
  const [contextId, setContextId] = useState<string | null>(null);
  useResume(() => {
    void query.reload(true);
  }, query.cancel);
  const context =
    query.data?.find((c) => c.id === contextId) ??
    (contextId
      ? null
      : (query.data?.find((c) => c.kind === "personal") ?? query.data?.[0]));
  if (!context)
    return (
      <SafeAreaView style={styles.shell}>
        <ScrollView contentContainerStyle={body}>
          {query.loading ? (
            <Loading />
          ) : query.error ? (
            <ErrorNotice
              error={query.error} read
              retry={() => {
                void query.reload();
              }}
            />
          ) : (
            <Card>
              <Heading>Sınavlarına erişilemiyor</Heading>
              <Text style={styles.text}>
                Kurum üyeliğin sona ermiş olabilir. Erişebildiğin sınavlara dönebilirsin.
              </Text>
              {query.data?.map((c) => (
                <Button key={c.id} onPress={() => setContextId(c.id)}>
                  {c.kind === "personal" ? "Sınavlarıma dön" : c.name}
                </Button>
              ))}
            </Card>
          )}
          <Button secondary disabled={pending} onPress={logout}>
            Çıkış yap
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  if (query.error && !isTransientReadError(query.error))
    return (
      <SafeAreaView style={styles.shell}>
        <View style={body}>
          <ErrorNotice
            error={query.error} read
            retry={() => {
              void query.reload();
            }}
          />
          <Button secondary disabled={pending} onPress={logout}>
            Çıkış yap
          </Button>
        </View>
      </SafeAreaView>
    );
  return (
    <View style={styles.shell}>
    {(query.error || query.refreshError) && !connectionWarning ? <ConnectionNotice retry={() => void query.reload(true)} /> : null}
    <NavigationContainer
      key={`${user.id}-${context.id}`}
      theme={navigationTheme}
    >
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          contentStyle: { backgroundColor: palette.paper },
          headerStyle: { backgroundColor: palette.paper },
          headerShadowVisible: false,
          headerTitleStyle: { fontSize: 16 * textSizeFactors[textSize], fontWeight: "700" },
          headerTintColor: palette.ink,
          headerTitleAlign: "center",
          headerLeft: () => (
            <IconButton
              icon={ArrowLeft}
              label="Geri dön"
              onPress={() => navigation.goBack()}
            />
          ),
        })}
      >
        <Stack.Screen name="Main" options={{ headerShown: false }}>
          {({ navigation }) => (
            <MainTabs
              user={user}
              refresh={refresh}
              context={context}
              contexts={query.data ?? []}
              choose={setContextId}
              logout={logout}
              pending={pending}
              exam={(id, initialExam) => navigation.navigate("Exam", { id, initialExam })}
              account={() => navigation.navigate("Account")}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Account" options={{ title: vocabulary.account.title }}>
          {() => <AccountScreen user={user} refresh={refresh} finished={signedOut} />}
        </Stack.Screen>
        <Stack.Screen name="Exam" options={{ title: "Sınav" }}>
          {({ route }) => <ExamDetail context={context} id={route.params.id} initialExam={route.params.initialExam} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
    </View>
  );
}
function ExamDetail({ context, id, initialExam }: { context: StudyContext; id: string; initialExam?: ExamAttempt }) {
  return <Exam key={id} context={context} id={id} initialExam={initialExam} />;
}
function Application() {
  const { styles } = useTheme();
  const body = useBody();
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [prepared, setPrepared] = useState<{ token: string; contexts: PreparedContexts }>();
  const [error, setError] = useState<unknown>(null);
  const [refreshWarning, setRefreshWarning] = useState(false);
  const refreshing = useRef<AbortController | null>(null);
  const task = useTask<unknown>();
  const insets = useSafeAreaInsets();
  async function clear() {
    refreshing.current?.abort();
    setRefreshWarning(false);
    setUser(null);
    setPrepared(undefined);
    try {
      await session.clear();
    } catch (e) {
      setError(e);
    }
  }
  async function refresh(recover = false) {
    const token = session.token;
    if (!token) return;
    refreshing.current?.abort();
    const request = new AbortController();
    refreshing.current = request;
    const current = () => !request.signal.aborted && refreshing.current === request && session.token === token;
    try {
      setError(null);
      setRefreshWarning(false);
      const read = () => api.request("get", "/api/v1/me", { signal: request.signal });
      const result = await (recover ? recoverRead(read, request.signal) : read());
      // A response from a signed-out account must never replace a newer session.
      if (!current()) return;
      setUser(result.data);
    } catch (e) {
      if (!current()) return;
      if (e instanceof ApiError && [401, 403].includes(e.status)) await clear();
      else if (recover && isTransientReadError(e)) setRefreshWarning(true);
      else setError(e);
    }
  }
  async function restore() {
    setRestoring(true);
    setError(null);
    try {
      await restoreApplication({
        probe: verifyPreviewStorage,
        restore: () => session.restore(),
        contexts: async () => (await api.request("get", "/api/v1/me/contexts", {})).data,
        prepared: contexts => {
          if (session.token) setPrepared({ token: session.token, contexts });
        },
        identity: () => refresh(),
      });
    } catch (e) {
      setError(e);
    } finally {
      setRestoring(false);
    }
  }
  useEffect(() => {
    void restore();
    const unsubscribe = sessionExpiredHandler(() => {
      void clear();
    });
    return () => { refreshing.current?.abort(); unsubscribe(); };
  }, []);
  useResume(() => {
    if (session.token) void refresh(true);
  }, () => refreshing.current?.abort());
  function logout() {
    void task.run(
      async () => {
        await api.request("post", "/api/v1/auth/logout", {});
        await session.clear();
      },
      () => { refreshing.current?.abort(); setRefreshWarning(false); setUser(null); setPrepared(undefined); },
    );
  }
  return (
    <View style={styles.shell}>
      {refreshWarning && user ? <ConnectionNotice retry={() => void refresh(true)} /> : null}
      {error || task.error ? (
        <View
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            right: 16,
            zIndex: 20,
          }}
        >
          <ErrorNotice
            error={error ?? task.error}
            read={!task.error}
            retry={() => {
              if (task.error) logout();
              else if (session.token) void refresh();
              else void restore();
            }}
          />
        </View>
      ) : null}
      {restoring ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <BrandLogo size={88} />
          <BrandWordmark style={styles.heading} />
          <Loading />
        </View>
      ) : user ? (
        <Workspace
          key={user.id}
          user={user}
          logout={logout}
          pending={task.pending}
          refresh={() => void refresh()}
          signedOut={() => void clear()}
          prepared={prepared?.token === session.token ? prepared.contexts : undefined}
          connectionWarning={refreshWarning}
        />
      ) : (
        <SafeAreaView style={styles.shell} edges={["top", "bottom"]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={body}
          >
            <Login signedIn={setUser} />
          </ScrollView>
        </SafeAreaView>
      )}
    </View>
  );
}
function Root() {
  const { styles } = useTheme();
  const fontTask = useTask<void>();
  function loadFont() { void fontTask.run(loadBrandFont, () => {}); }
  useEffect(loadFont, []);
  return (
    <MotionProvider>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.shell}
      >
        {fontTask.error ? <View style={{ padding: 12 }}><ErrorNotice title="Marka yazısı yüklenemedi" error={fontTask.error} retry={loadFont} /></View> : null}
        <AppUpdatesProvider><Application /></AppUpdatesProvider>
      </KeyboardAvoidingView>
    </MotionProvider>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
