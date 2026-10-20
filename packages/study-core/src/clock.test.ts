import { describe, expect, it } from "vitest";
import { anchorClock, randomId, remainingSeconds, timeLabel } from "./index";
describe("server deadline display", () => {
  it("uses server time instead of a wrong device date", () => {
    const c = anchorClock("2026-10-09T10:01:00Z", "2026-10-09T10:00:00Z", 700);
    expect(remainingSeconds(c, 700)).toBe(60);
    expect(remainingSeconds(c, 15700)).toBe(45);
  });
  it("clamps an expired deadline and a suspended view", () => {
    expect(
      remainingSeconds(
        anchorClock("2026-10-09T10:00:00Z", "2026-10-09T10:01:00Z", 0),
        1,
      ),
    ).toBe(0);
    expect(
      remainingSeconds({ remainingMs: 60000, receivedAt: 0 }, 300000),
    ).toBe(0);
  });
  it("rounds fractions up without showing a negative countdown", () => {
    expect(remainingSeconds({ remainingMs: 1001, receivedAt: 0 }, 1)).toBe(1);
    expect(remainingSeconds({ remainingMs: 1001, receivedAt: 0 }, 1002)).toBe(
      0,
    );
    expect(timeLabel(125)).toBe("02:05");
  });
});

import { examLabel, examSummary, examTypeShort } from './index';
describe('exam labels', () => {
  const basic = { exam_number: '107', year: 2024, exam_type_name: 'Deneme Sınavı', weapon_status: 'armed' as const };
  it('names the exam type and keeps armed/unarmed separate', () => {
    expect(examLabel(basic)).toBe('107. Deneme · silahlı');
    expect(examLabel({ ...basic, weapon_status: 'unarmed' })).toBe('107. Deneme · silahsız');
    expect(examLabel({ ...basic, exam_number: '83', exam_type_name: 'Ders Sınavı', subject_name: 'KALABALIK YÖNETİMİ', weapon_status: null })).toBe('83. Ders · KALABALIK YÖNETİMİ');
    expect(examLabel({ ...basic, exam_type_name: 'Ders Sınavı', subject_name: 'ÖZEL GÜVENLİK HUKUKU VE KİŞİ HAKLARI', weapon_status: null })).toBe('107. Ders · ÖZEL GÜVENLİK HUKUKU VE…');
  });
  it('shortens only the generic suffix of a type name', () => {
    expect(examTypeShort('Deneme Sınavı')).toBe('Deneme');
    expect(examTypeShort('Ders Sınavı')).toBe('Ders');
    expect(examTypeShort('Özel')).toBe('Özel');
  });
  it('falls back to the year without a number', () => expect(examLabel({ ...basic, exam_number: null, weapon_status: null })).toBe('2024. Deneme'));
  it('limits the list and counts the rest', () => {
    const many = ['100', '101', '102', '103', '104'].map((n) => ({ ...basic, exam_number: n }));
    expect(examSummary(many)).toBe('100. Deneme · silahlı, 101. Deneme · silahlı, 102. Deneme · silahlı +2');
    expect(examSummary([])).toBe('Çıkmış sınavlarda yok');
  });
});

describe("random ids", () => {
  it("builds a valid v4 UUID even where crypto.randomUUID is missing (insecure LAN origin)", () => {
    const original = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      const ids = new Set(Array.from({ length: 50 }, () => randomId()));
      expect(ids.size).toBe(50);
      for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      Object.defineProperty(globalThis.crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});
