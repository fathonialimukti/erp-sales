import { render } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { useEffect, useState } from "react";

import { useDetailForm } from "../lib/hooks/useDetailForm";

afterEach(() => {
  cleanup();
});

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

describe("useDetailForm — seeds once when detail arrives", () => {
  it("calls seed with the detail object", () => {
    const seed = vi.fn();
    const Probe = ({ detail }: { detail: { name: string } | null }) => {
      useDetailForm(detail, seed);
      return null;
    };
    renderWithIntl(<Probe detail={{ name: "Acme" }} />);
    expect(seed).toHaveBeenCalledTimes(1);
    expect(seed).toHaveBeenCalledWith({ name: "Acme" });
  });

  it("does not call seed while detail is null", () => {
    const seed = vi.fn();
    const Probe = () => {
      useDetailForm(null, seed);
      return null;
    };
    renderWithIntl(<Probe />);
    expect(seed).not.toHaveBeenCalled();
  });

  it("re-seeds when a new detail object arrives", () => {
    const seed = vi.fn();
    const Probe = () => {
      const [detail, setDetail] = useState<{ name: string } | null>(null);
      useEffect(() => {
        setDetail({ name: "Loaded" });
      }, []);
      useDetailForm(detail, seed);
      return null;
    };
    renderWithIntl(<Probe />);
    expect(seed).toHaveBeenCalledWith({ name: "Loaded" });
  });
});


