import { describe, it, expect } from "bun:test";
import { getWorkerAIModelId } from "../src/utils/ai";

describe("getWorkerAIModelId", () => {
    it("should return stable slugs as is", () => {
        expect(getWorkerAIModelId("@cf/meta/llama-3-8b-instruct")).toBe("@cf/meta/llama-3-8b-instruct");
    });

    it("should resolve short names from mapping", () => {
        expect(getWorkerAIModelId("llama-3-8b")).toBe("@cf/meta/llama-3-8b-instruct");
    });

    it("should throw error for UUID model IDs", () => {
        const uuid = "ad01ab83-baf8-4e7b-8fed-a0a219d4eb45";
        expect(() => getWorkerAIModelId(uuid)).toThrow(/is a transient UUID and cannot be used/);
    });

    it("should return other non-UUID strings as is", () => {
        expect(getWorkerAIModelId("custom-model")).toBe("custom-model");
    });

    it("should return empty string for empty input", () => {
        expect(getWorkerAIModelId("")).toBe("");
    });
});
