import { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import type { User } from "@oggaq/shared-types";
import { ApiError } from "@oggaq/api-client";
import brand from "../brand.json";
import { api, sessionExpiredHandler } from "./api";
import { session, verifyPreviewStorage } from "./storage";
import { Login, Verify } from "./auth";
import { useResource, useResume, useTask } from "./hooks";
import { Button, Card, ErrorNotice, Heading, Loading, styles } from "./ui";
import { History, Practice, QuestionList } from "./study";
import { Exam, Exams } from "./exams";
type Screen =
  | { kind: "questions" }
  | { kind: "history" }
  | { kind: "exams" }
  | { kind: "practice"; id: string }
  | { kind: "exam"; id: string };
function Workspace({ user, logout }: { user: User; logout: () => void }) {
  const scroll = useRef<ScrollView>(null);
  const query = useResource(
    async (signal) =>
      (await api.request("get", "/api/v1/me/contexts", { signal })).data,
    [user.id],
  );
  const [contextId, setContextId] = useState<string | null>(null);
  const [chooseContext, setChooseContext] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: "questions" });
  useResume(() => {
    void query.reload();
  });
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (screen.kind === "exam" || screen.kind === "practice") {
          setScreen({ kind: screen.kind === "exam" ? "exams" : "history" });
          return true;
        }
        if (chooseContext) {
          setChooseContext(false);
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [screen.kind, chooseContext]);
  const context =
    query.data?.find((c) => c.id === contextId) ??
    (contextId
      ? null
      : (query.data?.find((c) => c.kind === "personal") ?? query.data?.[0]));
  if (query.loading && !query.data) return <Loading />;
  if (query.error)
    return (
      <ErrorNotice
        error={query.error}
        retry={() => {
          void query.reload();
        }}
      />
    );
  if (!context)
    return (
      <Card>
        <Heading>Çalışma alanına erişilemiyor</Heading>
        <Text style={styles.text}>
          Üyeliğin sona ermiş olabilir. Başka çalışma alanını seç.
        </Text>
        {query.data?.map((c) => (
          <Button
            key={c.id}
            onPress={() => {
              setContextId(c.id);
              setScreen({ kind: "questions" });
            }}
          >
            {c.name}
          </Button>
        ))}
      </Card>
    );
  const detail = screen.kind === "practice" || screen.kind === "exam";
  return (
    <>
      <View style={styles.header}>
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <Text style={styles.heading}>{brand.displayName}</Text>
          <Button secondary onPress={logout}>
            Çıkış yap
          </Button>
        </View>
        <Text style={styles.muted}>
          {user.name} · {context.name}
        </Text>
        <Button secondary onPress={() => setChooseContext(!chooseContext)}>
          Çalışma alanı seç
        </Button>
        {chooseContext &&
          query.data?.map((c) => (
            <Button
              key={c.id}
              secondary={c.id !== context.id}
              onPress={() => {
                setContextId(c.id);
                setScreen({ kind: "questions" });
                setChooseContext(false);
              }}
            >
              {c.name}
            </Button>
          ))}
        {detail ? (
          <Button
            secondary
            onPress={() =>
              setScreen({ kind: screen.kind === "exam" ? "exams" : "history" })
            }
          >
            Geri dön
          </Button>
        ) : (
          <View style={styles.row}>
            {(["questions", "exams", "history"] as const).map((kind) => (
              <Button
                key={kind}
                secondary={screen.kind !== kind}
                onPress={() => setScreen({ kind })}
              >
                {kind === "questions"
                  ? "Soru çöz"
                  : kind === "exams"
                    ? "Deneme"
                    : "Geçmişim"}
              </Button>
            ))}
          </View>
        )}
      </View>
      <ScrollView
        ref={scroll}
        key={`${context.id}-${screen.kind}-${"id" in screen ? screen.id : ""}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.body}
      >
        <View
          key={`${context.id}-${screen.kind}-${"id" in screen ? screen.id : ""}`}
          style={{ gap: 16 }}
        >
          {screen.kind === "questions" ? (
            <QuestionList
              context={context}
              open={(id) => setScreen({ kind: "practice", id })}
            />
          ) : screen.kind === "history" ? (
            <History
              context={context}
              open={(id) => setScreen({ kind: "practice", id })}
            />
          ) : screen.kind === "exams" ? (
            <Exams
              context={context}
              open={(id) => setScreen({ kind: "exam", id })}
            />
          ) : screen.kind === "practice" ? (
            <Practice context={context} id={screen.id} />
          ) : (
            <Exam
              context={context}
              id={screen.id}
              onComplete={() =>
                scroll.current?.scrollTo({ y: 0, animated: false })
              }
            />
          )}
        </View>
      </ScrollView>
    </>
  );
}
function Application() {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const task = useTask<unknown>();
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
    <SafeAreaView style={styles.shell}>
      <StatusBar style="dark" />
      {error || task.error ? (
        <View style={{ padding: 16 }}>
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
        <View style={styles.body}>
          <Loading />
        </View>
      ) : user?.email_verified_at ? (
        <Workspace key={user.id} user={user} logout={logout} />
      ) : (
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
      )}
    </SafeAreaView>
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
