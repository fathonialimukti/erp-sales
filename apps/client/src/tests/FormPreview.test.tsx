import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { Building2, DollarSign, User } from "lucide-react";

import { FormPreview } from "../components/FormPreview";

const ACCENT_BORDER = ".absolute.inset-y-0.left-0";

/** FormPreview calls useIntl, which requires an IntlProvider ancestor. */
const renderPreview = (ui: ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

afterEach(() => {
  cleanup();
});

describe("FormPreview — completion accent border", () => {
  it("renders the accent border element on the card", () => {
    const { container } = renderPreview(
      <FormPreview
        module="customer"
        icon={Building2}
        title="Acme Corp"
        filled={2}
        total={5}
        rows={[]}
      />,
    );
    expect(container.querySelector(ACCENT_BORDER)).toBeInTheDocument();
  });

  it("sets border height to 0% when nothing is filled", () => {
    const { container } = renderPreview(
      <FormPreview
        module="customer"
        icon={Building2}
        title="Acme Corp"
        filled={0}
        total={5}
        rows={[]}
      />,
    );
    const border = container.querySelector(ACCENT_BORDER);
    expect(border).toBeInTheDocument();
    // motion sets style on the element; initial render should have height 0%
    expect(border?.getAttribute("style")).toContain("height: 0%");
  });

  it("sets border height to 100% when fully filled", () => {
    const { container } = renderPreview(
      <FormPreview
        module="customer"
        icon={Building2}
        title="Acme Corp"
        filled={5}
        total={5}
        rows={[]}
      />,
    );
    const border = container.querySelector(ACCENT_BORDER);
    expect(border?.getAttribute("style")).toContain("height: 100%");
  });

  it("does not set a background color when module is unknown", () => {
    const { container } = renderPreview(
      <FormPreview
        module={"unknown-module" as never}
        icon={Building2}
        title="Acme Corp"
        filled={3}
        total={5}
        rows={[]}
      />,
    );
    const border = container.querySelector(ACCENT_BORDER);
    expect(border?.getAttribute("style")).not.toContain("background-color");
  });
});

describe("FormPreview — animated value flash", () => {
  it("renders row values unchanged on first mount (no flash)", () => {
    const { container } = renderPreview(
      <FormPreview
        module="customer"
        icon={Building2}
        title="Acme Corp"
        filled={1}
        total={3}
        rows={[
          { icon: User, label: "Contact", value: "John Doe" },
        ]}
      />,
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    // First mount: no flash class applied yet (background transparent)
    const valueSpan = screen.getByText("John Doe");
    expect(valueSpan.tagName).toBe("SPAN");
  });

  it("flashes a row value when it changes between renders", () => {
    const { rerender } = renderPreview(
      <FormPreview
        module="customer"
        icon={Building2}
        title="Acme Corp"
        filled={1}
        total={3}
        rows={[
          { icon: DollarSign, label: "Revenue", value: "1000" },
        ]}
      />,
    );

    // Initial value
    expect(screen.getByText("1000")).toBeInTheDocument();

    // Re-render with changed value — flash should trigger
    rerender(
      <IntlProvider locale="en">
        <FormPreview
          module="customer"
          icon={Building2}
          title="Acme Corp"
          filled={2}
          total={3}
          rows={[
            { icon: DollarSign, label: "Revenue", value: "2500" },
          ]}
        />
      </IntlProvider>,
    );

    // The new value should be visible
    expect(screen.getByText("2500")).toBeInTheDocument();
    // Old value should be gone
    expect(screen.queryByText("1000")).not.toBeInTheDocument();
  });

  it("does not flash empty values (dash placeholders stay inert)", () => {
    const { rerender } = renderPreview(
      <FormPreview
        module="customer"
        icon={Building2}
        title="Acme Corp"
        filled={0}
        total={3}
        rows={[
          { icon: User, label: "Contact", value: "" },
        ]}
      />,
    );

    // Empty value renders as dash
    expect(screen.getByText("—")).toBeInTheDocument();

    // Re-render with still-empty value — no flash
    rerender(
      <IntlProvider locale="en">
        <FormPreview
          module="customer"
          icon={Building2}
          title="Acme Corp"
          filled={0}
          total={3}
          rows={[
            { icon: User, label: "Contact", value: "" },
          ]}
        />
      </IntlProvider>,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
