import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { FormLayout } from "../components/FormLayout";

const sidebarContent = <div data-testid="sidebar">Preview</div>;
const childContent = <div data-testid="child">Form fields</div>;

describe("FormLayout — mode prop (additive layout modes)", () => {
  describe("mode=simple", () => {
    it("renders a single-column centered layout with max-w-xl", () => {
      const { container } = render(
        <FormLayout mode="simple">{childContent}</FormLayout>,
      );

      const root = container.querySelector('[data-slot="form-layout"]');
      expect(root).toHaveClass("mx-auto", "w-full", "max-w-xl");
      expect(root?.getAttribute("data-form-layout-mode")).toBe("simple");
    });

    it("ignores sidebar even when provided", () => {
      const { container } = render(
        <FormLayout mode="simple" sidebar={sidebarContent}>
          {childContent}
        </FormLayout>,
      );

      expect(container.querySelector("aside")).toBeNull();
      expect(container.querySelector('[data-testid="sidebar"]')).toBeNull();
    });
  });

  describe("mode=complex", () => {
    it("renders with max-w-4xl and two-column grid when sidebar is provided", () => {
      const { container } = render(
        <FormLayout mode="complex" sidebar={sidebarContent}>
          {childContent}
        </FormLayout>,
      );

      const root = container.querySelector('[data-slot="form-layout"]');
      expect(root).toHaveClass("mx-auto", "w-full", "max-w-4xl");
      expect(root?.getAttribute("data-form-layout-mode")).toBe("complex");
      expect(container.querySelector("aside")).toBeInTheDocument();
    });

    it("still shows sidebar when provided", () => {
      const { container } = render(
        <FormLayout mode="complex" sidebar={sidebarContent}>
          {childContent}
        </FormLayout>,
      );

      expect(container.querySelector('[data-testid="sidebar"]')).toBeInTheDocument();
    });
  });

  describe("mode=standard", () => {
    it("renders sidebar when provided", () => {
      const { container } = render(
        <FormLayout mode="standard" sidebar={sidebarContent}>
          {childContent}
        </FormLayout>,
      );

      expect(container.querySelector("aside")).toBeInTheDocument();
      expect(container.querySelector('[data-slot="form-layout"]')?.getAttribute("data-form-layout-mode")).toBe("standard");
    });

    it("hides sidebar when not provided", () => {
      const { container } = render(
        <FormLayout mode="standard">{childContent}</FormLayout>,
      );

      expect(container.querySelector("aside")).toBeNull();
    });
  });

  describe("mode=auto (default)", () => {
    it("defaults to auto when mode is undefined", () => {
      const { container } = render(
        <FormLayout>{childContent}</FormLayout>,
      );

      expect(container.querySelector('[data-slot="form-layout"]')?.getAttribute("data-form-layout-mode")).toBe("auto");
    });

    it("shows sidebar when provided (backward compat)", () => {
      const { container } = render(
        <FormLayout sidebar={sidebarContent}>{childContent}</FormLayout>,
      );

      expect(container.querySelector("aside")).toBeInTheDocument();
    });

    it("hides sidebar when not provided (backward compat)", () => {
      const { container } = render(
        <FormLayout>{childContent}</FormLayout>,
      );

      expect(container.querySelector("aside")).toBeNull();
    });
  });

  describe("preservation", () => {
    it("applies custom className alongside mode classes", () => {
      const { container } = render(
        <FormLayout mode="simple" className="py-4">
          {childContent}
        </FormLayout>,
      );

      const root = container.querySelector('[data-slot="form-layout"]');
      expect(root).toHaveClass("py-4", "max-w-xl");
    });

    it("all modes render children", () => {
      for (const mode of ["auto", "simple", "standard", "complex"] as const) {
        const { container } = render(
          <FormLayout mode={mode}>{childContent}</FormLayout>,
        );
        expect(container.querySelector('[data-testid="child"]')).toBeInTheDocument();
      }
    });
  });
});
