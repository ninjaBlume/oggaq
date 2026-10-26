// Shared editorial summary, checked against the current regulation, articles 38–39.
// The scoring engine keeps its own versioned, period-specific rules.
export const calendarRules = {
  title: 'Sınav sistemi ve başarı kuralları',
  sourceUrl: 'https://www.egm.gov.tr/ozelguvenlik',
  regulationUrl: 'https://www.mevzuat.gov.tr/mevzuatmetin/yonetmelik/7.5.7190.pdf',
  note: 'Soru sayısı, süre ve puanlama için gireceğin dönemin resmî sınav kılavuzunu esas al.',
  items: [
    { id: 'unarmed', title: 'Silahsız temel eğitim', text: 'Yazılı sınavın birinci kısmında en az 60 puan gerekir.' },
    { id: 'armed', title: 'Silahlı temel eğitim', text: 'Genel bilgi, silah bilgisi ve uygulamalı atış bölümleri değerlendirilir.' },
    { id: 'shooting', title: 'Uygulamalı atış', text: 'Atış becerisi 5 fişek üzerinden ölçülür.' },
    { id: 'renewal', title: 'Yenileme eğitimi', text: 'Sınav bir seviye tespitidir; alınan puan sertifikaya işlenir.' },
  ],
} as const;
