import { draftDocument, blankDocument, personalDataWarning } from '@oggaq/study-core';
import { PrivacyNoticeLink } from './legal';
import { useState } from "react";
import { View } from "react-native";
import type { components, User } from "@oggaq/shared-types";
import brand from "../../../config/brand.json";
import { api } from "./api";
import { outputDocument } from './document-output';
import { ChoiceGroup } from "./expressive";
import { useResource, useTask } from "./hooks";
import { Text } from "./text";
import { useTheme } from "./themeContext";
import { Button, Card, ErrorNotice, Field, Loading, ReadNotice, ScreenTitle, SectionTitle, Sheet } from "./ui";

type Template = components["schemas"]["DocumentTemplate"];
type Draft = components["schemas"]["DocumentDraft"];
type ExportInput = components["schemas"]["DocumentExportInput"];
const modes = [
  { value: "guided", label: "Bilgilerimle", accessibilityLabel: "Bilgilerimle oluştur" },
  { value: "blank", label: "Matbu", accessibilityLabel: "Matbu örnek" },
  { value: "free", label: "Serbest", accessibilityLabel: "Serbest düzenleme" },
] as const;

export function DocumentBuilder({ kind, user }: { kind: Template["kind"]; user: User }) {
  const { styles } = useTheme();
  const catalog = useResource(signal => api.request("get", "/api/v1/document-templates", { signal }), []);
  const [selected, setSelected] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const templates = catalog.data?.data.filter(t => t.kind === kind) ?? [];
  const template = templates.find(t => t.id === selected) ?? templates[0];
  return <>
    <ScreenTitle title={kind === "petition" ? "Dilekçe hazırla" : "Tutanak hazırla"} subtitle="Örneğini seç, düzenle ve PDF olarak al." />
    <ReadNotice resource={catalog} refreshOnly />
    {catalog.loading && !catalog.data ? <Loading label="Belge örnekleri yükleniyor" /> : catalog.error ? <ReadNotice resource={catalog} /> : template ? <>
      <Card compact tone="blue"><SectionTitle>Belge örneği</SectionTitle><Button secondary onPress={() => setPicker(true)}>{template.title}</Button><Text style={styles.muted}>{template.description}</Text></Card>
      <Sheet visible={picker} title="Belge örneğini seç" close={() => setPicker(false)}>{templates.map(item => <Button key={item.id} secondary={item.id !== template.id} onPress={() => { setSelected(item.id); setPicker(false); }}>{item.title}</Button>)}</Sheet>
      <DocumentForm key={`${kind}:${template.id}:${template.version}`} template={template} user={user} />
    </> : <Card compact><Text style={styles.text}>Şu anda kullanılabilir belge örneği yok.</Text><Button secondary onPress={() => void catalog.reload()}>Yeniden dene</Button></Card>}
  </>;
}

function DocumentForm({ template, user }: { template: Template; user: User }) {
  const { styles, palette } = useTheme();
  const [mode, setMode] = useState<ExportInput["mode"]>("guided");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [recipient, setRecipient] = useState("");
  const [date, setDate] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [attachments, setAttachments] = useState("");
  const [signers, setSigners] = useState(template.signer_roles.map((role, index) => ({ role, name: index === 0 ? user.name : "" })));
  const [preview, setPreview] = useState(false);
  const prepare = useTask<Draft>();
  const output = useTask<void>();
  const pending = prepare.pending || output.pending;
  const missing = template.fields.some(field => !field.optional && !fields[field.key]?.trim());
  const blank = mode === "blank";
  const createDraft = () => void prepare.run(async () => ({ title: template.title, body: draftDocument(template, fields) }), setDraft);
  const exportPdf = (action: 'share' | 'print' = 'share') => void output.run(async () => {
    await outputDocument(blank ? blankDocument(template) : {
      title: draft?.title ?? '', body: draft?.body ?? '', recipient: recipient || null,
      document_date: date || null, address: address || null, contact: contact || null,
      attachments: attachments || null, signers,
    }, action);
  }, () => {});
  return <>
    <Text style={styles.muted}>{personalDataWarning} Belge metni ve PDF bu cihazda hazırlanır; sunucumuza veya yapay zekâ hizmetine gönderilmez. Kaydettiğin veya paylaştığın PDF kopyalarını sen yönetirsin.</Text><PrivacyNoticeLink />
    <ChoiceGroup choices={modes} value={mode} disabled={pending} onChange={value => { setMode(value); setDraft(value === "free" ? { title: template.title, body: "" } : null); }} />
    <Text style={styles.muted}>{blank ? "Boş alanlı örneği yazdırıp elle doldurabilirsin." : "Bu bir düzenlenebilir örnektir. Kurumunun istediği biçimi ve başvuru yolunu kontrol et."}</Text>
    {mode === "guided" && !draft && <Card compact>
      {template.fields.map(field => <Field key={field.key} label={field.label} placeholder={field.format === "date" ? "gg/aa/yyyy" : field.format === "time" ? "ss:dd" : undefined} value={fields[field.key] ?? ""} maxLength={field.format === "date" ? 10 : field.format === "time" ? 5 : 6000} multiline={field.multiline} editable={!pending} onChange={value => setFields(previous => ({ ...previous, [field.key]: value }))} />)}
      <Button disabled={missing || pending} onPress={createDraft}>{prepare.pending ? "Hazırlanıyor…" : "Taslağı oluştur"}</Button>
    </Card>}
    <ErrorNotice error={prepare.error} />
    {!blank && draft && <>
      <Card compact>
        <SectionTitle>Metnini düzenle</SectionTitle>
        <Field label="Belge başlığı" value={draft.title} maxLength={150} editable={!pending} onChange={title => setDraft({ ...draft, title })} />
        <Field label="Muhatap / birim (isteğe bağlı)" value={recipient} maxLength={300} editable={!pending} onChange={setRecipient} />
        <Field label="Belge tarihi (gg/aa/yyyy, isteğe bağlı)" value={date} placeholder="gg/aa/yyyy" maxLength={10} editable={!pending} onChange={setDate} />
        <Field label="Belge metni" value={draft.body} maxLength={16000} multiline editable={!pending} onChange={body => setDraft({ ...draft, body })} />
        <Field label="Ekler (isteğe bağlı)" value={attachments} maxLength={1500} multiline editable={!pending} onChange={setAttachments} />
        {template.kind === "petition" && <><Field label="Adres (isteğe bağlı)" value={address} maxLength={600} multiline editable={!pending} onChange={setAddress} /><Field label="İletişim (isteğe bağlı)" value={contact} maxLength={200} editable={!pending} onChange={setContact} /></>}
        {mode === "guided" && <Button secondary disabled={pending} onPress={() => setDraft(null)}>Bilgi alanlarına dön</Button>}
      </Card>
      <Card compact><SectionTitle>İmza alanları</SectionTitle><Text style={styles.muted}>İmzalar PDF’de boş bırakılır. Gerekmeyen rolleri kaldırabilirsin.</Text>
        {signers.map((signer, index) => <View key={index} style={{ gap: 8, borderBottomWidth: 1, borderColor: palette.line, paddingBottom: 10 }}>
          <Field label={`İmza ${index + 1} · rol`} value={signer.role} maxLength={80} editable={!pending} onChange={role => setSigners(previous => previous.map((item, i) => i === index ? { ...item, role } : item))} />
          <Field label={`İmza ${index + 1} · adı soyadı (isteğe bağlı)`} value={signer.name} maxLength={150} personName editable={!pending} onChange={name => setSigners(previous => previous.map((item, i) => i === index ? { ...item, name } : item))} />
          {signers.length > 1 && <Button secondary disabled={pending} onPress={() => setSigners(previous => previous.filter((_, i) => i !== index))}>{`${index + 1}. imza alanını kaldır`}</Button>}
        </View>)}
        {signers.length < 6 && <Button secondary disabled={pending} onPress={() => setSigners(previous => [...previous, { role: "İlgili", name: "" }])}>İmza alanı ekle</Button>}
      </Card>
      <Button secondary onPress={() => setPreview(true)}>Metni önizle</Button>
      <Sheet visible={preview} title="Belge önizlemesi" close={() => setPreview(false)}><Text style={styles.heading}>{draft.title}</Text>{!!recipient && <Text style={styles.text}>{recipient}</Text>}{!!date && <Text style={styles.text}>{`Tarih: ${date}`}</Text>}<Text style={styles.text}>{draft.body}</Text>{!!attachments && <Text style={styles.text}>{`Ekler\n${attachments}`}</Text>}{signers.map((signer, i) => <Text key={i} style={styles.text}>{`${signer.role}\n${signer.name || "Adı soyadı"}\nİmza: ……………………`}</Text>)}</Sheet>
    </>}
    {(blank || draft) && <Card compact tone="blue"><Button disabled={pending || (!blank && (!draft?.body.trim() || !draft.title.trim() || signers.some(s => !s.role.trim())))} onPress={() => exportPdf()}>{output.pending ? "PDF hazırlanıyor…" : "PDF kaydet / paylaş"}</Button><Button secondary disabled={pending} onPress={() => exportPdf('print')}>Yazdır</Button><Text style={styles.muted}>Paylaşım menüsünden PDF’yi kaydet veya gönder. Yazdırmak için aşağıdaki seçeneği kullan.</Text></Card>}
    <ErrorNotice title="PDF açılamadı" error={output.error} retry={() => exportPdf()} />
    <Text style={[styles.muted, { fontSize: 12 }]}>Belge yalnız cihazda hazırlanır; uygulamada belge arşivi tutulmaz. Paylaşmayı seçtiğin uygulama veya yazıcıya belgeyi sen iletirsin. Bu ekrandan çıkınca metnini yeniden girmen gerekir. Belge kurumlara gönderilmez ve elektronik olarak imzalanmaz.</Text>
    <Text style={[styles.muted, { fontSize: 12 }]}>{`${brand.name} için hazırlanmış özgün ve düzenlenebilir örnektir.`}</Text>
  </>;
}
