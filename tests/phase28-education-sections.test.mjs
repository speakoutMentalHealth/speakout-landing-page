import test from "node:test";
import assert from "node:assert/strict";
import { EDUCATION_STAGES, academicClass, contentStages, matchesPlacement, parseEducationMetadata, schoolPlacement, validPlacement } from "../js/education-levels.js";

test("school classes resolve to the correct academic section, never course difficulty", () => {
  for (const stage of EDUCATION_STAGES) for (const classLevel of stage.classes) {
    assert.deepEqual(schoolPlacement({ classLevel }), { educationStage: stage.id, classLevel });
    assert.equal(validPlacement({ educationStage: stage.id, classLevel }), true);
  }
  assert.equal(academicClass("SSS2"), "SS 2");
  assert.equal(academicClass("JSS1"), "JSS 1");
  assert.equal(academicClass("100"), "100 Level");
  assert.equal(schoolPlacement({ level: "beginner" }), null);
  assert.equal(schoolPlacement({ educationStage: "primary", classLevel: "SS 2" }), null);
});
test("nursery and primary do not receive generic student or beginner content", () => {
  const nursery = { educationStage: "nursery", classLevel: "Nursery 1" };
  for (const item of [{ audience: "student" }, { audience: "general" }, { difficulty: "beginner" }, { audience: ["secondary", "university"] }]) {
    assert.equal(matchesPlacement(item, nursery), false);
  }
  assert.deepEqual(contentStages({ audience: ["primary", "university"] }), ["primary", "tertiary"]);
  assert.deepEqual(contentStages({ educationStages: [], audience: "primary" }), []);
});
test("class restrictions are respected and malformed labels fail closed", () => {
  const placement = { educationStage: "primary", classLevel: "Primary 2" };
  assert.equal(matchesPlacement({ educationStages: ["primary"], classLevels: ["Primary 3"] }, placement), false);
  assert.equal(matchesPlacement({ educationStages: ["primary"], classLevels: ["Primary 2"] }, placement), true);
  assert.equal(matchesPlacement({ educationStages: ["primary"] }, placement), true);
  assert.equal(matchesPlacement({ educationStages: ["primary"], classLevels: ["unreviewed"] }, placement), false);
  assert.equal(validPlacement({ educationStage: "tertiary", classLevel: "Primary 2" }), false);
});
test("publisher classification accepts multiple sections and rejects mismatched classes", () => {
  assert.deepEqual(parseEducationMetadata("secondary, tertiary", "SS2, 100", "Digital Skills"), { educationStages: ["secondary", "tertiary"], classLevels: ["SS 2", "100 Level"], subject: "Digital Skills" });
  assert.throws(() => parseEducationMetadata("primary", "SS 1"), /belong/);
  assert.throws(() => parseEducationMetadata("student", ""), /nursery/);
  assert.throws(() => parseEducationMetadata("nursery", "advanced"), /supported class/);
});
