import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Building2, User } from "lucide-react";

import { FormSection } from "../components/FormSection";

/**
 * The success badge carries `bg-success` (solid green plate with the
 * CheckCircle2 icon). We detect it via that class rather than a
 * literal-dot Tailwind class like `size-3.5` (which needs CSS-selector
 * escaping). The badge only renders inside the icon plate, so a
 * step-only section never shows it even when completed.
 */
const SUCCESS_BADGE = ".bg-success.rounded-full";

describe("FormSection — completed state (additive prop)", () => {
  it("renders without completed prop exactly as before (no success ring, no checkmark)", () => {
    const { container } = render(
      <FormSection title="Customer Info" icon={Building2} step={1}>
        <p>content</p>
      </FormSection>,
    );

    expect(screen.getByText("Customer Info")).toBeInTheDocument();
    expect(container.querySelector("[data-completed]")).toBeTruthy();
    expect(container.querySelector("[data-completed]")?.getAttribute("data-completed")).toBe(
      "false",
    );
    expect(container.querySelector(".ring-success\\/30")).toBeNull();
    expect(container.querySelector(SUCCESS_BADGE)).toBeNull();
  });

  it("shows success ring and checkmark badge when completed is true", () => {
    const { container } = render(
      <FormSection title="Customer Info" icon={Building2} step={1} completed>
        <p>content</p>
      </FormSection>,
    );

    const card = container.querySelector("[data-completed]");
    expect(card?.getAttribute("data-completed")).toBe("true");
    expect(container.querySelector(".ring-success\\/30")).toBeInTheDocument();
    expect(container.querySelector(SUCCESS_BADGE)).toBeInTheDocument();
  });

  it("does not render checkmark badge when completed is false (explicit)", () => {
    const { container } = render(
      <FormSection title="Customer Info" icon={Building2} step={1} completed={false}>
        <p>content</p>
      </FormSection>,
    );

    expect(
      container.querySelector("[data-completed]")?.getAttribute("data-completed"),
    ).toBe("false");
    expect(container.querySelector(".ring-success\\/30")).toBeNull();
    expect(container.querySelector(SUCCESS_BADGE)).toBeNull();
  });

  it("renders without an icon plate (step-only path) regardless of completed", () => {
    const { container } = render(
      <FormSection title="Step Only" step={2} completed>
        <p>content</p>
      </FormSection>,
    );

    expect(screen.getByText("Step Only")).toBeInTheDocument();
    expect(container.querySelector(".ring-success\\/30")).toBeInTheDocument();
    // No icon plate → no checkmark badge (badge only renders on the icon plate)
    expect(container.querySelector(SUCCESS_BADGE)).toBeNull();
  });

  it("renders action slot and description alongside completed state", () => {
    render(
      <FormSection
        title="With Action"
        description="Helper text"
        icon={User}
        step={3}
        completed
        action={<button type="button">Add</button>}
      >
        <p>body</p>
      </FormSection>,
    );

    expect(screen.getByText("With Action")).toBeInTheDocument();
    expect(screen.getByText("Helper text")).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});
