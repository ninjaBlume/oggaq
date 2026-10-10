import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
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
  DefaultTheme,
  NavigationContainer,
  useIsFocused,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  History as HistoryIcon,
  House,
  ShieldCheck,
  UserRound,
} from "./icons";
import { StatusBar } from "expo-status-bar";
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
  palette,
  styles,
} from "./ui";
import { History, Practice, QuestionList } from "./study";
import { Exam, Exams } from "./exams";
import { Home } from "./home";
import { Profile } from "./profile";

type Routes = {
  Main: undefined;
  Practice: { id: string };
  Exam: { id: string };
};
const Stack = createNativeStackNavigator<Routes>();
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.primary,
    background: palette.paper,
    card: palette.paper,
    text: palette.ink,
    border: palette.line,
  },
};
const tabs = [
  { id: "home", label: "Ana sayfa", icon: House },
  { id: "questions", label: "Soru çöz", icon: BookOpen },
  { id: "exams", label: "Deneme", icon: Clock3 },
  { id: "history", label: "Geçmiş", icon: HistoryIcon },
  { id: "profile", label: "Profil", icon: UserRound },
] as const;
type Tab = (typeof tabs)[number]["id"];
function MainTabs({
  user,
  context,
  contexts,
  choose,
  logout,
  pending,
  practice,
  exam,
}: {
  user: User;
  context: StudyContext;
  contexts: StudyContext[];
  choose: (id: string) => void;
  logout: () => void;
  pending: boolean;
  practice: (id: string) => void;
  exam: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("home");
  const [subject, setSubject] = useState<string>();
  const content = useRef<ScrollView>(null);
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
  function questions(subjectId?: string) {
    setSubject(subjectId);
    setTab("questions");
  }
  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      <ScrollView
        ref={content}
        key={tab}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
        {tab === "home" ? (
          <Home
            user={user}
            context={context}
            questions={questions}
            exams={() => setTab("exams")}
            history={() => setTab("history")}
            profile={() => setTab("profile")}
            practice={practice}
            exam={exam}
          />
        ) : tab === "questions" ? (
          <QuestionList
            context={context}
            open={practice}
            initialSubject={subject}
          />
        ) : tab === "exams" ? (
          <Exams context={context} open={exam} />
        ) : tab === "history" ? (
          <History context={context} open={practice} openExam={exam} />
        ) : (
          <Profile
            user={user}
            context={context}
            contexts={contexts}
            choose={choose}
            logout={logout}
            pending={pending}
          />
        )}
      </ScrollView>
      {!keyboardOpen && (
        <View
          accessibilityLabel="Ana gezinme"
          style={{
            flexDirection: "row",
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 12),
            paddingHorizontal: 8,
            backgroundColor: palette.white,
            borderTopWidth: 1,
            borderColor: palette.line,
          }}
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: tab === id }}
              onPress={() => {
                if (tab === id)
                  content.current?.scrollTo({ y: 0, animated: true });
                else setTab(id);
              }}
              style={{
                flex: 1,
                minHeight: 52,
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor:
                    tab === id ? palette.softBlue : "transparent",
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={tab === id ? 2.3 : 1.7}
                  color={tab === id ? palette.primary : palette.muted}
                />
              </View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: tab === id ? "800" : "500",
                  color: tab === id ? palette.primary : palette.muted,
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
function Workspace({
  user,
  logout,
  pending,
}: {
  user: User;
  logout: () => void;
  pending: boolean;
}) {
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
        <ScrollView contentContainerStyle={styles.body}>
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
        <View style={styles.body}>
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
              practice={(id) => navigation.navigate("Practice", { id })}
              exam={(id) => navigation.navigate("Exam", { id })}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Practice" options={{ title: "Soru çöz" }}>
          {({ route, navigation }) => (
            <Practice
              key={route.params.id}
              context={context}
              id={route.params.id}
              back={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Exam" options={{ title: "Deneme" }}>
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
      <StatusBar style="dark" />
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
        />
      ) : (
        <SafeAreaView style={styles.shell} edges={["top", "bottom"]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
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
export default function App() {
  return (
    <SafeAreaProvider>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.shell}
      >
        <Application />
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}
