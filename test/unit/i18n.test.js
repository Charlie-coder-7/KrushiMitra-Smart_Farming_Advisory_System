import test from "node:test";
import assert from "node:assert/strict";
import {
  translations,
  localizedError,
  formatHeaderDate,
} from "../../src/i18n.js";

test("Odia translations cover every interface label and weather condition", () => {
  assert.deepEqual(
    Object.keys(translations.or).sort(),
    Object.keys(translations.en).sort(),
  );

  const intentionallyBlankOptionalCopy = new Set([
    "symptomNote",
    "probableNote",
  ]);

  for (const [key, value] of Object.entries(translations.or)) {
    if (key === "weatherConditions") {
      assert.deepEqual(
        Object.keys(value).sort(),
        Object.keys(translations.en.weatherConditions).sort(),
      );
      assert.ok(
        Object.values(value).every(
          (item) => typeof item === "string" && item.length,
        ),
      );
    } else if (Array.isArray(value)) {
      assert.equal(value.length, translations.en[key].length);
      assert.ok(
        value.every((item) => typeof item === "string" && item.trim()),
        `Missing Odia list item: ${key}`,
      );
    } else if (intentionallyBlankOptionalCopy.has(key)) {
      assert.equal(value, "");
    } else {
      assert.ok(
        typeof value === "string" && value.length,
        `Missing Odia translation: ${key}`,
      );
    }
  }
});

test("common API failures resolve to Odia interface messages", () => {
  assert.equal(
    localizedError("Choose a crop image to continue.", translations.or),
    translations.or.errImage,
  );
  assert.equal(
    localizedError(
      "Current weather could not be retrieved. Check your connection and try again.",
      translations.or,
    ),
    translations.or.errWeather,
  );
  assert.equal(
    localizedError(
      "Crop analysis is temporarily unavailable. Please try again later.",
      translations.or,
    ),
    translations.or.errCropAnalysis,
  );
  assert.equal(
    localizedError(
      "Gemini request failed: network error. Please try again.",
      translations.or,
    ),
    "Gemini request failed: network error. Please try again.",
  );
});

test("dashboard date uses Odia weekday, month, and numerals in Odia mode", () => {
  assert.equal(
    formatHeaderDate(new Date(2026, 10, 4), "or"),
    "ବୁଧବାର, ୪ ନଭେମ୍ବର, ୨୦୨୬",
  );
  assert.equal(
    formatHeaderDate(new Date(2026, 10, 4), "en"),
    "WEDNESDAY, 4 NOVEMBER 2026",
  );
});
