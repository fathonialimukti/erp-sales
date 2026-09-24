import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { FormField } from "../components/FormField";

afterEach(() => {
  cleanup();
});

describe("FormSection — hint prop (additive)", () => {
  it("renders hint below children when provided", () => {
    render(
      <FormField label="Name" hint="Enter your full legal name">
        <input type="text" />
      </FormField>,
    );

    expect(screen.getByText("Enter your full legal name")).toBeInTheDocument();
  });

  it("does not render hint element when hint is undefined", () => {
    const { container } = render(
      <FormField label="Name">
        <input type="text" />
      </FormField>,
    );

    expect(container.querySelector("p.text-xs.text-muted-foreground")).toBeNull();
  });

  it("renders hint above the error message when both are present", () => {
    render(
      <FormField label="Email" hint="We'll never share your email" error="Required">
        <input type="email" />
      </FormField>,
    );

    const hint = screen.getByText("We'll never share your email");
    const error = screen.getByText("Required");
    expect(hint).toBeInTheDocument();
    expect(error).toBeInTheDocument();
    expect(hint.compareDocumentPosition(error)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("renders hint alongside description when no error exists", () => {
    render(
      <FormField label="Phone" hint="Include country code" description="Contact number">
        <input type="tel" />
      </FormField>,
    );

    expect(screen.getByText("Include country code")).toBeInTheDocument();
    expect(screen.getByText("Contact number")).toBeInTheDocument();
  });

  it("applies text-xs and text-muted-foreground classes to hint", () => {
    const { container } = render(
      <FormField hint="Helper text">
        <input type="text" />
      </FormField>,
    );

    const hintEl = container.querySelector("p.text-xs.text-muted-foreground");
    expect(hintEl).toBeInTheDocument();
    expect(hintEl?.textContent).toBe("Helper text");
  });
});

describe("FormField — showValid prop (additive positive feedback)", () => {
  it("renders CheckCircle2 icon with text-success when showValid is true and no error", () => {
    const { container } = render(
      <FormField label="Email" showValid>
        <input type="email" />
      </FormField>,
    );

    const icon = container.querySelector("svg.text-success");
    expect(icon).toBeInTheDocument();
  });

  it("does not render check icon when showValid is false", () => {
    const { container } = render(
      <FormField label="Email">
        <input type="email" />
      </FormField>,
    );

    const icon = container.querySelector("svg.text-success");
    expect(icon).toBeNull();
  });

  it("does not render check icon when error is present (error takes precedence)", () => {
    const { container } = render(
      <FormField label="Email" showValid error="Required">
        <input type="email" />
      </FormField>,
    );

    const icon = container.querySelector("svg.text-success");
    expect(icon).toBeNull();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders check icon inside the Label next to the label text", () => {
    const { container } = render(
      <FormField label="Name" showValid>
        <input type="text" />
      </FormField>,
    );

    const label = container.querySelector("label");
    const icon = label?.querySelector("svg.text-success");
    expect(icon).toBeInTheDocument();
  });
});
