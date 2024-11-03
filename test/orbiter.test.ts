import {
  version,
} from "@/index.js";
import { expect } from "aegir/chai";

describe("Orbiter", () => {
  it("version", async () => {
    expect(version).to.be.a("string");
  });
});
