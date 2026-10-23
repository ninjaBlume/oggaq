import { useEffect, useMemo, useRef, useState } from "react";
import type { ScrollViewInstance } from "react-native";
import {
  KeyboardAvoidingView,
  BackHandler,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
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
import { ArrowLeft, ShieldCheck } from "./icons";
import type { StudyContext, User } from "@oggaq/shared-types";
import { ApiError } from "@oggaq/api-client";
import brand from "../brand.json";
import { api, sessionExpiredHandler } from "./api";
import { session, verifyPreviewStorage } from "./storage";
import { Login, Verify } from "./auth";
import { useResource, useResume, useTask } from "./hooks";
import {
  Button,
  Card,
  ErrorNotice,
  Heading,
  IconButton,
  Loading,
} from "./ui";
import { Review, Stats } from "./review";
import { Exam } from "./exams";
import { ExamList, Results } from "./sinavlar";
import { Home } from "./home";
import { MotionProvider } from "./motion";
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

type Routes = {
  Main: undefined;
  Exam: { id: string };
  Account: undefined;
};
const Stack = createNativeStackNavigator<Routes>();
function MainTabs({
  user,
  context,
  contexts,
  choose,
  logout,
  pending,
  exam,
  account,
}: {
  user: User;
  context: StudyContext;
  contexts: StudyContext[];
  choose: (id: string) => void;
  logout: () => void;
  pending: boolean;
  exam: (id: string) => void;
  account: () => void;
}) {
  const { styles } = useTheme();
  const layout = useLayout();
  const [tab, setTab] = useState<MainTab>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [subject, setSubject] = useState<string>();
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
      setTab("home");
      return true;
    });
    return () => back.remove();
  }, [focused, tab]);
  function ders(subjectId?: string) {
    setSubject(subjectId);
    setTab("ders");
  }
  function selectTab(id: MainTab) {
    if (id === "ders") setSubject(undefined);
    if (tab === id) content.current?.scrollTo({ y: 0, animated: true });
    else setTab(id);
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
              user={user}
              context={context}
              expanded={menuOpen}
              menu={() => setMenuOpen(true)}
              profile={() => selectTab("profile")}
            />
            <ScrollView
              ref={content}
              key={tab}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={body}
            >
              {tab === "home" ? (
                <Home
                  user={user}
                  context={context}
                  deneme={() => setTab("deneme")}
                  ders={ders}
                  history={() => setTab("history")}
                  review={() => setTab("review")}
                  stats={() => setTab("stats")}
                  exam={exam}
                />
              ) : tab === "deneme" ? (
                <ExamList context={context} kind="deneme" open={exam} />
              ) : tab === "ders" ? (
                <ExamList
                  context={context}
                  kind="ders"
                  open={exam}
                  initialSubject={subject}
                />
              ) : tab === "history" ? (
                <Results context={context} openExam={exam} />
              ) : tab === "review" ? (
                <Review context={context} openExam={exam} />
              ) : tab === "stats" ? (
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
                />
              )}
            </ScrollView>
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
}: {
  user: User;
  logout: () => void;
  pending: boolean;
  refresh: () => void;
  signedOut: () => void;
}) {
  const { palette, styles, scheme } = useTheme();
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
  const query = useResource(
    async (signal) =>
      (await api.request("get", "/api/v1/me/contexts", { signal })).data,
    [user.id],
  );
  const [contextId, setContextId] = useState<string | null>(null);
  useResume(() => {
    void query.reload();
  });
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
              error={query.error}
              retry={() => {
                void query.reload();
              }}
            />
          ) : (
            <Card>
              <Heading>Çalışma alanına erişilemiyor</Heading>
              <Text style={styles.text}>
                Üyeliğin sona ermiş olabilir. Başka çalışma alanını seç.
              </Text>
              {query.data?.map((c) => (
                <Button key={c.id} onPress={() => setContextId(c.id)}>
                  {c.name}
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
  if (query.error)
    return (
      <SafeAreaView style={styles.shell}>
        <View style={body}>
          <ErrorNotice
            error={query.error}
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
    <NavigationContainer
      key={`${user.id}-${context.id}`}
      theme={navigationTheme}
    >
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          contentStyle: { backgroundColor: palette.paper },
          headerStyle: { backgroundColor: palette.paper },
          headerShadowVisible: false,
          headerTitleStyle: { fontSize: 16, fontWeight: "700" },
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
              context={context}
              contexts={query.data ?? []}
              choose={setContextId}
              logout={logout}
              pending={pending}
              exam={(id) => navigation.navigate("Exam", { id })}
              account={() => navigation.navigate("Account")}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Account" options={{ title: vocabulary.account.title }}>
          {() => <AccountScreen user={user} refresh={refresh} finished={signedOut} />}
        </Stack.Screen>
        <Stack.Screen name="Exam" options={{ title: "Sınav" }}>
          {({ route }) => <ExamDetail context={context} id={route.params.id} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
function ExamDetail({ context, id }: { context: StudyContext; id: string }) {
  return <Exam key={id} context={context} id={id} />;
}
function Application() {
  const { palette, styles } = useTheme();
  const body = useBody();
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const task = useTask<unknown>();
  const insets = useSafeAreaInsets();
  async function clear() {
    setUser(null);
    try {
      await session.clear();
    } catch (e) {
      setError(e);
    }
  }
  async function refresh() {
    try {
      setError(null);
      const result = await api.request("get", "/api/v1/me", {});
      setUser(result.data);
    } catch (e) {
      if (e instanceof ApiError && [401, 403].includes(e.status)) await clear();
      else setError(e);
    }
  }
  async function restore() {
    setRestoring(true);
    setError(null);
    try {
      await verifyPreviewStorage();
      if (await session.restore()) await refresh();
    } catch (e) {
      setError(e);
    } finally {
      setRestoring(false);
    }
  }
  useEffect(() => {
    void restore();
    return sessionExpiredHandler(() => {
      void clear();
    });
  }, []);
  useResume(() => {
    if (session.token) void refresh();
  });
  function logout() {
    void task.run(
      async () => {
        await api.request("post", "/api/v1/auth/logout", {});
        await session.clear();
      },
      () => setUser(null),
    );
  }
  return (
    <View style={styles.shell}>
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
          <ShieldCheck size={42} color={palette.primary} />
          <Text style={styles.heading}>{brand.displayName}</Text>
          <Loading />
        </View>
      ) : user?.email_verified_at ? (
        <Workspace
          key={user.id}
          user={user}
          logout={logout}
          pending={task.pending}
          refresh={() => void refresh()}
          signedOut={() => void clear()}
        />
      ) : (
        <SafeAreaView style={styles.shell} edges={["top", "bottom"]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={body}
          >
            {user ? (
              <Verify
                refresh={() => {
                  void refresh();
                }}
                logout={logout}
              />
            ) : (
              <Login signedIn={setUser} />
            )}
          </ScrollView>
        </SafeAreaView>
      )}
    </View>
  );
}
function Root() {
  const { styles } = useTheme();
  return (
    <MotionProvider>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.shell}
      >
        <Application />
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
